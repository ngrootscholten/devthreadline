import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/app/lib/db';
import { storeCheckAndMetrics } from '../../lib/audit/store-check-and-metrics';
import { ProcessThreadlinesResponse } from '../../lib/processors/expert';
import { ExpertResult } from '../../lib/types/result';
import { ProcessThreadlineResult } from '../../lib/processors/single-expert';
import { countLinesInDiff, calculateContextStats } from '../../lib/utils/diff-stats';

/**
 * Sync endpoint for CLI-processed results.
 * Accepts pre-processed threadline check results and stores them.
 * Used when CLI processes LLM calls locally and wants to sync results to web app.
 */

// Request interface: ReviewRequest + results + metadata
export interface SyncResultsRequest {
  // Same fields as ReviewRequest
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
  apiKey: string;
  account: string;
  repoName?: string;
  branchName?: string;
  commitSha?: string;
  commitMessage?: string;
  commitAuthorName?: string;
  commitAuthorEmail?: string;
  prTitle?: string;
  environment?: string;
  cliVersion?: string;
  reviewContext: 'local' | 'commit' | 'pr' | 'file' | 'folder' | 'files';
  
  // Pre-processed results from CLI
  results: (ExpertResult | ProcessThreadlineResult)[];
  metadata: {
    totalThreadlines: number;
    completed: number;
    timedOut: number;
    errors: number;
    llmModel?: string;
  };
}


export async function POST(req: NextRequest) {
  const checkStartedAt = new Date().toISOString();
  
  try {
    const request: SyncResultsRequest = await req.json();

    // Calculate audit statistics
    const diffStats = countLinesInDiff(request.diff);
    const changedFilesCount = request.files.length;
    const contextStats = calculateContextStats(request.threadlines);
    
    // Audit logging
    console.log(`📥 Received request: POST /api/threadline-check-results (sync)`);
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
    const changedFilesTotalLines = request.files.length > 0 ? diffStats.total : 0;
    console.log(`     - Total lines (from diff): ${changedFilesTotalLines}`);
    console.log(`   Context Files:`);
    console.log(`     - Count: ${contextStats.fileCount}`);
    console.log(`     - Total lines: ${contextStats.totalLines}`);
    if (contextStats.files.length > 0) {
      console.log(`     - Files: ${contextStats.files.map(f => `${f.path} (${f.lines} lines)`).join(', ')}`);
    }
    console.log(`   Threadlines: ${request.threadlines?.length || 0}`);
    console.log(`   Results: ${request.results?.length || 0}`);
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

    // Validate that all threadlines have filePath
    for (const threadline of request.threadlines) {
      if (!threadline.filePath || typeof threadline.filePath !== 'string' || threadline.filePath.trim() === '') {
        return NextResponse.json(
          { error: `Missing required field 'filePath' for threadline '${threadline.id}'.` },
          { status: 400 }
        );
      }
    }

    // Validate diff
    if (request.diff === undefined || request.diff === null || typeof request.diff !== 'string') {
      return NextResponse.json(
        { error: 'diff must be a string (empty string is allowed for no changes)' },
        { status: 400 }
      );
    }

    // Validate reviewContext
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

    // Validate files array
    if (!request.files || !Array.isArray(request.files)) {
      return NextResponse.json(
        { error: 'files array is required' },
        { status: 400 }
      );
    }

    // Validate results (required for sync endpoint)
    if (!request.results || !Array.isArray(request.results)) {
      return NextResponse.json(
        { error: 'results array is required for sync endpoint' },
        { status: 400 }
      );
    }

    // Validate metadata (required for sync endpoint)
    if (!request.metadata || typeof request.metadata !== 'object') {
      return NextResponse.json(
        { error: 'metadata object is required for sync endpoint' },
        { status: 400 }
      );
    }

    // Validate results count matches threadlines
    if (request.results.length !== request.threadlines.length) {
      return NextResponse.json(
        { error: `results count (${request.results.length}) must match threadlines count (${request.threadlines.length})` },
        { status: 400 }
      );
    }

    // Validate API key
    if (!request.apiKey || typeof request.apiKey !== 'string') {
      return NextResponse.json(
        { error: 'apiKey is required in request body' },
        { status: 400 }
      );
    }

    // Validate account
    if (!request.account || typeof request.account !== 'string') {
      return NextResponse.json(
        { error: 'account is required in request body' },
        { status: 400 }
      );
    }

    // Authentication (same as /api/threadline-check)
    const serverApiKey = process.env.THREADLINE_API_KEY;
    const serverAccount = process.env.THREADLINE_ACCOUNT;
    
    let isAuthenticated = false;
    let userId: string | undefined = undefined;
    let accountId: string | undefined = undefined;
    
    // Try database first
    try {
      const pool = getPool();
      const accountResult = await pool.query(
        `SELECT id, api_key FROM threadline_accounts WHERE identifier = $1`,
        [request.account]
      );
      
      if (accountResult.rows.length > 0) {
        const storedApiKey = accountResult.rows[0].api_key;
        
        if (storedApiKey && request.apiKey === storedApiKey) {
          isAuthenticated = true;
          accountId = accountResult.rows[0].id;
          
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
    }
    
    // Fall back to environment variables
    if (!isAuthenticated && serverApiKey && serverAccount) {
      if (request.apiKey === serverApiKey && request.account === serverAccount) {
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
          // Ignore
        }
        isAuthenticated = true;
        console.log('   ✓ Authenticated via environment variables (backward compatibility)');
      }
    }
    
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Invalid API key or account' },
        { status: 401 }
      );
    }

    // Build ProcessThreadlinesResponse from request
    const result: ProcessThreadlinesResponse = {
      results: request.results,
      metadata: request.metadata
    };

    console.log(`✅ Syncing: ${result.results.length} results, ${result.metadata.completed} completed, ${result.metadata.timedOut} timed out, ${result.metadata.errors} errors`);

    // Store check and log metrics
    let checkId: string | null = null;
    if (accountId) {
      checkId = await storeCheckAndMetrics({
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

    return NextResponse.json({ 
      success: true, 
      checkId,
      message: 'Results synced successfully'
    });
  } catch (error: any) {
    console.error('❌ ERROR processing threadline-check-results:');
    console.error('Message:', error?.message);
    console.error('Name:', error?.name);
    console.error('Stack:', error?.stack);
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
