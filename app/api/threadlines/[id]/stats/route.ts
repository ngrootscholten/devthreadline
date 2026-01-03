import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth/[...nextauth]/route';
import { getPool } from '../../../../lib/db';

/**
 * GET /api/threadlines/[id]/stats
 * Returns statistics about how a threadline has been used across all checks
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

    // Get statistics: total checks and counts by status
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_checks,
        COUNT(CASE WHEN cr.status = 'compliant' THEN 1 END) as compliant,
        COUNT(CASE WHEN cr.status = 'attention' THEN 1 END) as attention,
        COUNT(CASE WHEN cr.status = 'not_relevant' OR cr.status IS NULL THEN 1 END) as not_relevant
      FROM check_threadlines ct
      LEFT JOIN check_results cr ON ct.id = cr.check_threadline_id
      WHERE ct.threadline_definition_id = $1 AND ct.account_id = $2`,
      [id, accountId]
    );

    const stats = statsResult.rows[0];

    return NextResponse.json({
      statistics: {
        totalChecks: parseInt(stats.total_checks) || 0,
        compliant: parseInt(stats.compliant) || 0,
        attention: parseInt(stats.attention) || 0,
        notRelevant: parseInt(stats.not_relevant) || 0
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching threadline statistics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch threadline statistics';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

