import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../auth/[...nextauth]/route';
import { getPool } from '../../lib/db';

/**
 * GET /api/threadlines
 * Returns threadline definitions for the authenticated user's account
 * Each row represents a unique threadline definition (threadline_id + repo_name + file_path)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const pool = getPool();
    
    // Filter by account (email is the account identifier)
    // Use AT TIME ZONE 'UTC' to explicitly mark timestamp as UTC before formatting
    const result = await pool.query(
      `SELECT 
        td.id,
        td.threadline_id,
        td.threadline_file_path,
        td.repo_name,
        TO_CHAR(td.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at_iso
      FROM threadline_definitions td
      WHERE td.account = $1
      ORDER BY td.created_at DESC`,
      [session.user.email]
    );

    return NextResponse.json({
      threadlines: result.rows.map(row => ({
        id: row.id,
        threadlineId: row.threadline_id,
        filePath: row.threadline_file_path,
        repoName: row.repo_name,
        createdAt: row.created_at_iso // Already formatted as ISO 8601 with 'Z' from PostgreSQL
      }))
    });
  } catch (error: unknown) {
    console.error('Error fetching threadlines:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch threadlines';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

