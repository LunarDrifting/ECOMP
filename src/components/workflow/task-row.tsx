import type { WorkflowProjectionTask } from '@/lib/api-client'
import { StateBadge } from '@/components/workflow/state-badge'

type TaskRowProps = {
  task: WorkflowProjectionTask
  debugMode: boolean
  customizeMode?: boolean
  customizationDirty?: boolean
  onSelect: () => void
  onComplete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onMarkNotRequired?: () => void
  completing: boolean
  customizing?: boolean
  completeDisabledReason?: string
  newlyReady?: boolean
  recentlyCompleted?: boolean
}

export function TaskRow({
  task,
  debugMode,
  customizeMode = false,
  customizationDirty = false,
  onSelect,
  onComplete,
  onMoveUp,
  onMoveDown,
  onMarkNotRequired,
  completing,
  customizing = false,
  completeDisabledReason,
  newlyReady = false,
  recentlyCompleted = false,
}: TaskRowProps) {
  return (
    <div
      className={[
        'grid grid-cols-[minmax(0,1.8fr)_auto_auto_auto_auto_auto] items-center gap-3 rounded-xl border bg-white p-3 transition hover:border-zinc-300 hover:shadow-sm',
        recentlyCompleted ? 'border-emerald-500 bg-emerald-50' : 'border-zinc-200',
        newlyReady ? 'animate-[pulse_1.5s_ease-in-out]' : '',
      ].join(' ')}
      style={{ transitionDuration: '180ms' }}
    >
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 text-left"
        title="Open details"
      >
        <div className="truncate text-sm font-semibold text-slate-900">{task.name ?? task.id}</div>
        {debugMode ? (
          <div className="truncate text-xs text-slate-700">{task.id}</div>
        ) : null}
      </button>

      <StateBadge state={task.state} />

      <div className="text-xs text-slate-700">↑ {task.upstreamTaskIds.length}</div>
      <div className="text-xs text-slate-700">↓ {task.downstreamTaskIds.length}</div>
      <div
        className="text-xs text-slate-700"
        title={
          task.blockingTaskIds.length > 0
            ? `blocked by ${task.blockingTaskIds.length} tasks`
            : 'no blockers'
        }
      >
        blockers {task.blockingTaskIds.length}
      </div>

      <div className="flex items-center justify-end gap-2">
        {task.requiresApproval ? (
          <span className="rounded bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800">
            APPROVAL
          </span>
        ) : null}
        {task.requiresPrecondition ? (
          <span className="rounded bg-zinc-200 px-2 py-1 text-[10px] font-semibold text-zinc-700">
            PRECONDITION
          </span>
        ) : null}

        <button
          type="button"
          onClick={onComplete}
          disabled={customizeMode || task.canComplete !== true || completing}
          title={task.canComplete !== true ? completeDisabledReason : 'Mark task done'}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {completing ? 'Completing…' : 'Complete'}
        </button>
        {customizeMode ? (
          <>
            <button
              type="button"
              onClick={onMoveUp}
              disabled={customizing || !onMoveUp}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs font-semibold text-zinc-700 disabled:opacity-50"
              title="Move task up"
            >
              Up
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={customizing || !onMoveDown}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs font-semibold text-zinc-700 disabled:opacity-50"
              title="Move task down"
            >
              Down
            </button>
            <button
              type="button"
              onClick={onMarkNotRequired}
              disabled={customizing || !onMarkNotRequired}
              className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-50"
              title="Hide task for this job (NOT_REQUIRED)"
            >
              Hide
            </button>
            {customizationDirty ? (
              <span className="rounded bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-800">
                Unsaved order
              </span>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
