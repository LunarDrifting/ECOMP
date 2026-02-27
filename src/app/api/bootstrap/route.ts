import { NextResponse } from 'next/server'
import { bootstrapSystem } from '@/services/bootstrap.service'

export async function POST() {
  try {
    const result = await bootstrapSystem()

    return NextResponse.json({
      message: 'Bootstrap complete',
      ...result,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Bootstrap failed' },
      { status: 500 }
    )
  }
}