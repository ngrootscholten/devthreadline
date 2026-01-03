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
    
    // Verify threadline definition exists and belongs to account, get identity_hash
    const definitionCheck = await pool.query(
      `SELECT id, identity_hash FROM threadline_definitions 
       WHERE id = $1 AND account_id = $2`,
      [id, accountId]
    );

    if (definitionCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Threadline not found' },
        { status: 404 }
      );
    }

    const identityHash = definitionCheck.rows[0].identity_hash;

    // Get statistics for THIS VERSION
    const thisVersionStatsResult = await pool.query(
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

    const thisVersionStats = thisVersionStatsResult.rows[0];

    // Get total number of versions (all threadline_definitions with same identity_hash)
    const versionsCountResult = await pool.query(
      `SELECT COUNT(*) as total_versions
       FROM threadline_definitions
       WHERE identity_hash = $1 AND account_id = $2`,
      [identityHash, accountId]
    );

    const totalVersions = parseInt(versionsCountResult.rows[0].total_versions) || 0;

    // Get all version IDs with the same identity_hash
    const allVersionsResult = await pool.query(
      `SELECT id FROM threadline_definitions
       WHERE identity_hash = $1 AND account_id = $2`,
      [identityHash, accountId]
    );

    const allVersionIds = allVersionsResult.rows.map(row => row.id);

    // Get statistics across ALL VERSIONS
    let allVersionsStats = {
      totalChecks: 0,
      compliant: 0,
      attention: 0,
      notRelevant: 0
    };

    if (allVersionIds.length > 0) {
      const allVersionsStatsResult = await pool.query(
        `SELECT 
          COUNT(*) as total_checks,
          COUNT(CASE WHEN cr.status = 'compliant' THEN 1 END) as compliant,
          COUNT(CASE WHEN cr.status = 'attention' THEN 1 END) as attention,
          COUNT(CASE WHEN cr.status = 'not_relevant' OR cr.status IS NULL THEN 1 END) as not_relevant
        FROM check_threadlines ct
        LEFT JOIN check_results cr ON ct.id = cr.check_threadline_id
        WHERE ct.threadline_definition_id = ANY($1::text[]) AND ct.account_id = $2`,
        [allVersionIds, accountId]
      );

      const allVersionsStatsRow = allVersionsStatsResult.rows[0];
      allVersionsStats = {
        totalChecks: parseInt(allVersionsStatsRow.total_checks) || 0,
        compliant: parseInt(allVersionsStatsRow.compliant) || 0,
        attention: parseInt(allVersionsStatsRow.attention) || 0,
        notRelevant: parseInt(allVersionsStatsRow.not_relevant) || 0
      };
    }

    return NextResponse.json({
      statistics: {
        thisVersion: {
          totalChecks: parseInt(thisVersionStats.total_checks) || 0,
          compliant: parseInt(thisVersionStats.compliant) || 0,
          attention: parseInt(thisVersionStats.attention) || 0,
          notRelevant: parseInt(thisVersionStats.not_relevant) || 0
        },
        totalVersions: totalVersions,
        allVersions: allVersionsStats
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

