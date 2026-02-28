import { Prisma, TaskState } from '@prisma/client'
import { tenantDb } from '@/lib/db'
import { prisma } from '@/lib/prisma'
import {
  assertTransitionAllowed,
  ILLEGAL_STATE_TRANSITION_ERROR,
} from '@/services/state-transition.service'

const INVALID_BLUEPRINT_GRAPH_ERROR =
  'Invalid blueprint: circular dependency detected'
const TASK_COMPLETION_FORBIDDEN_ERROR =
  'Forbidden: actor not authorized to complete task'
const APPROVAL_POLICY_NOT_SATISFIED_ERROR =
  'Approval policy requirements not satisfied'

function mapInstantiationReasonCode(errorMessage: string) {
  if (errorMessage === INVALID_BLUEPRINT_GRAPH_ERROR) {
    return 'BLUEPRINT_INVALID'
  }
  if (errorMessage.includes('No TemplateTaskDefinition rows found')) {
    return 'MISSING_DEFINITIONS'
  }
  if (errorMessage.includes('TemplateVersion not found')) {
    return 'TEMPLATE_VERSION_NOT_FOUND'
  }
  if (errorMessage.includes('ECO not found')) {
    return 'ECO_NOT_FOUND'
  }
  if (errorMessage.includes('already bound to different TemplateVersion')) {
    return 'ECOPLAN_VERSION_MISMATCH'
  }
  return 'INSTANTIATION_REJECTED'
}

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

type ResolveDependenciesCascadeInput = {
  tenantId: string
  taskId: string
  tx?: Prisma.TransactionClient
}

type MarkTaskDoneInput = {
  tenantId: string
  taskId: string
  actorId: string
}

function assertTasksCanTransition(
  tasks: Array<{ state: TaskState }>,
  toState: TaskState,
  context: 'instantiation' | 'resolver' | 'completion'
) {
  for (const task of tasks) {
    assertTransitionAllowed({
      fromState: task.state,
      toState,
      context,
    })
  }
}

function evaluateApprovalPolicy({
  approvalPolicy,
  ownerRoleId,
  approvals,
  actorRoles,
}: {
  approvalPolicy: 'NONE' | 'SINGLE' | 'SEQUENTIAL' | 'PARALLEL' | 'QUORUM'
  ownerRoleId: string
  approvals: Array<{ actorId: string; decision: 'APPROVED' | 'REJECTED' }>
  actorRoles: Array<{ userId: string; roleId: string }>
}) {
  if (approvalPolicy === 'NONE') {
    return true
  }

  const approvedApprovals = approvals.filter(
    (approval) => approval.decision === 'APPROVED'
  )

  if (approvalPolicy === 'SINGLE') {
    return approvedApprovals.length > 0
  }

  if (approvalPolicy === 'SEQUENTIAL') {
    const hasRejected = approvals.some((approval) => approval.decision === 'REJECTED')
    return !hasRejected && approvedApprovals.length > 0
  }

  if (approvalPolicy === 'PARALLEL') {
    const roleIdsByActorId = new Map<string, Set<string>>()
    for (const assignment of actorRoles) {
      const roleIds = roleIdsByActorId.get(assignment.userId) ?? new Set<string>()
      roleIds.add(assignment.roleId)
      roleIdsByActorId.set(assignment.userId, roleIds)
    }

    return approvedApprovals.some((approval) =>
      roleIdsByActorId.get(approval.actorId)?.has(ownerRoleId)
    )
  }

  if (approvalPolicy === 'QUORUM') {
    const distinctApprovedActors = new Set(
      approvedApprovals.map((approval) => approval.actorId)
    )
    return distinctApprovedActors.size >= 2
  }

  return false
}

