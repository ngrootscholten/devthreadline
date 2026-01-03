import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth/[...nextauth]/route';
import { getPool } from '../../../../lib/db';

/**
 * GET /api/checks/[id]/summary
 * Returns lightweight summary of threadline results for a check
 * Used for tooltips - only returns threadline IDs grouped by status
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
    
    // Verify check access first
    const checkAccess = await pool.query(
      `SELECT id FROM checks 
       WHERE id = $1 AND (user_id = $2 OR account_id = $3)`,
      [checkId, session.user.id, accountId]
    );

    if (checkAccess.rows.length === 0) {
      return NextResponse.json(
        { error: 'Check not found' },
        { status: 404 }
      );
    }

    // Get lightweight threadline results - only threadline_id and status
    const result = await pool.query(
      `SELECT 
        ct.threadline_id,
        cr.status
      FROM check_threadlines ct
      LEFT JOIN check_results cr ON ct.id = cr.check_threadline_id
      WHERE ct.check_id = $1
      ORDER BY ct.threadline_id`,
      [checkId]
    );

    // Group threadline IDs by status
    const compliant: string[] = [];
    const attention: string[] = [];
    const notRelevant: string[] = [];

    result.rows.forEach(row => {
      const threadlineId = row.threadline_id;
      const status = row.status || 'not_relevant';
      
      if (status === 'compliant') {
        compliant.push(threadlineId);
      } else if (status === 'attention') {
        attention.push(threadlineId);
      } else {
        notRelevant.push(threadlineId);
      }
    });

    return NextResponse.json({
      compliant,
      attention,
      notRelevant,
      total: result.rows.length
    });
  } catch (error: unknown) {
    console.error('Error fetching check summary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch check summary';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

