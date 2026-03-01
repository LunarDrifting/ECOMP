import { NextRequest, NextResponse } from 'next/server'
import {
  createTemplateDependencyDefinition,
  listTemplateVersionDependencies,
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

    const result = await listTemplateVersionDependencies({
      tenantId,
      templateVersionId,
    })
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
    const { tenantId, fromDefinitionId, toDefinitionId, type, lagMinutes } = body

    if (
      !templateVersionId ||
      !tenantId ||
      !fromDefinitionId ||
      !toDefinitionId ||
      !type ||
      lagMinutes === undefined
    ) {
      return NextResponse.json(
        {
          error:
            'templateVersion id, tenantId, fromDefinitionId, toDefinitionId, type, and lagMinutes are required',
        },
        { status: 400 }
      )
    }

    const result = await createTemplateDependencyDefinition({
      tenantId,
      templateVersionId,
      fromDefinitionId,
      toDefinitionId,
      type,
      lagMinutes,
    })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    if (
      message.includes('published') ||
      message.includes('Self dependency') ||
      message.includes('Dependency endpoints')
    ) {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
