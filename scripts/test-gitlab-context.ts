#!/usr/bin/env node

/**
 * GitLab CI Context Test Script
 * 
 * This script collects and displays GitLab CI environment variables and git state
 * to help understand what's available in different scenarios (branch push, MR, merge).
 * 
 * Run from GitLab CI or locally:
 *   npx tsx scripts/test-gitlab-context.ts
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
  console.log('\n🔍 GitLab CI Context Test Script\n');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Working Directory: ${process.cwd()}`);

  // 1. GitLab CI Environment Variables
  logSection('GitLab CI Environment Variables');
  
  console.log('\n--- Pipeline & Job ---');
  logEnvVar('CI');
  logEnvVar('GITLAB_CI');
  logEnvVar('CI_PIPELINE_SOURCE');
  logEnvVar('CI_PIPELINE_ID');
  logEnvVar('CI_JOB_ID');
  logEnvVar('CI_JOB_NAME');
  
  console.log('\n--- Project & Repository ---');
  logEnvVar('CI_PROJECT_ID');
  logEnvVar('CI_PROJECT_NAME');
  logEnvVar('CI_PROJECT_PATH');
  logEnvVar('CI_PROJECT_URL');
  logEnvVar('CI_PROJECT_NAMESPACE');
  logEnvVar('CI_SERVER_URL');
  logEnvVar('CI_DEFAULT_BRANCH');
  
  console.log('\n--- Commit & Branch ---');
  logEnvVar('CI_COMMIT_SHA');
  logEnvVar('CI_COMMIT_SHORT_SHA');
  logEnvVar('CI_COMMIT_REF_NAME');
  logEnvVar('CI_COMMIT_REF_SLUG');
  logEnvVar('CI_COMMIT_BRANCH');
  logEnvVar('CI_COMMIT_TAG');
  logEnvVar('CI_COMMIT_MESSAGE');
  logEnvVar('CI_COMMIT_TITLE');
  logEnvVar('CI_COMMIT_AUTHOR');
  logEnvVar('CI_COMMIT_BEFORE_SHA');
  
  console.log('\n--- Merge Request (if applicable) ---');
  logEnvVar('CI_MERGE_REQUEST_ID');
  logEnvVar('CI_MERGE_REQUEST_IID');
  logEnvVar('CI_MERGE_REQUEST_SOURCE_BRANCH_NAME');
  logEnvVar('CI_MERGE_REQUEST_TARGET_BRANCH_NAME');
  logEnvVar('CI_MERGE_REQUEST_TITLE');
  logEnvVar('CI_MERGE_REQUEST_EVENT_TYPE');
  logEnvVar('CI_MERGE_REQUEST_DIFF_BASE_SHA');

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
  const defaultBranch = process.env.CI_DEFAULT_BRANCH;
  console.log(`CI_DEFAULT_BRANCH: ${defaultBranch || '(not set)'}`);
  
  const mainExists = runCommand('git rev-parse --verify origin/main 2>/dev/null && echo "YES" || echo "NO"');
  console.log(`origin/main exists: ${mainExists}`);

  // 4. Repository Name Detection
  logSection('Repository Name Detection');
  
  console.log('\n--- Method 1: CI_PROJECT_URL Environment Variable ---');
  const projectUrl = process.env.CI_PROJECT_URL;
  if (projectUrl) {
    console.log(`  Result: ${projectUrl}`);
    console.log(`  Status: ✅ AVAILABLE`);
  } else {
    console.log(`  Result: NOT SET`);
    console.log(`  Status: ❌ NOT AVAILABLE`);
  }
  
  console.log('\n--- Method 2: CI_PROJECT_PATH Environment Variable ---');
  const projectPath = process.env.CI_PROJECT_PATH;
  if (projectPath) {
    const serverUrl = process.env.CI_SERVER_URL || 'https://gitlab.com';
    console.log(`  Result: ${serverUrl}/${projectPath}.git`);
    console.log(`  Status: ✅ AVAILABLE`);
  } else {
    console.log(`  Result: NOT SET`);
    console.log(`  Status: ❌ NOT AVAILABLE`);
  }
  
  console.log('\n--- Method 3: Git Remote Origin URL ---');
  const gitRemoteUrl = runCommand('git remote get-url origin 2>&1');
  if (gitRemoteUrl.includes('ERROR') || gitRemoteUrl.includes('fatal:')) {
    console.log(`  Result: ERROR - ${gitRemoteUrl}`);
    console.log(`  Status: ❌ NOT AVAILABLE`);
  } else {
    console.log(`  Result: ${gitRemoteUrl}`);
    console.log(`  Status: ✅ AVAILABLE`);
  }

  // 5. Branch Name Detection
  logSection('Branch Name Detection');
  
  console.log('\n--- Method 1: CI_COMMIT_REF_NAME Environment Variable ---');
  const refName = process.env.CI_COMMIT_REF_NAME;
  if (refName) {
    console.log(`  Result: ${refName}`);
    console.log(`  Status: ✅ AVAILABLE`);
  } else {
    console.log(`  Result: NOT SET`);
    console.log(`  Status: ❌ NOT AVAILABLE`);
  }
  
  console.log('\n--- Method 2: CI_COMMIT_BRANCH Environment Variable ---');
  const commitBranch = process.env.CI_COMMIT_BRANCH;
  if (commitBranch) {
    console.log(`  Result: ${commitBranch}`);
    console.log(`  Status: ✅ AVAILABLE`);
  } else {
    console.log(`  Result: NOT SET`);
    console.log(`  Status: ❌ NOT AVAILABLE (may be unset for MR pipelines)`);
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

  // 6. Diff Tests
  logSection('Diff Tests');
  
  const currentRefName = process.env.CI_COMMIT_REF_NAME || runCommand('git rev-parse --abbrev-ref HEAD');
  const targetBranch = process.env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME;
  const sourceBranch = process.env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME;
  const ciDefaultBranch = process.env.CI_DEFAULT_BRANCH || 'main';
  const beforeSha = process.env.CI_COMMIT_BEFORE_SHA;
  const currentSha = process.env.CI_COMMIT_SHA || runCommand('git rev-parse HEAD');
  
  console.log(`\nUsing refName: ${currentRefName}`);
  console.log(`Using default branch: ${ciDefaultBranch}`);
  console.log(`Using current SHA: ${currentSha}`);
  console.log(`Before SHA: ${beforeSha || '(not set)'}`);
  
  if (targetBranch && sourceBranch) {
    console.log('\n--- MR Context Detected ---');
    console.log(`Target: ${targetBranch}, Source: ${sourceBranch}`);
    
    console.log('\n--- Test 1: MR Diff (target vs source) ---');
    const diff1 = runCommand(`git diff origin/${targetBranch}...origin/${sourceBranch} --stat 2>&1 | head -20`);
    console.log(diff1 || '(no diff or error)');
  } else {
    console.log('\n--- Branch Push Context ---');
    
    console.log(`\n--- Test 1: Feature Branch vs Default (origin/${ciDefaultBranch} vs origin/${currentRefName}) ---`);
    const diff1 = runCommand(`git diff origin/${ciDefaultBranch}...origin/${currentRefName} --stat 2>&1 | head -20`);
    console.log(diff1 || '(no diff or error)');
  }
  
  console.log(`\n--- Test 2: Default Branch Before/After (origin/${ciDefaultBranch}~1 vs origin/${ciDefaultBranch}) ---`);
  const diff2 = runCommand(`git diff origin/${ciDefaultBranch}~1...origin/${ciDefaultBranch} --stat 2>&1 | head -20`);
  console.log(diff2 || '(no diff or error)');
  
  console.log('\n--- Test 3: Previous Commit vs Current (HEAD~1 vs HEAD) ---');
  const diff3 = runCommand('git diff HEAD~1...HEAD --stat 2>&1 | head -20');
  console.log(diff3 || '(no diff or error)');
  
  if (beforeSha && beforeSha !== '0000000000000000000000000000000000000000') {
    console.log(`\n--- Test 4: Before SHA vs Current (${beforeSha.substring(0, 7)} vs ${currentSha.substring(0, 7)}) ---`);
    const diff4 = runCommand(`git diff ${beforeSha}...${currentSha} --stat 2>&1 | head -20`);
    console.log(diff4 || '(no diff or error)');
  }

  // 7. Fetch-then-Diff Test (Option 2 validation)
  logSection('Fetch-then-Diff Test (Option 2)');
  
  console.log('\nThis test validates whether fetching the default branch at runtime');
  console.log('enables proper branch-based diffs without requiring yaml configuration.\n');
  
  const fetchTarget = ciDefaultBranch;
  console.log(`Target to fetch: origin/${fetchTarget}`);
  
  // Check before fetch
  console.log('\n--- Before Fetch ---');
  const beforeFetchCheck = runCommand(`git rev-parse --verify origin/${fetchTarget} 2>&1`);
  const existsBeforeFetch = !beforeFetchCheck.includes('fatal:') && !beforeFetchCheck.includes('ERROR');
  console.log(`origin/${fetchTarget} exists: ${existsBeforeFetch ? 'YES ✅' : 'NO ❌'}`);
  
  if (!existsBeforeFetch) {
    console.log('\n--- Fetching Default Branch ---');
    
    // Time the fetch operation
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
      
      // Now try the diff again
      console.log(`\n--- Diff Test After Fetch (origin/${fetchTarget} vs origin/${currentRefName}) ---`);
      
      const diffStartTime = Date.now();
      const diffResult = runCommand(`git diff origin/${fetchTarget}...origin/${currentRefName} --stat 2>&1 | head -20`);
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
      
      // Total time summary
      console.log(`\n--- Timing Summary ---`);
      console.log(`Fetch time: ${fetchDuration}ms`);
      console.log(`Diff time: ${diffDuration}ms`);
      console.log(`Total overhead: ${fetchDuration + diffDuration}ms (${((fetchDuration + diffDuration) / 1000).toFixed(2)}s)`);
    } else {
      console.log(`❌ Fetch did not make origin/${fetchTarget} available`);
      console.log(`   This approach may not work for GitLab CI`);
    }
  } else {
    console.log(`\norigin/${fetchTarget} already exists - no fetch needed.`);
    console.log(`This test is designed for environments where the default branch is NOT fetched by default.`);
  }

  // 8. Recent Commit History (moved from 7)
  logSection('Recent Commit History');
  const history = runCommand('git log --oneline --graph -10');
  console.log(history || '(no history)');

  // 9. Analysis
  logSection('Analysis & Recommendations');
  
  const pipelineSource = process.env.CI_PIPELINE_SOURCE;
  const isMR = pipelineSource === 'merge_request_event';
  const isDefaultBranch = currentRefName === ciDefaultBranch;
  
  console.log(`\nScenario Detection:`);
  console.log(`  Pipeline Source: ${pipelineSource || 'unknown'}`);
  console.log(`  Is MR: ${isMR ? 'YES' : 'NO'}`);
  console.log(`  Current Branch: ${currentRefName}`);
  console.log(`  Default Branch: ${ciDefaultBranch}`);
  console.log(`  Is Default Branch: ${isDefaultBranch ? 'YES' : 'NO'}`);
  console.log(`  Is Merge Commit: ${isMergeCommit ? 'YES' : 'NO'}`);
  
  console.log(`\nRecommended Strategy:`);
  if (isMR) {
    console.log(`  ✅ MR Context: Use CI_MERGE_REQUEST_TARGET_BRANCH_NAME vs CI_MERGE_REQUEST_SOURCE_BRANCH_NAME`);
  } else if (isDefaultBranch && isMergeCommit) {
    console.log(`  ✅ Merge to Default: Use origin/${ciDefaultBranch}~1 vs origin/${ciDefaultBranch}`);
  } else if (!isDefaultBranch) {
    console.log(`  ✅ Feature Branch Push: Use origin/${ciDefaultBranch} vs origin/${currentRefName}`);
  } else {
    console.log(`  ⚠️  Direct Push to Default (not merge): Use HEAD~1 vs HEAD`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Test complete! Copy the output above and share for analysis.');
  console.log('='.repeat(60) + '\n');
}

main().catch((error) => {
  console.error('Error running test script:', error);
  process.exit(1);
});

