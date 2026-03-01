export type WorkflowProjectionTask = {
  id: string
  name: string
  state: string
  ownerRoleId: string
  approvalPolicy: string
  hasGate: boolean
  isBlocked: boolean
  requiresApproval: boolean
  requiresPrecondition: boolean
  upstreamTaskIds: string[]
  downstreamTaskIds: string[]
  blockingTaskIds: string[]
  isReady: boolean
  canComplete: boolean | null
}

export type WorkflowProjectionResponse = {
  tenantId: string
  ecoId: string
  actorId: string | null
  tasks: WorkflowProjectionTask[]
  tasksTopologicalOrder: string[]
  counts: {
    totalTasks: number
    doneTasks: number
    blockedTasks: number
    readyTasks: number
  }
  dependencies: Array<{
    fromTaskId: string
    toTaskId: string
  }>
  approvals: Array<{
    taskId: string
    actorId: string
    decision: string
  }>
  gates: Array<{
    taskId: string
    type: string
  }>
}

export type AuditTimelineResponse = {
  tenantId: string
  ecoId: string
  events: Array<{
    id: string
    eventType: string
    createdAt: string
    payload: Record<string, string | number | boolean | null | string[]>
  }>
}

export type TenantUserOption = {
  id: string
  email: string
}

export type EcoOption = {
  id: string
  title: string
  createdAt: string
}

export type TemplateVersionOption = {
  id: string
  templateId: string
  templateName: string
  version: string
  isPublished: boolean
  createdAt: string
}

type CompleteTaskResponse = {
  taskMarkedDone: boolean
  tasksUnblocked: number
  unblockedTaskIds: string[]
  status: string
}

type CreateApprovalResponse = {
  id: string
  taskId: string
  actorId: string
  decision: string
  status: string
}

type CreateEcoResponse = {
  tenantId: string
  ecoId: string
}

type InstantiateEcoResponse = {
  ecoId: string
  status: string
}

async function requestJson<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error =
      payload && typeof payload.error === 'string'
        ? payload.error
        : `Request failed with status ${response.status}`
    return { ok: false, status: response.status, error }
  }

  return { ok: true, data: payload as T }
}

export async function fetchProjection(args: {
  tenantId: string
  ecoId: string
  actorId?: string
}) {
  const query = new URLSearchParams({ tenantId: args.tenantId })
  if (args.actorId) {
    query.set('actorId', args.actorId)
  }

  return requestJson<WorkflowProjectionResponse>(
    `/api/ecos/${args.ecoId}/projection?${query.toString()}`
  )
}

export async function fetchAuditTimeline(args: {
  tenantId: string
  ecoId: string
}) {
  const query = new URLSearchParams({ tenantId: args.tenantId })
  return requestJson<AuditTimelineResponse>(
    `/api/ecos/${args.ecoId}/audit?${query.toString()}`
  )
}

export async function fetchTenantUsers(tenantId: string) {
  return requestJson<TenantUserOption[]>(`/api/tenants/${tenantId}/users`)
}

export async function fetchEcos(tenantId: string) {
  return requestJson<{ tenantId: string; ecos: EcoOption[] }>(
    `/api/ecos?${new URLSearchParams({ tenantId }).toString()}`
  )
}

export async function createEco(args: { tenantId: string; title: string }) {
  return requestJson<CreateEcoResponse>('/api/ecos', {
    method: 'POST',
    body: JSON.stringify({
      tenantId: args.tenantId,
      title: args.title,
    }),
  })
}

export async function fetchTemplateVersions(tenantId: string) {
  return requestJson<{ tenantId: string; templateVersions: TemplateVersionOption[] }>(
    `/api/template-versions?${new URLSearchParams({ tenantId }).toString()}`
  )
}

export async function instantiateEco(args: {
  tenantId: string
  ecoId: string
  templateVersionId: string
  actorId?: string
}) {
  return requestJson<InstantiateEcoResponse>(`/api/ecos/${args.ecoId}/instantiate`, {
    method: 'POST',
    body: JSON.stringify({
      tenantId: args.tenantId,
      templateVersionId: args.templateVersionId,
      ...(args.actorId ? { actorId: args.actorId } : {}),
    }),
  })
}

