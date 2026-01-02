import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../auth/[...nextauth]/route';
import { getPool } from '../../../lib/db';

/**
 * GET /api/checks/filters
 * Returns distinct filter values for the authenticated user's checks
 * Used to populate filter dropdowns
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
    
    // Get distinct authors (name + email)
    const authorsResult = await pool.query(
      `SELECT DISTINCT 
        commit_author_name,
        commit_author_email
      FROM checks
      WHERE user_id = $1 
        AND (commit_author_name IS NOT NULL OR commit_author_email IS NOT NULL)
      ORDER BY commit_author_name NULLS LAST, commit_author_email NULLS LAST`,
      [session.user.id]
    );

    // Format authors as "Name <email>" or just email if no name
    const authors = authorsResult.rows
      .map(row => {
        const name = row.commit_author_name;
        const email = row.commit_author_email;
        if (name && email) {
          return { value: `${name}|${email}`, label: `${name} <${email}>` };
        } else if (name) {
          return { value: `${name}|`, label: name };
        } else if (email) {
          return { value: `|${email}`, label: email };
        }
        return null;
      })
      .filter((item): item is { value: string; label: string } => item !== null);

    // Get distinct environments
    const environmentsResult = await pool.query(
      `SELECT DISTINCT environment
      FROM checks
      WHERE user_id = $1
      ORDER BY environment NULLS LAST`,
      [session.user.id]
    );

    const environments = environmentsResult.rows
      .map(row => row.environment)
      .filter((env): env is string => env !== null)
      .map(env => ({ value: env, label: env }));

    // Get distinct repositories
    const reposResult = await pool.query(
      `SELECT DISTINCT repo_name
      FROM checks
      WHERE user_id = $1
        AND repo_name IS NOT NULL
      ORDER BY repo_name`,
      [session.user.id]
    );

    // Format repository names for display (same logic as dashboard)
    const formatRepoName = (repoName: string): string => {
      if (!repoName.includes('://') && repoName.includes('/')) {
        return repoName;
      }
      try {
        const url = new URL(repoName);
        const pathParts = url.pathname.split('/').filter(Boolean);
        const lastPart = pathParts[pathParts.length - 1];
        const repoPart = lastPart?.endsWith('.git') ? lastPart.slice(0, -4) : lastPart;
        if (pathParts.length >= 2) {
          return `${pathParts[pathParts.length - 2]}/${repoPart}`;
        }
        return repoPart || repoName;
      } catch {
        return repoName;
      }
    };

    const repositories = reposResult.rows
      .map(row => row.repo_name)
      .filter((repo): repo is string => repo !== null)
      .map(repo => ({ value: repo, label: formatRepoName(repo) }));

    return NextResponse.json({
      authors,
      environments,
      repositories
    });
  } catch (error: unknown) {
    console.error('Error fetching filter options:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch filter options';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

