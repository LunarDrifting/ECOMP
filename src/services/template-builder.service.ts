import type {
  ApprovalPolicy,
  ClockMode,
  DependencyType,
  TaskLevel,
  TaskVisibility,
} from '@prisma/client'
import { tenantDb } from '@/lib/db'

export const TEMPLATE_VALIDATION_FAILED_ERROR = 'Template validation failed'

type TemplateTaskDefinitionInput = {
  name: string
  taskLevel: TaskLevel
  ownerRoleId: string
  visibility: TaskVisibility
  approvalPolicy: ApprovalPolicy
  clockMode: ClockMode
  parentDefinitionId?: string | null
}

type ValidationError = {
  code: string
  message: string
  details?: string
}

async function getTemplateVersionForTenant(tenantId: string, templateVersionId: string) {
  const db = tenantDb(tenantId)
  const templateVersion = await db.templateVersion.findByIdViaTemplate(templateVersionId)
  if (!templateVersion) {
    throw new Error('TemplateVersion not found for tenant')
  }
  return templateVersion
}

async function assertEditableTemplateVersion(tenantId: string, templateVersionId: string) {
  const templateVersion = await getTemplateVersionForTenant(tenantId, templateVersionId)
  if (templateVersion.isPublished) {
    throw new Error('Cannot modify a published template version')
  }
  return templateVersion
}

function normalizeVersionLabel(versionLabel: string | undefined | null) {
  return versionLabel?.trim() ?? ''
}

function nextDraftVersion(existingVersions: string[]) {
  const existing = new Set(existingVersions)
  let counter = 1
  let candidate = `draft-${counter}`
  while (existing.has(candidate)) {
    counter += 1
    candidate = `draft-${counter}`
  }
  return candidate
}

export async function listTemplates({ tenantId }: { tenantId: string }) {
  const db = tenantDb(tenantId)
  const templates = await db.template.listByTenant()
  return { tenantId, templates }
}

export async function createTemplate({
  tenantId,
  name,
}: {
  tenantId: string
  name: string
}) {
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error('template name is required')
  }

  const db = tenantDb(tenantId)
  const template = await db.template.create(trimmedName)
  return {
    tenantId,
    templateId: template.id,
  }
}

export async function listTemplateVersions({
  tenantId,
  templateId,
}: {
  tenantId: string
  templateId: string
}) {
  const db = tenantDb(tenantId)
  const template = await db.template.findById(templateId)
  if (!template) {
    throw new Error('Template not found for tenant')
  }

  const versions = await db.templateVersion.listByTemplateId(templateId)
  return {
    tenantId,
    templateId,
    versions: versions.map((version) => ({
      id: version.id,
      templateId: version.templateId,
      version: version.version,
      isPublished: version.isPublished,
      createdAt: version.createdAt,
      templateName: version.template.name,
    })),
  }
}

export async function createTemplateVersionDraft({
  tenantId,
  templateId,
  versionLabel,
}: {
  tenantId: string
  templateId: string
  versionLabel?: string
}) {
  const db = tenantDb(tenantId)
  const template = await db.template.findById(templateId)
  if (!template) {
    throw new Error('Template not found for tenant')
  }

  const versions = await db.templateVersion.listByTemplateId(templateId)
  const requestedVersion = normalizeVersionLabel(versionLabel)
  const version =
    requestedVersion.length > 0
      ? requestedVersion
      : nextDraftVersion(versions.map((row) => row.version))

  if (versions.some((row) => row.version === version)) {
    throw new Error('Template version label already exists')
  }

  const created = await db.templateVersion.createDraft(templateId, version)
  return {
    tenantId,
    templateId,
    templateVersionId: created.id,
    version: created.version,
  }
}

export async function listTemplateVersionTasks({
  tenantId,
  templateVersionId,
}: {
  tenantId: string
  templateVersionId: string
}) {
  await getTemplateVersionForTenant(tenantId, templateVersionId)
  const db = tenantDb(tenantId)
  const tasks = await db.templateTaskDefinition.listByTemplateVersion(templateVersionId)
  return {
    tenantId,
    templateVersionId,
    tasks,
  }
}

