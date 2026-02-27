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

    userRole: prisma.userRole,
  }
}