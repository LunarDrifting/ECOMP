import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, tenantId } = body

    if (!userId || !tenantId) {
      return NextResponse.json(
        { error: 'userId and tenantId required' },
        { status: 400 }
      )
    }

    await requireRole(userId, tenantId, 'ADMIN')

    return NextResponse.json({
      message: 'Access granted to ADMIN endpoint',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }
}