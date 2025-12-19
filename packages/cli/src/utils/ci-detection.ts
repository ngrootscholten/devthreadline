/**
 * Detects CI environment and returns review target information.
 * 
 * Priority:
 * 1. PR/MR detected → use PR/MR branches (target...source)
 * 2. Branch detected → use branch (all commits vs base)
 * 3. Commit SHA detected → use commit (single commit)
 * 4. Local development → return null (use staged/unstaged)
 */
export interface AutoReviewTarget {
  type: 'pr' | 'mr' | 'branch' | 'commit' | 'local';
  value?: string;
  // For PR/MR: both source and target branches
  sourceBranch?: string;
  targetBranch?: string;
}

export function getAutoReviewTarget(): AutoReviewTarget | null {
  // 1. Check for PR/MR context (most authoritative)
  
  // GitHub Actions PR
  if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
    const targetBranch = process.env.GITHUB_BASE_REF;
    const sourceBranch = process.env.GITHUB_HEAD_REF;
    const prNumber = process.env.GITHUB_EVENT_PULL_REQUEST_NUMBER;
    
    if (targetBranch && sourceBranch && prNumber) {
      return {
        type: 'pr',
        value: prNumber,
        sourceBranch,
        targetBranch
      };
    }
  }
  
  // GitLab CI MR
  if (process.env.CI_MERGE_REQUEST_IID) {
    const targetBranch = process.env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME;
    const sourceBranch = process.env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME;
    const mrNumber = process.env.CI_MERGE_REQUEST_IID;
    
    if (targetBranch && sourceBranch && mrNumber) {
      return {
        type: 'mr',
        value: mrNumber,
        sourceBranch,
        targetBranch
      };
    }
  }
  
  // 2. Check for branch name (CI with branch)
  const branch = process.env.GITHUB_REF_NAME ||           // GitHub Actions
                 process.env.CI_COMMIT_REF_NAME ||          // GitLab CI
                 process.env.VERCEL_GIT_COMMIT_REF;         // Vercel
  
  if (branch) {
    return {
      type: 'branch',
      value: branch
    };
  }
  
  // 3. Check for commit SHA (CI without branch)
  const commit = process.env.GITHUB_SHA ||                 // GitHub Actions
                 process.env.CI_COMMIT_SHA ||              // GitLab CI
                 process.env.VERCEL_GIT_COMMIT_SHA;        // Vercel
  
  if (commit) {
    return {
      type: 'commit',
      value: commit
    };
  }
  
  // 4. Local development (no CI env vars)
  return null;
}

