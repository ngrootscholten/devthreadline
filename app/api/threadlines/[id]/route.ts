import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../auth/[...nextauth]/route';
import { getPool } from '../../../lib/db';

/**
 * GET /api/threadlines/[id]
 * Returns detailed information about a specific threadline definition
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
    
    // Get account_id from session (set by NextAuth session callback)
    if (!session.user.accountId) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      );
    }
    
    const accountId = session.user.accountId;
    
    // Get account identifier for threadline_definitions (still uses account TEXT field)
    const accountResult = await pool.query(
      `SELECT identifier FROM threadline_accounts WHERE id = $1`,
      [accountId]
    );
    
    if (accountResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }
    
    const accountIdentifier = accountResult.rows[0].identifier;
    
    // Get threadline definition (filtered by account identifier)
    const definitionResult = await pool.query(
      `SELECT 
        td.id,
        td.threadline_id,
        td.threadline_file_path,
        td.threadline_version,
        td.threadline_patterns,
        td.threadline_content,
        td.repo_name,
        td.created_at
      FROM threadline_definitions td
      WHERE td.id = $1 AND td.account = $2`,
      [id, accountIdentifier]
    );

    if (definitionResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Threadline not found' },
        { status: 404 }
      );
    }

    const definition = definitionResult.rows[0];

    return NextResponse.json({
      threadline: {
        id: definition.id,
        threadlineId: definition.threadline_id,
        filePath: definition.threadline_file_path,
        version: definition.threadline_version,
        patterns: definition.threadline_patterns,
        content: definition.threadline_content,
        repoName: definition.repo_name,
        createdAt: definition.created_at.toISOString()
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching threadline details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch threadline details';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

