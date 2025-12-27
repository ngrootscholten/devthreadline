import simpleGit, { SimpleGit } from 'simple-git';
import chalk from 'chalk';

/**
 * Gets the raw git remote URL from origin.
 * Returns the URL exactly as Git provides it - no parsing or normalization.
 * Server-side can normalize variations if needed based on actual data.
 */
export async function getRepoName(repoRoot: string): Promise<string | null> {
  const git: SimpleGit = simpleGit(repoRoot);

  console.log(chalk.gray('   [DEBUG] getRepoName: Starting...'));
  console.log(chalk.gray(`   [DEBUG] getRepoName: repoRoot = ${repoRoot}`));

  try {
    const remotes = await git.getRemotes(true);
    console.log(chalk.gray(`   [DEBUG] getRepoName: Found ${remotes.length} remote(s)`));
    
    if (remotes.length > 0) {
      remotes.forEach((remote, idx) => {
        console.log(chalk.gray(`   [DEBUG] getRepoName: Remote[${idx}] name="${remote.name}", fetch="${remote.refs?.fetch || 'N/A'}", push="${remote.refs?.push || 'N/A'}"`));
      });
    } else {
      console.log(chalk.yellow('   [DEBUG] getRepoName: No remotes found'));
    }
    
    const origin = remotes.find(r => r.name === 'origin');
    
    if (!origin) {
      console.log(chalk.yellow('   [DEBUG] getRepoName: No "origin" remote found'));
      return null;
    }
    
    console.log(chalk.gray(`   [DEBUG] getRepoName: Found origin remote: fetch="${origin.refs?.fetch || 'N/A'}"`));
    
    if (!origin.refs?.fetch) {
      console.log(chalk.yellow('   [DEBUG] getRepoName: Origin remote found but no fetch URL'));
      return null;
    }

    console.log(chalk.green(`   [DEBUG] getRepoName: Success - returning "${origin.refs.fetch}"`));
    // Return raw URL - let server handle normalization if needed
    return origin.refs.fetch;
  } catch (error: any) {
    console.log(chalk.red(`   [DEBUG] getRepoName: Error occurred: ${error.message || error}`));
    if (error.stack) {
      console.log(chalk.gray(`   [DEBUG] getRepoName: Stack: ${error.stack}`));
    }
    return null;
  }
}

/**
 * Gets current branch name from git.
 * Returns null if not in a git repo or error occurs.
 */
export async function getBranchName(repoRoot: string): Promise<string | null> {
  const git: SimpleGit = simpleGit(repoRoot);

  console.log(chalk.gray('   [DEBUG] getBranchName: Starting...'));
  console.log(chalk.gray(`   [DEBUG] getBranchName: repoRoot = ${repoRoot}`));

  try {
    const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
    console.log(chalk.gray(`   [DEBUG] getBranchName: git revparse --abbrev-ref HEAD returned: "${branch || '(empty)'}"`));
    
    if (!branch) {
      console.log(chalk.yellow('   [DEBUG] getBranchName: Git command returned empty string'));
      return null;
    }
    
    console.log(chalk.green(`   [DEBUG] getBranchName: Success - returning "${branch}"`));
    return branch;
  } catch (error: any) {
    console.log(chalk.red(`   [DEBUG] getBranchName: Error occurred: ${error.message || error}`));
    if (error.stack) {
      console.log(chalk.gray(`   [DEBUG] getBranchName: Stack: ${error.stack}`));
    }
    return null;
  }
}

