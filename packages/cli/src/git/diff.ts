import simpleGit, { SimpleGit } from 'simple-git';

export interface GitDiffResult {
  diff: string;
  changedFiles: string[];
}

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

