/**
 * Git Diff Execution
 * 
 * Executes the appropriate git diff function based on environment.
 * Each environment has ONE SINGLE IMPLEMENTATION - no fallbacks, no alternatives.
 */

import { ReviewContext } from './context';
import { Environment } from './environment';
import { getBranchDiff, getCommitDiff, getPRMRDiff } from '../git/diff';
import { getVercelDiff } from '../git/vercel-diff';
import { getGitHubDiff } from '../git/github-diff';
import { getLocalDiff } from '../git/local-diff';
import { getGitLabDiff } from '../git/gitlab-diff';

export interface GitDiffResult {
  diff: string;
  changedFiles: string[];
}

/**
 * Executes the appropriate git diff function based on environment.
 * 
 * Each environment has a single, specific implementation:
 * - Vercel: Uses VERCEL_GIT_COMMIT_SHA, gets commit diff via git show
 * - GitHub: Uses GITHUB_BASE_REF/GITHUB_HEAD_REF for PRs, GITHUB_REF_NAME for branches
 * - GitLab: Uses CI_MERGE_REQUEST_TARGET_BRANCH_NAME/CI_MERGE_REQUEST_SOURCE_BRANCH_NAME for MRs, CI_COMMIT_REF_NAME for branches
 * - Local: Uses staged changes first, then unstaged changes
 * 
 * No fallbacks - if the environment-specific implementation fails, we fail clearly.
 * Each environment is completely isolated - changes to one don't affect others.
 */
export async function getDiffForEnvironment(
  environment: Environment,
  repoRoot: string,
  _context?: ReviewContext
): Promise<GitDiffResult> {
  switch (environment) {
    case 'vercel':
      // Vercel: Single implementation using commit SHA
      return await getVercelDiff(repoRoot);
    
    case 'github':
      // GitHub: Single implementation using GitHub-provided environment variables
      return await getGitHubDiff(repoRoot);
    
    case 'gitlab':
      // GitLab: Single implementation using GitLab-provided environment variables
      return await getGitLabDiff(repoRoot);
    
    case 'local':
      // Local: Single implementation using staged/unstaged changes
      return await getLocalDiff(repoRoot);
    
    default:
      const _exhaustive: never = environment;
      throw new Error(`Unknown environment: ${_exhaustive}`);
  }
}

/**
 * Legacy GitLab-specific diff function (deprecated).
 * 
 * This function is kept for backward compatibility but should not be used.
 * GitLab now uses getDiffForEnvironment() which routes to getGitLabDiff().
 * 
 * @deprecated Use getDiffForEnvironment('gitlab', repoRoot) instead
 */
export async function getDiffForContext(
  context: ReviewContext,
  repoRoot: string,
  environment: Environment
): Promise<GitDiffResult> {
  // This should only be called for GitLab legacy code paths
  if (environment !== 'gitlab') {
    throw new Error(`getDiffForContext() is deprecated. Use getDiffForEnvironment('${environment}', repoRoot) instead.`);
  }

  switch (context.type) {
    case 'pr':
      return await getPRMRDiff(repoRoot, context.sourceBranch, context.targetBranch);
    
    case 'mr':
      return await getPRMRDiff(repoRoot, context.sourceBranch, context.targetBranch);
    
    case 'branch':
      return await getBranchDiff(repoRoot, context.branchName);
    
    case 'commit':
      return await getCommitDiff(repoRoot, context.commitSha);
    
    case 'local':
      throw new Error('Local context should use getDiffForEnvironment(), not getDiffForContext()');
    
    default:
      // TypeScript exhaustiveness check - should never reach here
      const _exhaustive: never = context;
      throw new Error(`Unknown context type: ${_exhaustive}`);
  }
}

/**
 * Returns a human-readable description of the context for logging.
 */
export function getContextDescription(context: ReviewContext): string {
  switch (context.type) {
    case 'pr':
      return `PR: ${context.prNumber}`;
    case 'mr':
      return `MR: ${context.mrNumber}`;
    case 'branch':
      return `branch: ${context.branchName}`;
    case 'commit':
      return `commit: ${context.commitSha.substring(0, 7)}`;
    case 'local':
      return 'local changes';
    default:
      const _exhaustive: never = context;
      throw new Error(`Unknown context type: ${_exhaustive}`);
  }
}

