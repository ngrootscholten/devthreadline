import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../auth/[...nextauth]/route';
import { getPool } from '../../lib/db';

/**
 * GET /api/threadlines
 * Returns threadline definitions for the authenticated user's account
 * Each row represents a unique threadline definition (threadline_id + repo_name + file_path)
 * Supports pagination via query params: ?page=1&limit=20
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

    // Parse pagination params
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10))); // Cap at 100, default 20
    const offset = (page - 1) * limit;

    const pool = getPool();
    
    // Get total count and paginated results in one query
    // Filter by account (email is the account identifier)
    // Use AT TIME ZONE 'UTC' to explicitly mark timestamp as UTC before formatting
    const result = await pool.query(
      `SELECT 
        td.id,
        td.threadline_id,
        td.threadline_file_path,
        td.repo_name,
        TO_CHAR(td.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at_iso,
        COUNT(*) OVER() as total_count
      FROM threadline_definitions td
      WHERE td.account = $1
      ORDER BY td.created_at DESC
      LIMIT $2 OFFSET $3`,
      [session.user.email, limit, offset]
    );

    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      threadlines: result.rows.map(row => ({
        id: row.id,
        threadlineId: row.threadline_id,
        filePath: row.threadline_file_path,
        repoName: row.repo_name,
        createdAt: row.created_at_iso // Already formatted as ISO 8601 with 'Z' from PostgreSQL
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
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

