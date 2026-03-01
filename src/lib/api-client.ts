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
