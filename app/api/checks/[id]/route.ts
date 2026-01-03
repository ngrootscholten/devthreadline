import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../auth/[...nextauth]/route';
import { getPool } from '../../../lib/db';

/**
 * GET /api/checks/[id]
 * Returns detailed information about a specific check
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

    const { id: checkId } = await params;
    const pool = getPool();
    
    // Get account_id from session (set by NextAuth session callback)
    if (!session.user.accountId) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      );
    }
    
    const accountId = session.user.accountId;
    
    // Get check metadata
    // Allow access if user_id matches OR if account_id matches
    const checkResult = await pool.query(
      `SELECT 
        c.id,
        c.repo_name,
        c.branch_name,
        c.commit_sha,
        c.review_context,
        c.environment,
        c.llm_model,
        c.cli_version,
        c.diff_lines_added,
        c.diff_lines_removed,
        c.diff_total_lines,
        c.files_changed_count,
        c.context_files_count,
        c.context_files_total_lines,
        c.threadlines_count,
        c.created_at
      FROM checks c
      WHERE c.id = $1 AND (c.user_id = $2 OR c.account_id = $3)`,
      [checkId, session.user.id, accountId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Check not found' },
        { status: 404 }
      );
    }

    const check = checkResult.rows[0];

    // Get lightweight threadlines list (no content, no diff, no context files)
    const threadlinesResult = await pool.query(
      `SELECT 
        ct.id as check_threadline_id,
        ct.threadline_id,
        ct.threadline_definition_id,
        td.threadline_version,
        cr.id as result_id,
        cr.status,
        cr.file_references
      FROM check_threadlines ct
      INNER JOIN threadline_definitions td ON ct.threadline_definition_id = td.id
      LEFT JOIN check_results cr ON ct.id = cr.check_threadline_id
      WHERE ct.check_id = $1
      ORDER BY ct.created_at`,
      [checkId]
    );

    // Calculate summary stats
    const threadlines = threadlinesResult.rows.map(row => ({
      checkThreadlineId: row.check_threadline_id,
      threadlineId: row.threadline_id,
      threadlineDefinitionId: row.threadline_definition_id,
      version: row.threadline_version,
      status: row.status || 'not_relevant',
      resultId: row.result_id || null,
      hasViolations: row.status === 'attention',
      fileReferences: row.file_references || []
    }));

    const passed = threadlines.filter(t => t.status === 'compliant').length;
    const failed = threadlines.filter(t => t.status === 'attention').length;
    const notRelevant = threadlines.filter(t => t.status === 'not_relevant').length;

    return NextResponse.json({
      check: {
        id: check.id,
        repoName: check.repo_name,
        branchName: check.branch_name,
        commitSha: check.commit_sha,
        reviewContext: check.review_context,
        environment: check.environment,
        llmModel: check.llm_model,
        cliVersion: check.cli_version,
        diffStats: {
          added: check.diff_lines_added,
          removed: check.diff_lines_removed,
          total: check.diff_total_lines
        },
        filesChangedCount: check.files_changed_count,
        contextFilesCount: check.context_files_count,
        contextFilesTotalLines: check.context_files_total_lines,
        threadlinesCount: check.threadlines_count,
        createdAt: check.created_at.toISOString(),
        summary: {
          total: threadlines.length,
          passed,
          failed,
          notRelevant,
          allPassed: failed === 0
        },
        threadlines
      }
    });
  } catch (error: any) {
    console.error('Error fetching check details:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch check details' },
      { status: 500 }
    );
  }
}

