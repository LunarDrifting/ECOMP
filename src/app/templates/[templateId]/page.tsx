import { TemplateVersionsPageClient } from '@/components/templates/template-versions-page-client'

type TemplateVersionsPageProps = {
  params: Promise<{ templateId: string }>
  searchParams?: Promise<{ tenantId?: string }>
}

export default async function TemplateVersionsPage({
  params,
  searchParams,
}: TemplateVersionsPageProps) {
  const { templateId } = await params
  const query = (await searchParams) ?? {}

  return (
    <TemplateVersionsPageClient
      templateId={templateId}
      initialTenantId={query.tenantId ?? ''}
    />
  )
}
