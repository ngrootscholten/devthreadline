import { findThreadlines } from '../validators/experts';
import { getGitDiff, getBranchDiff, getCommitDiff, getPRMRDiff, getCommitMessage } from '../git/diff';
import { getFileContent, getFolderContent, getMultipleFilesContent } from '../git/file';
import { getRepoName, getBranchName } from '../git/repo';
import { getAutoReviewTarget } from '../utils/ci-detection';
import { ReviewAPIClient, ExpertResult } from '../api/client';
import { getThreadlineApiKey, getThreadlineAccount } from '../utils/config';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

/**
 * Detect the environment where the check is being run
 * Returns: 'vercel', 'github', 'gitlab', or 'local'
 */
function detectEnvironment(): string {
  // Vercel: VERCEL env var is always set in Vercel builds
  if (process.env.VERCEL) {
    return 'vercel';
  }
  
  // GitHub Actions: GITHUB_ACTIONS env var is always set
  if (process.env.GITHUB_ACTIONS) {
    return 'github';
  }
  
  // GitLab CI: GITLAB_CI env var is always set, or CI is set with GitLab-specific vars
  if (process.env.GITLAB_CI || (process.env.CI && process.env.CI_COMMIT_SHA)) {
    return 'gitlab';
  }
  
  // Local development: none of the above
  return 'local';
}

