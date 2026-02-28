import { useMemo, useState } from 'react'
import type { WorkflowProjectionTask } from '@/lib/api-client'
import { StateBadge } from '@/components/workflow/state-badge'

type DependencyEdge = {
  fromTaskId: string
  toTaskId: string
}

type GraphViewProps = {
  tasks: WorkflowProjectionTask[]
  orderedTaskIds: string[]
  dependencies: DependencyEdge[]
  selectedTaskId: string | null
  onSelectTask: (taskId: string) => void
  onCompleteTask: (taskId: string) => void
  completingTaskId: string | null
  newlyReadyTaskIds: string[]
  completedTaskIds: string[]
}

type PositionedNode = {
  task: WorkflowProjectionTask
  x: number
  y: number
  layer: number
}

const NODE_WIDTH = 248
const NODE_HEIGHT = 118
const LAYER_GAP = 192
const ROW_GAP = 24
const PADDING = 24

export function GraphView({
  tasks,
  orderedTaskIds,
  dependencies,
  selectedTaskId,
  onSelectTask,
  onCompleteTask,
  completingTaskId,
  newlyReadyTaskIds,
  completedTaskIds,
}: GraphViewProps) {
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null)

  const {
    positionedNodes,
    width,
    height,
    upstreamByTaskId,
    downstreamByTaskId,
    positionByTaskId,
  } = useMemo(() => {
    const taskById = new Map(tasks.map((task) => [task.id, task]))
    const effectiveOrder = orderedTaskIds.filter((taskId) => taskById.has(taskId))

    const upstreamById = new Map<string, Set<string>>()
    const downstreamById = new Map<string, Set<string>>()
    const indexByTaskId = new Map<string, number>()

    effectiveOrder.forEach((taskId, index) => {
      upstreamById.set(taskId, new Set<string>())
      downstreamById.set(taskId, new Set<string>())
      indexByTaskId.set(taskId, index)
    })

    for (const edge of dependencies) {
      if (!upstreamById.has(edge.toTaskId) || !downstreamById.has(edge.fromTaskId)) {
        continue
      }
      upstreamById.get(edge.toTaskId)!.add(edge.fromTaskId)
      downstreamById.get(edge.fromTaskId)!.add(edge.toTaskId)
    }

    const layerByTaskId = new Map<string, number>()
    for (const taskId of effectiveOrder) {
      const upstreamIds = Array.from(upstreamById.get(taskId) ?? [])
      if (upstreamIds.length === 0) {
        layerByTaskId.set(taskId, 0)
        continue
      }

      let maxUpstreamLayer = 0
      for (const upstreamTaskId of upstreamIds) {
        maxUpstreamLayer = Math.max(maxUpstreamLayer, layerByTaskId.get(upstreamTaskId) ?? 0)
      }
      layerByTaskId.set(taskId, maxUpstreamLayer + 1)
    }

    const nodesByLayer = new Map<number, WorkflowProjectionTask[]>()
    for (const taskId of effectiveOrder) {
      const task = taskById.get(taskId)
      if (!task) {
        continue
      }

      const layer = layerByTaskId.get(taskId) ?? 0
      const tasksInLayer = nodesByLayer.get(layer) ?? []
      tasksInLayer.push(task)
      tasksInLayer.sort(
        (a, b) => (indexByTaskId.get(a.id) ?? 0) - (indexByTaskId.get(b.id) ?? 0)
      )
      nodesByLayer.set(layer, tasksInLayer)
    }

    const sortedLayers = Array.from(nodesByLayer.keys()).sort((a, b) => a - b)
    const positioned: PositionedNode[] = []
    const xyByTaskId = new Map<string, { x: number; y: number }>()
    let maxNodesInLayer = 1

    for (const layer of sortedLayers) {
      const layerNodes = nodesByLayer.get(layer) ?? []
      maxNodesInLayer = Math.max(maxNodesInLayer, layerNodes.length)
      layerNodes.forEach((task, rowIndex) => {
        const x = PADDING + layer * (NODE_WIDTH + LAYER_GAP)
        const y = PADDING + rowIndex * (NODE_HEIGHT + ROW_GAP)
        positioned.push({ task, x, y, layer })
        xyByTaskId.set(task.id, { x, y })
      })
    }

    const canvasWidth =
      PADDING * 2 + Math.max(1, sortedLayers.length) * NODE_WIDTH + Math.max(0, sortedLayers.length - 1) * LAYER_GAP
    const canvasHeight =
      PADDING * 2 + maxNodesInLayer * NODE_HEIGHT + Math.max(0, maxNodesInLayer - 1) * ROW_GAP

    return {
      positionedNodes: positioned,
      width: canvasWidth,
      height: canvasHeight,
      upstreamByTaskId: upstreamById,
      downstreamByTaskId: downstreamById,
      positionByTaskId: xyByTaskId,
    }
  }, [tasks, orderedTaskIds, dependencies])

  const { highlightedNodes, highlightedEdges } = useMemo(() => {
    if (!hoveredTaskId) {
      return {
        highlightedNodes: new Set<string>(),
        highlightedEdges: new Set<string>(),
      }
    }

    const nodeSet = new Set<string>([hoveredTaskId])
    const edgeSet = new Set<string>()

    const visit = (seedId: string, map: Map<string, Set<string>>, edgeDirection: 'up' | 'down') => {
      const queue = [seedId]
      const visited = new Set<string>([seedId])

      while (queue.length > 0) {
        const current = queue.shift()!
        const neighbors = Array.from(map.get(current) ?? []).sort()
        for (const next of neighbors) {
          if (visited.has(next)) {
            continue
          }
          visited.add(next)
          nodeSet.add(next)
          edgeSet.add(
            edgeDirection === 'up' ? `${next}->${current}` : `${current}->${next}`
          )
          queue.push(next)
        }
      }
    }

    visit(hoveredTaskId, upstreamByTaskId, 'up')
    visit(hoveredTaskId, downstreamByTaskId, 'down')

    return { highlightedNodes: nodeSet, highlightedEdges: edgeSet }
  }, [hoveredTaskId, downstreamByTaskId, upstreamByTaskId])

  return (
    <div className="overflow-auto rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
      <svg width={width} height={height} className="block min-w-full">
        {dependencies.map((edge) => {
          const from = positionByTaskId.get(edge.fromTaskId)
          const to = positionByTaskId.get(edge.toTaskId)
          if (!from || !to) {
            return null
          }

          const startX = from.x + NODE_WIDTH
          const startY = from.y + NODE_HEIGHT / 2
          const endX = to.x
          const endY = to.y + NODE_HEIGHT / 2
          const controlOffset = Math.max(48, (endX - startX) / 2)
          const path = `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`
          const edgeKey = `${edge.fromTaskId}->${edge.toTaskId}`
          const isHighlighted = highlightedEdges.has(edgeKey)

          return (
            <path
              key={edgeKey}
              d={path}
              fill="none"
              stroke={isHighlighted ? '#0f766e' : '#d4d4d8'}
              strokeWidth={isHighlighted ? 2.5 : 1.5}
              opacity={isHighlighted ? 1 : 0.9}
            />
          )
        })}

        {positionedNodes.map(({ task, x, y }) => {
          const isSelected = selectedTaskId === task.id
          const isHighlighted = hoveredTaskId ? highlightedNodes.has(task.id) : false
          const isNewlyReady = newlyReadyTaskIds.includes(task.id)
          const isCompleted = completedTaskIds.includes(task.id)
          const isCompleting = completingTaskId === task.id

          return (
            <foreignObject
              key={task.id}
              x={x}
              y={y}
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
            >
              <button
                type="button"
                onMouseEnter={() => setHoveredTaskId(task.id)}
                onMouseLeave={() => setHoveredTaskId(null)}
                onClick={() => onSelectTask(task.id)}
                className={[
                  'h-full w-full rounded-xl border p-3 text-left transition',
                  isSelected ? 'border-blue-500 bg-blue-50' : 'border-zinc-200 bg-white',
                  isHighlighted ? 'ring-2 ring-teal-500/40' : '',
                  isCompleted ? 'border-emerald-500 bg-emerald-50' : '',
                  isNewlyReady ? 'animate-[pulse_1.5s_ease-in-out]' : '',
                ].join(' ')}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-zinc-900">
                    {task.name ?? task.id}
                  </span>
                  <StateBadge state={task.state} />
                </div>

                <p className="truncate text-[11px] text-zinc-500">{task.id}</p>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-zinc-600">
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
                      onCompleteTask(task.id)
                    }}
                    disabled={!task.canComplete || isCompleting}
                    className="rounded-md bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
                  >
                    {isCompleting ? 'Completing…' : 'Complete'}
                  </button>
                </div>
              </button>
            </foreignObject>
          )
        })}
      </svg>
    </div>
  )
}