export async function createTemplateTaskDefinition({
  tenantId,
  templateVersionId,
  input,
}: {
  tenantId: string
  templateVersionId: string
  input: TemplateTaskDefinitionInput
}) {
  await assertEditableTemplateVersion(tenantId, templateVersionId)
  const db = tenantDb(tenantId)
  const trimmedName = input.name.trim()
  if (!trimmedName) {
    throw new Error('task definition name is required')
  }

  if (input.parentDefinitionId) {
    const parent = await db.templateTaskDefinition.findById(input.parentDefinitionId)
    if (!parent || parent.templateVersionId !== templateVersionId) {
      throw new Error('Parent definition must belong to templateVersion')
    }
  }

  const role = await db.role.findMany({
    where: {
      id: input.ownerRoleId,
    },
    select: { id: true },
    take: 1,
  })
  if (role.length === 0) {
    throw new Error('ownerRoleId not found for tenant')
  }

  const task = await db.templateTaskDefinition.createForTemplateVersion({
    templateVersionId,
    parentDefinitionId: input.parentDefinitionId ?? null,
    name: trimmedName,
    taskLevel: input.taskLevel,
    ownerRoleId: input.ownerRoleId,
    visibility: input.visibility,
    approvalPolicy: input.approvalPolicy,
    clockMode: input.clockMode,
  })

  return {
    tenantId,
    templateVersionId,
    task,
  }
}

export async function updateTemplateTaskDefinition({
  tenantId,
  taskDefinitionId,
  input,
}: {
  tenantId: string
  taskDefinitionId: string
  input: Partial<TemplateTaskDefinitionInput>
}) {
  const db = tenantDb(tenantId)
  const existing = await db.templateTaskDefinition.findById(taskDefinitionId)
  if (!existing) {
    throw new Error('Template task definition not found for tenant')
  }

  await assertEditableTemplateVersion(tenantId, existing.templateVersionId)

  if (input.parentDefinitionId && input.parentDefinitionId === taskDefinitionId) {
    throw new Error('Task definition cannot be its own parent')
  }

  if (input.parentDefinitionId) {
    const parent = await db.templateTaskDefinition.findById(input.parentDefinitionId)
    if (!parent || parent.templateVersionId !== existing.templateVersionId) {
      throw new Error('Parent definition must belong to templateVersion')
    }
  }

  if (input.ownerRoleId) {
    const role = await db.role.findMany({
      where: { id: input.ownerRoleId },
      select: { id: true },
      take: 1,
    })
    if (role.length === 0) {
      throw new Error('ownerRoleId not found for tenant')
    }
  }

  if (input.name !== undefined && !input.name.trim()) {
    throw new Error('task definition name is required')
  }

  const updated = await db.templateTaskDefinition.updateById({
    taskDefinitionId,
    data: {
      ...(input.parentDefinitionId !== undefined
        ? { parentDefinitionId: input.parentDefinitionId }
        : {}),
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.taskLevel !== undefined ? { taskLevel: input.taskLevel } : {}),
      ...(input.ownerRoleId !== undefined ? { ownerRoleId: input.ownerRoleId } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
      ...(input.approvalPolicy !== undefined
        ? { approvalPolicy: input.approvalPolicy }
        : {}),
      ...(input.clockMode !== undefined ? { clockMode: input.clockMode } : {}),
    },
  })

  return {
    tenantId,
    templateVersionId: existing.templateVersionId,
    task: updated,
  }
}

export async function deleteTemplateTaskDefinition({
  tenantId,
  taskDefinitionId,
}: {
  tenantId: string
  taskDefinitionId: string
}) {
  const db = tenantDb(tenantId)
  const existing = await db.templateTaskDefinition.findById(taskDefinitionId)
  if (!existing) {
    throw new Error('Template task definition not found for tenant')
  }

  await assertEditableTemplateVersion(tenantId, existing.templateVersionId)
  await db.templateTaskDefinition.deleteById(taskDefinitionId)

  return {
    tenantId,
    templateVersionId: existing.templateVersionId,
    deleted: true,
  }
}

export async function listTemplateVersionDependencies({
  tenantId,
  templateVersionId,
}: {
  tenantId: string
  templateVersionId: string
}) {
  await getTemplateVersionForTenant(tenantId, templateVersionId)
  const db = tenantDb(tenantId)
  const dependencies =
    await db.templateDependencyDefinition.listByTemplateVersion(templateVersionId)
  return {
    tenantId,
    templateVersionId,
    dependencies,
  }
}

export async function createTemplateDependencyDefinition({
  tenantId,
  templateVersionId,
  fromDefinitionId,
  toDefinitionId,
  type,
  lagMinutes,
}: {
  tenantId: string
  templateVersionId: string
  fromDefinitionId: string
  toDefinitionId: string
  type: DependencyType
  lagMinutes: number
}) {
  await assertEditableTemplateVersion(tenantId, templateVersionId)

  if (fromDefinitionId === toDefinitionId) {
    throw new Error('Self dependency is not allowed')
  }

  const db = tenantDb(tenantId)
  const definitions = await db.templateTaskDefinition.listByTemplateVersion(
    templateVersionId
  )
  const definitionIds = new Set(definitions.map((definition) => definition.id))
  if (!definitionIds.has(fromDefinitionId) || !definitionIds.has(toDefinitionId)) {
    throw new Error('Dependency endpoints must belong to templateVersion')
  }

  const dependency = await db.templateDependencyDefinition.createForTemplateVersion({
    templateVersionId,
    fromDefinitionId,
    toDefinitionId,
    type,
    lagMinutes,
  })

  return {
    tenantId,
    templateVersionId,
    dependency,
  }
}

