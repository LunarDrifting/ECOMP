import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { name: 'Default Tenant' },
      select: { id: true },
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Default Tenant not found' },
        { status: 404 }
      )
    }

    const template = await prisma.template.create({
      data: {
        name: 'Test Template',
        tenantId: tenant.id,
      },
      select: { id: true },
    })

    const templateVersion = await prisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: 'v1',
        isPublished: true,
      },
      select: { id: true },
    })

    const eco = await prisma.eCO.create({
      data: {
        title: 'Test ECO',
        tenantId: tenant.id,
      },
      select: { id: true },
    })

    return NextResponse.json({
      tenantId: tenant.id,
      templateId: template.id,
      templateVersionId: templateVersion.id,
      ecoId: eco.id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
