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
  logEnvVar('GITHUB_SERVER_URL');
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
  
  console.log('\n--- Default Branch Detection ---');
  
  // Method 1: git symbolic-ref (local reference, may not be set)
  console.log('\nMethod 1: git symbolic-ref refs/remotes/origin/HEAD');
  const defaultBranchRef = runCommand('git symbolic-ref refs/remotes/origin/HEAD 2>&1');
  if (defaultBranchRef.includes('fatal:') || defaultBranchRef.includes('not a symbolic ref') || defaultBranchRef.includes('ERROR')) {
    console.log(`  Result: NOT SET`);
    console.log(`  This means the default branch reference is not configured locally.`);
  } else {
    console.log(`  Result: ${defaultBranchRef}`);
    // Extract branch name from refs/remotes/origin/main -> main
    const branchMatch = defaultBranchRef.match(/refs\/remotes\/origin\/(.+)/);
    if (branchMatch) {
      console.log(`  Extracted default branch name: ${branchMatch[1]}`);
    }
  }
  
  // Method 2: git ls-remote --symref (queries remote directly, most reliable)
  console.log('\nMethod 2: git ls-remote --symref origin HEAD');
  const lsRemoteSymref = runCommand('git ls-remote --symref origin HEAD 2>&1');
  if (lsRemoteSymref.includes('ERROR') || lsRemoteSymref.includes('fatal:')) {
    console.log(`  Result: ERROR - ${lsRemoteSymref}`);
  } else {
    console.log(`  Result: ${lsRemoteSymref}`);
    // Parse: ref: refs/heads/main	HEAD
    const symrefMatch = lsRemoteSymref.match(/ref:\s+refs\/heads\/(\S+)/);
    if (symrefMatch) {
      console.log(`  Extracted default branch name: ${symrefMatch[1]}`);
    }
  }
  
  // Method 3: git remote show origin (may show HEAD branch)
  console.log('\nMethod 3: git remote show origin');
  const remoteShow = runCommand('git remote show origin 2>&1 | grep "HEAD branch"');
  if (remoteShow.includes('ERROR') || remoteShow.includes('fatal:')) {
    console.log(`  Result: ERROR - ${remoteShow}`);
  } else if (remoteShow.trim()) {
    console.log(`  Result: ${remoteShow.trim()}`);
    // Parse: HEAD branch: main
    const headMatch = remoteShow.match(/HEAD branch:\s+(\S+)/);
    if (headMatch) {
      console.log(`  Extracted default branch name: ${headMatch[1]}`);
    }
  } else {
    console.log(`  Result: No HEAD branch information found`);
  }
  
  // Method 4: Read GITHUB_EVENT_PATH JSON (GitHub Actions event data)
  console.log('\nMethod 4: Read GITHUB_EVENT_PATH JSON');
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath) {
    try {
      const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf-8'));
      console.log(`  GITHUB_EVENT_PATH: ${eventPath}`);
      
      // Dump entire JSON for analysis (formatted for readability)
      console.log('\n  --- Full Event JSON (for analysis) ---');
      console.log(JSON.stringify(eventData, null, 2));
      console.log('  --- End Event JSON ---\n');
      
      // Try to find default_branch in the event data
      // It might be at: repository.default_branch, or pull_request.base.repo.default_branch, etc.
      const defaultBranch = eventData.repository?.default_branch || 
                           eventData.pull_request?.base?.repo?.default_branch ||
                           eventData.pull_request?.base?.ref; // fallback to base ref
      
      if (defaultBranch) {
        console.log(`  Found default_branch: ${defaultBranch}`);
      } else {
        console.log(`  default_branch not found in event JSON`);
        console.log(`  Available keys in repository: ${eventData.repository ? Object.keys(eventData.repository).join(', ') : 'N/A'}`);
        if (eventData.pull_request) {
          console.log(`  Available keys in pull_request.base.repo: ${eventData.pull_request.base?.repo ? Object.keys(eventData.pull_request.base.repo).join(', ') : 'N/A'}`);
        }
      }
    } catch (error: any) {
      console.log(`  Result: ERROR reading event file - ${error.message}`);
    }
  } else {
    console.log(`  GITHUB_EVENT_PATH: NOT SET`);
    console.log(`  This environment variable is only available in GitHub Actions.`);
  }

  // 4. Diff Tests
  // 4. Repository Name Detection
  logSection('Repository Name Detection');
  
  console.log('\n--- Method 1: GITHUB_REPOSITORY Environment Variable ---');
  const githubRepo = process.env.GITHUB_REPOSITORY;
  const githubServerUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
  if (githubRepo) {
    const repoUrl = `${githubServerUrl}/${githubRepo}.git`;
    console.log(`  Result: ${repoUrl}`);
    console.log(`  Status: ✅ AVAILABLE`);
  } else {
    console.log(`  Result: NOT SET`);
    console.log(`  Status: ❌ NOT AVAILABLE`);
  }
  
  console.log('\n--- Method 2: Git Remote Origin URL ---');
  const gitRemoteUrl = runCommand('git remote get-url origin 2>&1');
  if (gitRemoteUrl.includes('ERROR') || gitRemoteUrl.includes('fatal:')) {
    console.log(`  Result: ERROR - ${gitRemoteUrl}`);
    console.log(`  Status: ❌ NOT AVAILABLE`);
  } else {
    console.log(`  Result: ${gitRemoteUrl}`);
    console.log(`  Status: ✅ AVAILABLE`);
  }
  
  console.log('\n--- Method 3: Git Remote Show Origin ---');
  const remoteShowOrigin = runCommand('git remote show origin 2>&1 | head -5');
  if (remoteShowOrigin.includes('ERROR') || remoteShowOrigin.includes('fatal:')) {
    console.log(`  Result: ERROR - ${remoteShowOrigin.split('\n')[0]}`);
    console.log(`  Status: ❌ NOT AVAILABLE`);
  } else {
    console.log(`  Result: ${remoteShowOrigin}`);
    console.log(`  Status: ✅ AVAILABLE`);
  }
  
  // 5. Branch Name Detection
  logSection('Branch Name Detection');
  
  console.log('\n--- Method 1: GITHUB_REF_NAME Environment Variable ---');
  const githubRefName = process.env.GITHUB_REF_NAME;
  if (githubRefName) {
    console.log(`  Result: ${githubRefName}`);
    console.log(`  Status: ✅ AVAILABLE`);
  } else {
    console.log(`  Result: NOT SET`);
    console.log(`  Status: ❌ NOT AVAILABLE`);
  }
  
  console.log('\n--- Method 2: Git Revparse Abbrev-Ref HEAD ---');
  const gitBranchName = runCommand('git rev-parse --abbrev-ref HEAD 2>&1');
  if (gitBranchName.includes('ERROR') || gitBranchName.includes('fatal:')) {
    console.log(`  Result: ERROR - ${gitBranchName}`);
    console.log(`  Status: ❌ NOT AVAILABLE`);
  } else if (gitBranchName === 'HEAD') {
    console.log(`  Result: ${gitBranchName}`);
    console.log(`  Status: ⚠️  DETACHED HEAD (not a branch)`);
  } else {
    console.log(`  Result: ${gitBranchName}`);
    console.log(`  Status: ✅ AVAILABLE`);
  }
  
  console.log('\n--- Method 3: Git Symbolic-Ref HEAD ---');
  const gitSymbolicRef = runCommand('git symbolic-ref --short HEAD 2>&1');
  if (gitSymbolicRef.includes('ERROR') || gitSymbolicRef.includes('fatal:')) {
    console.log(`  Result: ERROR - ${gitSymbolicRef}`);
    console.log(`  Status: ❌ NOT AVAILABLE (likely detached HEAD)`);
  } else {
    console.log(`  Result: ${gitSymbolicRef}`);
    console.log(`  Status: ✅ AVAILABLE`);
  }

  // 6. Diff Tests
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

