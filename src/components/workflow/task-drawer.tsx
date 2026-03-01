import type { WorkflowProjectionResponse, WorkflowProjectionTask } from '@/lib/api-client'
import { StateBadge } from '@/components/workflow/state-badge'

type TaskDrawerProps = {
  task: WorkflowProjectionTask | null
  projection: WorkflowProjectionResponse | null
  actorId: string
  approvingDecision: 'APPROVED' | 'REJECTED' | null
  completeDisabledReason?: string
  onApprove: (taskId: string, decision: 'APPROVED' | 'REJECTED', comment?: string) => Promise<void>
  onCopyBlockers: (ids: string[]) => Promise<void>
  onClose: () => void
}

export function TaskDrawer({
  task,
  projection,
  actorId,
  approvingDecision,
  completeDisabledReason,
  onApprove,
  onCopyBlockers,
  onClose,
}: TaskDrawerProps) {
  if (!task || !projection) {
    return (
      <aside className="rounded-2xl border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-500">Select a task to view details.</p>
      </aside>
    )
  }

  const approvals = projection.approvals.filter((item) => item.taskId === task.id)
  const gates = projection.gates.filter((item) => item.taskId === task.id)
  const actorPresent = actorId.length > 0

  return (
    <aside
      className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
      style={{ transitionDuration: '180ms' }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-zinc-900">{task.name ?? task.id}</h3>
          <p className="truncate text-xs text-zinc-500">{task.id}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-600"
        >
          Close
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <StateBadge state={task.state} />
        <span className="text-xs text-zinc-600">canComplete: {String(task.canComplete)}</span>
      </div>
      {task.canComplete === false && actorPresent ? (
        <p className="mb-3 rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
          Why not completable: {completeDisabledReason ?? 'Not eligible'}
        </p>
      ) : null}

      <div className="space-y-3 text-xs text-zinc-700">
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-zinc-900">Blocking Task IDs</p>
            <button
              type="button"
              onClick={() => onCopyBlockers(task.blockingTaskIds)}
              disabled={task.blockingTaskIds.length === 0}
              className="rounded border border-zinc-200 px-2 py-1 text-[11px] font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
              title={
                task.blockingTaskIds.length === 0
                  ? 'No blockers to copy'
                  : 'Copy blocker IDs'
              }
            >
              Copy IDs
            </button>
          </div>
          {task.blockingTaskIds.length > 0 ? (
            <ul className="mt-1 space-y-1">
              {task.blockingTaskIds.map((id) => (
                <li key={id} className="truncate rounded bg-zinc-100 px-2 py-1">
                  {id}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-zinc-500">None</p>
          )}
        </div>

        <div>
          <p className="font-semibold text-zinc-900">Approvals</p>
          <p className="mt-1 text-zinc-600">Total: {approvals.length}</p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void onApprove(task.id, 'APPROVED')}
              disabled={!actorPresent || approvingDecision !== null}
              className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
              title={!actorPresent ? 'Select actor to approve' : 'Create APPROVED decision'}
            >
              {approvingDecision === 'APPROVED' ? 'Approving…' : 'Approve'}
            </button>
            <button
              type="button"
              onClick={() => void onApprove(task.id, 'REJECTED')}
              disabled={!actorPresent || approvingDecision !== null}
              className="rounded bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
              title={!actorPresent ? 'Select actor to reject' : 'Create REJECTED decision'}
            >
              {approvingDecision === 'REJECTED' ? 'Rejecting…' : 'Reject'}
            </button>
          </div>
        </div>

        <div>
          <p className="font-semibold text-zinc-900">Gates</p>
          <p className="mt-1 text-zinc-600">Total: {gates.length}</p>
        </div>
      </div>
    </aside>
  )
}
