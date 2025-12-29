import simpleGit, { SimpleGit } from 'simple-git';
import { GitDiffResult } from '../utils/git-diff-executor';

/**
 * Get diff for GitLab CI environment
 * 
 * GitLab CI provides environment variables that tell us exactly what to compare:
 * - MR context: CI_MERGE_REQUEST_TARGET_BRANCH_NAME (target branch) and CI_MERGE_REQUEST_SOURCE_BRANCH_NAME (source branch)
 * - Branch context: CI_COMMIT_REF_NAME (current branch), compare against origin/main
 * 
 * This implementation follows the same pattern as GitHub Actions, using GitLab's equivalent
 * environment variables. This is the ONLY implementation for GitLab - no fallbacks, no alternatives.
 * If this doesn't work, we fail with a clear error.
 */
export async function getGitLabDiff(repoRoot: string): Promise<GitDiffResult> {
  const git: SimpleGit = simpleGit(repoRoot);

  // Check if we're in a git repo
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new Error('Not a git repository. Threadline requires a git repository.');
  }

  // Determine context from GitLab CI environment variables
  const mrIid = process.env.CI_MERGE_REQUEST_IID;
  const targetBranch = process.env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME;
  const sourceBranch = process.env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME;
  const refName = process.env.CI_COMMIT_REF_NAME;

  // MR context: GitLab provides both target and source branches
  if (mrIid) {
    if (!targetBranch || !sourceBranch) {
      throw new Error(
        'GitLab MR context detected but CI_MERGE_REQUEST_TARGET_BRANCH_NAME or ' +
        'CI_MERGE_REQUEST_SOURCE_BRANCH_NAME is missing. ' +
        'This should be automatically provided by GitLab CI.'
      );
    }

    // Use the branches GitLab provides directly - no detection needed
    const diff = await git.diff([`origin/${targetBranch}...origin/${sourceBranch}`, '-U200']);
    const diffSummary = await git.diffSummary([`origin/${targetBranch}...origin/${sourceBranch}`]);
    const changedFiles = diffSummary.files.map(f => f.file);

    return {
      diff: diff || '',
      changedFiles
    };
  }

  // Branch context: GitLab provides branch name, compare against origin/main
  if (refName) {
    // For branch pushes, compare against origin/main (standard base branch)
    // GitLab CI with fetch-depth: 0 should have origin/main available
    const diff = await git.diff([`origin/main...origin/${refName}`, '-U200']);
    const diffSummary = await git.diffSummary([`origin/main...origin/${refName}`]);
    const changedFiles = diffSummary.files.map(f => f.file);

    return {
      diff: diff || '',
      changedFiles
    };
  }

  // Neither MR nor branch context available
  throw new Error(
    'GitLab CI environment detected but no valid context found. ' +
    'Expected CI_MERGE_REQUEST_IID (with CI_MERGE_REQUEST_TARGET_BRANCH_NAME/CI_MERGE_REQUEST_SOURCE_BRANCH_NAME) ' +
    'or CI_COMMIT_REF_NAME for branch context.'
  );
}

