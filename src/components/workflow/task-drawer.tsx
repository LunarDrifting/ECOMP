import type { WorkflowProjectionResponse, WorkflowProjectionTask } from '@/lib/api-client'
import { StateBadge } from '@/components/workflow/state-badge'

type TaskDrawerProps = {
  task: WorkflowProjectionTask | null
  projection: WorkflowProjectionResponse | null
  onClose: () => void
}

export function TaskDrawer({ task, projection, onClose }: TaskDrawerProps) {
  if (!task || !projection) {
    return (
      <aside className="rounded-2xl border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-500">Select a task to view details.</p>
      </aside>
    )
  }

  const approvals = projection.approvals.filter((item) => item.taskId === task.id)
  const gates = projection.gates.filter((item) => item.taskId === task.id)

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

      <div className="space-y-3 text-xs text-zinc-700">
        <div>
          <p className="font-semibold text-zinc-900">Blocking Task IDs</p>
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
        </div>

        <div>
          <p className="font-semibold text-zinc-900">Gates</p>
          <p className="mt-1 text-zinc-600">Total: {gates.length}</p>
        </div>
      </div>
    </aside>
  )
}
