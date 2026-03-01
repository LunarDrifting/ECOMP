import { tenantDb } from '@/lib/db'

type ListTemplateVersionsInput = {
  tenantId: string
}

export async function listPublishedTemplateVersions({
  tenantId,
}: ListTemplateVersionsInput) {
  const db = tenantDb(tenantId)
  const templateVersions = await db.templateVersion.listPublishedByTenant()

  return {
    tenantId,
    templateVersions: templateVersions.map((item) => ({
      id: item.id,
      templateId: item.templateId,
      templateName: item.template.name,
      version: item.version,
      isPublished: item.isPublished,
      createdAt: item.createdAt,
    })),
  }
}
