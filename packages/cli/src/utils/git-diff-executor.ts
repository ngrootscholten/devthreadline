/**
 * Git Diff Execution
 * 
 * Executes the appropriate git diff function based on review context.
 * This is environment-agnostic - the git diff functions themselves
 * handle environment-specific details (like base branch detection).
 */

import { ReviewContext } from './context';
import { Environment } from './environment';
import { getGitDiff, getBranchDiff, getCommitDiff, getPRMRDiff } from '../git/diff';

export interface GitDiffResult {
  diff: string;
  changedFiles: string[];
}

/**
 * Executes the appropriate git diff function based on context.
 * 
 * This function maps context types to their corresponding git diff functions.
 * The actual git diff functions handle environment-specific details internally.
 */
export async function getDiffForContext(
  context: ReviewContext,
  repoRoot: string,
  environment: Environment
): Promise<GitDiffResult> {
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
      return await getGitDiff(repoRoot);
    
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

