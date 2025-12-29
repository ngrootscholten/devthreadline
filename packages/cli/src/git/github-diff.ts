import simpleGit, { SimpleGit } from 'simple-git';
import { GitDiffResult } from '../utils/git-diff-executor';

/**
 * Get diff for GitHub Actions CI environment
 * 
 * GitHub Actions provides environment variables that tell us exactly what to compare:
 * - PR context: GITHUB_BASE_REF (target branch) and GITHUB_HEAD_REF (source branch)
 * - Branch context: GITHUB_REF_NAME (current branch), compare against origin/main
 * 
 * This is the ONLY implementation for GitHub - no fallbacks, no alternatives.
 * If this doesn't work, we fail with a clear error.
 */
export async function getGitHubDiff(repoRoot: string): Promise<GitDiffResult> {
  const git: SimpleGit = simpleGit(repoRoot);

  // Check if we're in a git repo
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new Error('Not a git repository. Threadline requires a git repository.');
  }

  // Determine context from GitHub environment variables
  const eventName = process.env.GITHUB_EVENT_NAME;
  const baseRef = process.env.GITHUB_BASE_REF;
  const headRef = process.env.GITHUB_HEAD_REF;
  const refName = process.env.GITHUB_REF_NAME;

  // PR context: GitHub provides both base and head branches
  if (eventName === 'pull_request') {
    if (!baseRef || !headRef) {
      throw new Error(
        'GitHub PR context detected but GITHUB_BASE_REF or GITHUB_HEAD_REF is missing. ' +
        'This should be automatically provided by GitHub Actions.'
      );
    }

    // Use the branches GitHub provides directly - no detection needed
    const diff = await git.diff([`origin/${baseRef}...origin/${headRef}`, '-U200']);
    const diffSummary = await git.diffSummary([`origin/${baseRef}...origin/${headRef}`]);
    const changedFiles = diffSummary.files.map(f => f.file);

    return {
      diff: diff || '',
      changedFiles
    };
  }

  // Branch context: GitHub provides branch name, compare against origin/main
  if (refName) {
    // For branch pushes, compare against origin/main (standard base branch)
    // GitHub Actions with fetch-depth: 0 should have origin/main available
    const diff = await git.diff([`origin/main...origin/${refName}`, '-U200']);
    const diffSummary = await git.diffSummary([`origin/main...origin/${refName}`]);
    const changedFiles = diffSummary.files.map(f => f.file);

    return {
      diff: diff || '',
      changedFiles
    };
  }

  // Neither PR nor branch context available
  throw new Error(
    'GitHub Actions environment detected but no valid context found. ' +
    'Expected GITHUB_EVENT_NAME="pull_request" (with GITHUB_BASE_REF/GITHUB_HEAD_REF) ' +
    'or GITHUB_REF_NAME for branch context.'
  );
}