export async function deleteTemplateDependencyDefinition({
  tenantId,
  dependencyDefinitionId,
}: {
  tenantId: string
  dependencyDefinitionId: string
}) {
  const db = tenantDb(tenantId)
  const existing = await db.templateDependencyDefinition.findById(
    dependencyDefinitionId
  )
  if (!existing) {
    throw new Error('Template dependency definition not found for tenant')
  }

  await assertEditableTemplateVersion(tenantId, existing.templateVersionId)
  await db.templateDependencyDefinition.deleteById(dependencyDefinitionId)

  return {
    tenantId,
    templateVersionId: existing.templateVersionId,
    deleted: true,
  }
}

function findCycle(definitionIds: string[], edges: Array<[string, string]>) {
  const adjacency = new Map<string, string[]>()
  const state = new Map<string, 0 | 1 | 2>()

  for (const id of definitionIds) {
    adjacency.set(id, [])
    state.set(id, 0)
  }

  for (const [fromId, toId] of edges) {
    adjacency.get(fromId)?.push(toId)
  }

  for (const value of adjacency.values()) {
    value.sort()
  }

  const sortedIds = [...definitionIds].sort()

  const dfs = (nodeId: string): boolean => {
    const nodeState = state.get(nodeId) ?? 0
    if (nodeState === 1) {
      return true
    }
    if (nodeState === 2) {
      return false
    }
    state.set(nodeId, 1)
    for (const nextId of adjacency.get(nodeId) ?? []) {
      if (dfs(nextId)) {
        return true
      }
    }
    state.set(nodeId, 2)
    return false
  }

  for (const id of sortedIds) {
    if ((state.get(id) ?? 0) !== 0) {
      continue
    }
    if (dfs(id)) {
      return true
    }
  }

  return false
}

export async function validateTemplateVersionBlueprint({
  tenantId,
  templateVersionId,
}: {
  tenantId: string
  templateVersionId: string
}) {
  await getTemplateVersionForTenant(tenantId, templateVersionId)
  const db = tenantDb(tenantId)
  const definitions = await db.templateTaskDefinition.listByTemplateVersion(
    templateVersionId
  )
  const dependencies =
    await db.templateDependencyDefinition.listByTemplateVersion(templateVersionId)

  const errors: ValidationError[] = []
  const definitionIds = new Set(definitions.map((definition) => definition.id))
  const edgePairs: Array<[string, string]> = []

  for (const dependency of dependencies) {
    if (dependency.fromDefinitionId === dependency.toDefinitionId) {
      errors.push({
        code: 'SELF_EDGE',
        message: 'Dependency contains a self edge',
        details: dependency.id,
      })
      continue
    }

    if (
      !definitionIds.has(dependency.fromDefinitionId) ||
      !definitionIds.has(dependency.toDefinitionId)
    ) {
      errors.push({
        code: 'MISSING_ENDPOINT',
        message: 'Dependency endpoint must exist in templateVersion',
        details: dependency.id,
      })
      continue
    }

    edgePairs.push([dependency.fromDefinitionId, dependency.toDefinitionId])
  }

  const hasCycle = findCycle(Array.from(definitionIds), edgePairs)
  if (hasCycle) {
    errors.push({
      code: 'CYCLE',
      message: 'Dependency graph contains a cycle',
    })
  }

  return {
    tenantId,
    templateVersionId,
    ok: errors.length === 0,
    errors,
  }
}

export async function publishTemplateVersion({
  tenantId,
  templateVersionId,
}: {
  tenantId: string
  templateVersionId: string
}) {
  const templateVersion = await getTemplateVersionForTenant(tenantId, templateVersionId)
  if (templateVersion.isPublished) {
    return {
      tenantId,
      templateVersionId,
      ok: true,
      status: 'noop_already_published' as const,
    }
  }

  const validation = await validateTemplateVersionBlueprint({
    tenantId,
    templateVersionId,
  })
  if (!validation.ok) {
    throw new Error(TEMPLATE_VALIDATION_FAILED_ERROR)
  }

  const db = tenantDb(tenantId)
  await db.templateVersion.publishIfDraft(templateVersionId)
  return {
    tenantId,
    templateVersionId,
    ok: true,
    status: 'published' as const,
  }
}

export async function listTemplateBuilderRoles({ tenantId }: { tenantId: string }) {
  const db = tenantDb(tenantId)
  const roles = await db.role.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  })

  return {
    tenantId,
    roles,
  }
}
