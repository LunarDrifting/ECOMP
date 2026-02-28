import type {
  ApprovalPolicy,
  ClockMode,
  DependencyType,
  TaskLevel,
  TaskVisibility,
} from '@prisma/client'
import { testPrisma } from './test-db'

let sequence = 0

function nextName(prefix: string) {
  sequence += 1
  return `${prefix}-${sequence}`
}

export type TenantActorsFixture = {
  tenantId: string
  ownerRoleId: string
  adminRoleId: string
  outsiderRoleId: string
  ownerActorId: string
  adminActorId: string
  outsiderActorId: string
}

export async function createTenantActorsFixture(): Promise<TenantActorsFixture> {
  const tenant = await testPrisma.tenant.create({
    data: {
      name: nextName('tenant'),
    },
  })

  const ownerRole = await testPrisma.role.create({
    data: {
      name: nextName('OWNER_ROLE'),
      tenantId: tenant.id,
    },
  })

  const adminRole = await testPrisma.role.create({
    data: {
      name: 'ADMIN',
      tenantId: tenant.id,
    },
  })

  const outsiderRole = await testPrisma.role.create({
    data: {
      name: nextName('OUTSIDER_ROLE'),
      tenantId: tenant.id,
    },
  })

  const ownerActor = await testPrisma.user.create({
    data: {
      email: `${nextName('owner')}@example.com`,
      tenantId: tenant.id,
    },
  })

  const adminActor = await testPrisma.user.create({
    data: {
      email: `${nextName('admin')}@example.com`,
      tenantId: tenant.id,
    },
  })

  const outsiderActor = await testPrisma.user.create({
    data: {
      email: `${nextName('outsider')}@example.com`,
      tenantId: tenant.id,
    },
  })

  await testPrisma.userRole.createMany({
    data: [
      { userId: ownerActor.id, roleId: ownerRole.id },
      { userId: adminActor.id, roleId: adminRole.id },
      { userId: outsiderActor.id, roleId: outsiderRole.id },
    ],
  })

  return {
    tenantId: tenant.id,
    ownerRoleId: ownerRole.id,
    adminRoleId: adminRole.id,
    outsiderRoleId: outsiderRole.id,
    ownerActorId: ownerActor.id,
    adminActorId: adminActor.id,
    outsiderActorId: outsiderActor.id,
  }
}

type TaskDefinitionInput = {
  key: string
  name: string
  parentKey?: string
  taskLevel?: TaskLevel
  ownerRoleId?: string
  visibility?: TaskVisibility
  approvalPolicy?: ApprovalPolicy
  clockMode?: ClockMode
}

type DependencyDefinitionInput = {
  fromKey: string
  toKey: string
  type?: DependencyType
  lagMinutes?: number
}

export async function createBlueprintFixture(args: {
  tenantId: string
  ownerRoleId: string
  taskDefinitions: TaskDefinitionInput[]
  dependencyDefinitions: DependencyDefinitionInput[]
}) {
  const eco = await testPrisma.eCO.create({
    data: {
      title: nextName('eco'),
      tenantId: args.tenantId,
    },
  })

  const template = await testPrisma.template.create({
    data: {
      name: nextName('template'),
      tenantId: args.tenantId,
    },
  })

  const templateVersion = await testPrisma.templateVersion.create({
    data: {
      templateId: template.id,
      version: nextName('v'),
      isPublished: true,
    },
  })

  const definitionIdByKey = new Map<string, string>()

  for (const definition of args.taskDefinitions) {
    const created = await testPrisma.templateTaskDefinition.create({
      data: {
        templateVersionId: templateVersion.id,
        tenantId: args.tenantId,
        parentDefinitionId: definition.parentKey
          ? definitionIdByKey.get(definition.parentKey) ?? null
          : null,
        name: definition.name,
        taskLevel: definition.taskLevel ?? 'STEP',
        ownerRoleId: definition.ownerRoleId ?? args.ownerRoleId,
        visibility: definition.visibility ?? 'INTERNAL_ONLY',
        approvalPolicy: definition.approvalPolicy ?? 'NONE',
        clockMode: definition.clockMode ?? 'ACTIVE',
      },
    })

    definitionIdByKey.set(definition.key, created.id)
  }

  for (const dependency of args.dependencyDefinitions) {
    await testPrisma.templateDependencyDefinition.create({
      data: {
        templateVersionId: templateVersion.id,
        tenantId: args.tenantId,
        fromDefinitionId: definitionIdByKey.get(dependency.fromKey)!,
        toDefinitionId: definitionIdByKey.get(dependency.toKey)!,
        type: dependency.type ?? 'FINISH_TO_START',
        lagMinutes: dependency.lagMinutes ?? 0,
      },
    })
  }

  return {
    ecoId: eco.id,
    templateVersionId: templateVersion.id,
  }
}

export async function createTaskFixture(args: {
  tenantId: string
  ecoId: string
  ownerRoleId: string
  name: string
  state?: 'NOT_STARTED' | 'BLOCKED' | 'DONE'
  approvalPolicy?: ApprovalPolicy
}) {
  return testPrisma.task.create({
    data: {
      tenantId: args.tenantId,
      ecoId: args.ecoId,
      ownerRoleId: args.ownerRoleId,
      taskLevel: 'STEP',
      name: args.name,
      state: args.state ?? 'NOT_STARTED',
      visibility: 'INTERNAL_ONLY',
      approvalPolicy: args.approvalPolicy ?? 'NONE',
      clockMode: 'ACTIVE',
    },
  })
}
