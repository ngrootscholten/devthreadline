import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth/[...nextauth]/route';
import { getPool } from '../../../../../lib/db';
import { extractFilesFromDiff } from '../../../../../lib/utils/diff-filter';

/**
 * GET /api/checks/[id]/threadlines/[threadlineId]
 * Returns full details for a specific threadline within a check
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; threadlineId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id: checkId, threadlineId } = await params;
    const pool = getPool();
    
    // Verify check access first
    const checkAccess = await pool.query(
      `SELECT id FROM checks 
       WHERE id = $1 AND (user_id = $2 OR account = $3)`,
      [checkId, session.user.id, session.user.email]
    );

    if (checkAccess.rows.length === 0) {
      return NextResponse.json(
        { error: 'Check not found' },
        { status: 404 }
      );
    }

    // Get full threadline details
    const threadlineResult = await pool.query(
      `SELECT 
        ct.id as check_threadline_id,
        ct.threadline_id,
        ct.threadline_version,
        ct.threadline_patterns,
        ct.threadline_content,
        ct.context_files,
        ct.context_content,
        ct.relevant_files,
        ct.filtered_diff,
        ct.files_in_filtered_diff,
        cr.id as result_id,
        cr.status,
        cr.reasoning,
        cr.file_references
      FROM check_threadlines ct
      LEFT JOIN check_results cr ON ct.id = cr.check_threadline_id
      WHERE ct.check_id = $1 AND ct.threadline_id = $2`,
      [checkId, threadlineId]
    );

    if (threadlineResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Threadline not found' },
        { status: 404 }
      );
    }

    const row = threadlineResult.rows[0];

    // Get the full diff to extract all changed files
    const diffResult = await pool.query(
      `SELECT diff_content FROM check_diffs WHERE check_id = $1`,
      [checkId]
    );
    
    let allChangedFiles: string[] = [];
    if (diffResult.rows.length > 0 && diffResult.rows[0].diff_content) {
      allChangedFiles = extractFilesFromDiff(diffResult.rows[0].diff_content);
    }

    return NextResponse.json({
      threadline: {
        checkThreadlineId: row.check_threadline_id,
        threadlineId: row.threadline_id,
        version: row.threadline_version,
        patterns: row.threadline_patterns,
        content: row.threadline_content,
        contextFiles: row.context_files,
        contextContent: row.context_content,
        relevantFiles: row.relevant_files || [],
        filteredDiff: row.filtered_diff,
        filesInFilteredDiff: row.files_in_filtered_diff || [],
        allChangedFiles: allChangedFiles,
        result: row.result_id ? {
          id: row.result_id,
          status: row.status,
          reasoning: row.reasoning,
          fileReferences: row.file_references
        } : null
      }
    });
  } catch (error: any) {
    console.error('Error fetching threadline details:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch threadline details' },
      { status: 500 }
    );
  }
}

