'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  createEco,
  fetchTenantUsers,
  fetchTemplateVersions,
  instantiateEco,
  type TenantUserOption,
  type TemplateVersionOption,
} from '@/lib/api-client'
import { useDebugMode } from '@/components/workflow/debug-mode'

type WizardStep = 1 | 2 | 3
const TENANT_STORAGE_KEY = 'ecomp_tenantId'
const ACTOR_STORAGE_KEY = 'ecomp_actorId'

function getDefaultTemplateVersionId(templates: TemplateVersionOption[]) {
  const globalLive = templates.find(
    (template) => template.templateName.toLowerCase() === 'global template'
  )
  if (globalLive) {
    return globalLive.id
  }
  return templates[0]?.id ?? ''
}

export function QuickStartWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { debugMode } = useDebugMode()

  const [step, setStep] = useState<WizardStep>(1)
  const [tenantId, setTenantId] = useState(searchParams.get('tenantId') ?? '')
  const [actorId, setActorId] = useState(searchParams.get('actorId') ?? '')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [jobTitle, setJobTitle] = useState('')
  const [users, setUsers] = useState<TenantUserOption[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [templates, setTemplates] = useState<TemplateVersionOption[]>([])
  const [templateVersionId, setTemplateVersionId] = useState('')
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [starting, setStarting] = useState(false)
  const [message, setMessage] = useState('')

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === templateVersionId) ?? null,
    [templates, templateVersionId]
  )

  const selectedActor = useMemo(
    () => users.find((user) => user.id === actorId) ?? null,
    [users, actorId]
  )

  useEffect(() => {
    const searchTenant = searchParams.get('tenantId') ?? ''
    const searchActor = searchParams.get('actorId') ?? ''
    if (searchTenant || searchActor) {
      return
    }

    const storedTenantId = window.localStorage.getItem(TENANT_STORAGE_KEY) ?? ''
    const storedActorId = window.localStorage.getItem(ACTOR_STORAGE_KEY) ?? ''
    if (storedTenantId) {
      setTenantId(storedTenantId)
    }
    if (storedActorId) {
      setActorId(storedActorId)
    }
  }, [searchParams])

  useEffect(() => {
    if (!tenantId) {
      window.localStorage.removeItem(TENANT_STORAGE_KEY)
      return
    }
    window.localStorage.setItem(TENANT_STORAGE_KEY, tenantId)
  }, [tenantId])

  useEffect(() => {
    if (!actorId) {
      window.localStorage.removeItem(ACTOR_STORAGE_KEY)
      return
    }
    window.localStorage.setItem(ACTOR_STORAGE_KEY, actorId)
  }, [actorId])

  async function loadUsers() {
    if (!tenantId) {
      setUsers([])
      return
    }

    setLoadingUsers(true)
    setMessage('')
    try {
      const result = await fetchTenantUsers(tenantId)
      if (!result.ok) {
        setUsers([])
        setMessage(`Could not load users (${result.status}): ${result.error}`)
        return
      }

      setUsers(result.data)
      if (!actorId && result.data[0]?.id) {
        setActorId(result.data[0].id)
      }
      if (actorId && !result.data.some((user) => user.id === actorId)) {
        setActorId(result.data[0]?.id ?? '')
      }
    } finally {
      setLoadingUsers(false)
    }
  }

  async function loadTemplates() {
    if (!tenantId) {
      setTemplates([])
      setTemplateVersionId('')
      return
    }

    setLoadingTemplates(true)
    setMessage('')
    try {
      const result = await fetchTemplateVersions(tenantId)
      if (!result.ok) {
        setMessage(`Could not load templates (${result.status}): ${result.error}`)
        return
      }

      setTemplates(result.data.templateVersions)
      setTemplateVersionId(getDefaultTemplateVersionId(result.data.templateVersions))
      if (result.data.templateVersions.length === 0) {
        setMessage('No live templates yet. Create one in Templates.')
      }
    } finally {
      setLoadingTemplates(false)
    }
  }

  useEffect(() => {
    if (tenantId) {
      void loadUsers()
      void loadTemplates()
      return
    }
    setUsers([])
    setTemplates([])
    setTemplateVersionId('')
    setActorId('')
  }, [tenantId])

  useEffect(() => {
    if (!actorId) {
      return
    }
    if (users.length > 0 && !users.some((user) => user.id === actorId)) {
      setActorId('')
    }
  }, [users, actorId])

  useEffect(() => {
    if (templateVersionId) {
      return
    }
    if (templates.length > 0) {
      setTemplateVersionId(getDefaultTemplateVersionId(templates))
    }
  }, [templates, templateVersionId])

  async function handleStartJob() {
    if (!tenantId || !actorId || !jobTitle.trim() || !templateVersionId) {
      setMessage('Job name, workspace, actor, and template are required')
      return
    }

    setStarting(true)
    setMessage('')
    try {
      const ecoResult = await createEco({ tenantId, title: jobTitle.trim() })
      if (!ecoResult.ok) {
        setMessage(`Could not create job (${ecoResult.status}): ${ecoResult.error}`)
        return
      }

      const instantiateResult = await instantiateEco({
        tenantId,
        ecoId: ecoResult.data.ecoId,
        templateVersionId,
        actorId,
      })
      if (!instantiateResult.ok) {
        setMessage(`Could not start job (${instantiateResult.status}): ${instantiateResult.error}`)
        return
      }

      const params = new URLSearchParams({
        tenantId,
        ecoId: ecoResult.data.ecoId,
      })
      params.set('actorId', actorId)

      router.push(`/workflow?${params.toString()}`)
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-6 text-zinc-900">
      <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">Quick Start Job</h1>
          <p className="text-sm text-zinc-600">
            Start a job in a few steps. You can customize tasks after launch.
          </p>
        </div>

        {!debugMode ? (
          <p className="rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
            Need a brand-new template?{' '}
            <Link href="/templates" className="font-semibold text-blue-700 underline">
              Go to Templates
            </Link>
          </p>
        ) : null}

        <details
          open={settingsOpen || debugMode}
          onToggle={(event) => setSettingsOpen(event.currentTarget.open)}
          className="rounded-xl border border-zinc-200 p-4"
        >
          <summary className="cursor-pointer text-sm font-semibold text-zinc-900">
            Settings {tenantId ? '(Workspace configured)' : '(Required to launch)'}
          </summary>
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <input
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value)}
                placeholder="workspace id"
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
              />
              <button
                type="button"
                onClick={() => void loadUsers()}
                disabled={!tenantId || loadingUsers}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 disabled:opacity-50"
              >
                {loadingUsers ? 'Loading users…' : 'Load users'}
              </button>
            </div>

            <select
              value={actorId}
              onChange={(event) => setActorId(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
              disabled={!tenantId || loadingUsers}
            >
              <option value="">Select actor…</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </select>

            {selectedActor ? (
              <p className="text-xs text-zinc-600">Signed in as {selectedActor.email}</p>
            ) : (
              <p className="text-xs text-zinc-600">Choose an actor to launch and complete tasks.</p>
            )}
          </div>
        </details>

        {step === 1 ? (
          <section className="space-y-3 rounded-xl border border-zinc-200 p-4">
            <p className="text-sm font-semibold text-zinc-900">What are we calling this job?</p>
            <input
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              placeholder="Job name"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!jobTitle.trim()}
                className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-3 rounded-xl border border-zinc-200 p-4">
            <p className="text-sm font-semibold text-zinc-900">Pick a template</p>
            {!tenantId ? (
              <p className="rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
                Open Settings to choose your workspace.
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => void loadTemplates()}
              disabled={loadingTemplates || !tenantId}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 disabled:opacity-50"
            >
              {loadingTemplates ? 'Loading…' : 'Refresh templates'}
            </button>
            <select
              value={templateVersionId}
              onChange={(event) => setTemplateVersionId(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">Select a live template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.templateName === 'Global Template'
                    ? 'Global Template (Live)'
                    : `${template.templateName} (Live)`}
                </option>
              ))}
            </select>
            {tenantId && !loadingTemplates && templates.length === 0 ? (
              <p className="rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
                No live templates yet.{' '}
                <Link href="/templates" className="font-semibold text-blue-700 underline">
                  Create one in Templates.
                </Link>
              </p>
            ) : null}

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!tenantId || !templateVersionId}
                className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-3 rounded-xl border border-zinc-200 p-4">
            <p className="text-sm font-semibold text-zinc-900">Ready to start working?</p>
            <div className="rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
              <p>Job: {jobTitle || '—'}</p>
              <p>Workspace: {tenantId ? 'Configured' : 'Not set'}</p>
              <p>Actor: {selectedActor?.email ?? 'Not set'}</p>
              <p>
                Template:{' '}
                {selectedTemplate
                  ? selectedTemplate.templateName === 'Global Template'
                    ? 'Global Template (Live)'
                    : `${selectedTemplate.templateName} (Live)`
                  : '—'}
              </p>
            </div>
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleStartJob()}
                disabled={starting || !jobTitle.trim() || !tenantId || !actorId || !templateVersionId}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {starting ? 'Starting…' : 'Start job'}
              </button>
            </div>
          </section>
        ) : null}

        {message ? (
          <p className="rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  )
}
