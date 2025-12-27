import simpleGit, { SimpleGit } from 'simple-git';

/**
 * Gets the raw git remote URL from origin.
 * Returns the URL exactly as Git provides it - no parsing or normalization.
 * Server-side can normalize variations if needed based on actual data.
 */
export async function getRepoName(repoRoot: string): Promise<string | null> {
  const git: SimpleGit = simpleGit(repoRoot);

  try {
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(r => r.name === 'origin');
    
    if (!origin || !origin.refs?.fetch) {
      return null;
    }

    // Return raw URL - let server handle normalization if needed
    return origin.refs.fetch;
  } catch (error) {
    return null;
  }
}

/**
 * Gets current branch name from git.
 * Returns null if not in a git repo or error occurs.
 */
export async function getBranchName(repoRoot: string): Promise<string | null> {
  const git: SimpleGit = simpleGit(repoRoot);

  try {
    const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
    return branch || null;
  } catch (error) {
    return null;
  }
}

