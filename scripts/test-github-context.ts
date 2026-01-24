#!/usr/bin/env node

/**
 * GitHub Actions Context Test Script
 * 
 * This script tests the EXACT same approach used by the CLI tool.
 * It mirrors the implementation in:
 * - src/git/ci-context.ts (getCIContext)
 * - src/git/ci-config.ts (GitHub config)
 * - src/git/diff.ts (shared git commands)
 * 
 * Run from GitHub Actions workflow:
 *   npx tsx scripts/test-github-context.ts
 */

import { execSync } from 'child_process';

function runCommand(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', cwd: process.cwd() }).trim();
  } catch (error: any) {
    return `ERROR: ${error.message}`;
  }
}

function logSection(title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

function logEnvVar(name: string) {
  const value = process.env[name];
  console.log(`${name.padEnd(30)} = ${value || '(not set)'}`);
}

function sanitizeRepoUrl(url: string): string {
  // Same as CLI: Remove embedded credentials (CI tokens) from the URL
  return url.replace(/^(https?:\/\/)([^@]+@)/, '$1');
}

async function main() {
  console.log('\n🔍 GitHub Actions Context Test Script (CLI Implementation)\n');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Working Directory: ${process.cwd()}`);

  // 1. Environment Detection (matches CLI: src/utils/environment.ts)
  logSection('Environment Detection');
  const isGitHub = !!process.env.GITHUB_ACTIONS;
  console.log(`  GITHUB_ACTIONS: ${isGitHub ? '✅ YES' : '❌ NO'}`);
  if (!isGitHub) {
    console.log('  ⚠️  Not running in GitHub Actions - some tests may fail');
  }

  // 2. GitHub-Specific Environment Variables (matches CLI: src/git/ci-config.ts)
  logSection('GitHub Environment Variables');
  logEnvVar('GITHUB_EVENT_NAME');
  logEnvVar('GITHUB_REF_NAME');
  logEnvVar('GITHUB_BASE_REF');
  logEnvVar('GITHUB_HEAD_REF');
  logEnvVar('GITHUB_SHA');
  logEnvVar('GITHUB_REPOSITORY');
  logEnvVar('GITHUB_SERVER_URL');
  logEnvVar('PR_TITLE');

  const eventName = process.env.GITHUB_EVENT_NAME;
  const refName = process.env.GITHUB_REF_NAME;
  const baseRef = process.env.GITHUB_BASE_REF;
  const commitSha = process.env.GITHUB_SHA;

  // 3. PR Detection (matches CLI: src/git/ci-config.ts - github.isPullRequest)
  logSection('PR Detection');
  const isPR = eventName === 'pull_request';
  console.log(`  GITHUB_EVENT_NAME === 'pull_request': ${isPR ? '✅ YES' : '❌ NO'}`);
  console.log(`  Review Context: ${isPR ? 'pr' : 'commit'}`);

  // 4. Repository URL (matches CLI: src/git/diff.ts - getRepoUrl)
  logSection('Repository URL Detection');
  console.log('\n--- Method: git remote get-url origin (CLI approach) ---');
  try {
    const rawUrl = runCommand('git remote get-url origin');
    console.log(`  Raw URL: ${rawUrl}`);
    const sanitizedUrl = sanitizeRepoUrl(rawUrl);
    console.log(`  ✅ Sanitized URL: ${sanitizedUrl}`);
    console.log(`  (Credentials removed for security)`);
  } catch (error) {
    console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // 5. Branch Name (matches CLI: src/git/ci-config.ts - github.getBranchName)
  logSection('Branch Name Detection');
  console.log('\n--- Method: GITHUB_REF_NAME (CLI approach) ---');
  if (refName) {
    console.log(`  ✅ Branch: ${refName}`);
  } else {
    console.log(`  ❌ FAILED: GITHUB_REF_NAME not set`);
    console.log(`  This should be automatically provided by GitHub Actions.`);
  }

  // 6. Commit SHA (matches CLI: src/git/diff.ts - getHeadCommitSha)
  logSection('Commit SHA Detection');
  console.log('\n--- Method: git rev-parse HEAD (CLI approach) ---');
  try {
    const headSha = runCommand('git rev-parse HEAD');
    console.log(`  ✅ HEAD SHA: ${headSha}`);
    if (commitSha && headSha !== commitSha) {
      console.log(`  ⚠️  WARNING: HEAD SHA (${headSha}) differs from GITHUB_SHA (${commitSha})`);
    } else if (commitSha) {
      console.log(`  ✅ Matches GITHUB_SHA: ${commitSha}`);
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // 7. Commit Author (matches CLI: src/git/diff.ts - getCommitAuthor)
  logSection('Commit Author Detection');
  console.log('\n--- Method: git log -1 --format="%an <%ae>" HEAD (CLI approach) ---');
  try {
    const authorOutput = runCommand('git log -1 --format="%an <%ae>" HEAD');
    const match = authorOutput.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
      const name = match[1].trim();
      const email = match[2].trim();
      console.log(`  ✅ Name: ${name}`);
      console.log(`  ✅ Email: ${email}`);
    } else {
      console.log(`  ❌ FAILED: Could not parse author format`);
      console.log(`  Output: ${authorOutput}`);
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // 8. Commit Message (matches CLI: src/git/diff.ts - getCommitMessage)
  logSection('Commit Message Detection');
  console.log('\n--- Method: git show HEAD --format=%B --no-patch (CLI approach) ---');
  try {
    const message = runCommand('git show HEAD --format=%B --no-patch');
    const firstLine = message.split('\n')[0];
    console.log(`  ✅ First line: ${firstLine}`);
    console.log(`  Full message length: ${message.length} characters`);
  } catch (error) {
    console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // 9. Commit Details (for debugging)
  logSection('Commit Details');
  console.log('\n--- What is HEAD actually? ---');
  try {
    const commitDetails = runCommand('git log -1 --format="%H%n%P%n%s%n%b" HEAD');
    const details = commitDetails.split('\n');
    console.log(`  Full SHA: ${details[0]}`);
    console.log(`  Parent SHAs: ${details[1] || '(none)'}`);
    console.log(`  Subject: ${details[2]}`);
    const parentCount = details[1] ? details[1].split(' ').filter(p => p.trim()).length : 0;
    console.log(`  Parent count: ${parentCount}`);
    
    if (parentCount === 0) {
      console.log(`  ⚠️  Root commit (no parent)`);
    } else if (parentCount === 1) {
      console.log(`  ✅ Regular commit`);
    } else {
      console.log(`  ⚠️  Merge commit (${parentCount} parents)`);
      console.log(`  💡 Merge commits may show combined diff by default`);
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // 10. Diff Detection (matches CLI: src/git/diff.ts)
  logSection('Diff Detection');
  
  if (isPR && baseRef) {
    console.log('\n--- PR Context: Pull Request Diff (CLI approach) ---');
    console.log(`  Target branch: ${baseRef}`);
    
    // Step 1: Fetch target branch (matches CLI: getPRDiff)
    console.log(`\n  Step 1: Fetching target branch origin/${baseRef}...`);
    try {
      const fetchResult = runCommand(`git fetch origin ${baseRef}:refs/remotes/origin/${baseRef} --depth=1 2>&1`);
      if (fetchResult.includes('fatal:') || fetchResult.includes('error:')) {
        console.log(`  ❌ Fetch failed: ${fetchResult.split('\n')[0]}`);
      } else {
        console.log(`  ✅ Fetch successful`);
      }
    } catch (error) {
      console.log(`  ❌ Fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Step 2: Compare using two dots (matches CLI: getPRDiff)
    console.log(`\n  Step 2: Comparing origin/${baseRef}..HEAD (two dots)...`);
    try {
      const diffStats = runCommand(`git diff origin/${baseRef}..HEAD --stat 2>&1 | tail -1`);
      const fileCount = runCommand(`git diff origin/${baseRef}..HEAD --name-only 2>&1 | grep -v "^$" | wc -l`);
      console.log(`  ✅ Files changed: ${fileCount.trim()}`);
      console.log(`  ✅ Diff stats: ${diffStats.trim()}`);
      
      // Show first 10 files
      const files = runCommand(`git diff origin/${baseRef}..HEAD --name-only 2>&1 | grep -v "^$" | head -10`);
      if (files && !files.includes('fatal:') && !files.includes('error:')) {
        console.log(`\n  First 10 files:`);
        files.split('\n').forEach(file => {
          if (file.trim()) console.log(`    - ${file.trim()}`);
        });
      }
    } catch (error) {
      console.log(`  ❌ Diff failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    console.log('\n--- Commit Context: Single Commit Diff (CLI approach) ---');
    
    // Get parent SHA first (matches CLI: getCommitDiff)
    console.log(`\n  Step 1: Getting parent commit SHA...`);
    let parentSha: string;
    try {
      parentSha = runCommand('git show HEAD --format=%P --no-patch');
      console.log(`  ✅ Parent SHA: ${parentSha || '(none - root commit)'}`);
    } catch (error) {
      console.log(`  ❌ Failed to get parent SHA: ${error instanceof Error ? error.message : 'Unknown error'}`);
      parentSha = '';
    }
    
    // Fetch parent if available (matches CLI: getCommitDiff)
    if (parentSha && parentSha.length === 40) {
      console.log(`\n  Step 2: Fetching parent commit...`);
      try {
        const fetchResult = runCommand(`git fetch origin ${parentSha} --depth=1 2>&1`);
        if (fetchResult.includes('fatal:') || fetchResult.includes('error:')) {
          console.log(`  ⚠️  Fetch warning: ${fetchResult.split('\n')[0]}`);
        } else {
          console.log(`  ✅ Parent commit available`);
        }
      } catch (error) {
        console.log(`  ⚠️  Fetch warning: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Step 3: Get diff using git show (matches CLI: getCommitDiff)
    console.log(`\n  Step 3: Getting diff with git show HEAD...`);
    try {
      const diffStats = runCommand('git show HEAD --stat 2>&1 | tail -1');
      const fileCount = runCommand('git show HEAD --name-only --format= --pretty=format: 2>&1 | grep -v "^$" | wc -l');
      console.log(`  ✅ Files changed: ${fileCount.trim()}`);
      console.log(`  ✅ Diff stats: ${diffStats.trim()}`);
      
      // Show first 10 files
      const files = runCommand('git show HEAD --name-only --format= --pretty=format: 2>&1 | grep -v "^$" | head -10');
      if (files && !files.includes('fatal:') && !files.includes('error:')) {
        console.log(`\n  First 10 files:`);
        files.split('\n').forEach(file => {
          if (file.trim()) console.log(`    - ${file.trim()}`);
        });
      }
    } catch (error) {
      console.log(`  ❌ Diff failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 11. Summary
  logSection('Summary');
  console.log(`\nEvent Type: ${eventName || 'unknown'}`);
  console.log(`Review Context: ${isPR ? 'pr' : 'commit'}`);
  console.log(`\nCLI Implementation Strategy:`);
  console.log(`  ✅ Repository: git remote get-url origin (sanitized)`);
  console.log(`  ✅ Branch: GITHUB_REF_NAME`);
  console.log(`  ✅ Commit SHA: git rev-parse HEAD`);
  console.log(`  ✅ Commit Author: git log -1 --format="%an <%ae>" HEAD`);
  console.log(`  ✅ Commit Message: git show HEAD --format=%B --no-patch`);
  if (isPR) {
    console.log(`  ✅ Diff: Fetch origin/${baseRef}, then origin/${baseRef}..HEAD`);
  } else {
    console.log(`  ✅ Diff: Fetch parent, then git show HEAD`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Test complete!');
  console.log('='.repeat(60) + '\n');
}

main().catch((error) => {
  console.error('Error running test script:', error);
  process.exit(1);
});
