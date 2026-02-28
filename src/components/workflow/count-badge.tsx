type CountBadgeProps = {
  label: string
  value: number
  tone?: 'default' | 'done' | 'blocked' | 'ready'
}

const toneClassByValue: Record<NonNullable<CountBadgeProps['tone']>, string> = {
  default: 'bg-zinc-100 text-zinc-800',
  done: 'bg-emerald-100 text-emerald-800',
  blocked: 'bg-rose-100 text-rose-800',
  ready: 'bg-blue-100 text-blue-800',
}

export function CountBadge({ label, value, tone = 'default' }: CountBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${toneClassByValue[tone]}`}
    >
      <span>{label}</span>
      <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold">
        {value}
      </span>
    </div>
  )
}
