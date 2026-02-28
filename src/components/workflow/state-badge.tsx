type StateBadgeProps = {
  state: string
}

const stateClassByValue: Record<string, string> = {
  DONE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  BLOCKED: 'bg-rose-50 text-rose-700 border-rose-200',
  NOT_STARTED: 'bg-blue-50 text-blue-700 border-blue-200',
}

export function StateBadge({ state }: StateBadgeProps) {
  const classes =
    stateClassByValue[state] ?? 'bg-zinc-100 text-zinc-700 border-zinc-200'

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${classes}`}
    >
      {state}
    </span>
  )
}
