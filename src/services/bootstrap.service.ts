import { prisma } from '@/lib/prisma'
import { tenantDb } from '@/lib/db'

export async function bootstrapSystem() {
  let tenant = await prisma.tenant.findFirst({
    where: { name: 'Default Tenant' },
  })

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Default Tenant',
      },
    })
  }

  const db = tenantDb(tenant.id)

  let user = await prisma.user.findUnique({
    where: { email: 'admin@ecomp.local' },
  })

  if (!user) {
    user = await db.user.create({
      data: {
        email: 'admin@ecomp.local',
        name: 'Admin User',
      },
    })
  }

  let role = await prisma.role.findFirst({
    where: {
      name: 'ADMIN',
      tenantId: tenant.id,
    },
  })

  if (!role) {
    role = await db.role.create({
      data: {
        name: 'ADMIN',
      },
    })
  }

  const existingUserRole = await prisma.userRole.findFirst({
    where: {
      userId: user.id,
      roleId: role.id,
    },
  })

  if (!existingUserRole) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
      },
    })
  }

  return {
    tenant,
    user,
    role,
  }
}