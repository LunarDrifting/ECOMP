import { NextRequest, NextResponse } from 'next/server'
import { getEcoAuditTimeline } from '@/services/audit.service'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id: ecoId } = await context.params
    const tenantId = req.nextUrl.searchParams.get('tenantId')

    if (!ecoId || !tenantId) {
      return NextResponse.json(
        { error: 'eco id and tenantId are required' },
        { status: 400 }
      )
    }

    const result = await getEcoAuditTimeline({ tenantId, ecoId })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
