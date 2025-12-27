import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../[...nextauth]/route'
import { getPool } from '../../../lib/db'
import { generateApiKey, hashApiKey } from '../../../lib/auth/api-key'

/**
 * GET /api/auth/api-key
 * Returns the API key generation date (if exists) or null
 * Does NOT return the actual key for security
 */
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const pool = getPool()
    const result = await pool.query(
      `SELECT api_key_created_at FROM users WHERE id = $1`,
      [session.user.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      hasApiKey: !!result.rows[0].api_key_created_at,
      createdAt: result.rows[0].api_key_created_at || null
    })
  } catch (error: any) {
    console.error('Error fetching API key info:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch API key info' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/auth/api-key
 * Generates a new API key (or regenerates if one exists)
 * Returns the plaintext key ONCE - user must save it immediately
 */
export async function POST() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Generate new API key
    const apiKey = generateApiKey()
    const apiKeyHash = hashApiKey(apiKey)

    // Store hash and timestamp in database
    const pool = getPool()
    await pool.query(
      `UPDATE users 
       SET api_key_hash = $1, 
           api_key_created_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [apiKeyHash, session.user.id]
    )

    // Return plaintext key ONCE - this is the only time user will see it
    return NextResponse.json({
      apiKey,
      createdAt: new Date().toISOString(),
      message: 'API key generated. Save this key immediately - you will not be able to see it again.'
    })
  } catch (error: any) {
    console.error('Error generating API key:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate API key' },
      { status: 500 }
    )
  }
}

