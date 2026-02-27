import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Default Tenant',
      },
    })

    const user = await prisma.user.create({
      data: {
        email: 'admin@ecomp.local',
        name: 'Admin User',
        tenantId: tenant.id,
      },
    })

    const role = await prisma.role.create({
      data: {
        name: 'ADMIN',
        tenantId: tenant.id,
      },
    })

    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
      },
    })

    return NextResponse.json({
      message: 'Bootstrap complete',
      tenant,
      user,
      role,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Bootstrap failed' },
      { status: 500 }
    )
  }
}