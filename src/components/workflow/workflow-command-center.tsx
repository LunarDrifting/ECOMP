'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  completeTask,
  createApproval,
  fetchAuditTimeline,
  fetchProjection,
  fetchTenantUsers,
  type WorkflowProjectionTask,
  type AuditTimelineResponse,
  type TenantUserOption,
  type WorkflowProjectionResponse,
} from '@/lib/api-client'
import { CountBadge } from '@/components/workflow/count-badge'
import { Filters, type WorkflowFilter } from '@/components/workflow/filters'
import { TaskRow } from '@/components/workflow/task-row'
import { TaskDrawer } from '@/components/workflow/task-drawer'
import { AuditTimeline } from '@/components/workflow/audit-timeline'
import { GraphView } from '@/components/workflow/graph-view'

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
  const [approvingTaskId, setApprovingTaskId] = useState<string | null>(null)
  const [approvingDecision, setApprovingDecision] = useState<'APPROVED' | 'REJECTED' | null>(
    null
  )
  const [message, setMessage] = useState<string>('')
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list')
  const [filter, setFilter] = useState<WorkflowFilter>('ALL')
  const [search, setSearch] = useState('')
  const [tenantUsers, setTenantUsers] = useState<TenantUserOption[]>([])
  const [newlyReadyTaskIds, setNewlyReadyTaskIds] = useState<string[]>([])
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([])
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [])

  const tasksInOrder = useMemo(() => {
    if (!projection) {
      return []
    }

    const taskById = new Map(projection.tasks.map((task) => [task.id, task]))
    return projection.tasksTopologicalOrder
      .map((taskId) => taskById.get(taskId))
      .filter((task): task is NonNullable<typeof task> => !!task)
  }, [projection])

  function getIneligibleReason(task: WorkflowProjectionTask): string {
    if (task.state === 'DONE') {
      return 'Already done'
    }
    if (task.state === 'BLOCKED' || task.blockingTaskIds.length > 0) {
      return `Blocked by ${task.blockingTaskIds.length} tasks`
    }
    if (task.requiresApproval) {
      return 'Approval required'
    }
    if (task.requiresPrecondition) {
      return 'Precondition gate required'
    }
    return 'Not eligible'
  }

  const filteredTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return tasksInOrder.filter((task) => {
      const filterMatch =
        filter === 'ALL' ||
        (filter === 'READY' && task.isReady) ||
        (filter === 'BLOCKED' && task.state === 'BLOCKED') ||
        (filter === 'DONE' && task.state === 'DONE')

      if (!filterMatch) {
        return false
      }

      if (normalizedSearch.length === 0) {
        return true
      }

      return (
        task.id.toLowerCase().includes(normalizedSearch) ||
        task.name.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [filter, search, tasksInOrder])

  const selectedTask = useMemo(
    () => projection?.tasks.find((task) => task.id === selectedTaskId) ?? null,
    [projection, selectedTaskId]
  )

  async function refreshData(options?: {
    animateDiff?: boolean
    previousProjection?: WorkflowProjectionResponse | null
    actorIdOverride?: string
  }) {
    if (!tenantId || !ecoId) {
      setMessage('tenantId and ecoId are required')
      return
    }

    const effectiveActorId = options?.actorIdOverride ?? actorId
    setLoading(true)
    setMessage('')
    try {
      const [projectionResult, auditResult] = await Promise.all([
        fetchProjection({ tenantId, ecoId, actorId: effectiveActorId }),
        fetchAuditTimeline({ tenantId, ecoId }),
      ])

      if (!projectionResult.ok) {
        setMessage(`Projection load failed (${projectionResult.status}): ${projectionResult.error}`)
        return
      }

      if (options?.animateDiff && options.previousProjection) {
        const previousStateByTaskId = new Map(
          options.previousProjection.tasks.map((task) => [task.id, task.state])
        )
        const nextNewlyReadyTaskIds: string[] = []
        const nextCompletedTaskIds: string[] = []

        for (const nextTask of projectionResult.data.tasks) {
          const previousState = previousStateByTaskId.get(nextTask.id)
          if (previousState === 'BLOCKED' && nextTask.state === 'NOT_STARTED') {
            nextNewlyReadyTaskIds.push(nextTask.id)
          }
          if (previousState && previousState !== 'DONE' && nextTask.state === 'DONE') {
            nextCompletedTaskIds.push(nextTask.id)
          }
        }

        nextNewlyReadyTaskIds.sort()
        nextCompletedTaskIds.sort()
        setNewlyReadyTaskIds(nextNewlyReadyTaskIds)
        setCompletedTaskIds(nextCompletedTaskIds)

        if (animationTimeoutRef.current) {
          clearTimeout(animationTimeoutRef.current)
        }
        animationTimeoutRef.current = setTimeout(() => {
          setNewlyReadyTaskIds([])
          setCompletedTaskIds([])
        }, 1500)
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

  useEffect(() => {
    let cancelled = false

    async function loadTenantUsers() {
      if (!tenantId) {
        setTenantUsers([])
        return
      }

      const result = await fetchTenantUsers(tenantId)
      if (cancelled) {
        return
      }

      if (!result.ok) {
        setTenantUsers([])
        setMessage(`Tenant users load failed (${result.status}): ${result.error}`)
        return
      }

      setTenantUsers(result.data)

      const hasSelectedActor = result.data.some((user) => user.id === actorId)
      const nextActorId = hasSelectedActor ? actorId : (result.data[0]?.id ?? '')

      if (nextActorId !== actorId) {
        setActorId(nextActorId)
      }

      if (ecoId && nextActorId) {
        void refreshData({ actorIdOverride: nextActorId })
      }
    }

    void loadTenantUsers()

    return () => {
      cancelled = true
    }
  }, [tenantId, ecoId, actorId])

  async function handleComplete(taskId: string) {
    if (!tenantId || !actorId) {
      setMessage('tenantId and actorId are required to complete tasks')
      return
    }

    setCompletingTaskId(taskId)
    setMessage('')
    const previousProjection = projection
    try {
      const result = await completeTask({ tenantId, actorId, taskId })
      if (!result.ok) {
        setMessage(`Complete failed (${result.status}): ${result.error}`)
      } else {
        setMessage(`Task updated: ${result.data.status}`)
      }

      await refreshData({
        animateDiff: result.ok,
        previousProjection,
      })
    } finally {
      setCompletingTaskId(null)
    }
  }

  async function handleApprove(
    taskId: string,
    decision: 'APPROVED' | 'REJECTED',
    comment?: string
  ) {
    if (!tenantId || !actorId) {
      setMessage('tenantId and actorId are required for approval actions')
      return
    }

    setApprovingTaskId(taskId)
    setApprovingDecision(decision)
    setMessage('')
    try {
      const result = await createApproval({
        tenantId,
        actorId,
        taskId,
        decision,
        comment,
      })
      if (!result.ok) {
        setMessage(`Approval failed (${result.status}): ${result.error}`)
      } else {
        setMessage(`Approval recorded: ${result.data.status}`)
      }

      await refreshData({ previousProjection: projection })
    } finally {
      setApprovingTaskId(null)
      setApprovingDecision(null)
    }
  }

  async function handleCopyBlockers(ids: string[]) {
    if (ids.length === 0) {
      setMessage('No blocker IDs to copy')
      return
    }

    const content = ids.join('\n')
    try {
      await navigator.clipboard.writeText(content)
      setMessage(`Copied ${ids.length} blocker IDs`)
    } catch {
      setMessage('Clipboard unavailable')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-zinc-900">Workflow Command Center</h1>
              <p className="text-xs text-slate-700">ECO: {projection?.ecoId || ecoId || '—'}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                void refreshData()
              }}
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
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500"
            />
            <input
              value={ecoId}
              onChange={(event) => setEcoId(event.target.value)}
              placeholder="ecoId"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500"
            />
            <select
              value={actorId}
              onChange={(event) => {
                const nextActorId = event.target.value
                setActorId(nextActorId)
                if (tenantId && ecoId) {
                  void refreshData({ actorIdOverride: nextActorId })
                }
              }}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">Select actor...</option>
              {tenantUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email} ({user.id.slice(0, 8)})
                </option>
              ))}
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

          <div className="mt-3 inline-flex overflow-hidden rounded-lg border border-zinc-300 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={[
                'px-3 py-1.5 font-semibold',
                viewMode === 'list'
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white text-slate-700',
              ].join(' ')}
            >
              List View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('graph')}
              className={[
                'px-3 py-1.5 font-semibold',
                viewMode === 'graph'
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white text-slate-700',
              ].join(' ')}
            >
              Graph View
            </button>
          </div>

          {message ? (
            <p className="mt-3 rounded bg-zinc-100 px-2 py-1 text-xs text-slate-700">{message}</p>
          ) : null}
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="space-y-2">
            <Filters
              filter={filter}
              onFilterChange={setFilter}
              search={search}
              onSearchChange={setSearch}
            />
            {viewMode === 'list'
              ? filteredTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onSelect={() => setSelectedTaskId(task.id)}
                    onComplete={() => handleComplete(task.id)}
                    completing={completingTaskId === task.id}
                    completeDisabledReason={
                      actorId && task.canComplete === false
                        ? getIneligibleReason(task)
                        : undefined
                    }
                    newlyReady={newlyReadyTaskIds.includes(task.id)}
                    recentlyCompleted={completedTaskIds.includes(task.id)}
                  />
                ))
              : null}
            {viewMode === 'graph' && projection ? (
              <GraphView
                tasks={filteredTasks}
                orderedTaskIds={filteredTasks.map((task) => task.id)}
                dependencies={projection.dependencies}
                selectedTaskId={selectedTaskId}
                onSelectTask={setSelectedTaskId}
                onCompleteTask={handleComplete}
                completingTaskId={completingTaskId}
                newlyReadyTaskIds={newlyReadyTaskIds}
                completedTaskIds={completedTaskIds}
                getIneligibleReason={getIneligibleReason}
              />
            ) : null}
            {filteredTasks.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-slate-700">
                Load projection to view tasks.
              </div>
            ) : null}
          </section>

          <div className="space-y-4">
            <TaskDrawer
              task={selectedTask}
              projection={projection}
              actorId={actorId}
              approvingDecision={
                approvingTaskId && selectedTask?.id === approvingTaskId
                  ? approvingDecision
                  : null
              }
              completeDisabledReason={
                actorId && selectedTask?.canComplete === false
                  ? getIneligibleReason(selectedTask)
                  : undefined
              }
              onApprove={handleApprove}
              onCopyBlockers={handleCopyBlockers}
              onClose={() => setSelectedTaskId(null)}
            />
            <AuditTimeline timeline={timeline} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  )
}
