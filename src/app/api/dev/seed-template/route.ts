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

    const existingTemplate = await prisma.template.findFirst({
      where: {
        name: 'Test Template',
        tenantId: tenant.id,
      },
      select: { id: true },
    })

    const template =
      existingTemplate ??
      (await prisma.template.create({
        data: {
          name: 'Test Template',
          tenantId: tenant.id,
        },
        select: { id: true },
      }))

    const existingTemplateVersion = await prisma.templateVersion.findFirst({
      where: {
        templateId: template.id,
        version: 'v1',
      },
      select: { id: true },
    })

    const templateVersion =
      existingTemplateVersion ??
      (await prisma.templateVersion.create({
        data: {
          templateId: template.id,
          version: 'v1',
          isPublished: true,
        },
        select: { id: true },
      }))

    const adminRole = await prisma.role.findFirst({
      where: {
        tenantId: tenant.id,
        name: 'ADMIN',
      },
      select: { id: true },
    })

    if (!adminRole) {
      return NextResponse.json(
        { error: 'ADMIN role not found for tenant' },
        { status: 404 }
      )
    }

    const rootDefinition = await prisma.templateTaskDefinition.create({
      data: {
        templateVersionId: templateVersion.id,
        tenantId: tenant.id,
        name: 'Root Milestone',
        taskLevel: 'MILESTONE',
        ownerRoleId: adminRole.id,
        visibility: 'INTERNAL_ONLY',
        approvalPolicy: 'NONE',
        clockMode: 'ACTIVE',
      },
      select: { id: true },
    })

    const childDefinition = await prisma.templateTaskDefinition.create({
      data: {
        templateVersionId: templateVersion.id,
        tenantId: tenant.id,
        parentDefinitionId: rootDefinition.id,
        name: 'Child Step',
        taskLevel: 'STEP',
        ownerRoleId: adminRole.id,
        visibility: 'INTERNAL_ONLY',
        approvalPolicy: 'NONE',
        clockMode: 'ACTIVE',
      },
      select: { id: true },
    })

    await prisma.templateDependencyDefinition.create({
      data: {
        templateVersionId: templateVersion.id,
        tenantId: tenant.id,
        fromDefinitionId: rootDefinition.id,
        toDefinitionId: childDefinition.id,
        type: 'FINISH_TO_START',
        lagMinutes: 0,
      },
    })

    const eco = await prisma.eCO.create({
      data: {
        title: `Test ECO ${Date.now()}`,
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
