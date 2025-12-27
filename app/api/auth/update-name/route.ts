import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../[...nextauth]/route'
import { getPool } from '../../../lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { name } = await request.json()

    // Name is optional, but if provided, must be a string
    if (name !== null && name !== undefined && typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name must be a string' },
        { status: 400 }
      )
    }

    // Update user's name in database (can be null to clear it)
    const pool = getPool()
    await pool.query(
      `UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2`,
      [name || null, session.user.id]
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating name:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update name' },
      { status: 500 }
    )
  }
}

