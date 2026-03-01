import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/db'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id: tenantId } = await context.params

    if (!tenantId) {
      return NextResponse.json({ error: 'tenant id is required' }, { status: 400 })
    }

    const db = tenantDb(tenantId)
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
