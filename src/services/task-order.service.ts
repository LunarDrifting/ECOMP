import { tenantDb } from '@/lib/db'

type SetEcoTaskOrderInput = {
  tenantId: string
  ecoId: string
  actorId?: string
  orderedTaskIds: string[]
}

export async function setEcoTaskOrderPreference({
  tenantId,
  ecoId,
  actorId,
  orderedTaskIds,
}: SetEcoTaskOrderInput) {
  const db = tenantDb(tenantId)

  const eco = await db.eco.findById(ecoId)
  if (!eco) {
    throw new Error('ECO not found for tenant')
  }

  const distinctOrderedTaskIds = Array.from(new Set(orderedTaskIds))
  const ecoTaskIds = new Set((await db.task.listByEcoId(ecoId)).map((task) => task.id))
  const hasOutOfScopeTaskId = distinctOrderedTaskIds.some((taskId) => !ecoTaskIds.has(taskId))
  if (hasOutOfScopeTaskId) {
    throw new Error('orderedTaskIds must belong to eco')
  }

  await db.audit.emitAuditEvent({
    ecoId,
    actorId,
    eventType: 'TASK_ORDER_SET',
    payload: {
      orderedTaskIds: distinctOrderedTaskIds,
      status: 'saved',
    },
  })

  return {
    tenantId,
    ecoId,
    orderedTaskIds: distinctOrderedTaskIds,
    status: 'saved',
  }
}
