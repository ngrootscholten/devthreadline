import { getPool } from '../db';
import { storeCheck } from './store-check';
import { logLLMCallMetrics, logCheckSummaryMetrics } from '../metrics/logger';
import { ReviewRequest } from '../../api/threadline-check/route';
import { ProcessThreadlinesResponse } from '../processors/expert';

export interface StoreCheckAndMetricsParams {
  request: ReviewRequest;
  result: ProcessThreadlinesResponse;
  diffStats: { added: number; removed: number; total: number };
  contextStats: { fileCount: number; totalLines: number };
  reviewContext: 'local' | 'commit' | 'pr' | 'file' | 'folder' | 'files';
  checkStartedAt: string; // ISO 8601 - caller provides timing
  commitSha?: string;
  commitAuthorName?: string;
  commitAuthorEmail?: string;
  userId?: string;
  accountId: string;
}

/**
 * Stores a check and logs metrics in a single reusable function.
 * Used by both:
 * - POST /api/threadline-check (processes LLM, then stores)
 * - POST /api/threadline-check-results (receives pre-processed results, stores only)
 * 
 * @returns checkId if storage succeeded, null if storage failed (non-fatal)
 */
export async function storeCheckAndMetrics(
  params: StoreCheckAndMetricsParams
): Promise<string | null> {
  const {
    request,
    result,
    diffStats,
    contextStats,
    reviewContext,
    checkStartedAt,
    commitSha,
    commitAuthorName,
    commitAuthorEmail,
    userId,
    accountId
  } = params;

  // Store check in audit database (non-blocking - don't fail request if this fails)
  let checkId: string | null = null;
  try {
    checkId = await storeCheck({
      request,
      result,
      diffStats,
      contextStats,
      reviewContext,
      commitSha,
      commitAuthorName,
      commitAuthorEmail,
      userId,
      accountId
    });
  } catch (auditError: any) {
    console.error('⚠️  Failed to store check in audit database (non-fatal):', auditError);
    // Continue - don't fail the request if audit storage fails
    return null;
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
      // Note: This is conditional - CLI-synced results may not have llmCallMetrics
      for (let i = 0; i < result.results.length; i++) {
        const threadlineResult = result.results[i];
        const threadline = request.threadlines[i];
        
        // Only log if this is a ProcessThreadlineResult with metrics (i.e., had an LLM call)
        if ('llmCallMetrics' in threadlineResult && threadlineResult.llmCallMetrics) {
          const metrics = threadlineResult.llmCallMetrics;
          const checkThreadlineId = threadlineIdToCheckThreadlineId.get(threadline.id) || null;
          
          await logLLMCallMetrics(
            checkId,
            accountId,
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
        accountId,
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

  return checkId;
}
