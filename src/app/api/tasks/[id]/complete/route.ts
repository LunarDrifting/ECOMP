import { NextRequest, NextResponse } from 'next/server'
import { markTaskDone } from '@/services/template-instantiation.service'

const APPROVAL_POLICY_NOT_SATISFIED_ERROR =
  'Approval policy requirements not satisfied'
const ILLEGAL_STATE_TRANSITION_ERROR = 'Illegal state transition'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: taskId } = await context.params
    const body = await req.json()
    const { tenantId, actorId } = body

    if (!taskId || !tenantId || !actorId) {
      return NextResponse.json(
        { error: 'task id, tenantId, and actorId are required' },
        { status: 400 }
      )
    }

    const result = await markTaskDone({ tenantId, taskId, actorId })

    return NextResponse.json({
      message: 'Task completion processed',
      ...result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    if (message.includes('BLOCKED')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    if (message.includes('Forbidden:')) {
      return NextResponse.json({ error: message }, { status: 403 })
    }

    if (message === APPROVAL_POLICY_NOT_SATISFIED_ERROR) {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    if (message === ILLEGAL_STATE_TRANSITION_ERROR) {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    if (message.includes('Precondition gate failed')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
