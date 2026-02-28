import { tenantDb } from '@/lib/db'

const INVALID_BLUEPRINT_GRAPH_ERROR =
  'Invalid blueprint: circular dependency detected'

type BlueprintTaskDefinition = {
  id: string
}

type BlueprintDependencyDefinition = {
  fromDefinitionId: string
  toDefinitionId: string
}

function validateBlueprintGraph({
  definitions,
  dependencyDefinitions,
}: {
  definitions: BlueprintTaskDefinition[]
  dependencyDefinitions: BlueprintDependencyDefinition[]
}) {
  const definitionIds = new Set(definitions.map((definition) => definition.id))
  const adjacency = new Map<string, string[]>()

  for (const definition of definitions) {
    adjacency.set(definition.id, [])
  }

  for (const dependencyDefinition of dependencyDefinitions) {
    const { fromDefinitionId, toDefinitionId } = dependencyDefinition

    if (fromDefinitionId === toDefinitionId) {
      throw new Error(INVALID_BLUEPRINT_GRAPH_ERROR)
    }

    if (!definitionIds.has(fromDefinitionId) || !definitionIds.has(toDefinitionId)) {
      continue
    }

    const outgoing = adjacency.get(fromDefinitionId)
    if (outgoing && !outgoing.includes(toDefinitionId)) {
      outgoing.push(toDefinitionId)
    }
  }

  for (const outgoing of adjacency.values()) {
    outgoing.sort()
  }

  const visitState = new Map<string, 0 | 1 | 2>()

  const detectCycle = (definitionId: string): boolean => {
    const state = visitState.get(definitionId) ?? 0

    if (state === 1) {
      return true
    }

    if (state === 2) {
      return false
    }

    visitState.set(definitionId, 1)
    const outgoing = adjacency.get(definitionId) ?? []

    for (const nextDefinitionId of outgoing) {
      if (detectCycle(nextDefinitionId)) {
        return true
      }
    }

    visitState.set(definitionId, 2)
    return false
  }

  const sortedDefinitionIds = Array.from(definitionIds).sort()

  for (const definitionId of sortedDefinitionIds) {
    if ((visitState.get(definitionId) ?? 0) !== 0) {
      continue
    }

    if (detectCycle(definitionId)) {
      throw new Error(INVALID_BLUEPRINT_GRAPH_ERROR)
    }
  }
}

type InstantiateTemplateForEcoInput = {
  tenantId: string
  ecoId: string
  templateVersionId: string
  actorId?: string
}

type ResolveDependenciesForTaskInput = {
  tenantId: string
  taskId: string
}

