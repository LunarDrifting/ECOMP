import type { WorkflowProjectionTask } from '@/lib/api-client'
import { StateBadge } from '@/components/workflow/state-badge'

type NodeCardProps = {
  task: WorkflowProjectionTask
  isSelected: boolean
  isHighlighted: boolean
  isDimmed: boolean
  isNewlyReady: boolean
  isCompleted: boolean
  isCompleting: boolean
  onHoverStart: () => void
  onHoverEnd: () => void
  onSelect: () => void
  onComplete: () => void
}

export function NodeCard({
  task,
  isSelected,
  isHighlighted,
  isDimmed,
  isNewlyReady,
  isCompleted,
  isCompleting,
  onHoverStart,
  onHoverEnd,
  onSelect,
  onComplete,
}: NodeCardProps) {
  const isBlocked = task.state === 'BLOCKED'
  const isReady = task.state === 'NOT_STARTED' && task.isReady

  return (
    <button
      type="button"
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onClick={onSelect}
      title={[
        `upstream: ${task.upstreamTaskIds.length}`,
        `downstream: ${task.downstreamTaskIds.length}`,
        `blockers: ${task.blockingTaskIds.length}`,
        `requiresApproval: ${task.requiresApproval ? 'yes' : 'no'}`,
        `requiresPrecondition: ${task.requiresPrecondition ? 'yes' : 'no'}`,
        `canComplete: ${task.canComplete === null ? 'n/a' : String(task.canComplete)}`,
      ].join('\n')}
      className={[
        'h-full w-full rounded-xl border p-3 text-left transition duration-200',
        isSelected ? 'border-blue-500' : 'border-zinc-200',
        isCompleted || task.state === 'DONE' ? 'bg-emerald-50 border-emerald-300' : 'bg-white',
        isReady ? 'border-blue-300 bg-blue-50/60' : '',
        isBlocked ? 'border-zinc-300 bg-rose-50/30' : '',
        isHighlighted ? 'ring-2 ring-teal-400/45' : '',
        task.canComplete ? 'shadow-[0_0_0_2px_rgba(59,130,246,0.2)]' : '',
        isNewlyReady ? 'animate-[pulse_1.5s_ease-in-out]' : '',
        isDimmed ? 'opacity-35' : 'opacity-100',
      ].join(' ')}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-[13px] font-bold tracking-tight text-slate-900">
          {task.name ?? task.id}
        </span>
        <StateBadge state={task.state} />
      </div>

      <p className="truncate text-[11px] text-slate-500">{task.id}</p>
      <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-600">
        <span>↑ {task.upstreamTaskIds.length}</span>
        <span>↓ {task.downstreamTaskIds.length}</span>
        <span>blockers {task.blockingTaskIds.length}</span>
      </div>

      <div className="mt-2 flex items-center gap-1">
        {task.requiresApproval ? (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
            APPROVAL
          </span>
        ) : null}
        {task.requiresPrecondition ? (
          <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-700">
            PRE
          </span>
        ) : null}
      </div>

      <div className="mt-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onComplete()
          }}
          disabled={!task.canComplete || isCompleting}
          className={[
            'rounded-md px-2 py-1 text-[10px] font-semibold text-white disabled:cursor-not-allowed',
            task.canComplete ? 'bg-blue-600 hover:bg-blue-500' : 'bg-zinc-300',
          ].join(' ')}
        >
          {isCompleting ? 'Completing…' : 'Complete'}
        </button>
      </div>
    </button>
  )
}
