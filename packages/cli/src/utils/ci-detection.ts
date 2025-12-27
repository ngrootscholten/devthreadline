import chalk from 'chalk';

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
  // For MR: title from GitLab CI (reliable env var)
  prTitle?: string;
}

export function getAutoReviewTarget(): AutoReviewTarget | null {
  console.log(chalk.gray('   [DEBUG] getAutoReviewTarget: Starting detection...'));
  
  // 1. Check for PR/MR context (most authoritative)
  
  // GitHub Actions PR
  console.log(chalk.gray(`   [DEBUG] getAutoReviewTarget: Checking GitHub Actions PR...`));
  console.log(chalk.gray(`   [DEBUG] getAutoReviewTarget: GITHUB_EVENT_NAME = "${process.env.GITHUB_EVENT_NAME || 'NOT SET'}"`));
  
  if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
    const targetBranch = process.env.GITHUB_BASE_REF;
    const sourceBranch = process.env.GITHUB_HEAD_REF;
    const prNumber = process.env.GITHUB_EVENT_PULL_REQUEST_NUMBER;
    
    console.log(chalk.gray(`   [DEBUG] getAutoReviewTarget: GITHUB_BASE_REF = "${targetBranch || 'NOT SET'}"`));
    console.log(chalk.gray(`   [DEBUG] getAutoReviewTarget: GITHUB_HEAD_REF = "${sourceBranch || 'NOT SET'}"`));
    console.log(chalk.gray(`   [DEBUG] getAutoReviewTarget: GITHUB_EVENT_PULL_REQUEST_NUMBER = "${prNumber || 'NOT SET'}"`));
    
    if (targetBranch && sourceBranch && prNumber) {
      console.log(chalk.green(`   [DEBUG] getAutoReviewTarget: Detected GitHub PR #${prNumber}`));
      return {
        type: 'pr',
        value: prNumber,
        sourceBranch,
        targetBranch
      };
    } else {
      console.log(chalk.yellow('   [DEBUG] getAutoReviewTarget: GitHub PR env vars incomplete'));
    }
  }
  
  // GitLab CI MR
  console.log(chalk.gray(`   [DEBUG] getAutoReviewTarget: Checking GitLab CI MR...`));
  console.log(chalk.gray(`   [DEBUG] getAutoReviewTarget: CI_MERGE_REQUEST_IID = "${process.env.CI_MERGE_REQUEST_IID || 'NOT SET'}"`));
  
  if (process.env.CI_MERGE_REQUEST_IID) {
    const targetBranch = process.env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME;
    const sourceBranch = process.env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME;
    const mrNumber = process.env.CI_MERGE_REQUEST_IID;
    const mrTitle = process.env.CI_MERGE_REQUEST_TITLE; // Reliable GitLab CI env var
    
    console.log(chalk.gray(`   [DEBUG] getAutoReviewTarget: CI_MERGE_REQUEST_TARGET_BRANCH_NAME = "${targetBranch || 'NOT SET'}"`));
    console.log(chalk.gray(`   [DEBUG] getAutoReviewTarget: CI_MERGE_REQUEST_SOURCE_BRANCH_NAME = "${sourceBranch || 'NOT SET'}"`));
    console.log(chalk.gray(`   [DEBUG] getAutoReviewTarget: CI_MERGE_REQUEST_TITLE = "${mrTitle || 'NOT SET'}"`));
    
    if (targetBranch && sourceBranch && mrNumber) {
      console.log(chalk.green(`   [DEBUG] getAutoReviewTarget: Detected GitLab MR #${mrNumber}`));
      return {
        type: 'mr',
        value: mrNumber,
        sourceBranch,
        targetBranch,
        prTitle: mrTitle || undefined // Only include if present
      };
    } else {
      console.log(chalk.yellow('   [DEBUG] getAutoReviewTarget: GitLab MR env vars incomplete'));
    }
  }
  
  // 2. Check for branch name (CI with branch)
  console.log(chalk.gray(`   [DEBUG] getAutoReviewTarget: Checking branch env vars...`));
  console.log(chalk.gray(`   [DEBUG] getAutoReviewTarget: GITHUB_REF_NAME = "${process.env.GITHUB_REF_NAME || 'NOT SET'}"`));
  console.log(chalk.gray(`   [DEBUG] getAutoReviewTarget: CI_COMMIT_REF_NAME = "${process.env.CI_COMMIT_REF_NAME || 'NOT SET'}"`));
  console.log(chalk.gray(`   [DEBUG] getAutoReviewTarget: VERCEL_GIT_COMMIT_REF = "${process.env.VERCEL_GIT_COMMIT_REF || 'NOT SET'}"`));
  
  const branch = process.env.GITHUB_REF_NAME ||           // GitHub Actions
                 process.env.CI_COMMIT_REF_NAME ||          // GitLab CI
                 process.env.VERCEL_GIT_COMMIT_REF;         // Vercel
  
  if (branch) {
    console.log(chalk.green(`   [DEBUG] getAutoReviewTarget: Detected branch "${branch}"`));
    return {
      type: 'branch',
      value: branch
    };
  }
  
  // 3. Check for commit SHA (CI without branch)
  console.log(chalk.gray(`   [DEBUG] getAutoReviewTarget: Checking commit SHA env vars...`));
  console.log(chalk.gray(`   [DEBUG] getAutoReviewTarget: GITHUB_SHA = "${process.env.GITHUB_SHA || 'NOT SET'}"`));
  console.log(chalk.gray(`   [DEBUG] getAutoReviewTarget: CI_COMMIT_SHA = "${process.env.CI_COMMIT_SHA || 'NOT SET'}"`));
  console.log(chalk.gray(`   [DEBUG] getAutoReviewTarget: VERCEL_GIT_COMMIT_SHA = "${process.env.VERCEL_GIT_COMMIT_SHA || 'NOT SET'}"`));
  
  const commit = process.env.GITHUB_SHA ||                 // GitHub Actions
                 process.env.CI_COMMIT_SHA ||              // GitLab CI
                 process.env.VERCEL_GIT_COMMIT_SHA;        // Vercel
  
  if (commit) {
    console.log(chalk.green(`   [DEBUG] getAutoReviewTarget: Detected commit "${commit}"`));
    return {
      type: 'commit',
      value: commit
    };
  }
  
  // 4. Local development (no CI env vars)
  console.log(chalk.yellow('   [DEBUG] getAutoReviewTarget: No CI env vars detected - returning null (local mode)'));
  return null;
}