export async function completeTask(args: {
  tenantId: string
  actorId: string
  taskId: string
}) {
  return requestJson<CompleteTaskResponse>(`/api/tasks/${args.taskId}/complete`, {
    method: 'POST',
    body: JSON.stringify({
      tenantId: args.tenantId,
      actorId: args.actorId,
    }),
  })
}

export async function createApproval(args: {
  tenantId: string
  taskId: string
  actorId: string
  decision: 'APPROVED' | 'REJECTED'
  comment?: string
}) {
  return requestJson<CreateApprovalResponse>(`/api/tasks/${args.taskId}/approvals`, {
    method: 'POST',
    body: JSON.stringify({
      tenantId: args.tenantId,
      actorId: args.actorId,
      decision: args.decision,
      ...(args.comment ? { comment: args.comment } : {}),
    }),
  })
}

export type TemplateOption = {
  id: string
  name: string
  createdAt: string
}

export type TemplateBuilderVersion = {
  id: string
  templateId: string
  version: string
  isPublished: boolean
  createdAt: string
  templateName: string
}

export type RoleOption = {
  id: string
  name: string
}

export type TemplateTaskDefinitionRow = {
  id: string
  templateVersionId: string
  tenantId: string
  parentDefinitionId: string | null
  name: string
  taskLevel: 'MILESTONE' | 'STEP' | 'SUBSTEP'
  ownerRoleId: string
  visibility: 'INTERNAL_ONLY' | 'CUSTOMER_VISIBLE' | 'CUSTOMER_ACTIONABLE'
  approvalPolicy: 'NONE' | 'SINGLE' | 'SEQUENTIAL' | 'PARALLEL' | 'QUORUM'
  clockMode:
    | 'ACTIVE'
    | 'WAITING_ON_CUSTOMER'
    | 'WAITING_ON_SUPPLIER'
    | 'WAITING_INTERNAL'
  createdAt: string
}

export type TemplateDependencyDefinitionRow = {
  id: string
  templateVersionId: string
  tenantId: string
  fromDefinitionId: string
  toDefinitionId: string
  type: 'FINISH_TO_START' | 'START_TO_START'
  lagMinutes: number
  createdAt: string
}

export type BlueprintValidationError = {
  code: string
  message: string
  details?: string
}

export type BlueprintValidationResult = {
  tenantId: string
  templateVersionId: string
  ok: boolean
  errors: BlueprintValidationError[]
}

export async function fetchTemplates(tenantId: string) {
  return requestJson<{ tenantId: string; templates: TemplateOption[] }>(
    `/api/templates?${new URLSearchParams({ tenantId }).toString()}`
  )
}

export async function createTemplateForTenant(args: {
  tenantId: string
  name: string
}) {
  return requestJson<{ tenantId: string; templateId: string }>('/api/templates', {
    method: 'POST',
    body: JSON.stringify({
      tenantId: args.tenantId,
      name: args.name,
    }),
  })
}

export async function fetchTemplateVersionsForTemplate(args: {
  tenantId: string
  templateId: string
}) {
  return requestJson<{
    tenantId: string
    templateId: string
    versions: TemplateBuilderVersion[]
  }>(
    `/api/templates/${args.templateId}/versions?${new URLSearchParams({
      tenantId: args.tenantId,
    }).toString()}`
  )
}

export async function createDraftTemplateVersion(args: {
  tenantId: string
  templateId: string
  versionLabel?: string
}) {
  return requestJson<{
    tenantId: string
    templateId: string
    templateVersionId: string
    version: string
  }>(`/api/templates/${args.templateId}/versions`, {
    method: 'POST',
    body: JSON.stringify({
      tenantId: args.tenantId,
      ...(args.versionLabel ? { versionLabel: args.versionLabel } : {}),
    }),
  })
}

export async function validateTemplateVersion(args: {
  tenantId: string
  templateVersionId: string
}) {
  return requestJson<BlueprintValidationResult>(
    `/api/template-versions/${args.templateVersionId}/validate`,
    {
      method: 'POST',
      body: JSON.stringify({
        tenantId: args.tenantId,
      }),
    }
  )
}

export async function publishTemplateVersion(args: {
  tenantId: string
  templateVersionId: string
}) {
  return requestJson<{
    tenantId: string
    templateVersionId: string
    ok: boolean
    status: 'published' | 'noop_already_published'
  }>(`/api/template-versions/${args.templateVersionId}/publish`, {
    method: 'POST',
    body: JSON.stringify({
      tenantId: args.tenantId,
    }),
  })
}

