import { findExperts } from '../validators/experts';
import { getGitDiff } from '../git/diff';
import { ReviewAPIClient } from '../api/client';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

export async function checkCommand(options: { apiUrl?: string; apiKey?: string }) {
  const repoRoot = process.cwd();
  
  console.log(chalk.blue('🔍 Threadline: Checking code against your experts...\n'));

  try {
    // 1. Find and validate experts
    console.log(chalk.gray('📋 Finding experts...'));
    const experts = await findExperts(repoRoot);
    console.log(chalk.green(`✓ Found ${experts.length} expert(s)\n`));

    if (experts.length === 0) {
      console.log(chalk.yellow('⚠️  No valid experts found. Add expert files to /experts folder.'));
      process.exit(0);
    }

    // 2. Get git diff
    console.log(chalk.gray('📝 Collecting git changes...'));
    const gitDiff = await getGitDiff(repoRoot);
    
    if (gitDiff.changedFiles.length === 0) {
      console.log(chalk.yellow('⚠️  No changes detected. Make some code changes and try again.'));
      process.exit(0);
    }
    console.log(chalk.green(`✓ Found ${gitDiff.changedFiles.length} changed file(s)\n`));

    // 3. Read context files for each expert
    const expertsWithContext = experts.map(expert => {
      const contextContent: Record<string, string> = {};
      
      if (expert.contextFiles) {
        for (const contextFile of expert.contextFiles) {
          const fullPath = path.join(repoRoot, contextFile);
          if (fs.existsSync(fullPath)) {
            contextContent[contextFile] = fs.readFileSync(fullPath, 'utf-8');
          }
        }
      }

      return {
        id: expert.id,
        version: expert.version,
        patterns: expert.patterns,
        content: expert.content,
        contextFiles: expert.contextFiles,
        contextContent
      };
    });

    // 4. Get API URL and key
    const apiUrl = options.apiUrl || process.env.THREADLINE_API_URL || 'http://localhost:3000';
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OpenAI API key required. Set OPENAI_API_KEY environment variable.');
    }

    // 5. Call review API
    console.log(chalk.gray('🤖 Running expert reviews...'));
    const client = new ReviewAPIClient(apiUrl);
    const response = await client.review({
      experts: expertsWithContext,
      diff: gitDiff.diff,
      files: gitDiff.changedFiles,
      apiKey
    });

    // 6. Display results
    displayResults(response);

    // Exit with appropriate code
    const hasAttention = response.results.some(r => r.status === 'attention');
    process.exit(hasAttention ? 1 : 0);

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    process.exit(1);
  }
}

function displayResults(response: any) {
  const { results, metadata } = response;

  console.log('\n' + chalk.bold('Results:\n'));
  console.log(chalk.gray(`${metadata.totalExperts} expert reviews done`));
  
  const notRelevant = results.filter(r => r.status === 'not_relevant').length;
  const compliant = results.filter(r => r.status === 'compliant').length;
  const attention = results.filter(r => r.status === 'attention').length;

  if (notRelevant > 0) {
    console.log(chalk.gray(`  ${notRelevant} not relevant`));
  }
  if (compliant > 0) {
    console.log(chalk.green(`  ${compliant} compliant`));
  }
  if (attention > 0) {
    console.log(chalk.yellow(`  ${attention} attention`));
  }

  if (metadata.timedOut > 0) {
    console.log(chalk.yellow(`  ${metadata.timedOut} timed out`));
  }
  if (metadata.errors > 0) {
    console.log(chalk.red(`  ${metadata.errors} errors`));
  }

  console.log('');

  // Show attention items
  const attentionItems = results.filter(r => r.status === 'attention');
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

  // Show compliant items (optional, can be verbose)
  if (attentionItems.length === 0 && compliant > 0) {
    console.log(chalk.green('✓ All experts passed!\n'));
  }
}

