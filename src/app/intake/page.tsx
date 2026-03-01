'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createEco,
  fetchTemplateVersions,
  instantiateEco,
  type TemplateVersionOption,
} from '@/lib/api-client'

export default function IntakePage() {
  const router = useRouter()

  const [tenantId, setTenantId] = useState('')
  const [actorId, setActorId] = useState('')
  const [title, setTitle] = useState('')
  const [ecoId, setEcoId] = useState('')
  const [templateVersionId, setTemplateVersionId] = useState('')
  const [templateVersions, setTemplateVersions] = useState<TemplateVersionOption[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [creatingEco, setCreatingEco] = useState(false)
  const [instantiating, setInstantiating] = useState(false)
  const [message, setMessage] = useState('')

  async function loadTemplateVersions() {
    if (!tenantId) {
      setMessage('tenantId is required')
      return
    }

    setLoadingTemplates(true)
    setMessage('')
    try {
      const result = await fetchTemplateVersions(tenantId)
      if (!result.ok) {
        setMessage(`Template versions load failed (${result.status}): ${result.error}`)
        return
      }

      setTemplateVersions(result.data.templateVersions)
      setTemplateVersionId(result.data.templateVersions[0]?.id ?? '')
      setMessage(`Loaded ${result.data.templateVersions.length} template versions`)
    } finally {
      setLoadingTemplates(false)
    }
  }

  async function handleCreateEco() {
    if (!tenantId || !title.trim()) {
      setMessage('tenantId and ECO title are required')
      return
    }

    setCreatingEco(true)
    setMessage('')
    try {
      const result = await createEco({ tenantId, title: title.trim() })
      if (!result.ok) {
        setMessage(`Create ECO failed (${result.status}): ${result.error}`)
        return
      }

      setEcoId(result.data.ecoId)
      setMessage(`ECO created: ${result.data.ecoId}`)
    } finally {
      setCreatingEco(false)
    }
  }

  async function handleInstantiate() {
    if (!tenantId || !ecoId || !templateVersionId) {
      setMessage('tenantId, ecoId, and templateVersionId are required')
      return
    }

    setInstantiating(true)
    setMessage('')
    try {
      const result = await instantiateEco({
        tenantId,
        ecoId,
        templateVersionId,
        actorId: actorId || undefined,
      })

      if (!result.ok) {
        setMessage(`Instantiate failed (${result.status}): ${result.error}`)
        return
      }

      const params = new URLSearchParams({
        tenantId,
        ecoId,
      })
      if (actorId) {
        params.set('actorId', actorId)
      }

      router.push(`/workflow?${params.toString()}`)
    } finally {
      setInstantiating(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-6 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">ECO Intake + Workflow Launch</h1>
        <p className="text-sm text-slate-600">
          Create ECO, select TemplateVersion, instantiate, and launch workflow view.
        </p>

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

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="ECO title"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void handleCreateEco()}
            disabled={creatingEco}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {creatingEco ? 'Creating…' : 'Create ECO'}
          </button>
        </div>

        <div className="rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
          ECO ID: {ecoId || 'not created yet'}
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
          <select
            value={templateVersionId}
            onChange={(event) => setTemplateVersionId(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">Select TemplateVersion</option>
            {templateVersions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.templateName} / {item.version} ({item.id.slice(0, 8)})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void loadTemplateVersions()}
            disabled={loadingTemplates}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            {loadingTemplates ? 'Loading…' : 'Load Templates'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => void handleInstantiate()}
          disabled={instantiating}
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {instantiating ? 'Instantiating…' : 'Instantiate + Launch Workflow'}
        </button>

        {message ? (
          <p className="rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-700">{message}</p>
        ) : null}
      </div>
    </div>
  )
}
