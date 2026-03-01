'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  createEco,
  fetchTemplateVersions,
  instantiateEco,
  type TemplateVersionOption,
} from '@/lib/api-client'
import { useDebugMode } from '@/components/workflow/debug-mode'

type WizardStep = 1 | 2 | 3

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
  const [jobTitle, setJobTitle] = useState('')
  const [templates, setTemplates] = useState<TemplateVersionOption[]>([])
  const [templateVersionId, setTemplateVersionId] = useState('')
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [starting, setStarting] = useState(false)
  const [message, setMessage] = useState('')

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === templateVersionId) ?? null,
    [templates, templateVersionId]
  )

  async function loadTemplates() {
    if (!tenantId) {
      setMessage('Workspace is required before picking a template')
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
        setMessage('No live templates found. Add one in Templates first.')
      }
    } finally {
      setLoadingTemplates(false)
    }
  }

  useEffect(() => {
    if (tenantId) {
      void loadTemplates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  async function handleStartJob() {
    if (!tenantId || !jobTitle.trim() || !templateVersionId) {
      setMessage('Job name, workspace, and template are required')
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
        actorId: actorId || undefined,
      })
      if (!instantiateResult.ok) {
        setMessage(`Could not start job (${instantiateResult.status}): ${instantiateResult.error}`)
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

        {debugMode ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <input
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
              placeholder="tenantId"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
            <input
              value={actorId}
              onChange={(event) => setActorId(event.target.value)}
              placeholder="actorId (optional)"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
        ) : null}

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
                disabled={!templateVersionId}
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
                disabled={starting || !jobTitle.trim() || !templateVersionId}
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
