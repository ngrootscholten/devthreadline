#!/usr/bin/env node

/**
 * Bitbucket Pipelines Context Test Script
 * 
 * This script collects and displays Bitbucket Pipelines environment variables and git state
 * to help understand what's available in different scenarios (branch push, PR, merge to main).
 * 
 * Run from Bitbucket Pipelines or locally:
 *   npx tsx scripts/test-bitbucket-context.ts
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
  console.log(`${name.padEnd(45)} = ${value || '(not set)'}`);
}

async function main() {
  console.log('\n🔍 Bitbucket Pipelines Context Test Script\n');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Working Directory: ${process.cwd()}`);

  // 1. Bitbucket Pipelines Environment Variables
  logSection('Bitbucket Pipelines Environment Variables');
  
  console.log('\n--- Pipeline & Build ---');
  logEnvVar('CI');
  logEnvVar('BITBUCKET_BUILD_NUMBER');
  logEnvVar('BITBUCKET_PIPELINE_UUID');
  logEnvVar('BITBUCKET_STEP_UUID');
  logEnvVar('BITBUCKET_CLONE_DIR');
  
  console.log('\n--- Repository ---');
  logEnvVar('BITBUCKET_WORKSPACE');
  logEnvVar('BITBUCKET_REPO_SLUG');
  logEnvVar('BITBUCKET_REPO_FULL_NAME');
  logEnvVar('BITBUCKET_REPO_UUID');
  logEnvVar('BITBUCKET_GIT_HTTP_ORIGIN');
  logEnvVar('BITBUCKET_GIT_SSH_ORIGIN');
  
  console.log('\n--- Branch & Commit ---');
  logEnvVar('BITBUCKET_BRANCH');
  logEnvVar('BITBUCKET_COMMIT');
  logEnvVar('BITBUCKET_TAG');
  
  console.log('\n--- Pull Request (if applicable) ---');
  logEnvVar('BITBUCKET_PR_ID');
  logEnvVar('BITBUCKET_PR_DESTINATION_BRANCH');
  logEnvVar('BITBUCKET_PR_DESTINATION_COMMIT');
  
  console.log('\n--- Deployment (if applicable) ---');
  logEnvVar('BITBUCKET_DEPLOYMENT_ENVIRONMENT');
  logEnvVar('BITBUCKET_DEPLOYMENT_ENVIRONMENT_UUID');

  // 2. Git State
  logSection('Git State');
  
  console.log('\n--- Current Branch & Commit ---');
  console.log(`Current branch: ${runCommand('git rev-parse --abbrev-ref HEAD')}`);
  console.log(`Current commit: ${runCommand('git rev-parse HEAD')}`);
  console.log(`Current commit (short): ${runCommand('git rev-parse --short HEAD')}`);
  
  console.log('\n--- Commit Information ---');
  console.log(`Commit message (first line): ${runCommand('git log -1 --format=%s')}`);
  const commitAuthorName = runCommand('git log -1 --format=%an');
  const commitAuthorEmail = runCommand('git log -1 --format=%ae');
  console.log(`Commit author: ${commitAuthorName} <${commitAuthorEmail}>`);
  console.log(`Commit date: ${runCommand('git log -1 --format=%ai')}`);
  
  console.log('\n--- Commit Parents (for merge detection) ---');
  const parentShas = runCommand('git log -1 --format=%P');
  console.log(`Parent SHAs: ${parentShas || '(none - initial commit)'}`);
  const parentCount = parentShas && !parentShas.includes('ERROR') 
    ? parentShas.split(/\s+/).filter(s => s.length > 0).length 
    : 0;
  console.log(`Parent count: ${parentCount}`);
  const isMergeCommit = parentCount > 1;
  console.log(`Is merge commit: ${isMergeCommit ? 'YES ✅' : 'NO'}`);

  // 3. Branch Information
  logSection('Branch Information');
  
  console.log('\n--- Available Branches ---');
  console.log('Local branches:');
  const localBranches = runCommand('git branch --format="%(refname:short)"');
  console.log(localBranches || '(none)');
  
  console.log('\nRemote branches:');
  const remoteBranches = runCommand('git branch -r --format="%(refname:short)"');
  console.log(remoteBranches || '(none)');
  
  console.log('\n--- Default Branch Detection ---');
  const mainExists = runCommand('git rev-parse --verify origin/main 2>/dev/null && echo "YES" || echo "NO"');
  console.log(`origin/main exists: ${mainExists}`);
  const masterExists = runCommand('git rev-parse --verify origin/master 2>/dev/null && echo "YES" || echo "NO"');
  console.log(`origin/master exists: ${masterExists}`);

  // 4. Remote Information
  logSection('Remote Information');
  
  console.log('\n--- Git Remotes ---');
  const remotes = runCommand('git remote -v');
  console.log(remotes || '(no remotes)');
  
  console.log('\n--- Origin URL ---');
  const originUrl = runCommand('git remote get-url origin 2>&1');
  console.log(`origin URL: ${originUrl}`);

  // 5. Repository Name Detection
  logSection('Repository Name Detection');
  
  console.log('\n--- Method 1: BITBUCKET_REPO_FULL_NAME Environment Variable ---');
  const repoFullName = process.env.BITBUCKET_REPO_FULL_NAME;
  if (repoFullName) {
    const repoUrl = `https://bitbucket.org/${repoFullName}.git`;
    console.log(`  Result: ${repoUrl}`);
    console.log(`  Status: ✅ AVAILABLE`);
  } else {
    console.log(`  Result: NOT SET`);
    console.log(`  Status: ❌ NOT AVAILABLE`);
  }
  
  console.log('\n--- Method 2: BITBUCKET_GIT_HTTP_ORIGIN Environment Variable ---');
  const httpOrigin = process.env.BITBUCKET_GIT_HTTP_ORIGIN;
  if (httpOrigin) {
    console.log(`  Result: ${httpOrigin}`);
    console.log(`  Status: ✅ AVAILABLE`);
  } else {
    console.log(`  Result: NOT SET`);
    console.log(`  Status: ❌ NOT AVAILABLE`);
  }
  
  console.log('\n--- Method 3: Git Remote Origin URL ---');
  if (originUrl.includes('ERROR') || originUrl.includes('fatal:')) {
    console.log(`  Result: ERROR - ${originUrl}`);
    console.log(`  Status: ❌ NOT AVAILABLE`);
  } else {
    console.log(`  Result: ${originUrl}`);
    console.log(`  Status: ✅ AVAILABLE`);
  }

  // 6. Branch Name Detection
  logSection('Branch Name Detection');
  
  console.log('\n--- Method 1: BITBUCKET_BRANCH Environment Variable ---');
  const bitbucketBranch = process.env.BITBUCKET_BRANCH;
  if (bitbucketBranch) {
    console.log(`  Result: ${bitbucketBranch}`);
    console.log(`  Status: ✅ AVAILABLE`);
  } else {
    console.log(`  Result: NOT SET`);
    console.log(`  Status: ❌ NOT AVAILABLE (may be tag or detached HEAD)`);
  }
  
  console.log('\n--- Method 2: BITBUCKET_PR_DESTINATION_BRANCH (PR only) ---');
  const prDestBranch = process.env.BITBUCKET_PR_DESTINATION_BRANCH;
  if (prDestBranch) {
    console.log(`  Result: ${prDestBranch}`);
    console.log(`  Status: ✅ AVAILABLE (PR context detected)`);
  } else {
    console.log(`  Result: NOT SET`);
    console.log(`  Status: ❌ NOT AVAILABLE (not a PR build)`);
  }
  
  console.log('\n--- Method 3: Git Revparse Abbrev-Ref HEAD ---');
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

  // 7. Diff Tests
  logSection('Diff Tests');
  
  const currentBranch = process.env.BITBUCKET_BRANCH || runCommand('git rev-parse --abbrev-ref HEAD');
  const prId = process.env.BITBUCKET_PR_ID;
  const prDestination = process.env.BITBUCKET_PR_DESTINATION_BRANCH;
  const currentSha = process.env.BITBUCKET_COMMIT || runCommand('git rev-parse HEAD');
  
  console.log(`\nUsing branch: ${currentBranch}`);
  console.log(`Using current SHA: ${currentSha}`);
  console.log(`PR ID: ${prId || '(not a PR)'}`);
  console.log(`PR destination: ${prDestination || '(not a PR)'}`);
  
  if (prId && prDestination) {
    console.log('\n--- PR Context Detected ---');
    
    console.log(`\n--- Test 1: PR Diff (origin/${prDestination} vs HEAD) ---`);
    const diff1 = runCommand(`git diff origin/${prDestination}...HEAD --stat 2>&1 | head -20`);
    console.log(diff1 || '(no diff or error)');
  } else {
    console.log('\n--- Branch Push Context ---');
    
    console.log(`\n--- Test 1: Feature Branch vs Main (origin/main vs origin/${currentBranch}) ---`);
    const diff1 = runCommand(`git diff origin/main...origin/${currentBranch} --stat 2>&1 | head -20`);
    console.log(diff1 || '(no diff or error)');
    
    console.log(`\n--- Test 1b: Feature Branch vs Main (origin/main vs HEAD) ---`);
    const diff1b = runCommand(`git diff origin/main...HEAD --stat 2>&1 | head -20`);
    console.log(diff1b || '(no diff or error)');
  }
  
  console.log('\n--- Test 2: Previous Commit vs Current (HEAD~1 vs HEAD) ---');
  const diff2 = runCommand('git diff HEAD~1...HEAD --stat 2>&1 | head -20');
  console.log(diff2 || '(no diff or error)');
  
  console.log('\n--- Test 3: Main Before/After (origin/main~1 vs origin/main) ---');
  const diff3 = runCommand('git diff origin/main~1...origin/main --stat 2>&1 | head -20');
  console.log(diff3 || '(no diff or error)');
  
  if (isMergeCommit) {
    console.log('\n--- Test 4: Merge Commit Show (git show HEAD) ---');
    const diff4 = runCommand('git show --stat HEAD 2>&1 | head -20');
    console.log(diff4 || '(no diff or error)');
    
    console.log('\n--- Test 5: Merge Commit vs First Parent ---');
    const diff5 = runCommand('git diff HEAD^1...HEAD --stat 2>&1 | head -20');
    console.log(diff5 || '(no diff or error)');
  }

  // 8. Fetch-then-Diff Test (for shallow clone scenarios)
  logSection('Fetch-then-Diff Test');
  
  console.log('\nThis test validates whether fetching the main branch at runtime');
  console.log('enables proper branch-based diffs (in case of shallow clones).\n');
  
  const fetchTarget = 'main';
  console.log(`Target to fetch: origin/${fetchTarget}`);
  
  // Check before fetch
  console.log('\n--- Before Fetch ---');
  const beforeFetchCheck = runCommand(`git rev-parse --verify origin/${fetchTarget} 2>&1`);
  const existsBeforeFetch = !beforeFetchCheck.includes('fatal:') && !beforeFetchCheck.includes('ERROR');
  console.log(`origin/${fetchTarget} exists: ${existsBeforeFetch ? 'YES ✅' : 'NO ❌'}`);
  
  if (!existsBeforeFetch) {
    console.log('\n--- Fetching Main Branch ---');
    
    const fetchStartTime = Date.now();
    const fetchResult = runCommand(`git fetch origin ${fetchTarget}:refs/remotes/origin/${fetchTarget} --depth=1 2>&1`);
    const fetchEndTime = Date.now();
    const fetchDuration = fetchEndTime - fetchStartTime;
    
    console.log(`Command: git fetch origin ${fetchTarget}:refs/remotes/origin/${fetchTarget} --depth=1`);
    console.log(`Result: ${fetchResult || '(success - no output)'}`);
    console.log(`⏱️  Duration: ${fetchDuration}ms (${(fetchDuration / 1000).toFixed(2)}s)`);
    
    // Check after fetch
    console.log('\n--- After Fetch ---');
    const afterFetchCheck = runCommand(`git rev-parse --verify origin/${fetchTarget} 2>&1`);
    const existsAfterFetch = !afterFetchCheck.includes('fatal:') && !afterFetchCheck.includes('ERROR');
    console.log(`origin/${fetchTarget} exists: ${existsAfterFetch ? 'YES ✅' : 'NO ❌'}`);
    
    if (existsAfterFetch) {
      console.log(`origin/${fetchTarget} SHA: ${afterFetchCheck.substring(0, 12)}`);
      
      console.log(`\n--- Diff Test After Fetch (origin/${fetchTarget} vs HEAD) ---`);
      const diffStartTime = Date.now();
      const diffResult = runCommand(`git diff origin/${fetchTarget}...HEAD --stat 2>&1 | head -20`);
      const diffEndTime = Date.now();
      const diffDuration = diffEndTime - diffStartTime;
      
      if (diffResult.includes('fatal:') || diffResult.includes('ERROR')) {
        console.log(`❌ Diff FAILED: ${diffResult}`);
      } else {
        console.log(`✅ Diff SUCCESS!`);
        console.log(`⏱️  Diff Duration: ${diffDuration}ms`);
        console.log(`\nDiff output:`);
        console.log(diffResult || '(no changes)');
      }
      
      console.log(`\n--- Timing Summary ---`);
      console.log(`Fetch time: ${fetchDuration}ms`);
      console.log(`Diff time: ${diffDuration}ms`);
      console.log(`Total overhead: ${fetchDuration + diffDuration}ms`);
    } else {
      console.log(`❌ Fetch did not make origin/${fetchTarget} available`);
    }
  } else {
    console.log(`\norigin/${fetchTarget} already exists - no fetch needed.`);
  }

  // 9. Recent Commit History
  logSection('Recent Commit History');
  const history = runCommand('git log --oneline --graph -10');
  console.log(history || '(no history)');

  // 10. Analysis
  logSection('Analysis & Recommendations');
  
  const isPR = !!process.env.BITBUCKET_PR_ID;
  const isMainBranch = currentBranch === 'main' || currentBranch === 'master';
  
  console.log(`\nScenario Detection:`);
  console.log(`  Is PR: ${isPR ? 'YES' : 'NO'}`);
  console.log(`  Current Branch: ${currentBranch}`);
  console.log(`  Is Main Branch: ${isMainBranch ? 'YES' : 'NO'}`);
  console.log(`  Is Merge Commit: ${isMergeCommit ? 'YES' : 'NO'}`);
  
  console.log(`\nRecommended Strategy:`);
  if (isPR) {
    console.log(`  ✅ PR Context: Use BITBUCKET_PR_DESTINATION_BRANCH vs HEAD`);
  } else if (isMainBranch && isMergeCommit) {
    console.log(`  ✅ Merge to Main: Use origin/main~1 vs origin/main`);
    console.log(`     This shows what the merge added`);
  } else if (!isMainBranch) {
    console.log(`  ✅ Feature Branch Push: Use origin/main vs HEAD`);
  } else {
    console.log(`  ⚠️  Direct Push to Main (not merge): Use HEAD~1 vs HEAD`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Test complete! Copy the output above and share for analysis.');
  console.log('='.repeat(60) + '\n');
}

main().catch((error) => {
  console.error('Error running test script:', error);
  process.exit(1);
});
