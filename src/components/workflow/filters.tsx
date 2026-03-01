type WorkflowFilter = 'ALL' | 'READY' | 'BLOCKED' | 'DONE'

type FiltersProps = {
  filter: WorkflowFilter
  onFilterChange: (next: WorkflowFilter) => void
  search: string
  onSearchChange: (value: string) => void
}

const FILTERS: WorkflowFilter[] = ['ALL', 'READY', 'BLOCKED', 'DONE']

export function Filters({
  filter,
  onFilterChange,
  search,
  onSearchChange,
}: FiltersProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onFilterChange(item)}
            className={[
              'rounded-full border px-3 py-1 text-xs font-semibold transition',
              filter === item
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-300 bg-white text-slate-700 hover:border-zinc-400',
            ].join(' ')}
          >
            {item}
          </button>
        ))}
      </div>
      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search task name or id"
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-500"
      />
    </div>
  )
}

export type { WorkflowFilter }
