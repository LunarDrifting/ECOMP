import { NextRequest, NextResponse } from 'next/server'
import { markTaskDone } from '@/services/template-instantiation.service'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: taskId } = await context.params
    const body = await req.json()
    const { tenantId } = body

    if (!taskId || !tenantId) {
      return NextResponse.json(
        { error: 'task id and tenantId are required' },
        { status: 400 }
      )
    }

    const result = await markTaskDone({ tenantId, taskId })

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

    if (message.includes('Approval required')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    if (message.includes('Precondition gate failed')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
