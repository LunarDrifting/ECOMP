'use client'

import { useMemo, useState } from 'react'
import {
  completeTask,
  fetchAuditTimeline,
  fetchProjection,
  type AuditTimelineResponse,
  type WorkflowProjectionResponse,
} from '@/lib/api-client'
import { CountBadge } from '@/components/workflow/count-badge'
import { TaskRow } from '@/components/workflow/task-row'
import { TaskDrawer } from '@/components/workflow/task-drawer'
import { AuditTimeline } from '@/components/workflow/audit-timeline'

type WorkflowCommandCenterProps = {
  initialTenantId?: string
  initialEcoId?: string
  initialActorId?: string
}

export function WorkflowCommandCenter({
  initialTenantId = '',
  initialEcoId = '',
  initialActorId = '',
}: WorkflowCommandCenterProps) {
  const [tenantId, setTenantId] = useState(initialTenantId)
  const [ecoId, setEcoId] = useState(initialEcoId)
  const [actorId, setActorId] = useState(initialActorId)
  const [projection, setProjection] = useState<WorkflowProjectionResponse | null>(null)
  const [timeline, setTimeline] = useState<AuditTimelineResponse | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null)
  const [message, setMessage] = useState<string>('')

  const tasksInOrder = useMemo(() => {
    if (!projection) {
      return []
    }

    const taskById = new Map(projection.tasks.map((task) => [task.id, task]))
    return projection.tasksTopologicalOrder
      .map((taskId) => taskById.get(taskId))
      .filter((task): task is NonNullable<typeof task> => !!task)
  }, [projection])

  const selectedTask = useMemo(
    () => projection?.tasks.find((task) => task.id === selectedTaskId) ?? null,
    [projection, selectedTaskId]
  )

  async function refreshData() {
    if (!tenantId || !ecoId) {
      setMessage('tenantId and ecoId are required')
      return
    }

    setLoading(true)
    setMessage('')
    try {
      const [projectionResult, auditResult] = await Promise.all([
        fetchProjection({ tenantId, ecoId, actorId }),
        fetchAuditTimeline({ tenantId, ecoId }),
      ])

      if (!projectionResult.ok) {
        setMessage(`Projection load failed (${projectionResult.status}): ${projectionResult.error}`)
        return
      }

      setProjection(projectionResult.data)

      if (auditResult.ok) {
        setTimeline(auditResult.data)
      } else {
        setMessage(`Audit load failed (${auditResult.status}): ${auditResult.error}`)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleComplete(taskId: string) {
    if (!tenantId || !actorId) {
      setMessage('tenantId and actorId are required to complete tasks')
      return
    }

    setCompletingTaskId(taskId)
    setMessage('')
    try {
      const result = await completeTask({ tenantId, actorId, taskId })
      if (!result.ok) {
        setMessage(`Complete failed (${result.status}): ${result.error}`)
      } else {
        setMessage(`Task updated: ${result.data.status}`)
      }
    } finally {
      setCompletingTaskId(null)
      await refreshData()
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-zinc-900">Workflow Command Center</h1>
              <p className="text-xs text-zinc-500">ECO: {projection?.ecoId || ecoId || '—'}</p>
            </div>
            <button
              type="button"
              onClick={refreshData}
              disabled={loading}
              className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            <input
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
              placeholder="tenantId"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
            <input
              value={ecoId}
              onChange={(event) => setEcoId(event.target.value)}
              placeholder="ecoId"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
            <select
              value={actorId}
              onChange={(event) => setActorId(event.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">actorId (required for actions)</option>
              <option value={actorId || ''}>{actorId || 'Use current actorId'}</option>
            </select>
          </div>

          <div className="mb-3 h-2 overflow-hidden rounded bg-zinc-100">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{
                width:
                  projection && projection.counts.totalTasks > 0
                    ? `${(projection.counts.doneTasks / projection.counts.totalTasks) * 100}%`
                    : '0%',
              }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <CountBadge
              label="Total"
              value={projection?.counts.totalTasks ?? 0}
              tone="default"
            />
            <CountBadge label="Done" value={projection?.counts.doneTasks ?? 0} tone="done" />
            <CountBadge
              label="Blocked"
              value={projection?.counts.blockedTasks ?? 0}
              tone="blocked"
            />
            <CountBadge label="Ready" value={projection?.counts.readyTasks ?? 0} tone="ready" />
          </div>

          {message ? (
            <p className="mt-3 rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-700">{message}</p>
          ) : null}
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="space-y-2">
            {tasksInOrder.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onSelect={() => setSelectedTaskId(task.id)}
                onComplete={() => handleComplete(task.id)}
                completing={completingTaskId === task.id}
              />
            ))}
            {tasksInOrder.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
                Load projection to view tasks.
              </div>
            ) : null}
          </section>

          <div className="space-y-4">
            <TaskDrawer
              task={selectedTask}
              projection={projection}
              onClose={() => setSelectedTaskId(null)}
            />
            <AuditTimeline timeline={timeline} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  )
}
