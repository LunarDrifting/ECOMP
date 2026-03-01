import { NextRequest, NextResponse } from 'next/server'
import { setEcoTaskOrderPreference } from '@/services/task-order.service'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: ecoId } = await context.params
    const body = await req.json()
    const { tenantId, actorId, orderedTaskIds } = body

    if (!ecoId || !tenantId || !Array.isArray(orderedTaskIds)) {
      return NextResponse.json(
        { error: 'eco id, tenantId, and orderedTaskIds are required' },
        { status: 400 }
      )
    }

    if (!orderedTaskIds.every((taskId) => typeof taskId === 'string')) {
      return NextResponse.json(
        { error: 'orderedTaskIds must be a string array' },
        { status: 400 }
      )
    }

    const result = await setEcoTaskOrderPreference({
      tenantId,
      ecoId,
      actorId,
      orderedTaskIds,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    if (message.includes('orderedTaskIds')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
