#!/usr/bin/env node

/**
 * GitHub Actions Context Test Script
 * 
 * This script tests all approaches for getting information needed by the GitHub Actions implementation:
 * - Repository name/URL
 * - Branch name
 * - Commit SHA
 * - Commit author
 * - Commit message
 * - PR title (optional)
 * - Diff (PR vs push)
 * 
 * Run from GitHub Actions workflow:
 *   npx tsx scripts/test-github-context.ts
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

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

function testApproach(name: string, testFn: () => string, expectedFormat?: string) {
  console.log(`\n--- ${name} ---`);
  const result = testFn();
  if (result.includes('ERROR') || result.includes('fatal:') || result.includes('not set')) {
    console.log(`  ❌ FAILED: ${result}`);
  } else {
    console.log(`  ✅ SUCCESS: ${result}`);
    if (expectedFormat) {
      console.log(`  Format: ${expectedFormat}`);
    }
  }
}

async function main() {
  console.log('\n🔍 GitHub Actions Context Test Script\n');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Working Directory: ${process.cwd()}`);

  // 1. Available Environment Variables
  logSection('Available Environment Variables');
  logEnvVar('GITHUB_EVENT_NAME');
  logEnvVar('GITHUB_REF_NAME');
  logEnvVar('GITHUB_BASE_REF');
  logEnvVar('GITHUB_HEAD_REF');
  logEnvVar('GITHUB_SHA');
  logEnvVar('GITHUB_REF');
  logEnvVar('GITHUB_REPOSITORY');
  logEnvVar('GITHUB_SERVER_URL');

  const eventName = process.env.GITHUB_EVENT_NAME;
  const baseRef = process.env.GITHUB_BASE_REF;
  const headRef = process.env.GITHUB_HEAD_REF;
  const commitSha = process.env.GITHUB_SHA;

  // 2. Repository Name/URL
  logSection('Repository Name/URL Detection');
  
  testApproach(
    'Method 1: GITHUB_REPOSITORY + GITHUB_SERVER_URL',
    () => {
      const repo = process.env.GITHUB_REPOSITORY;
      const server = process.env.GITHUB_SERVER_URL || 'https://github.com';
      if (!repo) return 'GITHUB_REPOSITORY not set';
      return `${server}/${repo}.git`;
    },
    'https://github.com/owner/repo.git'
  );

  testApproach(
    'Method 2: git remote get-url origin',
    () => runCommand('git remote get-url origin 2>&1'),
    'https://github.com/owner/repo.git or git@github.com:owner/repo.git'
  );

  // 3. Branch Name
  logSection('Branch Name Detection');
  
  testApproach(
    'Method 1: GITHUB_REF_NAME (recommended)',
    () => process.env.GITHUB_REF_NAME || 'not set',
    'branch-name'
  );

  testApproach(
    'Method 2: git rev-parse --abbrev-ref HEAD',
    () => {
      const result = runCommand('git rev-parse --abbrev-ref HEAD 2>&1');
      // In detached HEAD state, this returns "HEAD" which is not useful
      return result === 'HEAD' ? 'ERROR: Detached HEAD' : result;
    },
    'branch-name (fails in detached HEAD)'
  );

  testApproach(
    'Method 3: git symbolic-ref --short HEAD',
    () => runCommand('git symbolic-ref --short HEAD 2>&1'),
    'branch-name (fails in detached HEAD)'
  );

  // 4. Commit SHA
  logSection('Commit SHA Detection');
  
  testApproach(
    'Method 1: GITHUB_SHA (recommended)',
    () => process.env.GITHUB_SHA || 'not set',
    'full-commit-sha'
  );

  testApproach(
    'Method 2: git rev-parse HEAD',
    () => runCommand('git rev-parse HEAD 2>&1'),
    'full-commit-sha'
  );

  // 5. Commit Author
  logSection('Commit Author Detection');
  
  testApproach(
    'Method 1: git log -1 --format="%an <%ae>" HEAD (recommended)',
    () => runCommand('git log -1 --format="%an <%ae>" HEAD 2>&1'),
    'Name <email@example.com>'
  );

  testApproach(
    'Method 2: git log -1 --format="%an <%ae>" <SHA>',
    () => {
      if (!commitSha) return 'GITHUB_SHA not set';
      return runCommand(`git log -1 --format="%an <%ae>" ${commitSha} 2>&1`);
    },
    'Name <email@example.com>'
  );

  // Note: We don't test GITHUB_EVENT_PATH JSON because we've moved away from it
  // It's unreliable and requires parsing large JSON files

  // 6. Commit Message
  logSection('Commit Message Detection');
  
  testApproach(
    'Method 1: git log -1 --format="%s" HEAD',
    () => runCommand('git log -1 --format="%s" HEAD 2>&1'),
    'First line of commit message'
  );

  testApproach(
    'Method 2: git log -1 --format="%B" <SHA>',
    () => {
      if (!commitSha) return 'GITHUB_SHA not set';
      return runCommand(`git log -1 --format="%B" ${commitSha} 2>&1`).split('\n')[0] || 'empty';
    },
    'Full commit message'
  );

  // 7. PR Title (optional - not available by default)
  logSection('PR Title Detection');
  
  console.log('\n--- Note: PR Title is NOT available by default in GitHub Actions ---');
  console.log('  GitHub Actions does not provide PR title as an environment variable.');
  console.log('  To get PR title, you would need to:');
  console.log('    1. Parse GITHUB_EVENT_PATH JSON file (not recommended)');
  console.log('    2. Manually set env var in workflow: PR_TITLE: ${{ github.event.pull_request.title }}');
  console.log('    3. Use GitHub API (requires token)');
  console.log('\n  Current implementation: PR title is optional and only used if manually set.');

  // 8. Diff Detection
  logSection('Diff Detection');
  
  if (eventName === 'pull_request' && baseRef) {
    console.log('\n--- PR Context: Pull Request Diff ---');
    
    console.log(`\nStep 1: Fetch base branch (required for shallow clones)`);
    const fetchResult = runCommand(`git fetch origin ${baseRef}:refs/remotes/origin/${baseRef} --depth=1 2>&1`);
    const fetchSuccess = !fetchResult.includes('ERROR') && !fetchResult.includes('fatal:');
    console.log(`  ${fetchSuccess ? '✅' : '❌'} Fetch result: ${fetchSuccess ? 'Success' : fetchResult.split('\n')[0]}`);
    
    if (fetchSuccess) {
      testApproach(
        'PR Diff: origin/${baseRef}..HEAD (two dots - direct comparison)',
        () => {
          const result = runCommand(`git diff origin/${baseRef}..HEAD --stat 2>&1 | head -10`);
          return result.includes('fatal:') || result.includes('error:') ? result.split('\n')[0] : 'Success (showing stats)';
        },
        'Shows all changes in HEAD not in base branch'
      );

      testApproach(
        'PR Diff: origin/${baseRef}...HEAD (three dots - merge base)',
        () => {
          const result = runCommand(`git diff origin/${baseRef}...HEAD --stat 2>&1 | head -10`);
          if (result.includes('no merge base')) {
            return 'ERROR: no merge base (common in shallow clones)';
          }
          return result.includes('fatal:') || result.includes('error:') ? result.split('\n')[0] : 'Success (showing stats)';
        },
        'Shows changes since common ancestor (may fail in shallow clones)'
      );
    }
  } else {
    console.log('\n--- Push Context: Single Commit Diff ---');
    
    testApproach(
      'Push Diff: git show HEAD (recommended)',
      () => {
        const result = runCommand('git show HEAD --stat 2>&1 | head -10');
        return result.includes('fatal:') || result.includes('error:') ? result.split('\n')[0] : 'Success (showing stats)';
      },
      'Shows the commit diff (works with shallow clones)'
    );

    testApproach(
      'Push Diff: HEAD~1...HEAD (three dots)',
      () => {
        const result = runCommand('git diff HEAD~1...HEAD --stat 2>&1 | head -10');
        if (result.includes('unknown revision')) {
          return 'ERROR: HEAD~1 not available (shallow clone with fetch-depth: 1)';
        }
        return result.includes('fatal:') || result.includes('error:') ? result.split('\n')[0] : 'Success (showing stats)';
      },
      'Shows changes since parent commit (fails in shallow clones)'
    );

    testApproach(
      'Push Diff: HEAD~1..HEAD (two dots)',
      () => {
        const result = runCommand('git diff HEAD~1..HEAD --stat 2>&1 | head -10');
        if (result.includes('unknown revision')) {
          return 'ERROR: HEAD~1 not available (shallow clone with fetch-depth: 1)';
        }
        return result.includes('fatal:') || result.includes('error:') ? result.split('\n')[0] : 'Success (showing stats)';
      },
      'Shows changes between parent and current (fails in shallow clones)'
    );
  }

  // 9. Summary
  logSection('Summary & Current Implementation');
  
  console.log(`\nEvent Type: ${eventName || 'unknown'}`);
  console.log(`\nCurrent Implementation Strategy:`);
  
  if (eventName === 'pull_request') {
    console.log(`  ✅ Repository: GITHUB_REPOSITORY + GITHUB_SERVER_URL`);
    console.log(`  ✅ Branch: GITHUB_REF_NAME`);
    console.log(`  ✅ Commit SHA: GITHUB_SHA`);
    console.log(`  ✅ Commit Author: git log -1 --format="%an <%ae>" <SHA>`);
    console.log(`  ✅ Commit Message: git log -1 --format="%B" <SHA>`);
    console.log(`  ✅ PR Title: PR_TITLE env var (if set in workflow)`);
    console.log(`  ✅ Diff: Fetch base branch, then origin/${baseRef}..HEAD (two dots)`);
  } else {
    console.log(`  ✅ Repository: GITHUB_REPOSITORY + GITHUB_SERVER_URL`);
    console.log(`  ✅ Branch: GITHUB_REF_NAME`);
    console.log(`  ✅ Commit SHA: GITHUB_SHA`);
    console.log(`  ✅ Commit Author: git log -1 --format="%an <%ae>" <SHA>`);
    console.log(`  ✅ Commit Message: git log -1 --format="%B" <SHA>`);
    console.log(`  ✅ Diff: git show HEAD (works with shallow clones)`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Test complete!');
  console.log('='.repeat(60) + '\n');
}

main().catch((error) => {
  console.error('Error running test script:', error);
  process.exit(1);
});
