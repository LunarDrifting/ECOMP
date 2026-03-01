import { tenantDb } from '@/lib/db'
import {
  assertTransitionAllowed,
  ILLEGAL_STATE_TRANSITION_ERROR,
} from '@/services/state-transition.service'

export async function markTaskNotRequired({
  tenantId,
  taskId,
  actorId,
}: {
  tenantId: string
  taskId: string
  actorId?: string
}) {
  const db = tenantDb(tenantId)
  const task = await db.task.findById(taskId)

  if (!task) {
    throw new Error('Task not found for tenant')
  }

  if (task.state === 'NOT_REQUIRED') {
    return {
      tenantId,
      taskId,
      state: 'NOT_REQUIRED' as const,
      status: 'noop_already_not_required' as const,
    }
  }

  assertTransitionAllowed({
    fromState: task.state,
    toState: 'NOT_REQUIRED',
    context: 'customization',
  })

  const update = await db.task.markNotRequiredByIdForCustomization(taskId)
  if (update.count === 0) {
    throw new Error(ILLEGAL_STATE_TRANSITION_ERROR)
  }

  await db.audit.emitAuditEvent({
    taskId,
    actorId,
    eventType: 'TASK_MARKED_NOT_REQUIRED',
    payload: {
      taskId,
      state: 'NOT_REQUIRED',
      status: 'updated',
    },
  })

  return {
    tenantId,
    taskId,
    state: 'NOT_REQUIRED' as const,
    status: 'updated' as const,
  }
}