type MarkTaskDoneInput = {
  tenantId: string
  taskId: string
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

  const definitions = await db.templateTaskDefinition.listByTemplateVersion(
    templateVersionId
  )
  if (definitions.length === 0) {
    throw new Error('No TemplateTaskDefinition rows found for templateVersion')
  }

  const dependencyDefinitions =
    await db.templateDependencyDefinition.listByTemplateVersion(templateVersionId)

  validateBlueprintGraph({
    definitions,
    dependencyDefinitions,
  })

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

export async function resolveDependenciesForTask({
  tenantId,
  taskId,
}: ResolveDependenciesForTaskInput) {
  const db = tenantDb(tenantId)

  const sourceTask = await db.task.findById(taskId)
  if (!sourceTask) {
    throw new Error('Task not found for tenant')
  }

  if (sourceTask.state !== 'DONE') {
    return {
      taskId,
      tenantId,
      tasksUnblocked: 0,
      unblockedTaskIds: [],
      status: 'noop_source_not_done',
    }
  }

  const downstreamEdges = await db.dependency.listDownstreamByFromTaskId(taskId)
  const downstreamTaskIds = Array.from(
    new Set(downstreamEdges.map((edge) => edge.toTaskId))
  ).sort()

  if (downstreamTaskIds.length === 0) {
    return {
      taskId,
      tenantId,
      tasksUnblocked: 0,
      unblockedTaskIds: [],
      status: 'noop_no_downstream_tasks',
    }
  }

  const downstreamTasks = await db.task.listStatesByIds(downstreamTaskIds)
  const blockedTaskIds = downstreamTasks
    .filter((task) => task.state === 'BLOCKED')
    .map((task) => task.id)
    .sort()

  if (blockedTaskIds.length === 0) {
    return {
      taskId,
      tenantId,
      tasksUnblocked: 0,
      unblockedTaskIds: [],
      status: 'noop_no_blocked_downstream',
    }
  }

  const incomingDependencies = await db.dependency.listIncomingByToTaskIds(
    blockedTaskIds
  )
  const upstreamTaskIds = Array.from(
    new Set(incomingDependencies.map((edge) => edge.fromTaskId))
  ).sort()
  const upstreamTaskStates = await db.task.listStatesByIds(upstreamTaskIds)
  const upstreamStateByTaskId = new Map(
    upstreamTaskStates.map((task) => [task.id, task.state])
  )

  const unblockedTaskIds = blockedTaskIds.filter((downstreamTaskId) => {
    const requiredUpstreamEdges = incomingDependencies.filter(
      (edge) => edge.toTaskId === downstreamTaskId
    )
    return (
      requiredUpstreamEdges.length > 0 &&
      requiredUpstreamEdges.every(
        (edge) => upstreamStateByTaskId.get(edge.fromTaskId) === 'DONE'
      )
    )
  })

  if (unblockedTaskIds.length > 0) {
    await db.task.updateStateForIds(unblockedTaskIds, 'NOT_STARTED')
  }

  return {
    taskId,
    tenantId,
    tasksUnblocked: unblockedTaskIds.length,
    unblockedTaskIds,
    status: unblockedTaskIds.length > 0 ? 'resolved' : 'noop_dependencies_pending',
  }
}

export async function markTaskDone({ tenantId, taskId }: MarkTaskDoneInput) {
  const db = tenantDb(tenantId)

  const task = await db.task.findById(taskId)
  if (!task) {
    throw new Error('Task not found for tenant')
  }

  if (task.state === 'BLOCKED') {
    throw new Error('Cannot mark BLOCKED task as DONE')
  }

  if (task.state === 'DONE') {
    return {
      taskId,
      tenantId,
      taskMarkedDone: false,
      tasksUnblocked: 0,
      unblockedTaskIds: [],
      approvalCheckPassed: false,
      gateCheckPassed: false,
      status: 'noop_already_done',
    }
  }

  let approvalCheckPassed = false
  if (task.approvalPolicy === 'NONE') {
    approvalCheckPassed = true
  } else {
    const approvals = await db.approval.listByTaskId(taskId)
    approvalCheckPassed = approvals.some(
      (approval) => approval.decision === 'APPROVED'
    )
  }

  if (!approvalCheckPassed) {
    throw new Error('Approval required before marking task DONE')
  }

  const preconditionGates = await db.gate.listPreconditionsByTaskId(taskId)
  const gateCheckPassed = preconditionGates.every((gate) => {
    const condition = gate.condition
    return (
      !!condition &&
      typeof condition === 'object' &&
      'allow' in condition &&
      (condition as { allow?: unknown }).allow === true
    )
  })

  if (!gateCheckPassed) {
    throw new Error('Precondition gate failed before marking task DONE')
  }

  await db.task.updateStateById(taskId, 'DONE')
  const resolution = await resolveDependenciesForTask({ tenantId, taskId })

  return {
    taskId,
    tenantId,
    taskMarkedDone: true,
    tasksUnblocked: resolution.tasksUnblocked,
    unblockedTaskIds: resolution.unblockedTaskIds,
    approvalCheckPassed: true,
    gateCheckPassed: true,
    status: 'done_marked',
  }
}