export async function fetchTemplateTasks(args: {
  tenantId: string
  templateVersionId: string
}) {
  return requestJson<{
    tenantId: string
    templateVersionId: string
    tasks: TemplateTaskDefinitionRow[]
  }>(
    `/api/template-versions/${args.templateVersionId}/tasks?${new URLSearchParams({
      tenantId: args.tenantId,
    }).toString()}`
  )
}

export async function createTemplateTask(args: {
  tenantId: string
  templateVersionId: string
  name: string
  taskLevel: 'MILESTONE' | 'STEP' | 'SUBSTEP'
  ownerRoleId: string
  visibility: 'INTERNAL_ONLY' | 'CUSTOMER_VISIBLE' | 'CUSTOMER_ACTIONABLE'
  approvalPolicy: 'NONE' | 'SINGLE' | 'SEQUENTIAL' | 'PARALLEL' | 'QUORUM'
  clockMode:
    | 'ACTIVE'
    | 'WAITING_ON_CUSTOMER'
    | 'WAITING_ON_SUPPLIER'
    | 'WAITING_INTERNAL'
  parentDefinitionId?: string | null
}) {
  return requestJson<{ task: TemplateTaskDefinitionRow }>(
    `/api/template-versions/${args.templateVersionId}/tasks`,
    {
      method: 'POST',
      body: JSON.stringify({
        tenantId: args.tenantId,
        name: args.name,
        taskLevel: args.taskLevel,
        ownerRoleId: args.ownerRoleId,
        visibility: args.visibility,
        approvalPolicy: args.approvalPolicy,
        clockMode: args.clockMode,
        ...(args.parentDefinitionId ? { parentDefinitionId: args.parentDefinitionId } : {}),
      }),
    }
  )
}

export async function updateTemplateTask(args: {
  tenantId: string
  taskDefinitionId: string
  patch: Partial<
    Pick<
      TemplateTaskDefinitionRow,
      | 'name'
      | 'taskLevel'
      | 'ownerRoleId'
      | 'visibility'
      | 'approvalPolicy'
      | 'clockMode'
      | 'parentDefinitionId'
    >
  >
}) {
  return requestJson<{ task: TemplateTaskDefinitionRow }>(
    `/api/template-tasks/${args.taskDefinitionId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        tenantId: args.tenantId,
        ...args.patch,
      }),
    }
  )
}

export async function deleteTemplateTask(args: {
  tenantId: string
  taskDefinitionId: string
}) {
  return requestJson<{ deleted: boolean }>(`/api/template-tasks/${args.taskDefinitionId}`, {
    method: 'DELETE',
    body: JSON.stringify({
      tenantId: args.tenantId,
    }),
  })
}

export async function fetchTemplateDependencies(args: {
  tenantId: string
  templateVersionId: string
}) {
  return requestJson<{
    tenantId: string
    templateVersionId: string
    dependencies: TemplateDependencyDefinitionRow[]
  }>(
    `/api/template-versions/${args.templateVersionId}/dependencies?${new URLSearchParams({
      tenantId: args.tenantId,
    }).toString()}`
  )
}

export async function createTemplateDependency(args: {
  tenantId: string
  templateVersionId: string
  fromDefinitionId: string
  toDefinitionId: string
  type: 'FINISH_TO_START' | 'START_TO_START'
  lagMinutes: number
}) {
  return requestJson<{ dependency: TemplateDependencyDefinitionRow }>(
    `/api/template-versions/${args.templateVersionId}/dependencies`,
    {
      method: 'POST',
      body: JSON.stringify({
        tenantId: args.tenantId,
        fromDefinitionId: args.fromDefinitionId,
        toDefinitionId: args.toDefinitionId,
        type: args.type,
        lagMinutes: args.lagMinutes,
      }),
    }
  )
}

export async function deleteTemplateDependency(args: {
  tenantId: string
  dependencyDefinitionId: string
}) {
  return requestJson<{ deleted: boolean }>(
    `/api/template-dependencies/${args.dependencyDefinitionId}`,
    {
      method: 'DELETE',
      body: JSON.stringify({
        tenantId: args.tenantId,
      }),
    }
  )
}

export async function fetchRoles(tenantId: string) {
  return requestJson<{ tenantId: string; roles: RoleOption[] }>(
    `/api/roles?${new URLSearchParams({ tenantId }).toString()}`
  )
}
