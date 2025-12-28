/**
 * Review Context Detection
 * 
 * Determines what type of code review context we're in:
 * - PR/MR: Multiple commits comparing two branches
 * - Branch: All commits on a branch vs base branch
 * - Commit: Single commit changes
 * - Local: Staged/unstaged changes in working directory
 * 
 * Context detection is environment-specific - each CI platform
 * provides different environment variables.
 */

import { Environment } from './environment';

export type ContextType = 'pr' | 'mr' | 'branch' | 'commit' | 'local';

export interface PRContext {
  type: 'pr';
  prNumber: string;
  sourceBranch: string;
  targetBranch: string;
}

export interface MRContext {
  type: 'mr';
  mrNumber: string;
  sourceBranch: string;
  targetBranch: string;
  prTitle?: string; // Available in GitLab CI
}

export interface BranchContext {
  type: 'branch';
  branchName: string;
}

export interface CommitContext {
  type: 'commit';
  commitSha: string;
}

export interface LocalContext {
  type: 'local';
}

export type ReviewContext = PRContext | MRContext | BranchContext | CommitContext | LocalContext;

/**
 * Detects the review context based on the environment.
 * 
 * Each environment has different environment variables available,
 * so detection logic is environment-specific.
 */
export function detectContext(environment: Environment): ReviewContext {
  switch (environment) {
    case 'github':
      return detectGitHubContext();
    case 'gitlab':
      return detectGitLabContext();
    case 'vercel':
      return detectVercelContext();
    case 'local':
      return { type: 'local' };
    case 'azure-devops':
      // Future: return detectAzureDevOpsContext();
      return { type: 'local' };
    default:
      return { type: 'local' };
  }
}

/**
 * GitHub Actions context detection
 * 
 * Environment Variables:
 * - PR: GITHUB_EVENT_NAME='pull_request', GITHUB_BASE_REF, GITHUB_HEAD_REF, GITHUB_EVENT_NUMBER
 * - Branch: GITHUB_REF_NAME
 * - Commit: GITHUB_SHA
 */
function detectGitHubContext(): ReviewContext {
  // 1. Check for PR context
  if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
    const targetBranch = process.env.GITHUB_BASE_REF;
    const sourceBranch = process.env.GITHUB_HEAD_REF;
    const prNumber = process.env.GITHUB_EVENT_PULL_REQUEST_NUMBER || process.env.GITHUB_EVENT_NUMBER;
    
    if (targetBranch && sourceBranch && prNumber) {
      return {
        type: 'pr',
        prNumber,
        sourceBranch,
        targetBranch
      };
    }
  }
  
  // 2. Check for branch context
  if (process.env.GITHUB_REF_NAME) {
    return {
      type: 'branch',
      branchName: process.env.GITHUB_REF_NAME
    };
  }
  
  // 3. Check for commit context
  if (process.env.GITHUB_SHA) {
    return {
      type: 'commit',
      commitSha: process.env.GITHUB_SHA
    };
  }
  
  // 4. Fallback to local
  return { type: 'local' };
}

/**
 * GitLab CI context detection
 * 
 * Environment Variables:
 * - MR: CI_MERGE_REQUEST_IID, CI_MERGE_REQUEST_TARGET_BRANCH_NAME, CI_MERGE_REQUEST_SOURCE_BRANCH_NAME, CI_MERGE_REQUEST_TITLE
 * - Branch: CI_COMMIT_REF_NAME
 * - Commit: CI_COMMIT_SHA
 */
function detectGitLabContext(): ReviewContext {
  // 1. Check for MR context
  if (process.env.CI_MERGE_REQUEST_IID) {
    const targetBranch = process.env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME;
    const sourceBranch = process.env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME;
    const mrNumber = process.env.CI_MERGE_REQUEST_IID;
    const mrTitle = process.env.CI_MERGE_REQUEST_TITLE;
    
    if (targetBranch && sourceBranch && mrNumber) {
      return {
        type: 'mr',
        mrNumber,
        sourceBranch,
        targetBranch,
        prTitle: mrTitle || undefined
      };
    }
  }
  
  // 2. Check for branch context
  if (process.env.CI_COMMIT_REF_NAME) {
    return {
      type: 'branch',
      branchName: process.env.CI_COMMIT_REF_NAME
    };
  }
  
  // 3. Check for commit context
  if (process.env.CI_COMMIT_SHA) {
    return {
      type: 'commit',
      commitSha: process.env.CI_COMMIT_SHA
    };
  }
  
  // 4. Fallback to local
  return { type: 'local' };
}

/**
 * Vercel context detection
 * 
 * Environment Variables:
 * - Branch: VERCEL_GIT_COMMIT_REF
 * - Commit: VERCEL_GIT_COMMIT_SHA
 */
function detectVercelContext(): ReviewContext {
  // 1. Check for branch context
  if (process.env.VERCEL_GIT_COMMIT_REF) {
    return {
      type: 'branch',
      branchName: process.env.VERCEL_GIT_COMMIT_REF
    };
  }
  
  // 2. Check for commit context
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return {
      type: 'commit',
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA
    };
  }
  
  // 3. Fallback to local
  return { type: 'local' };
}

