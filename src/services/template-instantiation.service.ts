import { tenantDb } from '@/lib/db'

type InstantiateTemplateForEcoInput = {
  tenantId: string
  ecoId: string
  templateVersionId: string
  actorId?: string
}

export async function instantiateTemplateForEco({
  tenantId,
  ecoId,
  templateVersionId,
  actorId,
}: InstantiateTemplateForEcoInput) {
  const db = tenantDb(tenantId)

  const eco = await db.eco.findById(ecoId)
  if (!eco) {
    throw new Error('ECO not found for tenant')
  }

  const templateVersion = await db.templateVersion.findByIdViaTemplate(
    templateVersionId
  )
  if (!templateVersion) {
    throw new Error('TemplateVersion not found for tenant')
  }

  if (eco.tenantId !== templateVersion.template.tenantId) {
    throw new Error('ECO and Template must belong to same tenant')
  }

  let ecoPlan = await db.ecoPlan.findByEcoId(ecoId)
  let createdEcoPlan = false

  if (!ecoPlan) {
    ecoPlan = await db.ecoPlan.create(ecoId, templateVersionId)
    createdEcoPlan = true
  } else if (ecoPlan.templateVersionId !== templateVersionId) {
    throw new Error('ECOPlan already bound to different TemplateVersion')
  }

  const adminRole =
    (await db.role.findMany({ where: { name: 'ADMIN' }, take: 1 }))[0] ??
    (await db.role.findMany({ take: 1 }))[0]

  if (!adminRole) {
    throw new Error('No role available for task ownership')
  }

  const rootTask = await db.task.createRootPlaceholder(
    ecoId,
    adminRole.id,
    'Root Task Placeholder'
  )

  return {
    ecoId,
    tenantId,
    templateVersionId,
    actorId: actorId ?? null,
    ecoPlanId: ecoPlan.id,
    createdEcoPlan,
    task: rootTask,
  }
}
