import type { AuditTimelineResponse } from '@/lib/api-client'

type AuditTimelineProps = {
  timeline: AuditTimelineResponse | null
  loading: boolean
  debugMode: boolean
}

function renderPayloadSummary(payload: Record<string, string | number | boolean | null | string[]>) {
  const pairs = Object.entries(payload).slice(0, 3)
  if (pairs.length === 0) {
    return 'no payload'
  }

  return pairs
    .map(([key, value]) =>
      `${key}=${
        Array.isArray(value) ? `[${value.slice(0, 2).join(',')}]` : String(value)
      }`
    )
    .join(' · ')
}

function friendlyAuditMessage(eventType: string) {
  const labels: Record<string, string> = {
    INSTANTIATE_ATTEMPT: 'Workflow instantiation started',
    INSTANTIATE_SUCCESS: 'Workflow instantiated',
    INSTANTIATE_REJECTED: 'Workflow instantiation failed',
    TASK_COMPLETE_ATTEMPT: 'Task completion started',
    TASK_COMPLETE_SUCCESS: 'Task completed',
    TASK_COMPLETE_REJECTED: 'Task completion blocked',
    TASK_COMPLETE_NOOP: 'Task already completed',
    CASCADE_RESOLVE: 'Dependencies resolved',
    APPROVAL_CREATE_ATTEMPT: 'Approval submission started',
    APPROVAL_CREATE_SUCCESS: 'Approval recorded',
    APPROVAL_CREATE_REJECTED: 'Approval submission rejected',
    GATE_PRECONDITION_FAILED: 'Precondition gate blocked completion',
  }

  return labels[eventType] ?? 'Workflow event recorded'
}

export function AuditTimeline({ timeline, loading, debugMode }: AuditTimelineProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-zinc-900">Audit Timeline</h3>
      {loading ? <p className="text-xs text-zinc-500">Loading audit events…</p> : null}
      {!loading && (!timeline || timeline.events.length === 0) ? (
        <p className="text-xs text-zinc-500">No audit events yet.</p>
      ) : null}

      <ul className="space-y-2">
        {timeline?.events.slice(0, 20).map((event) => (
          <li key={event.id} className="rounded border border-zinc-200 bg-zinc-50 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-zinc-800">
                {debugMode ? event.eventType : friendlyAuditMessage(event.eventType)}
              </span>
              <span className="text-[10px] text-zinc-500">
                {new Date(event.createdAt).toLocaleString()}
              </span>
            </div>
            {debugMode ? (
              <>
                <p className="mt-1 truncate text-[11px] text-zinc-600">
                  id={event.id}
                </p>
                <p className="mt-1 truncate text-[11px] text-zinc-600">
                  {renderPayloadSummary(event.payload)}
                </p>
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
