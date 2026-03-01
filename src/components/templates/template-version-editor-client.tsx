'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createEco,
  createTemplateDependency,
  createTemplateTask,
  deleteTemplateDependency,
  deleteTemplateTask,
  fetchRoles,
  fetchTemplateDependencies,
  fetchTemplateTasks,
  fetchTemplateVersionsForTemplate,
  instantiateEco,
  publishTemplateVersion,
  updateTemplateTask,
  validateTemplateVersion,
  type BlueprintValidationResult,
  type RoleOption,
  type TemplateBuilderVersion,
  type TemplateDependencyDefinitionRow,
  type TemplateTaskDefinitionRow,
} from '@/lib/api-client'

const TASK_LEVELS = ['MILESTONE', 'STEP', 'SUBSTEP'] as const
const VISIBILITY_VALUES = [
  'INTERNAL_ONLY',
  'CUSTOMER_VISIBLE',
  'CUSTOMER_ACTIONABLE',
] as const
const APPROVAL_POLICIES = ['NONE', 'SINGLE', 'SEQUENTIAL', 'PARALLEL', 'QUORUM'] as const
const CLOCK_MODES = [
  'ACTIVE',
  'WAITING_ON_CUSTOMER',
  'WAITING_ON_SUPPLIER',
  'WAITING_INTERNAL',
] as const
const DEPENDENCY_TYPES = ['FINISH_TO_START', 'START_TO_START'] as const

type TaskFormState = {
  name: string
  taskLevel: (typeof TASK_LEVELS)[number]
  ownerRoleId: string
  visibility: (typeof VISIBILITY_VALUES)[number]
  approvalPolicy: (typeof APPROVAL_POLICIES)[number]
  clockMode: (typeof CLOCK_MODES)[number]
  parentDefinitionId: string
}

const DEFAULT_TASK_FORM: TaskFormState = {
  name: '',
  taskLevel: 'STEP',
  ownerRoleId: '',
  visibility: 'INTERNAL_ONLY',
  approvalPolicy: 'NONE',
  clockMode: 'ACTIVE',
  parentDefinitionId: '',
}

