import { tenantDb } from '@/lib/db'

const APPROVAL_CREATION_FORBIDDEN_ERROR =
  'Forbidden: actor not authorized to create approval'

type CreateApprovalInput = {
  tenantId: string
  taskId: string
  actorId: string
  decision: 'APPROVED' | 'REJECTED'
  comment?: string | null
}

export async function createApproval({
  tenantId,
  taskId,
  actorId,
  decision,
  comment,
}: CreateApprovalInput) {
  const db = tenantDb(tenantId)

  const task = await db.task.findOwnerRoleById(taskId)
  if (!task) {
    throw new Error('Task not found for tenant')
  }

  const actorRoleAssignments = await db.userRole.listRoleAssignmentsByUserId(
    actorId
  )
  const actorRoleIds = new Set(
    actorRoleAssignments.map((assignment) => assignment.roleId)
  )

  if (!actorRoleIds.has(task.ownerRoleId)) {
    throw new Error(APPROVAL_CREATION_FORBIDDEN_ERROR)
  }

  const approval = await db.approval.createForTask({
    taskId,
    actorId,
    decision,
    comment,
  })

  return {
    ...approval,
    status: 'created',
  }
}
