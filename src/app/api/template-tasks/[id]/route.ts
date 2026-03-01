import { NextRequest, NextResponse } from 'next/server'
import {
  deleteTemplateTaskDefinition,
  updateTemplateTaskDefinition,
} from '@/services/template-builder.service'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id: taskDefinitionId } = await context.params
    const body = await req.json()
    const {
      tenantId,
      name,
      taskLevel,
      ownerRoleId,
      visibility,
      approvalPolicy,
      clockMode,
      parentDefinitionId,
    } = body

    if (!taskDefinitionId || !tenantId) {
      return NextResponse.json(
        { error: 'taskDefinition id and tenantId are required' },
        { status: 400 }
      )
    }

    const result = await updateTemplateTaskDefinition({
      tenantId,
      taskDefinitionId,
      input: {
        ...(name !== undefined ? { name } : {}),
        ...(taskLevel !== undefined ? { taskLevel } : {}),
        ...(ownerRoleId !== undefined ? { ownerRoleId } : {}),
        ...(visibility !== undefined ? { visibility } : {}),
        ...(approvalPolicy !== undefined ? { approvalPolicy } : {}),
        ...(clockMode !== undefined ? { clockMode } : {}),
        ...(parentDefinitionId !== undefined ? { parentDefinitionId } : {}),
      },
    })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    if (
      message.includes('published') ||
      message.includes('cannot be its own parent') ||
      message.includes('Parent definition')
    ) {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id: taskDefinitionId } = await context.params
    const body = await req.json().catch(() => ({}))
    const tenantId =
      typeof body.tenantId === 'string'
        ? body.tenantId
        : req.nextUrl.searchParams.get('tenantId')

    if (!taskDefinitionId || !tenantId) {
      return NextResponse.json(
        { error: 'taskDefinition id and tenantId are required' },
        { status: 400 }
      )
    }

    const result = await deleteTemplateTaskDefinition({ tenantId, taskDefinitionId })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    if (message.includes('published')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
