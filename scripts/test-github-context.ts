#!/usr/bin/env node

/**
 * GitHub Actions Context Test Script
 * 
 * This script collects and displays GitHub Actions environment variables and git state
 * to help understand what's available in different scenarios (branch push, PR, merge).
 * 
 * Run from GitHub Actions workflow or locally:
 *   npx tsx scripts/test-github-context.ts
 * 
 * Or add to GitHub Actions workflow:
 *   - name: Test GitHub Context
 *     run: npx tsx scripts/test-github-context.ts
 */

import { execSync } from 'child_process';
import * as path from 'path';

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

async function main() {
  console.log('\n🔍 GitHub Actions Context Test Script\n');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Working Directory: ${process.cwd()}`);

  // 1. Environment Variables
  logSection('Environment Variables');
  logEnvVar('GITHUB_EVENT_NAME');
  logEnvVar('GITHUB_REF_NAME');
  logEnvVar('GITHUB_BASE_REF');
  logEnvVar('GITHUB_HEAD_REF');
  logEnvVar('GITHUB_SHA');
  logEnvVar('GITHUB_REF');
  logEnvVar('GITHUB_WORKFLOW');
  logEnvVar('GITHUB_ACTIONS');
  logEnvVar('GITHUB_REPOSITORY');
  logEnvVar('GITHUB_RUN_ID');

  // 2. Git State
  logSection('Git State');
  
  console.log('\n--- Current Branch & Commit ---');
  console.log(`Current branch: ${runCommand('git rev-parse --abbrev-ref HEAD')}`);
  console.log(`Current commit: ${runCommand('git rev-parse HEAD')}`);
  console.log(`Current commit (short): ${runCommand('git rev-parse --short HEAD')}`);
  
  console.log('\n--- Commit Information ---');
  console.log(`Commit message (first line): ${runCommand('git log -1 --format=%s')}`);
  console.log(`Commit author: ${runCommand('git log -1 --format=%an <%ae>')}`);
  console.log(`Commit date: ${runCommand('git log -1 --format=%ai')}`);
  
  console.log('\n--- Commit Parents (for merge detection) ---');
  const parentShas = runCommand('git log -1 --format=%P');
  console.log(`Parent SHAs: ${parentShas || '(none - initial commit)'}`);
  // Count parents by splitting the parent SHAs string
  const parentCount = parentShas ? parentShas.split(/\s+/).filter(s => s.length > 0).length : 0;
  console.log(`Parent count: ${parentCount}`);
  const isMergeCommit = parentCount > 1;
  console.log(`Is merge commit: ${isMergeCommit ? 'YES ✅' : 'NO'}`);
  
  if (isMergeCommit) {
    console.log('\n--- Merge Commit Details ---');
    const fullMessage = runCommand('git log -1 --format=%B');
    console.log(`Full commit message:\n${fullMessage}`);
    
    // Try to extract branch name from GitHub merge commit message
    const mergeMatch = fullMessage.match(/Merge pull request #\d+ from [^/]+\/(.+)/);
    if (mergeMatch) {
      console.log(`\nExtracted branch from message: ${mergeMatch[1]}`);
    } else {
      console.log(`\nCould not extract branch from commit message`);
    }
  }

  // 3. Branch Information
  logSection('Branch Information');
  
  console.log('\n--- Available Branches ---');
  console.log('Local branches:');
  const localBranches = runCommand('git branch --format="%(refname:short)"');
  console.log(localBranches || '(none)');
  
  console.log('\nRemote branches:');
  const remoteBranches = runCommand('git branch -r --format="%(refname:short)"');
  console.log(remoteBranches || '(none)');
  
  console.log('\n--- Main Branch Detection ---');
  const mainExists = runCommand('git rev-parse --verify origin/main 2>/dev/null && echo "YES" || echo "NO"');
  console.log(`origin/main exists: ${mainExists}`);
  const masterExists = runCommand('git rev-parse --verify origin/master 2>/dev/null && echo "YES" || echo "NO"');
  console.log(`origin/master exists: ${masterExists}`);

  // 4. Diff Tests
  logSection('Diff Tests');
  
  const refName = process.env.GITHUB_REF_NAME || runCommand('git rev-parse --abbrev-ref HEAD');
  const currentSha = runCommand('git rev-parse HEAD');
  
  console.log(`\nUsing refName: ${refName}`);
  console.log(`Using current SHA: ${currentSha}`);
  
  console.log('\n--- Test 1: Current Strategy (origin/main vs origin/refName) ---');
  const diff1 = runCommand(`git diff origin/main...origin/${refName} --stat 2>&1 | head -20`);
  console.log(diff1 || '(no diff or error)');
  
  console.log('\n--- Test 2: Main Before/After Merge (origin/main~1 vs origin/main) ---');
  const diff2 = runCommand('git diff origin/main~1...origin/main --stat 2>&1 | head -20');
  console.log(diff2 || '(no diff or error)');
  
  console.log('\n--- Test 3: Previous Commit vs Current (HEAD~1 vs HEAD) ---');
  const diff3 = runCommand('git diff HEAD~1...HEAD --stat 2>&1 | head -20');
  console.log(diff3 || '(no diff or error)');
  
  if (isMergeCommit) {
    console.log('\n--- Test 4: Merge Commit Show (git show HEAD) ---');
    const diff4 = runCommand('git show --stat HEAD 2>&1 | head -20');
    console.log(diff4 || '(no diff or error)');
    
    console.log('\n--- Test 5: Merge Commit vs First Parent ---');
    const diff5 = runCommand('git diff HEAD^1...HEAD --stat 2>&1 | head -20');
    console.log(diff5 || '(no diff or error)');
    
    console.log('\n--- Test 6: Merge Commit vs Second Parent (if exists) ---');
    const diff6 = runCommand('git diff HEAD^2...HEAD --stat 2>&1 | head -20');
    console.log(diff6 || '(no diff or error - may not have second parent)');
  }

  // 5. Recent Commit History
  logSection('Recent Commit History');
  const history = runCommand('git log --oneline --graph -10');
  console.log(history || '(no history)');

  // 6. Recommendations
  logSection('Analysis & Recommendations');
  
  const eventName = process.env.GITHUB_EVENT_NAME;
  const isMainBranch = refName === 'main' || refName === 'master';
  
  console.log(`\nScenario Detection:`);
  console.log(`  Event Type: ${eventName || 'unknown'}`);
  console.log(`  Branch: ${refName}`);
  console.log(`  Is Main Branch: ${isMainBranch ? 'YES' : 'NO'}`);
  console.log(`  Is Merge Commit: ${isMergeCommit ? 'YES' : 'NO'}`);
  
  console.log(`\nRecommended Strategy:`);
  if (eventName === 'pull_request') {
    console.log(`  ✅ PR Context: Use GITHUB_BASE_REF vs GITHUB_HEAD_REF`);
  } else if (isMainBranch && isMergeCommit) {
    console.log(`  ✅ Merge to Main: Use origin/main~1 vs origin/main`);
    console.log(`     This shows what the merge added (all changes from merged branch)`);
  } else if (!isMainBranch) {
    console.log(`  ✅ Feature Branch Push: Use origin/main vs origin/${refName}`);
  } else {
    console.log(`  ⚠️  Direct Push to Main (not merge): Use HEAD~1 vs HEAD`);
    console.log(`     This shows only the last commit, not full branch diff`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Test complete! Copy the output above and share for analysis.');
  console.log('='.repeat(60) + '\n');
}

main().catch((error) => {
  console.error('Error running test script:', error);
  process.exit(1);
});

