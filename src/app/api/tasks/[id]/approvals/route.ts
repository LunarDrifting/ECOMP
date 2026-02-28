import { NextRequest, NextResponse } from 'next/server'
import { createApproval } from '@/services/approval.service'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: taskId } = await context.params
    const body = await req.json()
    const { tenantId, actorId, decision, comment } = body

    if (!taskId || !tenantId || !actorId || !decision) {
      return NextResponse.json(
        { error: 'task id, tenantId, actorId, and decision are required' },
        { status: 400 }
      )
    }

    if (decision !== 'APPROVED' && decision !== 'REJECTED') {
      return NextResponse.json(
        { error: 'decision must be APPROVED or REJECTED' },
        { status: 400 }
      )
    }

    const result = await createApproval({
      tenantId,
      taskId,
      actorId,
      decision,
      comment,
    })

    return NextResponse.json({
      message: 'Approval created',
      ...result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    if (message.includes('Forbidden:')) {
      return NextResponse.json({ error: message }, { status: 403 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
