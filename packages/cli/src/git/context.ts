/**
 * Unified Git Context Collection
 * 
 * Collects all git-related information (diff, repo name, branch name) in a unified way.
 * Each environment has isolated implementations - changes to one don't affect others.
 */

import { Environment } from '../utils/environment';
import { GitDiffResult, getDiffForEnvironment } from '../utils/git-diff-executor';
import { getGitHubRepoName, getVercelRepoName, getLocalRepoName } from './repo';
import { getGitHubBranchName, getVercelBranchName, getLocalBranchName } from './repo';

export interface GitContext {
  diff: GitDiffResult;
  repoName: string;
  branchName: string;
}

/**
 * Collects all git context (diff, repo name, branch name) for the given environment.
 * 
 * Each environment has a single, specific implementation:
 * - GitHub: Uses GITHUB_REPOSITORY, GITHUB_REF_NAME, and GitHub-specific diff logic
 * - Vercel: Uses VERCEL_GIT_REPO_OWNER/SLUG, VERCEL_GIT_COMMIT_REF, and Vercel-specific diff logic
 * - Local: Uses git commands for repo/branch, and local diff logic
 * 
 * All methods fail loudly if they can't get the required information.
 */
export async function getGitContextForEnvironment(
  environment: Environment,
  repoRoot: string
): Promise<GitContext> {
  switch (environment) {
    case 'github':
      return {
        diff: await getDiffForEnvironment('github', repoRoot),
        repoName: await getGitHubRepoName(repoRoot),
        branchName: await getGitHubBranchName(repoRoot)
      };
    
    case 'vercel':
      return {
        diff: await getDiffForEnvironment('vercel', repoRoot),
        repoName: await getVercelRepoName(repoRoot),
        branchName: await getVercelBranchName(repoRoot)
      };
    
    case 'local':
      return {
        diff: await getDiffForEnvironment('local', repoRoot),
        repoName: await getLocalRepoName(repoRoot),
        branchName: await getLocalBranchName(repoRoot)
      };
    
    case 'gitlab':
      // GitLab not implemented yet - will be added later
      throw new Error('GitLab environment not yet supported for unified git context collection.');
    
    default:
      const _exhaustive: never = environment;
      throw new Error(`Unknown environment: ${_exhaustive}`);
  }
}