export function TemplateVersionEditorClient({
  templateId,
  templateVersionId,
  initialTenantId,
}: {
  templateId: string
  templateVersionId: string
  initialTenantId: string
}) {
  const router = useRouter()
  const [tenantId, setTenantId] = useState(initialTenantId)
  const [actorId, setActorId] = useState('')
  const [ecoTitle, setEcoTitle] = useState('')
  const [versions, setVersions] = useState<TemplateBuilderVersion[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [tasks, setTasks] = useState<TemplateTaskDefinitionRow[]>([])
  const [dependencies, setDependencies] = useState<TemplateDependencyDefinitionRow[]>([])
  const [taskForm, setTaskForm] = useState<TaskFormState>(DEFAULT_TASK_FORM)
  const [dependencyForm, setDependencyForm] = useState({
    fromDefinitionId: '',
    toDefinitionId: '',
    type: 'FINISH_TO_START' as (typeof DEPENDENCY_TYPES)[number],
    lagMinutes: 0,
  })
  const [validation, setValidation] = useState<BlueprintValidationResult | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const versionMeta = useMemo(
    () => versions.find((version) => version.id === templateVersionId) ?? null,
    [versions, templateVersionId]
  )

  async function loadAll() {
    if (!tenantId) {
      setMessage('tenantId is required')
      return
    }

    setBusy(true)
    setMessage('')
    try {
      const [rolesResult, tasksResult, depsResult, versionsResult] = await Promise.all([
        fetchRoles(tenantId),
        fetchTemplateTasks({ tenantId, templateVersionId }),
        fetchTemplateDependencies({ tenantId, templateVersionId }),
        fetchTemplateVersionsForTemplate({ tenantId, templateId }),
      ])

      if (!rolesResult.ok) {
        setMessage(`Roles failed (${rolesResult.status}): ${rolesResult.error}`)
        return
      }
      if (!tasksResult.ok) {
        setMessage(`Tasks failed (${tasksResult.status}): ${tasksResult.error}`)
        return
      }
      if (!depsResult.ok) {
        setMessage(`Dependencies failed (${depsResult.status}): ${depsResult.error}`)
        return
      }
      if (!versionsResult.ok) {
        setMessage(`Versions failed (${versionsResult.status}): ${versionsResult.error}`)
        return
      }

      setRoles(rolesResult.data.roles)
      setTasks(tasksResult.data.tasks)
      setDependencies(depsResult.data.dependencies)
      setVersions(versionsResult.data.versions)

      setTaskForm((current) => ({
        ...current,
        ownerRoleId: current.ownerRoleId || rolesResult.data.roles[0]?.id || '',
      }))
      setMessage('Template version loaded')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!initialTenantId) {
      return
    }
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTenantId, templateId, templateVersionId])

  async function handleCreateTask() {
    if (!tenantId || !taskForm.name.trim() || !taskForm.ownerRoleId) {
      setMessage('tenantId, task name, and ownerRoleId are required')
      return
    }

    setBusy(true)
    setMessage('')
    try {
      const result = await createTemplateTask({
        tenantId,
        templateVersionId,
        name: taskForm.name.trim(),
        taskLevel: taskForm.taskLevel,
        ownerRoleId: taskForm.ownerRoleId,
        visibility: taskForm.visibility,
        approvalPolicy: taskForm.approvalPolicy,
        clockMode: taskForm.clockMode,
        parentDefinitionId: taskForm.parentDefinitionId || undefined,
      })

      if (!result.ok) {
        setMessage(`Create task failed (${result.status}): ${result.error}`)
        return
      }

      setTaskForm((current) => ({
        ...current,
        name: '',
        parentDefinitionId: '',
      }))
      setValidation(null)
      await loadAll()
    } finally {
      setBusy(false)
    }
  }

  async function handleUpdateTask(task: TemplateTaskDefinitionRow) {
    setBusy(true)
    setMessage('')
    try {
      const result = await updateTemplateTask({
        tenantId,
        taskDefinitionId: task.id,
        patch: {
          name: task.name,
          taskLevel: task.taskLevel,
          ownerRoleId: task.ownerRoleId,
          visibility: task.visibility,
          approvalPolicy: task.approvalPolicy,
          clockMode: task.clockMode,
          parentDefinitionId: task.parentDefinitionId,
        },
      })

      if (!result.ok) {
        setMessage(`Update task failed (${result.status}): ${result.error}`)
        return
      }

      setValidation(null)
      setMessage('Task updated')
      await loadAll()
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteTask(taskDefinitionId: string) {
    setBusy(true)
    setMessage('')
    try {
      const result = await deleteTemplateTask({ tenantId, taskDefinitionId })
      if (!result.ok) {
        setMessage(`Delete task failed (${result.status}): ${result.error}`)
        return
      }

      setValidation(null)
      await loadAll()
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateDependency() {
    if (!tenantId || !dependencyForm.fromDefinitionId || !dependencyForm.toDefinitionId) {
      setMessage('tenantId, fromDefinitionId, and toDefinitionId are required')
      return
    }

    if (dependencyForm.fromDefinitionId === dependencyForm.toDefinitionId) {
      setMessage('Self dependency is not allowed')
      return
    }

    setBusy(true)
    setMessage('')
    try {
      const result = await createTemplateDependency({
        tenantId,
        templateVersionId,
        fromDefinitionId: dependencyForm.fromDefinitionId,
        toDefinitionId: dependencyForm.toDefinitionId,
        type: dependencyForm.type,
        lagMinutes: dependencyForm.lagMinutes,
      })

      if (!result.ok) {
        setMessage(`Create dependency failed (${result.status}): ${result.error}`)
        return
      }

      setValidation(null)
      await loadAll()
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteDependency(dependencyDefinitionId: string) {
    setBusy(true)
    setMessage('')
    try {
      const result = await deleteTemplateDependency({
        tenantId,
        dependencyDefinitionId,
      })
      if (!result.ok) {
        setMessage(`Delete dependency failed (${result.status}): ${result.error}`)
        return
      }

      setValidation(null)
      await loadAll()
    } finally {
      setBusy(false)
    }
  }

  async function handleValidate() {
    if (!tenantId) {
      setMessage('tenantId is required')
      return
    }

    setBusy(true)
    setMessage('')
    try {
      const result = await validateTemplateVersion({ tenantId, templateVersionId })
      if (!result.ok) {
        setMessage(`Validate failed (${result.status}): ${result.error}`)
        return
      }

      setValidation(result.data)
      setMessage(result.data.ok ? 'Validation passed' : 'Validation failed')
    } finally {
      setBusy(false)
    }
  }

  async function handlePublish() {
    if (!tenantId) {
      setMessage('tenantId is required')
      return
    }

    setBusy(true)
    setMessage('')
    try {
      const result = await publishTemplateVersion({ tenantId, templateVersionId })
      if (!result.ok) {
        setMessage(`Publish failed (${result.status}): ${result.error}`)
        return
      }

      setMessage(
        result.data.status === 'published'
          ? 'Version published'
          : 'Version already published (noop)'
      )
      await loadAll()
    } finally {
      setBusy(false)
    }
  }

  async function handleLaunch() {
    if (!tenantId || !ecoTitle.trim()) {
      setMessage('tenantId and ECO title are required for launch')
      return
    }

    setBusy(true)
    setMessage('')
    try {
      const ecoResult = await createEco({ tenantId, title: ecoTitle.trim() })
      if (!ecoResult.ok) {
        setMessage(`Create ECO failed (${ecoResult.status}): ${ecoResult.error}`)
        return
      }

      const instantiateResult = await instantiateEco({
        tenantId,
        ecoId: ecoResult.data.ecoId,
        templateVersionId,
        actorId: actorId || undefined,
      })

      if (!instantiateResult.ok) {
        setMessage(
          `Instantiate failed (${instantiateResult.status}): ${instantiateResult.error}`
        )
        return
      }

      const params = new URLSearchParams({
        tenantId,
        ecoId: ecoResult.data.ecoId,
      })
      if (actorId) {
        params.set('actorId', actorId)
      }
      router.push(`/workflow?${params.toString()}`)
    } finally {
      setBusy(false)
    }
  }

  const validationOk = validation?.ok === true

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-6 text-zinc-900">
      <div className="mx-auto max-w-6xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Template Version Editor</h1>
            <p className="text-sm text-zinc-600">
              {versionMeta?.templateName ?? 'Template'} / {versionMeta?.version ?? templateVersionId}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href={`/templates/${templateId}${tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ''}`}
              className="text-blue-700 underline"
            >
              Back to versions
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value)}
            placeholder="tenantId"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            value={actorId}
            onChange={(event) => setActorId(event.target.value)}
            placeholder="actorId (for launch, optional)"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void loadAll()}
            disabled={busy}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 disabled:opacity-60"
          >
            Reload
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleValidate()}
            disabled={busy}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 disabled:opacity-60"
          >
            Validate Blueprint
          </button>
          <button
            type="button"
            onClick={() => void handlePublish()}
            disabled={busy || !validationOk}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Publish Version
          </button>
          <span
            className={`rounded px-2 py-1 text-xs font-semibold ${
              versionMeta?.isPublished
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {versionMeta?.isPublished ? 'PUBLISHED' : 'DRAFT'}
          </span>
        </div>

        <div className="rounded-lg border border-zinc-200 p-3">
          <h2 className="mb-2 text-sm font-semibold">Launch from template</h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
            <input
              value={ecoTitle}
              onChange={(event) => setEcoTitle(event.target.value)}
              placeholder="ECO title"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void handleLaunch()}
              disabled={busy || !versionMeta?.isPublished}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Create ECO + Instantiate + Open Workflow
            </button>
          </div>
          {!versionMeta?.isPublished ? (
            <p className="mt-2 text-xs text-amber-700">Publish version before launch.</p>
          ) : null}
        </div>

        {message ? (
          <p className="rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-700">{message}</p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="space-y-2 rounded-lg border border-zinc-200 p-3">
            <h2 className="text-sm font-semibold">Task Definitions</h2>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <input
                value={taskForm.name}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Task name"
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
              />
              <select
                value={taskForm.ownerRoleId}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, ownerRoleId: event.target.value }))
                }
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
              >
                <option value="">Select owner role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <select
                value={taskForm.taskLevel}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    taskLevel: event.target.value as TaskFormState['taskLevel'],
                  }))
                }
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
              >
                {TASK_LEVELS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select
                value={taskForm.visibility}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    visibility: event.target.value as TaskFormState['visibility'],
                  }))
                }
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
              >
                {VISIBILITY_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select
                value={taskForm.approvalPolicy}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    approvalPolicy: event.target.value as TaskFormState['approvalPolicy'],
                  }))
                }
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
              >
                {APPROVAL_POLICIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select
                value={taskForm.clockMode}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    clockMode: event.target.value as TaskFormState['clockMode'],
                  }))
                }
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
              >
                {CLOCK_MODES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select
                value={taskForm.parentDefinitionId}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    parentDefinitionId: event.target.value,
                  }))
                }
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
              >
                <option value="">No parent</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void handleCreateTask()}
              disabled={busy}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              Add Task Definition
            </button>

            <div className="space-y-2">
              {tasks.map((task) => (
                <TaskEditorRow
                  key={task.id}
                  task={task}
                  allTasks={tasks}
                  roles={roles}
                  disabled={busy || versionMeta?.isPublished === true}
                  onSave={(nextTask) => void handleUpdateTask(nextTask)}
                  onDelete={(taskId) => void handleDeleteTask(taskId)}
                />
              ))}
              {tasks.length === 0 ? (
                <p className="text-xs text-zinc-500">No task definitions yet.</p>
              ) : null}
            </div>
          </section>

          <section className="space-y-2 rounded-lg border border-zinc-200 p-3">
            <h2 className="text-sm font-semibold">Dependency Definitions</h2>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <select
                value={dependencyForm.fromDefinitionId}
                onChange={(event) =>
                  setDependencyForm((current) => ({
                    ...current,
                    fromDefinitionId: event.target.value,
                  }))
                }
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
              >
                <option value="">From task</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </select>
              <select
                value={dependencyForm.toDefinitionId}
                onChange={(event) =>
                  setDependencyForm((current) => ({
                    ...current,
                    toDefinitionId: event.target.value,
                  }))
                }
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
              >
                <option value="">To task</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </select>
              <select
                value={dependencyForm.type}
                onChange={(event) =>
                  setDependencyForm((current) => ({
                    ...current,
                    type: event.target.value as (typeof DEPENDENCY_TYPES)[number],
                  }))
                }
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
              >
                {DEPENDENCY_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={dependencyForm.lagMinutes}
                onChange={(event) =>
                  setDependencyForm((current) => ({
                    ...current,
                    lagMinutes: Number(event.target.value || 0),
                  }))
                }
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
                placeholder="lagMinutes"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleCreateDependency()}
              disabled={
                busy ||
                !dependencyForm.fromDefinitionId ||
                !dependencyForm.toDefinitionId ||
                dependencyForm.fromDefinitionId === dependencyForm.toDefinitionId ||
                versionMeta?.isPublished === true
              }
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              Add Dependency
            </button>
            {dependencyForm.fromDefinitionId &&
            dependencyForm.fromDefinitionId === dependencyForm.toDefinitionId ? (
              <p className="text-xs text-amber-700">Self dependency is blocked in UI.</p>
            ) : null}

            <div className="space-y-2">
              {dependencies.map((dependency) => (
                <div
                  key={dependency.id}
                  className="rounded border border-zinc-200 bg-zinc-50 px-2 py-2 text-xs"
                >
                  <div className="font-medium text-zinc-800">
                    {`${dependency.fromDefinitionId.slice(0, 8)} -> ${dependency.toDefinitionId.slice(0, 8)}`}
                  </div>
                  <div className="text-zinc-600">
                    {dependency.type} / lag {dependency.lagMinutes} min
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteDependency(dependency.id)}
                    disabled={busy || versionMeta?.isPublished === true}
                    className="mt-1 rounded border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {dependencies.length === 0 ? (
                <p className="text-xs text-zinc-500">No dependency definitions yet.</p>
              ) : null}
            </div>
          </section>
        </div>

        <section className="rounded-lg border border-zinc-200 p-3">
          <h2 className="mb-2 text-sm font-semibold">Validation Report</h2>
          {validation ? (
            <div className="space-y-2 text-xs">
              <p
                className={`font-semibold ${
                  validation.ok ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {validation.ok ? 'OK' : 'FAILED'}
              </p>
              {validation.errors.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-red-700">
                  {validation.errors.map((error, index) => (
                    <li key={`${error.code}-${index}`}>
                      {error.code}: {error.message}
                      {error.details ? ` (${error.details})` : ''}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-zinc-600">No validation errors.</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Run validation to view report.</p>
          )}
        </section>
      </div>
    </div>
  )
}

function TaskEditorRow({
  task,
  allTasks,
  roles,
  disabled,
  onSave,
  onDelete,
}: {
  task: TemplateTaskDefinitionRow
  allTasks: TemplateTaskDefinitionRow[]
  roles: RoleOption[]
  disabled: boolean
  onSave: (task: TemplateTaskDefinitionRow) => void
  onDelete: (taskId: string) => void
}) {
  const [draft, setDraft] = useState<TemplateTaskDefinitionRow>(task)

  useEffect(() => {
    setDraft(task)
  }, [task])

  return (
    <div className="rounded border border-zinc-200 bg-zinc-50 p-2 text-xs">
      <div className="mb-1 text-[11px] text-zinc-500">{task.id}</div>
      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        <input
          value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          className="rounded border border-zinc-300 px-2 py-1"
        />
        <select
          value={draft.ownerRoleId}
          onChange={(event) =>
            setDraft((current) => ({ ...current, ownerRoleId: event.target.value }))
          }
          className="rounded border border-zinc-300 px-2 py-1"
        >
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <select
          value={draft.taskLevel}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              taskLevel: event.target.value as TemplateTaskDefinitionRow['taskLevel'],
            }))
          }
          className="rounded border border-zinc-300 px-2 py-1"
        >
          {TASK_LEVELS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          value={draft.visibility}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              visibility: event.target.value as TemplateTaskDefinitionRow['visibility'],
            }))
          }
          className="rounded border border-zinc-300 px-2 py-1"
        >
          {VISIBILITY_VALUES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          value={draft.approvalPolicy}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              approvalPolicy: event.target.value as TemplateTaskDefinitionRow['approvalPolicy'],
            }))
          }
          className="rounded border border-zinc-300 px-2 py-1"
        >
          {APPROVAL_POLICIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          value={draft.clockMode}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              clockMode: event.target.value as TemplateTaskDefinitionRow['clockMode'],
            }))
          }
          className="rounded border border-zinc-300 px-2 py-1"
        >
          {CLOCK_MODES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          value={draft.parentDefinitionId ?? ''}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              parentDefinitionId: event.target.value || null,
            }))
          }
          className="rounded border border-zinc-300 px-2 py-1 md:col-span-2"
        >
          <option value="">No parent</option>
          {allTasks
            .filter((candidate) => candidate.id !== task.id)
            .map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
        </select>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSave(draft)}
          disabled={disabled}
          className="rounded bg-zinc-900 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          disabled={disabled}
          className="rounded border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-700 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