export async function checkCommand(options: { 
  apiUrl?: string; 
  full?: boolean;
  branch?: string;
  commit?: string;
  file?: string;
  folder?: string;
  files?: string[];
}) {
  const repoRoot = process.cwd();
  
  console.log(chalk.blue('🔍 Threadline: Checking code against your threadlines...\n'));

  // Get and validate API key
  const apiKey = getThreadlineApiKey();
  if (!apiKey) {
    console.error(chalk.red('❌ Error: THREADLINE_API_KEY is required'));
    console.log('');
    console.log(chalk.yellow('To fix this:'));
    console.log(chalk.white('  1. Create a .env.local file in your project root'));
    console.log(chalk.gray('  2. Add: THREADLINE_API_KEY=your-api-key-here'));
    console.log(chalk.gray('  3. Make sure .env.local is in your .gitignore'));
    console.log('');
    console.log(chalk.gray('For CI/CD: Set THREADLINE_API_KEY as an environment variable in your platform settings.'));
    process.exit(1);
  }

  // Get and validate account key
  const account = getThreadlineAccount();
  if (!account) {
    console.error(chalk.red('❌ Error: THREADLINE_ACCOUNT is required'));
    console.log('');
    console.log(chalk.yellow('To fix this:'));
    console.log(chalk.white('  1. Create a .env.local file in your project root'));
    console.log(chalk.gray('  2. Add: THREADLINE_ACCOUNT=your-email@example.com'));
    console.log(chalk.gray('  3. Make sure .env.local is in your .gitignore'));
    console.log('');
    console.log(chalk.gray('For CI/CD: Set THREADLINE_ACCOUNT as an environment variable in your platform settings.'));
    process.exit(1);
  }

  try {
    // 1. Find and validate threadlines
    console.log(chalk.gray('📋 Finding threadlines...'));
    const threadlines = await findThreadlines(repoRoot);
    console.log(chalk.green(`✓ Found ${threadlines.length} threadline(s)\n`));

    if (threadlines.length === 0) {
      console.log(chalk.yellow('⚠️  No valid threadlines found.'));
      console.log(chalk.gray('   Run `npx threadlines init` to create your first threadline.'));
      process.exit(0);
    }

    // 2. Determine review target and get git diff
    let gitDiff: { diff: string; changedFiles: string[] };
    let reviewContext: { type: string; value?: string } = { type: 'local' };
    let commitSha: string | undefined = undefined;
    let commitMessage: string | undefined = undefined;
    let prTitle: string | undefined = undefined;
    
    // Validate mutually exclusive flags
    const explicitFlags = [options.branch, options.commit, options.file, options.folder, options.files].filter(Boolean);
    if (explicitFlags.length > 1) {
      console.error(chalk.red('❌ Error: Only one review option can be specified at a time'));
      console.log(chalk.gray('   Options: --branch, --commit, --file, --folder, --files'));
      process.exit(1);
    }
    
    // Check for explicit flags first (override auto-detection)
    if (options.file) {
      console.log(chalk.gray(`📝 Reading file: ${options.file}...`));
      gitDiff = await getFileContent(repoRoot, options.file);
      reviewContext = { type: 'file', value: options.file };
    } else if (options.folder) {
      console.log(chalk.gray(`📝 Reading folder: ${options.folder}...`));
      gitDiff = await getFolderContent(repoRoot, options.folder);
      reviewContext = { type: 'folder', value: options.folder };
    } else if (options.files && options.files.length > 0) {
      console.log(chalk.gray(`📝 Reading ${options.files.length} file(s)...`));
      gitDiff = await getMultipleFilesContent(repoRoot, options.files);
      reviewContext = { type: 'files', value: options.files.join(', ') };
    } else if (options.branch) {
      console.log(chalk.gray(`📝 Collecting git changes for branch: ${options.branch}...`));
      gitDiff = await getBranchDiff(repoRoot, options.branch);
      reviewContext = { type: 'branch', value: options.branch };
    } else if (options.commit) {
      console.log(chalk.gray(`📝 Collecting git changes for commit: ${options.commit}...`));
      gitDiff = await getCommitDiff(repoRoot, options.commit);
      reviewContext = { type: 'commit', value: options.commit };
      commitSha = options.commit;
      // Fetch commit message (reliable when we have SHA)
      const message = await getCommitMessage(repoRoot, options.commit);
      if (message) {
        commitMessage = message;
      }
    } else {
      // Auto-detect CI environment or use local changes
      const autoTarget = getAutoReviewTarget();
      
      if (autoTarget) {
        if (autoTarget.type === 'pr' || autoTarget.type === 'mr') {
          // PR/MR: use source and target branches
          console.log(chalk.gray(`📝 Collecting git changes for ${autoTarget.type.toUpperCase()}: ${autoTarget.value}...`));
          gitDiff = await getPRMRDiff(repoRoot, autoTarget.sourceBranch!, autoTarget.targetBranch!);
          reviewContext = { type: autoTarget.type, value: autoTarget.value };
          // Use PR title from GitLab CI (reliable env var)
          if (autoTarget.prTitle) {
            prTitle = autoTarget.prTitle;
          }
        } else if (autoTarget.type === 'branch') {
          // Branch: use branch vs base
          console.log(chalk.gray(`📝 Collecting git changes for branch: ${autoTarget.value}...`));
          gitDiff = await getBranchDiff(repoRoot, autoTarget.value!);
          reviewContext = { type: 'branch', value: autoTarget.value };
        } else if (autoTarget.type === 'commit') {
          // Commit: use single commit
          console.log(chalk.gray(`📝 Collecting git changes for commit: ${autoTarget.value}...`));
          gitDiff = await getCommitDiff(repoRoot, autoTarget.value!);
          reviewContext = { type: 'commit', value: autoTarget.value };
          commitSha = autoTarget.value;
          // Fetch commit message (reliable when we have SHA)
          const message = await getCommitMessage(repoRoot, autoTarget.value!);
          if (message) {
            commitMessage = message;
          }
        } else {
          // Fallback: local development
          console.log(chalk.gray('📝 Collecting git changes...'));
          gitDiff = await getGitDiff(repoRoot);
        }
      } else {
        // Local development: use staged/unstaged changes
        console.log(chalk.gray('📝 Collecting git changes...'));
        gitDiff = await getGitDiff(repoRoot);
      }
    }
    
    if (gitDiff.changedFiles.length === 0) {
      console.log(chalk.yellow('⚠️  No changes detected. Make some code changes and try again.'));
      process.exit(0);
    }
    
    // Check for zero diff (files changed but no actual code changes)
    if (!gitDiff.diff || gitDiff.diff.trim() === '') {
      console.log(chalk.blue('ℹ️  No code changes detected. Diff contains zero lines added or removed.'));
      console.log(chalk.gray(`   ${gitDiff.changedFiles.length} file(s) changed but no content modifications detected.`));
      console.log('');
      console.log(chalk.bold('Results:\n'));
      console.log(chalk.gray(`${threadlines.length} threadlines checked`));
      console.log(chalk.gray(`  ${threadlines.length} not relevant`));
      console.log('');
      process.exit(0);
    }
    
    console.log(chalk.green(`✓ Found ${gitDiff.changedFiles.length} changed file(s)\n`));

    // 3. Read context files for each threadline
    const threadlinesWithContext = threadlines.map(threadline => {
      const contextContent: Record<string, string> = {};
      
      if (threadline.contextFiles) {
        for (const contextFile of threadline.contextFiles) {
          const fullPath = path.join(repoRoot, contextFile);
          if (fs.existsSync(fullPath)) {
            contextContent[contextFile] = fs.readFileSync(fullPath, 'utf-8');
          }
        }
      }

      return {
        id: threadline.id,
        version: threadline.version,
        patterns: threadline.patterns,
        content: threadline.content,
        contextFiles: threadline.contextFiles,
        contextContent
      };
    });

    // 4. Get repo name and branch name
    const repoName = await getRepoName(repoRoot);
    const branchName = await getBranchName(repoRoot);

    // 5. Get API URL
    const apiUrl = options.apiUrl || 
                   process.env.THREADLINE_API_URL || 
                   'https://devthreadline.com';

    // 6. Call review API
    console.log(chalk.gray('🤖 Running threadline checks...'));
    const client = new ReviewAPIClient(apiUrl);
    const environment = detectEnvironment();
    const response = await client.review({
      threadlines: threadlinesWithContext,
      diff: gitDiff.diff,
      files: gitDiff.changedFiles,
      apiKey,
      account,
      repoName: repoName || undefined,
      branchName: branchName || undefined,
      commitSha: commitSha,
      commitMessage: commitMessage,
      prTitle: prTitle,
      environment: environment
    });

    // 7. Display results (with filtering if --full not specified)
    displayResults(response, options.full || false);

    // Exit with appropriate code
    const hasAttention = response.results.some(r => r.status === 'attention');
    process.exit(hasAttention ? 1 : 0);

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    process.exit(1);
  }
}

