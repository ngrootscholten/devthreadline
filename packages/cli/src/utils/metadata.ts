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
import * as fs from 'fs';
import simpleGit from 'simple-git';

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

  // Collect commit message and author (environment-specific)
  if (metadata.commitSha) {
    const message = await getCommitMessage(repoRoot, metadata.commitSha);
    if (message) {
      metadata.commitMessage = message;
    }
    
    // Get commit author - environment-specific approach
    const author = await getCommitAuthorForEnvironment(environment, repoRoot, metadata.commitSha);
    if (author) {
      metadata.commitAuthorName = author.name;
      metadata.commitAuthorEmail = author.email;
    }
  } else {
    // For local environment without explicit commit SHA:
    // Use git config (who will commit staged/unstaged changes)
    // No fallbacks - if git config fails, the error propagates and fails the check
    console.log('[DEBUG] Local environment - calling getGitConfigUser()');
    const author = await getGitConfigUser(repoRoot);
    console.log(`[DEBUG] getGitConfigUser returned: ${JSON.stringify(author)}`);
    metadata.commitAuthorName = author.name;
    metadata.commitAuthorEmail = author.email;
    console.log(`[DEBUG] metadata after assignment: commitAuthorName=${metadata.commitAuthorName}, commitAuthorEmail=${metadata.commitAuthorEmail}`);
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
 * Gets commit author information using environment-specific methods.
 * 
 * For GitHub: Reads from GITHUB_EVENT_PATH JSON file (most reliable)
 * For GitLab: Uses CI_COMMIT_AUTHOR environment variable (most reliable)
 * For Local: Uses git config (for uncommitted changes, represents who will commit)
 * For other environments: Uses git log command
 */
async function getCommitAuthorForEnvironment(
  environment: Environment,
  repoRoot: string,
  commitSha: string
): Promise<{ name: string; email: string } | null> {
  if (environment === 'github') {
    // GitHub: Read from GITHUB_EVENT_PATH JSON file
    // This is more reliable than git commands, especially in shallow clones
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (eventPath && fs.existsSync(eventPath)) {
      try {
        const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf-8'));
        
        // For push events, use head_commit.author
        if (eventData.head_commit?.author) {
          return {
            name: eventData.head_commit.author.name,
            email: eventData.head_commit.author.email
          };
        }
        
        // For PR events, use commits[0].author (first commit in the PR)
        if (eventData.commits && eventData.commits.length > 0 && eventData.commits[0].author) {
          return {
            name: eventData.commits[0].author.name,
            email: eventData.commits[0].author.email
          };
        }
        
        // Fallback to pull_request.head.commit.author for PR events
        if (eventData.pull_request?.head?.commit?.author) {
          return {
            name: eventData.pull_request.head.commit.author.name,
            email: eventData.pull_request.head.commit.author.email
          };
        }
      } catch (error: unknown) {
        // If JSON parsing fails, fall through to git command
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`Warning: Failed to read GitHub event JSON: ${errorMessage}`);
      }
    }
  }
  
  if (environment === 'gitlab') {
    // GitLab: Use CI_COMMIT_AUTHOR environment variable
    // Format: "name <email>" (e.g., "ngrootscholten <niels.grootscholten@gmail.com>")
    // This is more reliable than git commands, especially in shallow clones
    const commitAuthor = process.env.CI_COMMIT_AUTHOR;
    if (commitAuthor) {
      // Parse "name <email>" format
      const match = commitAuthor.match(/^(.+?)\s*<(.+?)>$/);
      if (match) {
        return {
          name: match[1].trim(),
          email: match[2].trim()
        };
      }
      // If format doesn't match expected pattern, try to extract anyway
      // Some GitLab versions might format differently
      const parts = commitAuthor.trim().split(/\s+/);
      if (parts.length >= 2) {
        // Assume last part is email if it contains @
        const emailIndex = parts.findIndex(p => p.includes('@'));
        if (emailIndex >= 0) {
          const email = parts[emailIndex].replace(/[<>]/g, '').trim();
          const name = parts.slice(0, emailIndex).join(' ').trim();
          if (name && email) {
            return { name, email };
          }
        }
      }
    }
  }
  
  // Fallback to git command for all environments (including GitHub/GitLab if env vars unavailable)
  return await getCommitAuthor(repoRoot, commitSha);
}

/**
 * Gets git user info from git config (for local uncommitted changes).
 * This represents who is currently working on the changes and will commit them.
 * 
 * No fallbacks - if git config is not set or fails, throws an error.
 */
async function getGitConfigUser(repoRoot: string): Promise<{ name: string; email: string }> {
  const git = simpleGit(repoRoot);
  
  try {
    const name = await git.getConfig('user.name');
    const email = await git.getConfig('user.email');
    
    if (!name.value || !email.value) {
      throw new Error(
        'Git config user.name or user.email is not set. ' +
        'Run: git config user.name "Your Name" && git config user.email "your.email@example.com"'
      );
    }
    
    return {
      name: name.value.trim(),
      email: email.value.trim()
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get git config user: ${errorMessage}`);
  }
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

