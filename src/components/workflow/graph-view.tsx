import { useMemo, useState } from 'react'
import type { WorkflowProjectionTask } from '@/lib/api-client'
import { EdgeLayer } from '@/components/workflow/edge-layer'
import { GraphControls } from '@/components/workflow/graph-controls'
import { NodeCard } from '@/components/workflow/node-card'

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
}

const NODE_WIDTH = 264
const NODE_HEIGHT = 132
const LAYER_GAP = 180
const ROW_GAP = 28
const PADDING = 30

function clampScale(value: number) {
  return Math.max(0.6, Math.min(1.8, value))
}

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
  const [scale, setScale] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const [lastPointer, setLastPointer] = useState<{ x: number; y: number } | null>(null)

  const layout = useMemo(() => {
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
      upstreamById.get(edge.toTaskId)?.add(edge.fromTaskId)
      downstreamById.get(edge.fromTaskId)?.add(edge.toTaskId)
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
    const positionedNodes: PositionedNode[] = []
    const positionByTaskId = new Map<string, { x: number; y: number }>()
    let maxNodesInLayer = 1

    for (const layer of sortedLayers) {
      const layerNodes = nodesByLayer.get(layer) ?? []
      maxNodesInLayer = Math.max(maxNodesInLayer, layerNodes.length)
      layerNodes.forEach((task, rowIndex) => {
        const x = PADDING + layer * (NODE_WIDTH + LAYER_GAP)
        const y = PADDING + rowIndex * (NODE_HEIGHT + ROW_GAP)
        positionedNodes.push({ task, x, y })
        positionByTaskId.set(task.id, { x, y })
      })
    }

    const width =
      PADDING * 2 +
      Math.max(1, sortedLayers.length) * NODE_WIDTH +
      Math.max(0, sortedLayers.length - 1) * LAYER_GAP
    const height =
      PADDING * 2 +
      maxNodesInLayer * NODE_HEIGHT +
      Math.max(0, maxNodesInLayer - 1) * ROW_GAP

    return {
      positionedNodes,
      width,
      height,
      upstreamByTaskId: upstreamById,
      downstreamByTaskId: downstreamById,
      positionByTaskId,
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
          edgeSet.add(edgeDirection === 'up' ? `${next}->${current}` : `${current}->${next}`)
          queue.push(next)
        }
      }
    }

    visit(hoveredTaskId, layout.upstreamByTaskId, 'up')
    visit(hoveredTaskId, layout.downstreamByTaskId, 'down')

    return { highlightedNodes: nodeSet, highlightedEdges: edgeSet }
  }, [hoveredTaskId, layout.downstreamByTaskId, layout.upstreamByTaskId])

  const waveEdgeKeys = useMemo(() => {
    if (completedTaskIds.length === 0 || newlyReadyTaskIds.length === 0) {
      return new Set<string>()
    }

    const completedSet = new Set(completedTaskIds)
    const newlyReadySet = new Set(newlyReadyTaskIds)
    const edgeSet = new Set<string>()

    for (const edge of dependencies) {
      if (completedSet.has(edge.fromTaskId) && newlyReadySet.has(edge.toTaskId)) {
        edgeSet.add(`${edge.fromTaskId}->${edge.toTaskId}`)
      }
    }

    if (edgeSet.size > 0) {
      return edgeSet
    }

    for (const targetTaskId of newlyReadyTaskIds) {
      const queue: string[] = [targetTaskId]
      const prev = new Map<string, string>()
      const visited = new Set<string>([targetTaskId])
      let matchedCompleted: string | null = null

      while (queue.length > 0 && !matchedCompleted) {
        const current = queue.shift()!
        const upstreamNeighbors = Array.from(layout.upstreamByTaskId.get(current) ?? []).sort()
        for (const upstreamId of upstreamNeighbors) {
          if (visited.has(upstreamId)) {
            continue
          }
          visited.add(upstreamId)
          prev.set(upstreamId, current)
          if (completedSet.has(upstreamId)) {
            matchedCompleted = upstreamId
            break
          }
          queue.push(upstreamId)
        }
      }

      if (!matchedCompleted) {
        continue
      }

      let cursor = matchedCompleted
      while (prev.has(cursor)) {
        const next = prev.get(cursor)!
        edgeSet.add(`${cursor}->${next}`)
        cursor = next
      }
    }

    return edgeSet
  }, [completedTaskIds, dependencies, layout.upstreamByTaskId, newlyReadyTaskIds])

  const renderEdges = useMemo(() => {
    return dependencies
      .map((edge) => {
        const from = layout.positionByTaskId.get(edge.fromTaskId)
        const to = layout.positionByTaskId.get(edge.toTaskId)
        if (!from || !to) {
          return null
        }

        const startX = from.x + NODE_WIDTH
        const startY = from.y + NODE_HEIGHT / 2
        const endX = to.x
        const endY = to.y + NODE_HEIGHT / 2
        const controlOffset = Math.max(52, (endX - startX) / 2)
        const path = `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`
        const key = `${edge.fromTaskId}->${edge.toTaskId}`

        return {
          key,
          path,
          isHighlighted: highlightedEdges.has(key),
          isWave: waveEdgeKeys.has(key),
        }
      })
      .filter((edge): edge is NonNullable<typeof edge> => edge !== null)
  }, [dependencies, highlightedEdges, layout.positionByTaskId, waveEdgeKeys])

  const hasHoverFocus = hoveredTaskId !== null

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
      onWheel={(event) => {
        event.preventDefault()
        const multiplier = event.deltaY > 0 ? 0.9 : 1.1
        setScale((current) => clampScale(current * multiplier))
      }}
      onPointerDown={(event) => {
        setIsPanning(true)
        setLastPointer({ x: event.clientX, y: event.clientY })
      }}
      onPointerMove={(event) => {
        if (!isPanning || !lastPointer) {
          return
        }
        const dx = event.clientX - lastPointer.x
        const dy = event.clientY - lastPointer.y
        setPanX((current) => current + dx)
        setPanY((current) => current + dy)
        setLastPointer({ x: event.clientX, y: event.clientY })
      }}
      onPointerUp={() => {
        setIsPanning(false)
        setLastPointer(null)
      }}
      onPointerLeave={() => {
        setIsPanning(false)
        setLastPointer(null)
      }}
    >
      <GraphControls
        scale={scale}
        onZoomIn={() => setScale((current) => clampScale(current * 1.1))}
        onZoomOut={() => setScale((current) => clampScale(current * 0.9))}
        onReset={() => {
          setScale(1)
          setPanX(0)
          setPanY(0)
        }}
      />

      <div className="overflow-auto p-3">
        <svg width={layout.width} height={layout.height} className="block min-w-full">
          <g transform={`translate(${panX} ${panY}) scale(${scale})`}>
            <EdgeLayer edges={renderEdges} />

            {layout.positionedNodes.map(({ task, x, y }) => {
              const isSelected = selectedTaskId === task.id
              const isHighlighted = hasHoverFocus ? highlightedNodes.has(task.id) : false
              const isDimmed = hasHoverFocus ? !highlightedNodes.has(task.id) : false
              const isNewlyReady = newlyReadyTaskIds.includes(task.id)
              const isCompleted = completedTaskIds.includes(task.id)
              const isCompleting = completingTaskId === task.id

              return (
                <foreignObject key={task.id} x={x} y={y} width={NODE_WIDTH} height={NODE_HEIGHT}>
                  <NodeCard
                    task={task}
                    isSelected={isSelected}
                    isHighlighted={isHighlighted}
                    isDimmed={isDimmed}
                    isNewlyReady={isNewlyReady}
                    isCompleted={isCompleted}
                    isCompleting={isCompleting}
                    onHoverStart={() => setHoveredTaskId(task.id)}
                    onHoverEnd={() => setHoveredTaskId(null)}
                    onSelect={() => onSelectTask(task.id)}
                    onComplete={() => onCompleteTask(task.id)}
                  />
                </foreignObject>
              )
            })}
          </g>
        </svg>
      </div>
    </div>
  )
}
