type GraphControlsProps = {
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export function GraphControls({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
}: GraphControlsProps) {
  return (
    <div className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white/95 p-1 shadow">
      <button
        type="button"
        onClick={onZoomOut}
        className="rounded px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-zinc-100"
      >
        -
      </button>
      <span className="min-w-12 text-center text-[11px] font-semibold text-slate-600">
        {Math.round(scale * 100)}%
      </span>
      <button
        type="button"
        onClick={onZoomIn}
        className="rounded px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-zinc-100"
      >
        +
      </button>
      <button
        type="button"
        onClick={onReset}
        className="rounded px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-zinc-100"
      >
        Reset
      </button>
    </div>
  )
}
