import simpleGit, { SimpleGit } from 'simple-git';
import { GitDiffResult } from '../utils/git-diff-executor';

/**
 * Get diff for GitHub Actions CI environment
 * 
 * GitHub Actions provides different environment variables depending on the event type.
 * We handle three scenarios:
 * 
 * 1. PR Context (pull_request event):
 *    - GITHUB_EVENT_NAME = 'pull_request'
 *    - GitHub provides GITHUB_BASE_REF (target branch) and GITHUB_HEAD_REF (source branch)
 *    - These are ONLY available for pull_request events, NOT for push events
 *    - Compare: origin/base vs origin/head
 *    - Shows: All changes in the PR
 * 
 * 2. Merge Commit to Main (push event, main branch, merge commit):
 *    - GITHUB_EVENT_NAME = 'push', GITHUB_REF_NAME = 'main'
 *    - GITHUB_BASE_REF and GITHUB_HEAD_REF are NOT set for push events
 *    - When a PR is merged, GitHub creates a merge commit with 2+ parents
 *    - We detect merge commits by checking parent count (> 1)
 *    - Compare: origin/main~1 vs origin/main
 *    - Shows: All changes that were merged in (same as feature branch vs main)
 *    - Why this works: main~1 is main before merge, main is main after merge
 *    - This gives us the cumulative diff of what was merged, not just the merge commit itself
 * 
 * 3. Feature Branch Push (push event, feature branch):
 *    - GITHUB_EVENT_NAME = 'push', GITHUB_REF_NAME = 'feature-branch-name'
 *    - GITHUB_BASE_REF and GITHUB_HEAD_REF are NOT set for push events
 *    - GitHub provides GITHUB_REF_NAME (current branch name)
 *    - Compare: origin/main vs origin/feature-branch
 *    - Shows: All changes in feature branch vs main (cumulative)
 *    - Why not HEAD~1 vs HEAD: That only shows the last commit, not cumulative changes
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
  const commitSha = process.env.GITHUB_SHA;

  // Scenario 1: PR Context
  // When a PR is created or updated, GitHub provides both base and head branches
  // This is the simplest case - we use what GitHub gives us directly
  if (eventName === 'pull_request') {
    if (!baseRef || !headRef) {
      throw new Error(
        'GitHub PR context detected but GITHUB_BASE_REF or GITHUB_HEAD_REF is missing. ' +
        'This should be automatically provided by GitHub Actions.'
      );
    }

    // Compare target branch (base) vs source branch (head)
    // This shows all changes in the PR
    const diff = await git.diff([`origin/${baseRef}...origin/${headRef}`, '-U200']);
    const diffSummary = await git.diffSummary([`origin/${baseRef}...origin/${headRef}`]);
    const changedFiles = diffSummary.files.map(f => f.file);

    return {
      diff: diff || '',
      changedFiles
    };
  }

  // Scenario 2: Merge Commit to Main
  // When a PR is merged to main, GitHub creates a merge commit with 2+ parents
  // Problem: origin/main vs origin/main = empty diff (comparing branch to itself)
  // Solution: Compare main before merge (main~1) vs main after merge (main)
  // This shows all changes that were merged in, which is what we want to check
  if (refName === 'main' && commitSha) {
    // Check if this is a merge commit by counting parents
    // Merge commits have 2+ parents (first parent = main before merge, second = feature branch tip)
    try {
      const parentShas = await git.raw(['log', '-1', '--format=%P', commitSha]);
      const parentCount = parentShas.trim() ? parentShas.trim().split(/\s+/).length : 0;
      
      if (parentCount > 1) {
        // This is a merge commit
        // Compare main before merge vs main after merge
        // origin/main~1 = main branch before the merge commit
        // origin/main = main branch after the merge commit (includes merge commit)
        // This diff shows all changes that were merged in (same as feature branch vs main)
        const diff = await git.diff(['origin/main~1...origin/main', '-U200']);
        const diffSummary = await git.diffSummary(['origin/main~1...origin/main']);
        const changedFiles = diffSummary.files.map(f => f.file);

        return {
          diff: diff || '',
          changedFiles
        };
      }
    } catch (error: any) {
      // If we can't detect merge commit, fall through to regular branch logic
      // This handles edge cases where detection fails
      console.log(`[DEBUG] Could not detect merge commit, using regular branch logic: ${error.message}`);
    }
  }

  // Scenario 3: Feature Branch Push
  // When code is pushed to a feature branch, we want to see all changes vs main
  // Compare: origin/main vs origin/feature-branch
  // This shows cumulative changes in the feature branch (all commits vs main)
  // Note: We don't use HEAD~1 vs HEAD because that only shows the last commit,
  //       not the cumulative changes in the branch
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

