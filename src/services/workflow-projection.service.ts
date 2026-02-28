import { tenantDb } from '@/lib/db'

type GetWorkflowProjectionInput = {
  tenantId: string
  ecoId: string
}

export async function getWorkflowProjection({
  tenantId,
  ecoId,
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
  const approvals = taskIds.length > 0 ? await db.approval.listByTaskIds(taskIds) : []
  const gates = taskIds.length > 0 ? await db.gate.listByTaskIds(taskIds) : []

  const gatesByTaskId = new Map<string, { hasGate: boolean; hasPrecondition: boolean }>()
  for (const gate of gates) {
    const existing = gatesByTaskId.get(gate.taskId) ?? {
      hasGate: false,
      hasPrecondition: false,
    }
    existing.hasGate = true
    if (gate.type === 'PRECONDITION') {
      existing.hasPrecondition = true
    }
    gatesByTaskId.set(gate.taskId, existing)
  }

  const projectionTasks = tasks.map((task) => {
    const gatePresence = gatesByTaskId.get(task.id) ?? {
      hasGate: false,
      hasPrecondition: false,
    }

    return {
      id: task.id,
      state: task.state,
      approvalPolicy: task.approvalPolicy,
      hasGate: gatePresence.hasGate,
      isBlocked: task.state === 'BLOCKED',
      requiresApproval: task.approvalPolicy !== 'NONE',
      requiresPrecondition: gatePresence.hasPrecondition,
    }
  })

  return {
    tenantId,
    ecoId,
    tasks: projectionTasks,
    dependencies: dependencies.map((dependency) => ({
      fromTaskId: dependency.fromTaskId,
      toTaskId: dependency.toTaskId,
    })),
    approvals: approvals.map((approval) => ({
      taskId: approval.taskId,
      decision: approval.decision,
    })),
    gates: gates.map((gate) => ({
      taskId: gate.taskId,
      type: gate.type,
    })),
  }
}
