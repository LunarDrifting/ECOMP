import { tenantDb } from '@/lib/db'

type GetEcoAuditTimelineInput = {
  tenantId: string
  ecoId: string
  limit?: number
}

type SafeAuditPayload = {
  [key: string]: string | number | boolean | null | string[]
}

function toSafeAuditPayload(payload: unknown): SafeAuditPayload {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {}
  }

  const raw = payload as Record<string, unknown>
  const safe: SafeAuditPayload = {}

  for (const [key, value] of Object.entries(raw)) {
    if (!/(id|ids|count|status|reason|decision|type)$/i.test(key)) {
      continue
    }

    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      safe[key] = value
      continue
    }

    if (
      Array.isArray(value) &&
      value.every((item) => typeof item === 'string')
    ) {
      safe[key] = value
    }
  }

  return safe
}

export async function getEcoAuditTimeline({
  tenantId,
  ecoId,
  limit = 50,
}: GetEcoAuditTimelineInput) {
  const db = tenantDb(tenantId)

  const eco = await db.eco.findById(ecoId)
  if (!eco) {
    throw new Error('ECO not found for tenant')
  }

  const events = await db.audit.listByEcoId(ecoId, limit)

  return {
    tenantId,
    ecoId,
    events: events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      createdAt: event.createdAt,
      payload: toSafeAuditPayload(event.payload),
    })),
  }
}
