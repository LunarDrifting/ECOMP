import { NextRequest, NextResponse } from 'next/server'
import { instantiateTemplateForEco } from '@/services/template-instantiation.service'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: ecoId } = await context.params
    const body = await req.json()
    const { tenantId, templateVersionId, actorId } = body

    if (!ecoId || !tenantId || !templateVersionId) {
      return NextResponse.json(
        { error: 'eco id, tenantId, and templateVersionId are required' },
        { status: 400 }
      )
    }

    const result = await instantiateTemplateForEco({
      tenantId,
      ecoId,
      templateVersionId,
      actorId,
    })

    return NextResponse.json({
      message: 'Template instantiated for ECO',
      ...result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    if (message.includes('different TemplateVersion')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    if (
      message.includes('Unresolvable TemplateTaskDefinition hierarchy') ||
      message.includes('No TemplateTaskDefinition rows found') ||
      message.includes('TemplateDependencyDefinition references missing') ||
      message.includes('Self dependency is not allowed')
    ) {
      return NextResponse.json({ error: message }, { status: 422 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