function displayResults(response: any, showFull: boolean) {
  const { results, metadata, message } = response;

  // Filter results based on --full flag
  const filteredResults = showFull 
    ? results 
    : results.filter((r: ExpertResult) => r.status === 'attention');

  // Display informational message if present (e.g., zero diffs)
  if (message) {
    console.log('\n' + chalk.blue('ℹ️  ' + message));
  }

  console.log('\n' + chalk.bold('Results:\n'));
  console.log(chalk.gray(`${metadata.totalThreadlines} threadlines checked`));
  
  const notRelevant = results.filter((r: ExpertResult) => r.status === 'not_relevant').length;
  const compliant = results.filter((r: ExpertResult) => r.status === 'compliant').length;
  const attention = results.filter((r: ExpertResult) => r.status === 'attention').length;

  if (showFull) {
    // Show all results when --full flag is used
    if (notRelevant > 0) {
      console.log(chalk.gray(`  ${notRelevant} not relevant`));
    }
    if (compliant > 0) {
      console.log(chalk.green(`  ${compliant} compliant`));
    }
    if (attention > 0) {
      console.log(chalk.yellow(`  ${attention} attention`));
    }
  } else {
    // Default: only show attention items
    if (attention > 0) {
      console.log(chalk.yellow(`  ${attention} attention`));
    }
  }

  if (metadata.timedOut > 0) {
    console.log(chalk.yellow(`  ${metadata.timedOut} timed out`));
  }
  if (metadata.errors > 0) {
    console.log(chalk.red(`  ${metadata.errors} errors`));
  }

  console.log('');

  // Show attention items
  const attentionItems = filteredResults.filter((r: ExpertResult) => r.status === 'attention');
  if (attentionItems.length > 0) {
    for (const item of attentionItems) {
      console.log(chalk.yellow(`⚠️  ${item.expertId}`));
      if (item.fileReferences && item.fileReferences.length > 0) {
        for (const fileRef of item.fileReferences) {
          const lineRef = item.lineReferences?.[item.fileReferences.indexOf(fileRef)];
          const lineStr = lineRef ? `:${lineRef}` : '';
          console.log(chalk.gray(`   ${fileRef}${lineStr} - ${item.reasoning || 'Needs attention'}`));
        }
      } else if (item.reasoning) {
        console.log(chalk.gray(`   ${item.reasoning}`));
      }
    }
    console.log('');
  }

  // Show compliant items (only when --full flag is used)
  if (showFull) {
    const compliantItems = filteredResults.filter((r: ExpertResult) => r.status === 'compliant');
    if (compliantItems.length > 0 && attentionItems.length === 0) {
      console.log(chalk.green('✓ All threadlines passed!\n'));
    }
  } else if (attentionItems.length === 0 && compliant > 0) {
    // Default: show success message if no attention items
    console.log(chalk.green('✓ All threadlines passed!\n'));
  }
}

