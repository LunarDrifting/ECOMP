import { NextRequest, NextResponse } from 'next/server'
import { deleteTemplateDependencyDefinition } from '@/services/template-builder.service'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id: dependencyDefinitionId } = await context.params
    const body = await req.json().catch(() => ({}))
    const tenantId =
      typeof body.tenantId === 'string'
        ? body.tenantId
        : req.nextUrl.searchParams.get('tenantId')

    if (!dependencyDefinitionId || !tenantId) {
      return NextResponse.json(
        { error: 'dependencyDefinition id and tenantId are required' },
        { status: 400 }
      )
    }

    const result = await deleteTemplateDependencyDefinition({
      tenantId,
      dependencyDefinitionId,
    })
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
