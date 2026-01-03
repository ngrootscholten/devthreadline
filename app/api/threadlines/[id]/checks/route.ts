import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth/[...nextauth]/route';
import { getPool } from '../../../../lib/db';
import { extractFilesFromDiff } from '../../../../lib/utils/diff-filter';

/**
 * GET /api/threadlines/[id]/checks
 * Returns recent checks for a specific threadline definition with full details
 * Query params: limit (default: 10)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const pool = getPool();
    
    // Get account_id from session
    if (!session.user.accountId) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      );
    }
    
    const accountId = session.user.accountId;
    
    // Get limit from query params (default: 10)
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    
    // Verify threadline definition exists and belongs to account
    const definitionCheck = await pool.query(
      `SELECT id FROM threadline_definitions 
       WHERE id = $1 AND account_id = $2`,
      [id, accountId]
    );

    if (definitionCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Threadline not found' },
        { status: 404 }
      );
    }

    // Get recent checks with full details
    const checksResult = await pool.query(
      `SELECT 
        c.id as check_id,
        c.created_at,
        c.repo_name,
        c.branch_name,
        c.commit_sha,
        c.commit_message,
        c.environment,
        cr.status,
        cr.reasoning,
        cr.file_references,
        ct.relevant_files,
        ct.filtered_diff,
        ct.files_in_filtered_diff,
        td.threadline_patterns as patterns,
        cd.diff_content
      FROM check_threadlines ct
      INNER JOIN checks c ON ct.check_id = c.id
      LEFT JOIN check_results cr ON ct.id = cr.check_threadline_id
      INNER JOIN threadline_definitions td ON ct.threadline_definition_id = td.id
      LEFT JOIN check_diffs cd ON c.id = cd.check_id
      WHERE ct.threadline_definition_id = $1 AND ct.account_id = $2
      ORDER BY c.created_at DESC
      LIMIT $3`,
      [id, accountId, limit]
    );

    const checks = checksResult.rows.map(row => {
      const allChangedFiles = row.diff_content ? extractFilesFromDiff(row.diff_content) : [];
      
      return {
        checkId: row.check_id,
        createdAt: row.created_at.toISOString(),
        repoName: row.repo_name,
        branchName: row.branch_name,
        commitSha: row.commit_sha,
        commitMessage: row.commit_message,
        environment: row.environment,
        status: row.status || 'not_relevant',
        result: {
          status: row.status || 'not_relevant',
          reasoning: row.reasoning || null,
          fileReferences: row.file_references || []
        },
        relevantFiles: row.relevant_files || [],
        filesInFilteredDiff: row.files_in_filtered_diff || [],
        filteredDiff: row.filtered_diff || null,
        allChangedFiles,
        patterns: row.patterns || []
      };
    });

    return NextResponse.json({
      checks
    });
  } catch (error: unknown) {
    console.error('Error fetching threadline checks:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch threadline checks';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

