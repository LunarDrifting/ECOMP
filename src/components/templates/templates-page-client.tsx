'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createTemplateForTenant, fetchTemplates, type TemplateOption } from '@/lib/api-client'

export function TemplatesPageClient() {
  const [tenantId, setTenantId] = useState('')
  const [name, setName] = useState('')
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  async function loadTemplates() {
    if (!tenantId) {
      setMessage('tenantId is required')
      return
    }

    setLoading(true)
    setMessage('')
    try {
      const result = await fetchTemplates(tenantId)
      if (!result.ok) {
        setMessage(`Load failed (${result.status}): ${result.error}`)
        return
      }
      setTemplates(result.data.templates)
      setMessage(`Loaded ${result.data.templates.length} templates`)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateTemplate() {
    if (!tenantId || !name.trim()) {
      setMessage('tenantId and template name are required')
      return
    }

    setCreating(true)
    setMessage('')
    try {
      const result = await createTemplateForTenant({
        tenantId,
        name: name.trim(),
      })

      if (!result.ok) {
        setMessage(`Create failed (${result.status}): ${result.error}`)
        return
      }

      setName('')
      setMessage(`Template created: ${result.data.templateId}`)
      await loadTemplates()
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-6 text-zinc-900">
      <div className="mx-auto max-w-4xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold">Template Builder</h1>
        <p className="text-sm text-zinc-600">Create and manage workflow templates by tenant.</p>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
          <input
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value)}
            placeholder="tenantId"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void loadTemplates()}
            disabled={loading}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 disabled:opacity-60"
          >
            {loading ? 'Loading…' : 'Load Templates'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Template name"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void handleCreateTemplate()}
            disabled={creating}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'Create Template'}
          </button>
        </div>

        {message ? (
          <p className="rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-700">{message}</p>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Open</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id} className="border-t border-zinc-200">
                  <td className="px-3 py-2 font-medium text-zinc-900">{template.name}</td>
                  <td className="px-3 py-2 text-zinc-700">
                    {new Date(template.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/templates/${template.id}${tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ''}`}
                      className="text-blue-700 underline"
                    >
                      Versions
                    </Link>
                  </td>
                </tr>
              ))}
              {templates.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-zinc-500" colSpan={3}>
                    No templates loaded.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
