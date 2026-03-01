import { NextRequest, NextResponse } from 'next/server'
import {
  createTemplateVersionDraft,
  listTemplateVersions,
} from '@/services/template-builder.service'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id: templateId } = await context.params
    const tenantId = req.nextUrl.searchParams.get('tenantId')

    if (!templateId || !tenantId) {
      return NextResponse.json(
        { error: 'template id and tenantId are required' },
        { status: 400 }
      )
    }

    const result = await listTemplateVersions({
      tenantId,
      templateId,
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
    const { id: templateId } = await context.params
    const body = await req.json()
    const { tenantId, versionLabel } = body

    if (!templateId || !tenantId) {
      return NextResponse.json(
        { error: 'template id and tenantId are required' },
        { status: 400 }
      )
    }

    const result = await createTemplateVersionDraft({
      tenantId,
      templateId,
      versionLabel,
    })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    if (message.includes('already exists')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
