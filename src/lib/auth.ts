import { prisma } from '@/lib/prisma'

export async function requireRole(
  userId: string,
  tenantId: string,
  requiredRole: string
) {
  const role = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        name: requiredRole,
        tenantId,
      },
    },
    include: {
      role: true,
    },
  })

  if (!role) {
    throw new Error('Forbidden: insufficient role')
  }

  return true
}