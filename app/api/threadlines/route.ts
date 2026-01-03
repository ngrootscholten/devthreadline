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
    
    // Get account_id from session (set by NextAuth session callback)
    if (!session.user.accountId) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      );
    }
    
    const accountId = session.user.accountId;
    
    // Get total count first (before pagination)
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM threadline_definitions WHERE account_id = $1`,
      [accountId]
    );
    const total = parseInt(countResult.rows[0].total) || 0;

    // Get paginated results with statistics
    // Filter by account_id FK
    // Use LEFT JOINs to get statistics for each threadline definition
    const result = await pool.query(
      `SELECT 
        td.id,
        td.threadline_id,
        td.threadline_file_path,
        td.repo_name,
        td.created_at,
        COUNT(DISTINCT ct.check_id) as total_checks,
        COUNT(CASE WHEN cr.status = 'compliant' THEN 1 END) as compliant,
        COUNT(CASE WHEN cr.status = 'attention' THEN 1 END) as attention,
        COUNT(CASE WHEN cr.status = 'not_relevant' OR cr.status IS NULL THEN 1 END) as not_relevant
      FROM threadline_definitions td
      LEFT JOIN check_threadlines ct ON td.id = ct.threadline_definition_id AND ct.account_id = $1
      LEFT JOIN check_results cr ON ct.id = cr.check_threadline_id AND cr.account_id = $1
      WHERE td.account_id = $1
      GROUP BY td.id, td.threadline_id, td.threadline_file_path, td.repo_name, td.created_at
      ORDER BY td.created_at DESC
      LIMIT $2 OFFSET $3`,
      [accountId, limit, offset]
    );
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      threadlines: result.rows.map(row => ({
        id: row.id,
        threadlineId: row.threadline_id,
        filePath: row.threadline_file_path,
        repoName: row.repo_name,
        createdAt: row.created_at.toISOString(),
        results: {
          totalChecks: parseInt(row.total_checks) || 0,
          compliant: parseInt(row.compliant) || 0,
          attention: parseInt(row.attention) || 0,
          notRelevant: parseInt(row.not_relevant) || 0
        }
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

