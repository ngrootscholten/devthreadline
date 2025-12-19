import simpleGit, { SimpleGit } from 'simple-git';

/**
 * Gets repository name from git remote URL.
 * Parses common formats: github.com/user/repo, gitlab.com/user/repo, etc.
 * Returns null if no remote or parsing fails.
 */
export async function getRepoName(repoRoot: string): Promise<string | null> {
  const git: SimpleGit = simpleGit(repoRoot);

  try {
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(r => r.name === 'origin');
    
    if (!origin?.refs?.fetch) {
      return null;
    }

    const url = origin.refs.fetch;
    
    // Parse repo name from common URL formats:
    // - https://github.com/user/repo.git
    // - git@github.com:user/repo.git
    // - https://gitlab.com/user/repo.git
    // - git@gitlab.com:user/repo.git
    const patterns = [
      /(?:github\.com|gitlab\.com)[\/:]([^\/]+\/[^\/]+?)(?:\.git)?$/,
      /([^\/]+\/[^\/]+?)(?:\.git)?$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  } catch (error) {
    // If no remote or error, return null
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

