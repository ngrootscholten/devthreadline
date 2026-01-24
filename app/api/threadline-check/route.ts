import { NextRequest, NextResponse } from 'next/server';
import { processThreadlines } from '@/app/lib/processors/expert';
import { getPool } from '@/app/lib/db';
import { storeCheckAndMetrics } from '../../lib/audit/store-check-and-metrics';

export interface ReviewRequest {
  threadlines: Array<{
    id: string;
    version: string;
    patterns: string[];
    content: string;
    filePath: string;
    contextFiles?: string[];
    contextContent?: Record<string, string>;
  }>;
  diff: string;
  files: string[];
  apiKey: string; // Client's Threadline API key for authentication
  account: string;        // REQUIRED: Account identifier
  repoName?: string;     // Raw git remote URL (e.g., "https://github.com/user/repo.git")
  branchName?: string;   // Branch name (e.g., "feature/x")
  commitSha?: string;    // Commit SHA (when commit context available)
  commitMessage?: string; // Commit message (when commit context available)
  commitAuthorName?: string; // Commit author name
  commitAuthorEmail?: string; // Commit author email
  prTitle?: string;      // PR/MR title (when GitLab MR context available)
  environment?: string;  // Environment where check was run: 'vercel', 'github', 'gitlab', 'local'
  cliVersion?: string;  // CLI version that ran this check
  reviewContext: 'local' | 'commit' | 'pr' | 'file' | 'folder' | 'files'; // REQUIRED: Context type - 'local', 'commit', 'pr' (CI), or 'file', 'folder', 'files' (local only)
}

function countLinesInDiff(diff: string): { added: number; removed: number; total: number } {
  // Count lines that start with + or - (excluding the diff header lines)
  const lines = diff.split('\n');
  let added = 0;
  let removed = 0;
  
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      added++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      removed++;
    }
  }
  
  return { added, removed, total: added + removed };
}

function calculateContextStats(threadlines: ReviewRequest['threadlines']): {
  fileCount: number;
  totalLines: number;
  files: Array<{ path: string; lines: number }>;
} {
  const contextFiles: Map<string, number> = new Map();
  
  for (const threadline of threadlines) {
    if (threadline.contextContent) {
      for (const [filePath, content] of Object.entries(threadline.contextContent)) {
        const lines = content.split('\n').length;
        // If file appears in multiple threadlines, take the max (should be same, but just in case)
        const existing = contextFiles.get(filePath) || 0;
        contextFiles.set(filePath, Math.max(existing, lines));
      }
    }
  }
  
  const files = Array.from(contextFiles.entries()).map(([path, lines]) => ({ path, lines }));
  const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
  
  return {
    fileCount: files.length,
    totalLines,
    files
  };
}

