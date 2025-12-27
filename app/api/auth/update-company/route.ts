import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../[...nextauth]/route'
import { getPool } from '../../../lib/db'

const pool = getPool()

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { company } = await request.json()

    // Company is optional, but if provided, must be a string
    if (company !== null && company !== undefined && typeof company !== 'string') {
      return NextResponse.json(
        { error: 'Company must be a string' },
        { status: 400 }
      )
    }

    // Update user's company in database (can be null to clear it)
    await pool.query(
      `UPDATE users SET company = $1, updated_at = NOW() WHERE id = $2`,
      [company || null, session.user.id]
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating company:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update company' },
      { status: 500 }
    )
  }
}

