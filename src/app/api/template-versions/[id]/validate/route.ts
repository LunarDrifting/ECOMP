import { NextRequest, NextResponse } from 'next/server'
import { validateTemplateVersionBlueprint } from '@/services/template-builder.service'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: templateVersionId } = await context.params
    const body = await req.json()
    const { tenantId } = body

    if (!templateVersionId || !tenantId) {
      return NextResponse.json(
        { error: 'templateVersion id and tenantId are required' },
        { status: 400 }
      )
    }

    const result = await validateTemplateVersionBlueprint({
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
