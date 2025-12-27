import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../auth/[...nextauth]/route';
import { getPool } from '../../lib/db';

/**
 * GET /api/checks
 * Returns the most recent checks for the authenticated user
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
    
    // Get the 10 most recent checks for this user
    const result = await pool.query(
      `SELECT 
        c.id,
        c.repo_name,
        c.environment,
        c.commit_sha,
        c.review_context,
        c.diff_lines_added,
        c.diff_lines_removed,
        c.diff_total_lines,
        c.files_changed_count,
        c.threadlines_count,
        c.created_at,
        COUNT(cr.id) FILTER (WHERE cr.status = 'compliant') as compliant_count,
        COUNT(cr.id) FILTER (WHERE cr.status = 'attention') as attention_count,
        COUNT(cr.id) FILTER (WHERE cr.status = 'not_relevant') as not_relevant_count
      FROM checks c
      LEFT JOIN check_threadlines ct ON c.id = ct.check_id
      LEFT JOIN check_results cr ON ct.id = cr.check_threadline_id
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT 10`,
      [session.user.id]
    );

    return NextResponse.json({
      checks: result.rows.map(row => ({
        id: row.id,
        repoName: row.repo_name,
        environment: row.environment,
        commitSha: row.commit_sha,
        reviewContext: row.review_context,
        diffStats: {
          added: row.diff_lines_added,
          removed: row.diff_lines_removed,
          total: row.diff_total_lines
        },
        filesChangedCount: row.files_changed_count,
        threadlinesCount: row.threadlines_count,
        results: {
          compliant: parseInt(row.compliant_count) || 0,
          attention: parseInt(row.attention_count) || 0,
          notRelevant: parseInt(row.not_relevant_count) || 0
        },
        createdAt: row.created_at
      }))
    });
  } catch (error: any) {
    console.error('Error fetching checks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch checks' },
      { status: 500 }
    );
  }
}

