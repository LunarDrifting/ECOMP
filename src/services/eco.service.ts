import { tenantDb } from '@/lib/db'

type ListEcosInput = {
  tenantId: string
}

type CreateEcoInput = {
  tenantId: string
  title: string
}

export async function listEcos({ tenantId }: ListEcosInput) {
  const db = tenantDb(tenantId)
  const ecos = await db.eco.listByTenant()

  return {
    tenantId,
    ecos,
  }
}

export async function createEco({ tenantId, title }: CreateEcoInput) {
  const trimmedTitle = title.trim()
  if (!trimmedTitle) {
    throw new Error('title is required')
  }

  const db = tenantDb(tenantId)
  const eco = await db.eco.create(trimmedTitle)

  return {
    tenantId,
    ecoId: eco.id,
  }
}
