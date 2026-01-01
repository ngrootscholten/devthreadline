/**
 * Metadata Collection
 * 
 * Collects environment-specific metadata for review context:
 * - Commit SHA (from env vars or git)
 * - Commit message (from git)
 * - PR/MR title (from env vars or API)
 * 
 * Metadata collection is environment-specific because each CI platform
 * provides different environment variables.
 */

import { Environment } from './environment';
import { ReviewContext } from './context';
import { getCommitMessage, getCommitAuthor } from '../git/diff';

export interface ReviewMetadata {
  commitSha?: string;
  commitMessage?: string;
  commitAuthorName?: string;
  commitAuthorEmail?: string;
  prTitle?: string;
}

/**
 * Collects metadata for the given context and environment.
 * 
 * This function knows how to extract metadata from each environment's
 * specific environment variables and git commands.
 */
export async function collectMetadata(
  context: ReviewContext,
  environment: Environment,
  repoRoot: string
): Promise<ReviewMetadata> {
  const metadata: ReviewMetadata = {};

  // Collect commit SHA (environment-specific)
  metadata.commitSha = getCommitSha(context, environment);

  // Collect commit message and author (if we have a commit SHA)
  if (metadata.commitSha) {
    const message = await getCommitMessage(repoRoot, metadata.commitSha);
    if (message) {
      metadata.commitMessage = message;
    }
    
    // Get commit author using commit SHA
    // No fallbacks - if this fails, the error propagates and fails the check
    const author = await getCommitAuthor(repoRoot, metadata.commitSha);
    if (author) {
      metadata.commitAuthorName = author.name;
      metadata.commitAuthorEmail = author.email;
    }
  } else {
    // For local environment without explicit commit SHA, get HEAD commit author
    // No fallbacks - if this fails, the error propagates and fails the check
    const author = await getCommitAuthor(repoRoot);
    if (author) {
      metadata.commitAuthorName = author.name;
      metadata.commitAuthorEmail = author.email;
    }
  }

  // Collect PR/MR title (environment-specific)
  metadata.prTitle = getPRTitle(context, environment);

  return metadata;
}

/**
 * Extracts commit SHA from context and environment.
 */
function getCommitSha(context: ReviewContext, environment: Environment): string | undefined {
  // If context already has commit SHA, use it
  if (context.type === 'commit') {
    return context.commitSha;
  }

  // For branch contexts, try to get commit SHA from environment variables
  if (context.type === 'branch') {
    switch (environment) {
      case 'github':
        return process.env.GITHUB_SHA;
      case 'gitlab':
        return process.env.CI_COMMIT_SHA;
      case 'vercel':
        return process.env.VERCEL_GIT_COMMIT_SHA;
      default:
        return undefined;
    }
  }

  // For PR/MR contexts, commit SHA might be available in env vars
  if (context.type === 'pr' || context.type === 'mr') {
    switch (environment) {
      case 'github':
        // For PRs, GITHUB_SHA is a merge commit, might want GITHUB_HEAD_SHA instead
        return process.env.GITHUB_HEAD_SHA || process.env.GITHUB_SHA;
      case 'gitlab':
        return process.env.CI_COMMIT_SHA;
      default:
        return undefined;
    }
  }

  return undefined;
}

/**
 * Extracts PR/MR title from context and environment.
 * 
 * Note: GitHub Actions doesn't provide PR title as an env var by default.
 * It would need to be passed from the workflow YAML or fetched via API.
 */
function getPRTitle(context: ReviewContext, environment: Environment): string | undefined {
  // Only PR/MR contexts have titles
  if (context.type !== 'pr' && context.type !== 'mr') {
    return undefined;
  }

  // GitLab CI provides MR title as env var
  if (context.type === 'mr' && environment === 'gitlab') {
    return context.prTitle;
  }

  // GitHub Actions doesn't provide PR title as env var
  // Would need to be passed from workflow: PR_TITLE: ${{ github.event.pull_request.title }}
  // or fetched via GitHub API
  if (context.type === 'pr' && environment === 'github') {
    return process.env.PR_TITLE; // Only if passed from workflow
  }

  return undefined;
}