export async function instantiateTemplateForEco({
  tenantId,
  ecoId,
  templateVersionId,
  actorId,
}: InstantiateTemplateForEcoInput) {
  const db = tenantDb(tenantId)
  await db.audit.emitAuditEvent({
    ecoId,
    actorId,
    eventType: 'INSTANTIATE_ATTEMPT',
    payload: {
      ecoId,
      templateVersionId,
    },
  })

  try {
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
      const noopResult = {
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

      await db.audit.emitAuditEvent({
        ecoId,
        actorId,
        eventType: 'INSTANTIATE_SUCCESS',
        payload: {
          ecoId,
          templateVersionId,
          status: noopResult.status,
          tasksCreated: 0,
          dependenciesCreated: 0,
          blockedTasks: 0,
          readyTasks: 0,
        },
      })

      return noopResult
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

    const blockedTaskIds = createdTaskIds.filter((taskId) =>
      incomingDependencyTaskIds.has(taskId)
    )
    const readyTaskIds = createdTaskIds.filter(
      (taskId) => !incomingDependencyTaskIds.has(taskId)
    )

    const createdTasks = await db.task.listStatesByIds(createdTaskIds)
    const blockedTasks = createdTasks.filter((task) =>
      blockedTaskIds.includes(task.id)
    )
    const readyTasks = createdTasks.filter((task) => readyTaskIds.includes(task.id))

    if (blockedTaskIds.length > 0) {
      assertTasksCanTransition(blockedTasks, 'BLOCKED', 'instantiation')
      await db.task.setBlockedForInstantiation(blockedTaskIds)
    }

    // Ready tasks are already initialized as NOT_STARTED at creation time.
    if (readyTasks.some((task) => task.state !== 'NOT_STARTED')) {
      throw new Error(ILLEGAL_STATE_TRANSITION_ERROR)
    }

    const createdResult = {
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

    await db.audit.emitAuditEvent({
      ecoId,
      actorId,
      eventType: 'INSTANTIATE_SUCCESS',
      payload: {
        ecoId,
        templateVersionId,
        status: createdResult.status,
        tasksCreated: createdResult.tasksCreated,
        dependenciesCreated: createdResult.dependenciesCreated,
        blockedTasks: createdResult.blockedTasks,
        readyTasks: createdResult.readyTasks,
      },
    })

    return createdResult
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await db.audit.emitAuditEvent({
      ecoId,
      actorId,
      eventType: 'INSTANTIATE_REJECTED',
      payload: {
        ecoId,
        templateVersionId,
        reasonCode: mapInstantiationReasonCode(message),
      },
    })
    throw error
  }
}

export async function resolveDependenciesCascade({
  tenantId,
  taskId,
  tx,
}: ResolveDependenciesCascadeInput) {
  const db = tenantDb(tenantId, tx ?? prisma)

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
      status: 'noop_no_eligible',
    }
  }

  const queue: string[] = [taskId]
  const visited = new Set<string>()
  const unblockedTaskIds = new Set<string>()
  let sawDownstream = false

  // Batch strategy: traverse frontier-by-frontier and fetch graph/state/policy data
  // in grouped queries to avoid per-task N+1 patterns.
  while (queue.length > 0) {
    const frontier = Array.from(new Set(queue.splice(0))).sort()
    const unresolvedFrontier = frontier.filter((id) => !visited.has(id))

    if (unresolvedFrontier.length === 0) {
      continue
    }

    for (const id of unresolvedFrontier) {
      visited.add(id)
    }

    const downstreamEdges =
      await db.dependency.listDownstreamByFromTaskIds(unresolvedFrontier)
    if (downstreamEdges.length === 0) {
      continue
    }
    sawDownstream = true

    const candidateTaskIds = Array.from(
      new Set(downstreamEdges.map((edge) => edge.toTaskId))
    ).sort()
    const candidateTasks = await db.task.listResolutionFieldsByIds(candidateTaskIds)

    const doneTaskIds = candidateTasks
      .filter((task) => task.state === 'DONE')
      .map((task) => task.id)
      .sort()
    queue.push(...doneTaskIds)

    const blockedCandidates = candidateTasks
      .filter((task) => task.state === 'BLOCKED')
      .sort((a, b) => a.id.localeCompare(b.id))
    if (blockedCandidates.length === 0) {
      continue
    }

    const blockedCandidateIds = blockedCandidates.map((task) => task.id)
    const incomingDependencies = await db.dependency.listIncomingByToTaskIds(
      blockedCandidateIds
    )
    if (incomingDependencies.length === 0) {
      continue
    }

    const upstreamTaskIds = Array.from(
      new Set(incomingDependencies.map((edge) => edge.fromTaskId))
    ).sort()
    const upstreamTaskStates = await db.task.listStatesByIds(upstreamTaskIds)
    const upstreamStateByTaskId = new Map(
      upstreamTaskStates.map((task) => [task.id, task.state])
    )

    const dependencySatisfiedTaskIds = blockedCandidateIds.filter((candidateTaskId) => {
      const requiredEdges = incomingDependencies.filter(
        (edge) => edge.toTaskId === candidateTaskId
      )

      return (
        requiredEdges.length > 0 &&
        requiredEdges.every(
          (edge) => upstreamStateByTaskId.get(edge.fromTaskId) === 'DONE'
        )
      )
    })

    if (dependencySatisfiedTaskIds.length === 0) {
      continue
    }

    const dependencySatisfiedSet = new Set(dependencySatisfiedTaskIds)
    const dependencySatisfiedTasks = blockedCandidates.filter((task) =>
      dependencySatisfiedSet.has(task.id)
    )

    const approvals = await db.approval.listByTaskIdsForPolicy(
      dependencySatisfiedTaskIds
    )
    const approvalActorIds = Array.from(
      new Set(approvals.map((approval) => approval.actorId))
    ).sort()
    const approvalActorRoles =
      approvalActorIds.length > 0
        ? await db.userRole.listRoleAssignmentsByUserIds(approvalActorIds)
        : []

    const approvalsByTaskId = new Map<
      string,
      Array<{ actorId: string; decision: 'APPROVED' | 'REJECTED' }>
    >()
    for (const approval of approvals) {
      const taskApprovals = approvalsByTaskId.get(approval.taskId) ?? []
      taskApprovals.push({
        actorId: approval.actorId,
        decision: approval.decision,
      })
      approvalsByTaskId.set(approval.taskId, taskApprovals)
    }

    const preconditionGates = await db.gate.listPreconditionsByTaskIds(
      dependencySatisfiedTaskIds
    )
    const gatesByTaskId = new Map<string, Array<{ condition: unknown }>>()
    for (const gate of preconditionGates) {
      const taskGates = gatesByTaskId.get(gate.taskId) ?? []
      taskGates.push({ condition: gate.condition })
      gatesByTaskId.set(gate.taskId, taskGates)
    }

    const eligibleTasks = dependencySatisfiedTasks.filter((task) => {
      const approvalCheckPassed = evaluateApprovalPolicy({
        approvalPolicy: task.approvalPolicy,
        ownerRoleId: task.ownerRoleId,
        approvals: approvalsByTaskId.get(task.id) ?? [],
        actorRoles: approvalActorRoles,
      })

      if (!approvalCheckPassed) {
        return false
      }

      const taskGates = gatesByTaskId.get(task.id) ?? []
      return taskGates.every((gate) => {
        const condition = gate.condition
        return (
          !!condition &&
          typeof condition === 'object' &&
          'allow' in condition &&
          (condition as { allow?: unknown }).allow === true
        )
      })
    })

    if (eligibleTasks.length === 0) {
      continue
    }

    assertTasksCanTransition(eligibleTasks, 'NOT_STARTED', 'resolver')

    const idsToUnblock = eligibleTasks
      .map((task) => task.id)
      .sort((a, b) => a.localeCompare(b))
    await db.task.setNotStartedByIdsForUnblocking(idsToUnblock)

    for (const id of idsToUnblock) {
      unblockedTaskIds.add(id)
    }

    queue.push(...idsToUnblock)
  }

  const orderedUnblockedTaskIds = Array.from(unblockedTaskIds).sort()
  const status = !sawDownstream
    ? 'noop_no_downstream'
    : orderedUnblockedTaskIds.length > 0
      ? 'resolved'
      : 'noop_no_eligible'

  return {
    taskId,
    tenantId,
    tasksUnblocked: orderedUnblockedTaskIds.length,
    unblockedTaskIds: orderedUnblockedTaskIds,
    status,
  }
}

