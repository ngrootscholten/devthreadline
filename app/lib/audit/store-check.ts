import { getPool } from '../db';
import { ReviewRequest } from '../../api/threadline-check/route';
import { ProcessThreadlinesResponse } from '../processors/expert';
import { ExpertResult } from '../types/result';
import { ProcessThreadlineResult } from '../processors/single-expert';
import { generateVersionHash, generateIdentityHash, generateContextHash } from './threadline-hash';

interface StoreCheckParams {
  request: ReviewRequest;
  result: ProcessThreadlinesResponse;
  diffStats: { added: number; removed: number; total: number };
  contextStats: { fileCount: number; totalLines: number };
  reviewContext: string; // 'local', 'branch', 'commit', 'file', 'folder', 'files'
  commitSha?: string;
  commitAuthorName?: string;
  commitAuthorEmail?: string;
  userId?: string; // Optional - may not be available for legacy env var auth
  accountId: string; // Required - account_id from threadline_accounts
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
    commitAuthorName,
    commitAuthorEmail,
    userId,
    accountId
  } = params;

  const pool = getPool();

  try {
    // Start a transaction
    await pool.query('BEGIN');

    // 1. Insert check record
    const checkResult = await pool.query(
      `INSERT INTO checks (
        user_id,
        account_id,
        repo_name,
        branch_name,
        commit_sha,
        commit_message,
        commit_author_name,
        commit_author_email,
        pr_title,
        environment,
        review_context,
        llm_model,
        cli_version,
        diff_lines_added,
        diff_lines_removed,
        diff_total_lines,
        files_changed_count,
        context_files_count,
        context_files_total_lines,
        threadlines_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING id`,
      [
        userId || null,
        accountId,
        request.repoName || null,
        request.branchName || null,
        commitSha || null,
        request.commitMessage || null,
        commitAuthorName || null,
        commitAuthorEmail || null,
        request.prTitle || null,
        request.environment || null,
        reviewContext,
        result.metadata.llmModel || null,
        request.cliVersion || null,
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
    const resultMap = new Map<string, ProcessThreadlineResult | ExpertResult>();
    result.results.forEach(r => {
      resultMap.set(r.expertId, r);
    });

    for (const threadline of request.threadlines) {
      const threadlineResult = resultMap.get(threadline.id);
      const isProcessThreadlineResult = threadlineResult && 'relevantFiles' in threadlineResult;
      
      // Generate hashes for deduplication
      const versionHash = generateVersionHash({
        threadlineId: threadline.id,
        filePath: threadline.filePath,
        patterns: threadline.patterns,
        content: threadline.content,
        version: threadline.version,
        repoName: request.repoName || null,
        account: request.account,
      });
      
      const identityHash = generateIdentityHash({
        threadlineId: threadline.id,
        filePath: threadline.filePath,
        repoName: request.repoName || null,
        account: request.account,
      });

      let threadlineDefinitionId: string;

      // Step 1: Check if exact version already exists (version_hash match)
      const existingVersionResult = await pool.query(
        `SELECT id FROM threadline_definitions WHERE version_hash = $1 LIMIT 1`,
        [versionHash]
      );

      if (existingVersionResult.rows.length > 0) {
        // Exact match found - reuse existing definition
        threadlineDefinitionId = existingVersionResult.rows[0].id;
        console.log(`   ♻️  Reusing existing threadline definition for "${threadline.id}"`);
      } else {
        // No exact match - check if this is a new version of existing threadline
        const existingIdentityResult = await pool.query(
          `SELECT id FROM threadline_definitions 
           WHERE identity_hash = $1 
           ORDER BY created_at DESC 
           LIMIT 1`,
          [identityHash]
        );

        const predecessorId = existingIdentityResult.rows.length > 0 
          ? existingIdentityResult.rows[0].id 
          : null;

        // Create new definition (either new version or completely new threadline)
        const definitionResult = await pool.query(
          `INSERT INTO threadline_definitions (
            threadline_id,
            threadline_file_path,
            threadline_version,
            threadline_patterns,
            threadline_content,
            repo_name,
            account,
            predecessor_id,
            version_hash,
            identity_hash
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id`,
          [
            threadline.id,
            threadline.filePath,
            threadline.version,
            JSON.stringify(threadline.patterns),
            threadline.content,
            request.repoName || null,
            request.account,
            predecessorId,
            versionHash,
            identityHash
          ]
        );

        threadlineDefinitionId = definitionResult.rows[0].id;

        if (predecessorId) {
          console.log(`   🆕 Created new version of threadline "${threadline.id}" (predecessor: ${predecessorId.substring(0, 8)}...)`);
        } else {
          console.log(`   ✨ Created new threadline definition for "${threadline.id}"`);
        }
      }

      // Step 2: Process context files - deduplicate into context_file_snapshots
      const contextSnapshotIds: string[] = [];
      let contextFilesReused = 0;
      let contextFilesCreated = 0;

      if (threadline.contextContent) {
        for (const [filePath, content] of Object.entries(threadline.contextContent)) {
          const contentHash = generateContextHash({
            account: request.account,
            repoName: request.repoName || null,
            filePath,
            content,
          });

          // Check if this exact content already exists
          const existingSnapshot = await pool.query(
            `SELECT id FROM context_file_snapshots WHERE content_hash = $1 LIMIT 1`,
            [contentHash]
          );

          if (existingSnapshot.rows.length > 0) {
            // Reuse existing snapshot
            contextSnapshotIds.push(existingSnapshot.rows[0].id);
            contextFilesReused++;
          } else {
            // Create new snapshot
            const newSnapshot = await pool.query(
              `INSERT INTO context_file_snapshots (account, repo_name, file_path, content, content_hash)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING id`,
              [request.account, request.repoName || null, filePath, content, contentHash]
            );
            contextSnapshotIds.push(newSnapshot.rows[0].id);
            contextFilesCreated++;
          }
        }
      }

      if (contextFilesReused > 0 || contextFilesCreated > 0) {
        console.log(`   📄 Context files: ${contextFilesReused} reused, ${contextFilesCreated} new`);
      }

      // Step 3: Insert check_threadlines with reference to definition and context snapshots
      const threadlineInsertResult = await pool.query(
        `INSERT INTO check_threadlines (
          check_id,
          threadline_id,
          threadline_definition_id,
          context_snapshot_ids,
          relevant_files,
          filtered_diff,
          files_in_filtered_diff
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          checkId,
          threadline.id,
          threadlineDefinitionId,
          contextSnapshotIds,
          isProcessThreadlineResult ? JSON.stringify(threadlineResult.relevantFiles) : null,
          isProcessThreadlineResult ? threadlineResult.filteredDiff : null,
          isProcessThreadlineResult ? JSON.stringify(threadlineResult.filesInFilteredDiff) : null
        ]
      );

      const checkThreadlineId = threadlineInsertResult.rows[0].id;

      // Insert result for this threadline
      if (threadlineResult) {
        await pool.query(
          `INSERT INTO check_results (
            check_threadline_id,
            status,
            reasoning,
            file_references
          ) VALUES ($1, $2, $3, $4)`,
          [
            checkThreadlineId,
            threadlineResult.status,
            threadlineResult.reasoning || null,
            threadlineResult.fileReferences ? JSON.stringify(threadlineResult.fileReferences) : null
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

