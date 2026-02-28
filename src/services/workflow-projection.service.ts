import { tenantDb } from '@/lib/db'

type GetWorkflowProjectionInput = {
  tenantId: string
  ecoId: string
  actorId?: string | null
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

function evaluatePreconditionGates(
  gates: Array<{ type: string; condition?: unknown }>
) {
  const preconditions = gates.filter((gate) => gate.type === 'PRECONDITION')
  return preconditions.every((gate) => {
    const condition = gate.condition
    return (
      !!condition &&
      typeof condition === 'object' &&
      'allow' in condition &&
      (condition as { allow?: unknown }).allow === true
    )
  })
}

export async function getWorkflowProjection({
  tenantId,
  ecoId,
  actorId = null,
}: GetWorkflowProjectionInput) {
  const db = tenantDb(tenantId)

  const eco = await db.eco.findById(ecoId)
  if (!eco) {
    throw new Error('ECO not found for tenant')
  }

  const tasks = await db.task.listProjectionByEcoId(ecoId)
  const taskIds = tasks.map((task) => task.id)

  const dependencies =
    taskIds.length > 0 ? await db.dependency.listByTaskIds(taskIds) : []
  const approvals =
    taskIds.length > 0 ? await db.approval.listByTaskIdsForPolicy(taskIds) : []
  const gates =
    taskIds.length > 0 ? await db.gate.listByTaskIdsWithCondition(taskIds) : []

  const actorRoleAssignments =
    actorId !== null ? await db.userRole.listRoleAssignmentsByUserId(actorId) : []
  const actorRoleIds = new Set(
    actorRoleAssignments.map((assignment) => assignment.roleId)
  )
  const actorHasAdminRole = actorRoleAssignments.some(
    (assignment) => assignment.role.name === 'ADMIN'
  )

  const fallbackSortedTaskIds = tasks
    .slice()
    .sort((a, b) => {
      if (a.createdAt.getTime() !== b.createdAt.getTime()) {
        return a.createdAt.getTime() - b.createdAt.getTime()
      }
      return a.id.localeCompare(b.id)
    })
    .map((task) => task.id)
  const taskById = new Map(tasks.map((task) => [task.id, task]))
  const compareTaskIdsForReadyQueue = (a: string, b: string) => {
    const aTask = taskById.get(a)
    const bTask = taskById.get(b)

    if (aTask?.createdAt && bTask?.createdAt) {
      const createdAtDiff = aTask.createdAt.getTime() - bTask.createdAt.getTime()
      if (createdAtDiff !== 0) {
        return createdAtDiff
      }
    }

    return a.localeCompare(b)
  }

  const stateByTaskId = new Map(tasks.map((task) => [task.id, task.state]))

  const upstreamSetByTaskId = new Map<string, Set<string>>()
  const downstreamSetByTaskId = new Map<string, Set<string>>()
  for (const taskId of taskIds) {
    upstreamSetByTaskId.set(taskId, new Set<string>())
    downstreamSetByTaskId.set(taskId, new Set<string>())
  }
  for (const dependency of dependencies) {
    upstreamSetByTaskId.get(dependency.toTaskId)?.add(dependency.fromTaskId)
    downstreamSetByTaskId.get(dependency.fromTaskId)?.add(dependency.toTaskId)
  }

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

  const gatesByTaskId = new Map<
    string,
    Array<{ type: string; condition?: unknown }>
  >()
  for (const gate of gates) {
    const taskGates = gatesByTaskId.get(gate.taskId) ?? []
    taskGates.push({ type: gate.type, condition: gate.condition })
    gatesByTaskId.set(gate.taskId, taskGates)
  }

  const indegreeByTaskId = new Map<string, number>()
  const adjacencyByTaskId = new Map<string, Set<string>>()
  for (const taskId of taskIds) {
    indegreeByTaskId.set(taskId, 0)
    adjacencyByTaskId.set(taskId, new Set<string>())
  }
  for (const dependency of dependencies) {
    const adjacency = adjacencyByTaskId.get(dependency.fromTaskId)
    if (!adjacency || adjacency.has(dependency.toTaskId)) {
      continue
    }
    adjacency.add(dependency.toTaskId)
    indegreeByTaskId.set(
      dependency.toTaskId,
      (indegreeByTaskId.get(dependency.toTaskId) ?? 0) + 1
    )
  }

  const topoQueue = taskIds
    .filter((taskId) => (indegreeByTaskId.get(taskId) ?? 0) === 0)
    .sort(compareTaskIdsForReadyQueue)
  const tasksTopologicalOrder: string[] = []

  while (topoQueue.length > 0) {
    const taskId = topoQueue.shift()!
    tasksTopologicalOrder.push(taskId)

    const downstream = adjacencyByTaskId.get(taskId) ?? new Set<string>()
    const newlyReadyTaskIds: string[] = []
    for (const downstreamTaskId of downstream) {
      indegreeByTaskId.set(
        downstreamTaskId,
        (indegreeByTaskId.get(downstreamTaskId) ?? 1) - 1
      )
      if ((indegreeByTaskId.get(downstreamTaskId) ?? 0) === 0) {
        newlyReadyTaskIds.push(downstreamTaskId)
      }
    }

    newlyReadyTaskIds.sort(compareTaskIdsForReadyQueue)
    topoQueue.push(...newlyReadyTaskIds)
  }

  const deterministicTopologicalOrder =
    tasksTopologicalOrder.length === taskIds.length
      ? tasksTopologicalOrder
      : fallbackSortedTaskIds

  let readyTasks = 0

  const projectionTasks = tasks.map((task) => {
    const upstreamTaskIds = Array.from(upstreamSetByTaskId.get(task.id) ?? []).sort()
    const downstreamTaskIds = Array.from(
      downstreamSetByTaskId.get(task.id) ?? []
    ).sort()
    const blockingTaskIds = upstreamTaskIds
      .filter((upstreamTaskId) => stateByTaskId.get(upstreamTaskId) !== 'DONE')
      .sort()

    const taskGates = gatesByTaskId.get(task.id) ?? []
    const hasGate = taskGates.length > 0
    const requiresPrecondition = taskGates.some(
      (gate) => gate.type === 'PRECONDITION'
    )

    const isReady = task.state === 'NOT_STARTED' && blockingTaskIds.length === 0
    if (isReady) {
      readyTasks += 1
    }

    let canComplete: boolean | null = null
    if (actorId !== null) {
      const hasRequiredRole =
        actorHasAdminRole || actorRoleIds.has(task.ownerRoleId)
      const approvalCheckPassed = evaluateApprovalPolicy({
        approvalPolicy: task.approvalPolicy,
        ownerRoleId: task.ownerRoleId,
        approvals: approvalsByTaskId.get(task.id) ?? [],
        actorRoles: actorRoleAssignments.map((assignment) => ({
          userId: actorId,
          roleId: assignment.roleId,
        })),
      })
      const gateCheckPassed = evaluatePreconditionGates(taskGates)

      canComplete =
        task.state === 'NOT_STARTED' &&
        hasRequiredRole &&
        approvalCheckPassed &&
        gateCheckPassed
    }

    return {
      id: task.id,
      state: task.state,
      ownerRoleId: task.ownerRoleId,
      approvalPolicy: task.approvalPolicy,
      hasGate,
      isBlocked: task.state === 'BLOCKED',
      requiresApproval: task.approvalPolicy !== 'NONE',
      requiresPrecondition,
      upstreamTaskIds,
      downstreamTaskIds,
      blockingTaskIds,
      isReady,
      canComplete,
    }
  })

  return {
    tenantId,
    ecoId,
    actorId,
    tasks: projectionTasks,
    tasksTopologicalOrder: deterministicTopologicalOrder,
    counts: {
      totalTasks: tasks.length,
      doneTasks: tasks.filter((task) => task.state === 'DONE').length,
      blockedTasks: tasks.filter((task) => task.state === 'BLOCKED').length,
      readyTasks,
    },
    dependencies: dependencies.map((dependency) => ({
      fromTaskId: dependency.fromTaskId,
      toTaskId: dependency.toTaskId,
    })),
    approvals: approvals.map((approval) => ({
      taskId: approval.taskId,
      actorId: approval.actorId,
      decision: approval.decision,
    })),
    gates: gates.map((gate) => ({
      taskId: gate.taskId,
      type: gate.type,
    })),
  }
}