export async function markTaskDone({
  tenantId,
  taskId,
  actorId,
}: MarkTaskDoneInput) {
  const db = tenantDb(tenantId)
  await db.audit.emitAuditEvent({
    taskId,
    actorId,
    eventType: 'TASK_COMPLETE_ATTEMPT',
    payload: {
      taskId,
      actorId,
    },
  })

  const task = await db.task.findById(taskId)
  if (!task) {
    await db.audit.emitAuditEvent({
      taskId,
      actorId,
      eventType: 'TASK_COMPLETE_REJECTED',
      payload: {
        taskId,
        actorId,
        reasonCode: 'TASK_NOT_FOUND',
      },
    })
    throw new Error('Task not found for tenant')
  }

  if (task.state === 'BLOCKED') {
    await db.audit.emitAuditEvent({
      taskId,
      actorId,
      eventType: 'TASK_COMPLETE_REJECTED',
      payload: {
        taskId,
        actorId,
        reasonCode: 'TASK_BLOCKED',
      },
    })
    throw new Error('Cannot mark BLOCKED task as DONE')
  }

  if (task.state === 'DONE') {
    await db.audit.emitAuditEvent({
      taskId,
      actorId,
      eventType: 'TASK_COMPLETE_NOOP',
      payload: {
        taskId,
        actorId,
        status: 'noop_already_done',
        tasksUnblocked: 0,
      },
    })
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

  assertTransitionAllowed({
    fromState: task.state,
    toState: 'DONE',
    context: 'completion',
  })

  const actorRoleAssignments = await db.userRole.listRoleAssignmentsByUserId(
    actorId
  )
  const actorRoleIds = new Set(
    actorRoleAssignments.map((assignment) => assignment.roleId)
  )
  const hasAdminRole = actorRoleAssignments.some(
    (assignment) => assignment.role.name === 'ADMIN'
  )
  const ownsTaskRole = actorRoleIds.has(task.ownerRoleId)

  if (!hasAdminRole && !ownsTaskRole) {
    await db.audit.emitAuditEvent({
      taskId,
      actorId,
      eventType: 'TASK_COMPLETE_REJECTED',
      payload: {
        taskId,
        actorId,
        reasonCode: 'ACTOR_FORBIDDEN',
      },
    })
    throw new Error(TASK_COMPLETION_FORBIDDEN_ERROR)
  }

  const approvals = await db.approval.listByTaskId(taskId)
  const approvalActorIds = Array.from(
    new Set(approvals.map((approval) => approval.actorId))
  ).sort()
  const approvalActorRoles =
    approvalActorIds.length > 0
      ? await db.userRole.listRoleAssignmentsByUserIds(approvalActorIds)
      : []

  const approvalCheckPassed = evaluateApprovalPolicy({
    approvalPolicy: task.approvalPolicy,
    ownerRoleId: task.ownerRoleId,
    approvals,
    actorRoles: approvalActorRoles,
  })

  if (!approvalCheckPassed) {
    await db.audit.emitAuditEvent({
      taskId,
      actorId,
      eventType: 'TASK_COMPLETE_REJECTED',
      payload: {
        taskId,
        actorId,
        reasonCode: 'APPROVAL_POLICY_UNSATISFIED',
      },
    })
    throw new Error(APPROVAL_POLICY_NOT_SATISFIED_ERROR)
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
    await db.audit.emitAuditEvent({
      taskId,
      actorId,
      eventType: 'GATE_PRECONDITION_FAILED',
      payload: {
        taskId,
        reasonCode: 'PRECONDITION_NOT_MET',
        gateCount: preconditionGates.length,
      },
    })
    await db.audit.emitAuditEvent({
      taskId,
      actorId,
      eventType: 'TASK_COMPLETE_REJECTED',
      payload: {
        taskId,
        actorId,
        reasonCode: 'GATE_PRECONDITION_FAILED',
      },
    })
    throw new Error('Precondition gate failed before marking task DONE')
  }

  const resolution = await prisma.$transaction(async (tx) => {
    const txDb = tenantDb(tenantId, tx)
    const doneUpdateResult = await txDb.task.markDoneByIdIfNotStartedForCompletion(
      taskId
    )

    // If another transaction already marked this task DONE, return deterministic no-op.
    if (doneUpdateResult.count === 0) {
      const currentTask = await txDb.task.findById(taskId)
      if (currentTask?.state === 'DONE') {
        await txDb.audit.emitAuditEvent({
          taskId,
          actorId,
          eventType: 'TASK_COMPLETE_NOOP',
          payload: {
            taskId,
            actorId,
            status: 'noop_already_done',
            tasksUnblocked: 0,
          },
        })
        return {
          taskMarkedDone: false as const,
          tasksUnblocked: 0,
          unblockedTaskIds: [] as string[],
          status: 'noop_already_done' as const,
        }
      }

      throw new Error(ILLEGAL_STATE_TRANSITION_ERROR)
    }

    const cascade = await resolveDependenciesCascade({ tenantId, taskId, tx })
    await txDb.audit.emitAuditEvent({
      taskId,
      actorId,
      eventType: 'CASCADE_RESOLVE',
      payload: {
        startingTaskId: taskId,
        status: cascade.status,
        tasksUnblocked: cascade.tasksUnblocked,
        unblockedTaskIds: cascade.unblockedTaskIds,
      },
    })
    await txDb.audit.emitAuditEvent({
      taskId,
      actorId,
      eventType: 'TASK_COMPLETE_SUCCESS',
      payload: {
        taskId,
        actorId,
        status: 'done_marked',
        tasksUnblocked: cascade.tasksUnblocked,
      },
    })
    return {
      taskMarkedDone: true as const,
      tasksUnblocked: cascade.tasksUnblocked,
      unblockedTaskIds: cascade.unblockedTaskIds,
      status: 'done_marked' as const,
    }
  })

  return {
    taskId,
    tenantId,
    taskMarkedDone: resolution.taskMarkedDone,
    tasksUnblocked: resolution.tasksUnblocked,
    unblockedTaskIds: resolution.unblockedTaskIds,
    approvalCheckPassed: true,
    gateCheckPassed: true,
    status: resolution.status,
  }
}

export async function resolveDependenciesForTask(
  input: ResolveDependenciesCascadeInput
) {
  return resolveDependenciesCascade(input)
}
