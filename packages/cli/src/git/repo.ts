import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Gets repository URL. Prefers CI environment variables over git commands.
 * 
 * CI Environment Variables:
 * - GitHub Actions: GITHUB_REPOSITORY (format: "owner/repo"), GITHUB_SERVER_URL
 * - Vercel: VERCEL_GIT_REPO_OWNER, VERCEL_GIT_REPO_SLUG
 * - GitLab CI: Not available (falls back to git)
 * - Local: Falls back to git origin remote
 */
export async function getRepoName(repoRoot: string): Promise<string | null> {
  // GitHub Actions: GITHUB_REPOSITORY = "owner/repo"
  if (process.env.GITHUB_REPOSITORY) {
    const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
    return `${serverUrl}/${process.env.GITHUB_REPOSITORY}.git`;
  }

  // Vercel: Construct from owner + slug
  if (process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG) {
    return `https://github.com/${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}.git`;
  }

  // Fallback: git origin remote (local dev, GitLab CI)
  const git: SimpleGit = simpleGit(repoRoot);
  try {
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(r => r.name === 'origin');
    return origin?.refs?.fetch || null;
  } catch {
    return null;
  }
}

/**
 * Gets branch name. Prefers CI environment variables over git commands.
 * 
 * CI Environment Variables:
 * - GitHub Actions: GITHUB_REF_NAME
 * - Vercel: VERCEL_GIT_COMMIT_REF
 * - GitLab CI: CI_COMMIT_REF_NAME
 * - Local: Falls back to git revparse --abbrev-ref HEAD
 */
export async function getBranchName(repoRoot: string): Promise<string | null> {
  if (process.env.GITHUB_REF_NAME) return process.env.GITHUB_REF_NAME;
  if (process.env.VERCEL_GIT_COMMIT_REF) return process.env.VERCEL_GIT_COMMIT_REF;
  if (process.env.CI_COMMIT_REF_NAME) return process.env.CI_COMMIT_REF_NAME;

  // Fallback: git command
  const git: SimpleGit = simpleGit(repoRoot);
  try {
    return await git.revparse(['--abbrev-ref', 'HEAD']) || null;
  } catch {
    return null;
  }
}

/**
 * Detects the default branch name of the repository for GitHub Actions.
 * 
 * Uses GITHUB_EVENT_PATH JSON (repository.default_branch) - the most authoritative source
 * provided directly by GitHub Actions.
 * 
 * This function is ONLY called from GitHub Actions context (getGitHubDiff),
 * so GITHUB_EVENT_PATH should always be available. If it's not, we fail with a clear error.
 * 
 * Returns the branch name (e.g., "main", "master") without the "origin/" prefix.
 * Throws an error if the default branch cannot be detected.
 */
export async function getDefaultBranchName(repoRoot: string): Promise<string> {
  // GitHub Actions provides GITHUB_EVENT_PATH which contains repository.default_branch
  const githubEventPath = process.env.GITHUB_EVENT_PATH;
  
  if (!githubEventPath) {
    throw new Error(
      'GITHUB_EVENT_PATH environment variable is not set. ' +
      'This should be automatically provided by GitHub Actions. ' +
      'This function should only be called in GitHub Actions context.'
    );
  }

  try {
    const eventPath = path.resolve(githubEventPath);
    
    if (!fs.existsSync(eventPath)) {
      throw new Error(`GITHUB_EVENT_PATH file does not exist: ${eventPath}`);
    }
    
    const eventJson = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    const defaultBranch = eventJson.repository?.default_branch;
    
    if (!defaultBranch || typeof defaultBranch !== 'string') {
      throw new Error(
        'Could not find repository.default_branch in GITHUB_EVENT_PATH JSON. ' +
        'This should be automatically provided by GitHub Actions.'
      );
    }
    
    return defaultBranch;
  } catch (error: any) {
    // If it's already our error, re-throw it
    if (error.message.includes('GITHUB_EVENT_PATH') || error.message.includes('default_branch')) {
      throw error;
    }
    // Otherwise, wrap it
    throw new Error(
      `Failed to read or parse GITHUB_EVENT_PATH: ${error.message}. ` +
      'This should be automatically provided by GitHub Actions.'
    );
  }
}

