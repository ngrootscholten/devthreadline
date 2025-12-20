import simpleGit, { SimpleGit } from 'simple-git';

export interface GitDiffResult {
  diff: string;
  changedFiles: string[];
}

/**
 * Get diff for staged/unstaged changes (current behavior)
 */
export async function getGitDiff(repoRoot: string): Promise<GitDiffResult> {
  const git: SimpleGit = simpleGit(repoRoot);

  // Check if we're in a git repo
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new Error('Not a git repository. Threadline requires a git repository.');
  }

  // Get diff (staged changes, or unstaged if no staged)
  const status = await git.status();
  
  let diff: string;
  if (status.staged.length > 0) {
    // Use staged changes
    diff = await git.diff(['--cached']);
  } else if (status.files.length > 0) {
    // Use unstaged changes
    diff = await git.diff();
  } else {
    // No changes
    return {
      diff: '',
      changedFiles: []
    };
  }

  // Get list of changed files
  const changedFiles = status.files
    .filter(f => f.working_dir !== ' ' || f.index !== ' ')
    .map(f => f.path);

  return {
    diff: diff || '',
    changedFiles
  };
}

/**
 * Get diff for a specific branch (all commits vs base branch)
 * Uses git merge-base to find common ancestor, then diffs from there
 */
export async function getBranchDiff(
  repoRoot: string,
  branchName: string,
  baseBranch?: string
): Promise<GitDiffResult> {
  const git: SimpleGit = simpleGit(repoRoot);

  // Check if we're in a git repo
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new Error('Not a git repository. Threadline requires a git repository.');
  }

  // Determine base branch
  let base: string;
  
  if (baseBranch) {
    // Use provided base branch
    base = baseBranch;
  } else {
    // Check if the branch itself is a base branch (main/master)
    const baseBranchNames = ['main', 'master'];
    const isBaseBranch = baseBranchNames.includes(branchName.toLowerCase());
    
    if (isBaseBranch) {
      // For main/master branch, compare against previous commit (HEAD~1)
      // This checks what changed in the most recent commit
      try {
        const previousCommit = await git.revparse(['HEAD~1']).catch(() => null);
        if (previousCommit) {
          // Use commit-based diff instead
          const diff = await git.diff([`${previousCommit}..HEAD`]);
          const diffSummary = await git.diffSummary([`${previousCommit}..HEAD`]);
          const changedFiles = diffSummary.files.map(f => f.file);
          
          return {
            diff: diff || '',
            changedFiles
          };
        }
      } catch {
        // If no previous commit, return empty (first commit)
        return {
          diff: '',
          changedFiles: []
        };
      }
    }
    
    // Try to detect base branch: upstream, default branch, or common names
    base = await detectBaseBranch(git, branchName);
  }
  
  // Helper function to detect base branch
  async function detectBaseBranch(git: SimpleGit, branchName: string): Promise<string> {
    // Try upstream tracking branch
    const upstream = await git.revparse(['--abbrev-ref', '--symbolic-full-name', `${branchName}@{u}`]).catch(() => null);
    if (upstream) {
      // Extract base from upstream (e.g., "origin/main" -> "main")
      const upstreamBranch = upstream.replace(/^origin\//, '');
      // Don't use the branch itself as its base
      if (upstreamBranch !== branchName) {
        return upstreamBranch;
      }
    }
    
    // Try default branch
    try {
      const defaultBranch = await git.revparse(['--abbrev-ref', 'refs/remotes/origin/HEAD']);
      const defaultBranchName = defaultBranch.replace(/^origin\//, '');
      // Don't use the branch itself as its base
      if (defaultBranchName !== branchName) {
        return defaultBranchName;
      }
    } catch {
      // Continue to fallback
    }
    
    // Fallback to common names (excluding the branch itself)
    const commonBases = ['main', 'master', 'develop'];
    for (const candidate of commonBases) {
      if (candidate.toLowerCase() === branchName.toLowerCase()) {
        continue; // Skip if it's the same branch
      }
      try {
        await git.revparse([`origin/${candidate}`]);
        return candidate;
      } catch {
        // Try next
      }
    }
    throw new Error(`Could not determine base branch for '${branchName}'. Please specify with --base flag or set upstream tracking.`);
  }

  // Get diff between base and branch (cumulative diff of all commits)
  // Format: git diff base...branch (three-dot notation finds common ancestor)
  const diff = await git.diff([`${base}...${branchName}`]);
  
  // Get list of changed files
  const diffSummary = await git.diffSummary([`${base}...${branchName}`]);
  const changedFiles = diffSummary.files.map(f => f.file);

  return {
    diff: diff || '',
    changedFiles
  };
}

/**
 * Get diff for a specific commit
 */
export async function getCommitDiff(repoRoot: string, sha: string): Promise<GitDiffResult> {
  const git: SimpleGit = simpleGit(repoRoot);

  // Check if we're in a git repo
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new Error('Not a git repository. Threadline requires a git repository.');
  }

  // Get diff for the commit
  // Use git show to get the commit diff
  let diff: string;
  let changedFiles: string[];
  
  try {
    // Get diff using git show
    diff = await git.show([sha, '--format=', '--no-color']);
    
    // Get changed files using git show --name-only
    const commitFiles = await git.show([sha, '--name-only', '--format=', '--pretty=format:']);
    changedFiles = commitFiles
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.trim());
  } catch (error: any) {
    // Fallback: try git diff format
    try {
      diff = await git.diff([`${sha}^..${sha}`]);
      // Get files from diff summary
      const diffSummary = await git.diffSummary([`${sha}^..${sha}`]);
      changedFiles = diffSummary.files.map(f => f.file);
    } catch (diffError: any) {
      throw new Error(`Commit ${sha} not found or invalid: ${error.message || diffError.message}`);
    }
  }

  return {
    diff: diff || '',
    changedFiles
  };
}

/**
 * Get diff for PR/MR (source branch vs target branch)
 */
export async function getPRMRDiff(
  repoRoot: string,
  sourceBranch: string,
  targetBranch: string
): Promise<GitDiffResult> {
  const git: SimpleGit = simpleGit(repoRoot);

  // Check if we're in a git repo
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new Error('Not a git repository. Threadline requires a git repository.');
  }

  // Get diff between target and source (cumulative diff)
  // Format: git diff target...source (three-dot notation finds common ancestor)
  const diff = await git.diff([`${targetBranch}...${sourceBranch}`]);
  
  // Get list of changed files
  const diffSummary = await git.diffSummary([`${targetBranch}...${sourceBranch}`]);
  const changedFiles = diffSummary.files.map(f => f.file);

  return {
    diff: diff || '',
    changedFiles
  };
}

