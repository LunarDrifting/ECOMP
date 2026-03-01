import { NextRequest, NextResponse } from 'next/server'
import { markTaskNotRequired } from '@/services/task-customization.service'
import { ILLEGAL_STATE_TRANSITION_ERROR } from '@/services/state-transition.service'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id: taskId } = await context.params
    const body = await req.json()
    const { tenantId, actorId, state } = body

    if (!taskId || !tenantId || !state) {
      return NextResponse.json(
        { error: 'task id, tenantId, and state are required' },
        { status: 400 }
      )
    }

    if (state !== 'NOT_REQUIRED') {
      return NextResponse.json(
        { error: 'only state NOT_REQUIRED is supported' },
        { status: 400 }
      )
    }

    const result = await markTaskNotRequired({
      tenantId,
      taskId,
      actorId,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    if (message === ILLEGAL_STATE_TRANSITION_ERROR) {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
