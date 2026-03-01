import { NextRequest, NextResponse } from 'next/server'
import {
  createTemplateTaskDefinition,
  listTemplateVersionTasks,
} from '@/services/template-builder.service'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id: templateVersionId } = await context.params
    const tenantId = req.nextUrl.searchParams.get('tenantId')

    if (!templateVersionId || !tenantId) {
      return NextResponse.json(
        { error: 'templateVersion id and tenantId are required' },
        { status: 400 }
      )
    }

    const result = await listTemplateVersionTasks({ tenantId, templateVersionId })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: templateVersionId } = await context.params
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

    if (
      !templateVersionId ||
      !tenantId ||
      !name ||
      !taskLevel ||
      !ownerRoleId ||
      !visibility ||
      !approvalPolicy ||
      !clockMode
    ) {
      return NextResponse.json(
        {
          error:
            'templateVersion id, tenantId, name, taskLevel, ownerRoleId, visibility, approvalPolicy, and clockMode are required',
        },
        { status: 400 }
      )
    }

    const result = await createTemplateTaskDefinition({
      tenantId,
      templateVersionId,
      input: {
        name,
        taskLevel,
        ownerRoleId,
        visibility,
        approvalPolicy,
        clockMode,
        parentDefinitionId: parentDefinitionId ?? null,
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
      message.includes('Parent definition') ||
      message.includes('Dependency endpoints') ||
      message.includes('Self dependency')
    ) {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
