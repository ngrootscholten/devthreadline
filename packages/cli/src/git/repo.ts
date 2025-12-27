import simpleGit, { SimpleGit } from 'simple-git';

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

