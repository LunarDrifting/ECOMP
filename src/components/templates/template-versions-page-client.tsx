'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  createDraftTemplateVersion,
  fetchTemplateVersionsForTemplate,
  type TemplateBuilderVersion,
} from '@/lib/api-client'

export function TemplateVersionsPageClient({
  templateId,
  initialTenantId,
}: {
  templateId: string
  initialTenantId: string
}) {
  const [tenantId, setTenantId] = useState(initialTenantId)
  const [versionLabel, setVersionLabel] = useState('')
  const [versions, setVersions] = useState<TemplateBuilderVersion[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  const templateName = useMemo(() => versions[0]?.templateName ?? 'Template', [versions])

  async function loadVersions() {
    if (!tenantId) {
      setMessage('tenantId is required')
      return
    }

    setLoading(true)
    setMessage('')
    try {
      const result = await fetchTemplateVersionsForTemplate({ tenantId, templateId })
      if (!result.ok) {
        setMessage(`Load failed (${result.status}): ${result.error}`)
        return
      }
      setVersions(result.data.versions)
      setMessage(`Loaded ${result.data.versions.length} versions`)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateDraft() {
    if (!tenantId) {
      setMessage('tenantId is required')
      return
    }

    setCreating(true)
    setMessage('')
    try {
      const result = await createDraftTemplateVersion({
        tenantId,
        templateId,
        versionLabel: versionLabel.trim() || undefined,
      })

      if (!result.ok) {
        setMessage(`Create draft failed (${result.status}): ${result.error}`)
        return
      }

      setVersionLabel('')
      setMessage(`Draft created: ${result.data.version}`)
      await loadVersions()
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    if (!initialTenantId) {
      return
    }
    void loadVersions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTenantId, templateId])

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-6 text-zinc-900">
      <div className="mx-auto max-w-4xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Template Versions</h1>
            <p className="text-sm text-zinc-600">{templateName}</p>
          </div>
          <Link href="/templates" className="text-sm text-blue-700 underline">
            Back to templates
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
          <input
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value)}
            placeholder="tenantId"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void loadVersions()}
            disabled={loading}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 disabled:opacity-60"
          >
            {loading ? 'Loading…' : 'Load Versions'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
          <input
            value={versionLabel}
            onChange={(event) => setVersionLabel(event.target.value)}
            placeholder="versionLabel (optional, auto draft-N if blank)"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void handleCreateDraft()}
            disabled={creating}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'Create Draft Version'}
          </button>
        </div>

        {message ? (
          <p className="rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-700">{message}</p>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-3 py-2">Version</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Open</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((version) => (
                <tr key={version.id} className="border-t border-zinc-200">
                  <td className="px-3 py-2 font-medium">{version.version}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-2 py-1 text-xs font-semibold ${
                        version.isPublished
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {version.isPublished ? 'PUBLISHED' : 'DRAFT'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-700">
                    {new Date(version.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/templates/${templateId}/versions/${version.id}?tenantId=${encodeURIComponent(tenantId)}`}
                      className="text-blue-700 underline"
                    >
                      Edit Blueprint
                    </Link>
                  </td>
                </tr>
              ))}
              {versions.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-zinc-500" colSpan={4}>
                    No versions loaded.
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
