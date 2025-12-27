import { getPool } from '../db';
import { ReviewRequest } from '../../api/threadline-check/route';
import { ProcessThreadlinesResponse } from '../processors/expert';
import { ExpertResult } from '../types/result';

interface StoreCheckParams {
  request: ReviewRequest;
  result: ProcessThreadlinesResponse;
  diffStats: { added: number; removed: number; total: number };
  contextStats: { fileCount: number; totalLines: number };
  reviewContext: string; // 'local', 'branch', 'commit', 'file', 'folder', 'files'
  commitSha?: string;
  userId?: string; // Optional - may not be available for legacy env var auth
}

/**
 * Stores a complete check request and its results in the database for auditing and analysis
 */
export async function storeCheck(params: StoreCheckParams): Promise<string> {
  const {
    request,
    result,
    diffStats,
    contextStats,
    reviewContext,
    commitSha,
    userId
  } = params;

  const pool = getPool();

  try {
    // Start a transaction
    await pool.query('BEGIN');

    // 1. Insert check record
    const checkResult = await pool.query(
      `INSERT INTO checks (
        user_id,
        account,
        repo_name,
        branch_name,
        commit_sha,
        commit_message,
        pr_title,
        environment,
        review_context,
        diff_lines_added,
        diff_lines_removed,
        diff_total_lines,
        files_changed_count,
        context_files_count,
        context_files_total_lines,
        threadlines_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id`,
      [
        userId || null,
        request.account,
        request.repoName || null,
        request.branchName || null,
        commitSha || null,
        request.commitMessage || null,
        request.prTitle || null,
        request.environment || null,
        reviewContext,
        diffStats.added,
        diffStats.removed,
        diffStats.total,
        request.files.length,
        contextStats.fileCount,
        contextStats.totalLines,
        request.threadlines.length
      ]
    );

    const checkId = checkResult.rows[0].id;

    // Debug: Log what we're storing
    console.log(`   💾 Storing check: repoName=${request.repoName}, branchName=${request.branchName}`);

    // 2. Insert diff content (unified diff format - industry standard)
    // The diff is stored exactly as received from git, in unified diff format
    // This format is compatible with: git apply, patch command, GitHub/GitLab, most tools
    await pool.query(
      `INSERT INTO check_diffs (check_id, diff_content, diff_format) VALUES ($1, $2, 'unified')`,
      [checkId, request.diff]
    );

    // 3. Insert threadlines and their results
    // Create a map of expertId to result for quick lookup
    const resultMap = new Map<string, ExpertResult>();
    result.results.forEach(r => {
      resultMap.set(r.expertId, r);
    });

    for (const threadline of request.threadlines) {
      // Insert threadline
      const threadlineResult = await pool.query(
        `INSERT INTO check_threadlines (
          check_id,
          threadline_id,
          threadline_version,
          threadline_patterns,
          threadline_content,
          context_files,
          context_content
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          checkId,
          threadline.id,
          threadline.version,
          JSON.stringify(threadline.patterns),
          threadline.content,
          threadline.contextFiles ? JSON.stringify(threadline.contextFiles) : null,
          threadline.contextContent ? JSON.stringify(threadline.contextContent) : null
        ]
      );

      const checkThreadlineId = threadlineResult.rows[0].id;

      // Insert result for this threadline
      const expertResult = resultMap.get(threadline.id);
      if (expertResult) {
        await pool.query(
          `INSERT INTO check_results (
            check_threadline_id,
            status,
            reasoning,
            line_references,
            file_references
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            checkThreadlineId,
            expertResult.status,
            expertResult.reasoning || null,
            expertResult.lineReferences ? JSON.stringify(expertResult.lineReferences) : null,
            expertResult.fileReferences ? JSON.stringify(expertResult.fileReferences) : null
          ]
        );
      }
    }

    // Commit transaction
    await pool.query('COMMIT');

    console.log(`   💾 Stored check ${checkId} in audit database`);

    return checkId;
  } catch (error: any) {
    // Rollback on error
    await pool.query('ROLLBACK');
    console.error('Error storing check in audit database:', error);
    // Don't throw - we don't want to fail the request if audit storage fails
    throw error;
  }
}

