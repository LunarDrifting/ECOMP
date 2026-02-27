import { prisma } from '@/lib/prisma'

export function tenantDb(tenantId: string) {
  if (!tenantId) {
    throw new Error('Tenant ID is required')
  }

  return {
    tenant: {
      findUnique: (args: any) =>
        prisma.tenant.findUnique({
          ...args,
          where: { ...args.where, id: tenantId },
        }),
    },

    user: {
      findMany: (args: any = {}) =>
        prisma.user.findMany({
          ...args,
          where: { ...args.where, tenantId },
        }),

      create: (args: any) =>
        prisma.user.create({
          ...args,
          data: { ...args.data, tenantId },
        }),
    },

    role: {
      findMany: (args: any = {}) =>
        prisma.role.findMany({
          ...args,
          where: { ...args.where, tenantId },
        }),

      create: (args: any) =>
        prisma.role.create({
          ...args,
          data: { ...args.data, tenantId },
        }),
    },

    eco: {
      findById: (ecoId: string) =>
        prisma.eCO.findFirst({
          where: { id: ecoId, tenantId },
        }),
    },

    templateVersion: {
      findByIdViaTemplate: (templateVersionId: string) =>
        prisma.templateVersion.findFirst({
          where: {
            id: templateVersionId,
            template: { tenantId },
          },
          include: {
            template: true,
          },
        }),
    },

    ecoPlan: {
      findByEcoId: (ecoId: string) =>
        prisma.eCOPlan.findFirst({
          where: { ecoId, tenantId },
        }),

      create: (ecoId: string, templateVersionId: string) =>
        prisma.eCOPlan.create({
          data: {
            ecoId,
            templateVersionId,
            tenantId,
          },
        }),
    },

    task: {
      createRootPlaceholder: (ecoId: string, ownerRoleId: string, name: string) =>
        prisma.task.create({
          data: {
            tenantId,
            ecoId,
            ownerRoleId,
            name,
            taskLevel: 'MILESTONE',
            state: 'NOT_STARTED',
            visibility: 'INTERNAL_ONLY',
            approvalPolicy: 'NONE',
            clockMode: 'ACTIVE',
          },
        }),
    },

    userRole: prisma.userRole,
  }
}
