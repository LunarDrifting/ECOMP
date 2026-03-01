import { NextRequest, NextResponse } from 'next/server'
import { createTemplate, listTemplates } from '@/services/template-builder.service'

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.nextUrl.searchParams.get('tenantId')
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const result = await listTemplates({ tenantId })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenantId, name } = body

    if (!tenantId || !name) {
      return NextResponse.json(
        { error: 'tenantId and name are required' },
        { status: 400 }
      )
    }

    const result = await createTemplate({ tenantId, name })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('required')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }

    if (message.includes('already exists')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
