import { NextRequest, NextResponse } from 'next/server';
import { processThreadlines } from '../../lib/processors/expert';
import { getPool } from '../../lib/db';
import { hashApiKey } from '../../lib/auth/api-key';
import { storeCheck } from '../../lib/audit/store-check';
import { logLLMCallMetrics, logCheckSummaryMetrics } from '../../lib/metrics/logger';
import { ProcessThreadlineResult } from '../../lib/processors/single-expert';

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
        `SELECT id, api_key_hash FROM threadline_accounts WHERE identifier = $1`,
        [request.account]
      );
      
      if (accountResult.rows.length > 0) {
        const storedHash = accountResult.rows[0].api_key_hash;
        const providedHash = hashApiKey(request.apiKey);
        
        if (providedHash === storedHash) {
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

    // Determine review context type
    // Note: We infer from available data - could be enhanced with explicit context field in request
    let reviewContext = 'local';
    if (request.repoName && request.branchName) {
      reviewContext = 'branch'; // Most common case - branch review
    }
    // TODO: Could add explicit review_context field to request for more precise tracking

    // Store check in audit database (non-blocking - don't fail request if this fails)
    let checkId: string | null = null;
    try {
      if (!accountId) {
        throw new Error('Account ID is required but not available');
      }
      checkId = await storeCheck({
        request,
        result,
        diffStats,
        contextStats,
        reviewContext,
        commitSha: request.commitSha,
        commitAuthorName: request.commitAuthorName,
        commitAuthorEmail: request.commitAuthorEmail,
        userId,
        accountId
      });
    } catch (auditError: any) {
      console.error('⚠️  Failed to store check in audit database (non-fatal):', auditError);
      // Continue - don't fail the request if audit storage fails
    }

    // Capture finish time (after DB storage, before telemetry logging)
    const checkFinishedAt = new Date().toISOString();
    const checkTotalTimeMs = new Date(checkFinishedAt).getTime() - new Date(checkStartedAt).getTime();

    // Log metrics (non-blocking - don't fail request if this fails)
    if (checkId) {
      try {
        // Get check_threadline_id mapping for LLM call metrics
        const pool = getPool();
        const threadlineMappingResult = await pool.query(
          `SELECT id, threadline_id FROM check_threadlines WHERE check_id = $1`,
          [checkId]
        );
        const threadlineIdToCheckThreadlineId = new Map<string, string>();
        threadlineMappingResult.rows.forEach((row: { id: string; threadline_id: string }) => {
          threadlineIdToCheckThreadlineId.set(row.threadline_id, row.id);
        });

        // Log LLM call metrics for each threadline that had an LLM call
        for (let i = 0; i < result.results.length; i++) {
          const threadlineResult = result.results[i];
          const threadline = request.threadlines[i];
          
          // Only log if this is a ProcessThreadlineResult with metrics (i.e., had an LLM call)
          if ('llmCallMetrics' in threadlineResult && threadlineResult.llmCallMetrics) {
            const metrics = threadlineResult.llmCallMetrics;
            const checkThreadlineId = threadlineIdToCheckThreadlineId.get(threadline.id) || null;
            
            await logLLMCallMetrics(
              checkId,
              checkThreadlineId,
              {
                type: 'llm_call',
                threadline_id: threadline.id,
                model: result.metadata.llmModel || 'unknown',
                status: metrics.status,
                error_message: metrics.errorMessage,
                timing: {
                  started_at: metrics.startedAt,
                  finished_at: metrics.finishedAt,
                  response_time_ms: metrics.responseTimeMs
                },
                tokens: metrics.tokens
              }
            );
          }
        }

        // Log check summary metrics
        await logCheckSummaryMetrics(
          checkId,
          {
            type: 'check_summary',
            timing: {
              started_at: checkStartedAt,
              finished_at: checkFinishedAt,
              total_response_time_ms: checkTotalTimeMs
            },
            parallelization: {
              total_threadlines: result.metadata.totalThreadlines,
              total_llm_calls: result.metadata.completed + result.metadata.timedOut + result.metadata.errors,
              completed_count: result.metadata.completed,
              timeout_count: result.metadata.timedOut,
              error_count: result.metadata.errors
            }
          }
        );
      } catch (metricsError: any) {
        console.error('⚠️  Failed to log metrics (non-fatal):', metricsError);
        // Continue - don't fail the request if metrics logging fails
      }
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

