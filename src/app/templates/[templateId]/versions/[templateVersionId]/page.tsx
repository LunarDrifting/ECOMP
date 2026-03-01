import { TemplateVersionEditorClient } from '@/components/templates/template-version-editor-client'

type TemplateVersionEditorPageProps = {
  params: Promise<{
    templateId: string
    templateVersionId: string
  }>
  searchParams?: Promise<{
    tenantId?: string
  }>
}

export default async function TemplateVersionEditorPage({
  params,
  searchParams,
}: TemplateVersionEditorPageProps) {
  const { templateId, templateVersionId } = await params
  const query = (await searchParams) ?? {}

  return (
    <TemplateVersionEditorClient
      templateId={templateId}
      templateVersionId={templateVersionId}
      initialTenantId={query.tenantId ?? ''}
    />
  )
}