export async function POST(req: NextRequest) {
  // Start timing for entire check (including DB insertion, but not telemetry logging)
  const checkStartedAt = new Date().toISOString();
  
  try {
    const request: ReviewRequest = await req.json();

    // Calculate audit statistics
    const diffStats = countLinesInDiff(request.diff);
    const changedFilesCount = request.files.length;
    const contextStats = calculateContextStats(request.threadlines);
    
    // Audit logging
    console.log(`📥 Received request: POST /api/threadline-check`);
    if (request.environment) {
      console.log(`   Environment: ${request.environment}`);
    }
    console.log(`📊 Audit Statistics:`);
    console.log(`   Code Changes:`);
    console.log(`     - Files changed: ${changedFilesCount}`);
    console.log(`     - Lines added: ${diffStats.added}`);
    console.log(`     - Lines removed: ${diffStats.removed}`);
    console.log(`     - Total lines changed: ${diffStats.total}`);
    console.log(`   Changed Files Sent:`);
    console.log(`     - Count: ${changedFilesCount}`);
    // Calculate total lines in changed files (approximate from diff)
    const changedFilesTotalLines = request.files.length > 0 ? diffStats.total : 0;
    console.log(`     - Total lines (from diff): ${changedFilesTotalLines}`);
    console.log(`   Context Files:`);
    console.log(`     - Count: ${contextStats.fileCount}`);
    console.log(`     - Total lines: ${contextStats.totalLines}`);
    if (contextStats.files.length > 0) {
      console.log(`     - Files: ${contextStats.files.map(f => `${f.path} (${f.lines} lines)`).join(', ')}`);
    }
    console.log(`   Threadlines: ${request.threadlines?.length || 0}`);
    if (request.account) {
      console.log(`   Account: ${request.account}`);
    }
    if (request.repoName) {
      console.log(`   Repository: ${request.repoName}`);
    }
    if (request.branchName) {
      console.log(`   Branch: ${request.branchName}`);
    }

    // Validate request
    if (!request.threadlines || !Array.isArray(request.threadlines) || request.threadlines.length === 0) {
      return NextResponse.json(
        { error: 'threadlines array is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Validate that all threadlines have filePath (required for new schema)
    for (const threadline of request.threadlines) {
      if (!threadline.filePath || typeof threadline.filePath !== 'string' || threadline.filePath.trim() === '') {
        return NextResponse.json(
          { error: `Missing required field 'filePath' for threadline '${threadline.id}'. Please update your Threadline CLI to the latest version.` },
          { status: 400 }
        );
      }
    }

    // Allow empty diff (no code changes) - this is valid
    if (request.diff === undefined || request.diff === null || typeof request.diff !== 'string') {
      return NextResponse.json(
        { error: 'diff must be a string (empty string is allowed for no changes)' },
        { status: 400 }
      );
    }

    // Validate reviewContext - must be one of the allowed values
    const allowedReviewContexts = ['local', 'commit', 'pr', 'file', 'folder', 'files'] as const;
    if (!request.reviewContext || !allowedReviewContexts.includes(request.reviewContext)) {
      return NextResponse.json(
        { 
          error: `reviewContext is required and must be one of: ${allowedReviewContexts.join(', ')}`,
          received: request.reviewContext || '(missing)',
          allowedValues: allowedReviewContexts
        },
        { status: 400 }
      );
    }

    // Handle zero diffs - return success with all threadlines marked as not_relevant
    // No LLM calls are made in this case - early return before processThreadlines()
    if (request.diff.trim() === '') {
      console.log('   ℹ️  No code changes detected (empty diff) - returning not_relevant for all threadlines');
      return NextResponse.json({
        results: request.threadlines.map(t => ({
          expertId: t.id,
          status: 'not_relevant' as const,
          reasoning: 'No code changes detected'
        })),
        metadata: {
          totalThreadlines: request.threadlines.length,
          completed: request.threadlines.length,
          timedOut: 0,
          errors: 0
        },
        message: 'No code changes detected. Diff contains zero lines added or removed.'
      });
    }

    if (!request.files || !Array.isArray(request.files)) {
      return NextResponse.json(
        { error: 'files array is required' },
        { status: 400 }
      );
    }

    // Validate client's Threadline API key
    if (!request.apiKey || typeof request.apiKey !== 'string') {
      return NextResponse.json(
        { error: 'apiKey is required in request body' },
        { status: 400 }
      );
    }

    // Validate account (required)
    if (!request.account || typeof request.account !== 'string') {
      return NextResponse.json(
        { error: 'account is required in request body' },
        { status: 400 }
      );
    }

    // Authentication: Account-level authentication
    // Look up account by identifier (email) and verify API key
    const serverApiKey = process.env.THREADLINE_API_KEY;
    const serverAccount = process.env.THREADLINE_ACCOUNT;
    
    let isAuthenticated = false;
    let userId: string | undefined = undefined;
    let accountId: string | undefined = undefined;
    
    // Try database first - account-level authentication
    try {
      const pool = getPool();
      const accountResult = await pool.query(
        `SELECT id, api_key FROM threadline_accounts WHERE identifier = $1`,
        [request.account]
      );
      
      if (accountResult.rows.length > 0) {
        const storedApiKey = accountResult.rows[0].api_key;
        
        // Compare plaintext API keys
        if (storedApiKey && request.apiKey === storedApiKey) {
          isAuthenticated = true;
          accountId = accountResult.rows[0].id;
          
          // Find user for userId tracking (optional - get first user for this account)
          const userResult = await pool.query(
            `SELECT id FROM users WHERE account_id = $1 LIMIT 1`,
            [accountId]
          );
          
          if (userResult.rows.length > 0) {
            userId = userResult.rows[0].id;
          }
          
          console.log('   ✓ Authenticated via database (account API key)');
        }
      }
    } catch (dbError: any) {
      console.error('Database authentication error:', dbError);
      // Don't fail here - we'll return 401 below
    }
    
    // Fall back to environment variables (backward compatibility for legacy setups)
    if (!isAuthenticated && serverApiKey && serverAccount) {
      if (request.apiKey === serverApiKey && request.account === serverAccount) {
        // For env var auth, try to find account by identifier
        try {
          const pool = getPool();
          const accountResult = await pool.query(
            `SELECT id FROM threadline_accounts WHERE identifier = $1`,
            [request.account]
          );
          if (accountResult.rows.length > 0) {
            accountId = accountResult.rows[0].id;
          }
        } catch (err) {
          // Ignore - accountId remains undefined
        }
        isAuthenticated = true;
        console.log('   ✓ Authenticated via environment variables (backward compatibility)');
        // Note: userId remains undefined for legacy env var auth
      }
    }
    
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Invalid API key or account' },
        { status: 401 }
      );
    }

    // Get OpenAI API key from server environment (server pays for OpenAI)
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'Server configuration error: OPENAI_API_KEY not set' },
        { status: 500 }
      );
    }

    // Process threadlines (use server's OpenAI API key)
    const result = await processThreadlines({ ...request, apiKey: openaiApiKey });

    console.log(`✅ Processed: ${result.results.length} results, ${result.metadata.completed} completed, ${result.metadata.timedOut} timed out, ${result.metadata.errors} errors`);

    // Store check and log metrics (non-blocking - don't fail request if this fails)
    if (accountId) {
      await storeCheckAndMetrics({
        request,
        result,
        diffStats,
        contextStats,
        reviewContext: request.reviewContext,
        checkStartedAt,
        commitSha: request.commitSha,
        commitAuthorName: request.commitAuthorName,
        commitAuthorEmail: request.commitAuthorEmail,
        userId,
        accountId
      });
    } else {
      console.error('⚠️  Account ID not available - skipping check storage');
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ ERROR processing threadline-check:');
    console.error('Message:', error?.message);
    console.error('Name:', error?.name);
    console.error('Stack:', error?.stack);
    console.error('Full error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Internal server error',
        name: error?.name,
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

