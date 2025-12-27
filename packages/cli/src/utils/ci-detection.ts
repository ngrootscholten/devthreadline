/**
 * Detects CI environment and returns review target information.
 * 
 * CI Environment Variables:
 * - GitHub Actions PR: GITHUB_EVENT_NAME="pull_request", GITHUB_BASE_REF, GITHUB_HEAD_REF, GITHUB_EVENT_NUMBER
 * - GitHub Actions Branch: GITHUB_REF_NAME
 * - GitHub Actions Commit: GITHUB_SHA
 * - Vercel Branch: VERCEL_GIT_COMMIT_REF
 * - Vercel Commit: VERCEL_GIT_COMMIT_SHA
 * - GitLab CI MR: CI_MERGE_REQUEST_IID, CI_MERGE_REQUEST_TARGET_BRANCH_NAME, CI_MERGE_REQUEST_SOURCE_BRANCH_NAME, CI_MERGE_REQUEST_TITLE
 * - GitLab CI Branch: CI_COMMIT_REF_NAME
 * - GitLab CI Commit: CI_COMMIT_SHA
 */
export interface AutoReviewTarget {
  type: 'pr' | 'mr' | 'branch' | 'commit' | 'local';
  value?: string;
  sourceBranch?: string;
  targetBranch?: string;
  prTitle?: string;
}

export function getAutoReviewTarget(): AutoReviewTarget | null {
  // 1. PR/MR context
  if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
    const targetBranch = process.env.GITHUB_BASE_REF;
    const sourceBranch = process.env.GITHUB_HEAD_REF;
    const prNumber = process.env.GITHUB_EVENT_PULL_REQUEST_NUMBER || process.env.GITHUB_EVENT_NUMBER;
    
    // Log PR detection for verification (remove after confirming it works)
    console.log(`[PR Detection] GITHUB_BASE_REF=${targetBranch || 'NOT SET'}, GITHUB_HEAD_REF=${sourceBranch || 'NOT SET'}, PR_NUMBER=${prNumber || 'NOT SET'}`);
    
    if (targetBranch && sourceBranch && prNumber) {
      return {
        type: 'pr',
        value: prNumber,
        sourceBranch,
        targetBranch
      };
    }
  }
  
  if (process.env.CI_MERGE_REQUEST_IID) {
    const targetBranch = process.env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME;
    const sourceBranch = process.env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME;
    const mrNumber = process.env.CI_MERGE_REQUEST_IID;
    const mrTitle = process.env.CI_MERGE_REQUEST_TITLE;
    
    if (targetBranch && sourceBranch && mrNumber) {
      return {
        type: 'mr',
        value: mrNumber,
        sourceBranch,
        targetBranch,
        prTitle: mrTitle || undefined
      };
    }
  }
  
  // 2. Branch name
  const branch = process.env.GITHUB_REF_NAME ||
                 process.env.CI_COMMIT_REF_NAME ||
                 process.env.VERCEL_GIT_COMMIT_REF;
  
  if (branch) {
    return { type: 'branch', value: branch };
  }
  
  // 3. Commit SHA
  const commit = process.env.GITHUB_SHA ||
                 process.env.CI_COMMIT_SHA ||
                 process.env.VERCEL_GIT_COMMIT_SHA;
  
  if (commit) {
    return { type: 'commit', value: commit };
  }
  
  // 4. Local development
  return null;
}


