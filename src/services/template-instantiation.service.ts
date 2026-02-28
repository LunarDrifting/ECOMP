import { tenantDb } from '@/lib/db'

type InstantiateTemplateForEcoInput = {
  tenantId: string
  ecoId: string
  templateVersionId: string
  actorId?: string
}

export async function instantiateTemplateForEco({
  tenantId,
  ecoId,
  templateVersionId,
  actorId,
}: InstantiateTemplateForEcoInput) {
  const db = tenantDb(tenantId)

  const eco = await db.eco.findById(ecoId)
  if (!eco) {
    throw new Error('ECO not found for tenant')
  }

  const templateVersion = await db.templateVersion.findByIdViaTemplate(
    templateVersionId
  )
  if (!templateVersion) {
    throw new Error('TemplateVersion not found for tenant')
  }

  if (eco.tenantId !== templateVersion.template.tenantId) {
    throw new Error('ECO and Template must belong to same tenant')
  }

  let ecoPlan = await db.ecoPlan.findByEcoId(ecoId)
  let createdEcoPlan = false

  if (!ecoPlan) {
    ecoPlan = await db.ecoPlan.create(ecoId, templateVersionId)
    createdEcoPlan = true
  } else if (ecoPlan.templateVersionId !== templateVersionId) {
    throw new Error('ECOPlan already bound to different TemplateVersion')
  }

  const existingTasks = await db.task.listByEcoId(ecoId)
  if (existingTasks.length > 0) {
    return {
      ecoId,
      tenantId,
      templateVersionId,
      actorId: actorId ?? null,
      ecoPlanId: ecoPlan.id,
      createdEcoPlan,
      tasksCreated: 0,
      createdTaskIds: [],
      dependenciesCreated: 0,
      createdDependencyIds: [],
      blockedTasks: 0,
      readyTasks: 0,
      status: 'noop_existing_tasks',
    }
  }

  const definitions = await db.templateTaskDefinition.listByTemplateVersion(
    templateVersionId
  )
  if (definitions.length === 0) {
    throw new Error('No TemplateTaskDefinition rows found for templateVersion')
  }

  const createdTaskIds: string[] = []
  const definitionToTaskId = new Map<string, string>()
  const pending = [...definitions]

  while (pending.length > 0) {
    let createdThisPass = 0

    for (let i = 0; i < pending.length; i += 1) {
      const def = pending[i]
      const parentReady =
        !def.parentDefinitionId ||
        definitionToTaskId.has(def.parentDefinitionId)

      if (!parentReady) {
        continue
      }

      const parentTaskId = def.parentDefinitionId
        ? definitionToTaskId.get(def.parentDefinitionId)
        : undefined

      const task = await db.task.createFromDefinition({
        ecoId,
        ownerRoleId: def.ownerRoleId,
        name: def.name,
        taskLevel: def.taskLevel,
        visibility: def.visibility,
        approvalPolicy: def.approvalPolicy,
        clockMode: def.clockMode,
        parentTaskId,
      })

      definitionToTaskId.set(def.id, task.id)
      createdTaskIds.push(task.id)
      pending.splice(i, 1)
      i -= 1
      createdThisPass += 1
    }

    if (createdThisPass === 0) {
      throw new Error(
        'Unresolvable TemplateTaskDefinition hierarchy: parent definitions missing or cyclic'
      )
    }
  }

  const dependencyDefinitions =
    await db.templateDependencyDefinition.listByTemplateVersion(templateVersionId)
  const existingDependencies = await db.dependency.listByTaskIds(createdTaskIds)
  const knownEdges = new Set(
    existingDependencies.map((edge) => `${edge.fromTaskId}:${edge.toTaskId}`)
  )
  const blueprintEdgesSeen = new Set<string>()
  const createdDependencyIds: string[] = []
  const incomingDependencyTaskIds = new Set<string>()

  for (const dependencyDefinition of dependencyDefinitions) {
    const fromTaskId = definitionToTaskId.get(dependencyDefinition.fromDefinitionId)
    const toTaskId = definitionToTaskId.get(dependencyDefinition.toDefinitionId)

    if (!fromTaskId || !toTaskId) {
      throw new Error(
        'TemplateDependencyDefinition references missing task definition mapping'
      )
    }

    if (fromTaskId === toTaskId) {
      throw new Error('Self dependency is not allowed')
    }

    const edgeKey = `${fromTaskId}:${toTaskId}`
    if (blueprintEdgesSeen.has(edgeKey) || knownEdges.has(edgeKey)) {
      continue
    }

    blueprintEdgesSeen.add(edgeKey)

    const dependency = await db.dependency.create({
      fromTaskId,
      toTaskId,
      type: dependencyDefinition.type,
      lagMinutes: dependencyDefinition.lagMinutes,
    })

    knownEdges.add(edgeKey)
    createdDependencyIds.push(dependency.id)
    incomingDependencyTaskIds.add(dependency.toTaskId)
  }

  const blockedTaskIds = createdTaskIds
    .filter((taskId) => incomingDependencyTaskIds.has(taskId))
    .sort()
  const readyTaskIds = createdTaskIds
    .filter((taskId) => !incomingDependencyTaskIds.has(taskId))
    .sort()

  if (blockedTaskIds.length > 0) {
    await db.task.updateStateForIds(blockedTaskIds, 'BLOCKED')
  }
  if (readyTaskIds.length > 0) {
    await db.task.updateStateForIds(readyTaskIds, 'NOT_STARTED')
  }

  return {
    ecoId,
    tenantId,
    templateVersionId,
    actorId: actorId ?? null,
    ecoPlanId: ecoPlan.id,
    createdEcoPlan,
    tasksCreated: createdTaskIds.length,
    createdTaskIds,
    dependenciesCreated: createdDependencyIds.length,
    createdDependencyIds,
    blockedTasks: blockedTaskIds.length,
    readyTasks: readyTaskIds.length,
    status: 'created',
  }
}
