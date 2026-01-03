import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../auth/[...nextauth]/route';
import { getPool } from '../../lib/db';

/**
 * GET /api/checks
 * Returns checks for the authenticated user
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

    // Parse filter params
    const authorFilter = searchParams.get('author');
    const environmentFilter = searchParams.get('environment');
    const repoFilter = searchParams.get('repo');

    const pool = getPool();
    
    // Get account_id from session (set by NextAuth session callback)
    if (!session.user.accountId) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      );
    }
    
    const accountId = session.user.accountId;
    
    // Build WHERE conditions for filters - filter by account_id (team-wide visibility)
    const whereConditions: string[] = ['c.account_id = $1'];
    const queryParams: any[] = [accountId];
    let paramIndex = 2;

    if (authorFilter) {
      // Author filter format: "Name|email" or "Name|" or "|email"
      const [name, email] = authorFilter.split('|');
      if (name && email) {
        whereConditions.push(`c.commit_author_name = $${paramIndex} AND c.commit_author_email = $${paramIndex + 1}`);
        queryParams.push(name, email);
        paramIndex += 2;
      } else if (name) {
        whereConditions.push(`c.commit_author_name = $${paramIndex}`);
        queryParams.push(name);
        paramIndex += 1;
      } else if (email) {
        whereConditions.push(`c.commit_author_email = $${paramIndex}`);
        queryParams.push(email);
        paramIndex += 1;
      }
    }

    if (environmentFilter) {
      whereConditions.push(`c.environment = $${paramIndex}`);
      queryParams.push(environmentFilter);
      paramIndex += 1;
    }

    if (repoFilter) {
      whereConditions.push(`c.repo_name = $${paramIndex}`);
      queryParams.push(repoFilter);
      paramIndex += 1;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count and paginated results in one query
    const result = await pool.query(
      `SELECT 
        c.id,
        c.repo_name,
        c.branch_name,
        c.environment,
        c.commit_sha,
        c.commit_message,
        c.commit_author_name,
        c.commit_author_email,
        c.review_context,
        c.diff_lines_added,
        c.diff_lines_removed,
        c.diff_total_lines,
        c.files_changed_count,
        c.threadlines_count,
        c.created_at,
        COUNT(cr.id) FILTER (WHERE cr.status = 'compliant') as compliant_count,
        COUNT(cr.id) FILTER (WHERE cr.status = 'attention') as attention_count,
        COUNT(cr.id) FILTER (WHERE cr.status = 'not_relevant') as not_relevant_count,
        COUNT(*) OVER() as total_count
      FROM checks c
      LEFT JOIN check_threadlines ct ON c.id = ct.check_id
      LEFT JOIN check_results cr ON ct.id = cr.check_threadline_id
      WHERE ${whereClause}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      checks: result.rows.map(row => ({
        id: row.id,
        repoName: row.repo_name,
        branchName: row.branch_name,
        environment: row.environment,
        commitSha: row.commit_sha,
        commitMessage: row.commit_message,
        commitAuthorName: row.commit_author_name,
        commitAuthorEmail: row.commit_author_email,
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
        createdAt: row.created_at.toISOString()
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error: any) {
    console.error('Error fetching checks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch checks' },
      { status: 500 }
    );
  }
}

