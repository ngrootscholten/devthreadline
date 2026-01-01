#!/usr/bin/env node

/**
 * Local Environment Context Test Script
 * 
 * This script tests and validates commit author detection for local development.
 * It checks git config, git log, and staged/unstaged changes to ensure our
 * approach works correctly.
 * 
 * Run locally:
 *   npx tsx scripts/test-local-context.ts
 * 
 * This helps validate that commit author detection works for:
 * - Staged changes (git diff --cached)
 * - Unstaged changes (git diff)
 * - Specific commits (git log)
 * - Git config (who will commit)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import simpleGit from 'simple-git';

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

async function main() {
  console.log('\n🔍 Local Environment Context Test Script\n');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Working Directory: ${process.cwd()}`);

  // 1. Git Repository Check
  logSection('Git Repository Status');
  
  const isRepo = runCommand('git rev-parse --git-dir');
  if (isRepo.includes('ERROR')) {
    console.log('❌ Not a git repository. Please run this script from a git repository.');
    process.exit(1);
  }
  console.log('✅ Git repository detected');

  // 2. Git Config (who will commit changes)
  logSection('Git Config (Who Will Commit)');
  
  console.log('\n--- User Configuration (Test Script Method) ---');
  const gitUserNameShell = runCommand('git config user.name');
  const gitUserEmailShell = runCommand('git config user.email');
  console.log(`user.name (shell):  ${gitUserNameShell || '(not set)'}`);
  console.log(`user.email (shell): ${gitUserEmailShell || '(not set)'}`);
  
  console.log('\n--- User Configuration (CLI Method - simple-git) ---');
  const git = simpleGit(process.cwd());
  let gitUserName: string | null = null;
  let gitUserEmail: string | null = null;
  try {
    const nameResult = await git.getConfig('user.name');
    const emailResult = await git.getConfig('user.email');
    gitUserName = nameResult.value;
    gitUserEmail = emailResult.value;
    console.log(`user.name (simple-git):  ${gitUserName || '(not set)'}`);
    console.log(`user.email (simple-git): ${gitUserEmail || '(not set)'}`);
    console.log(`\n   nameResult structure: ${JSON.stringify(nameResult)}`);
    console.log(`   emailResult structure: ${JSON.stringify(emailResult)}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`❌ Error getting git config: ${errorMessage}`);
  }
  
  if (gitUserName && gitUserEmail) {
    console.log(`\n✅ Git config available (simple-git): ${gitUserName} <${gitUserEmail}>`);
    console.log('   This represents who will commit staged/unstaged changes.');
  } else {
    console.log('\n⚠️  Git config not fully set (simple-git). Run:');
    console.log('   git config user.name "Your Name"');
    console.log('   git config user.email "your.email@example.com"');
  }
  
  // Compare methods
  if (gitUserNameShell && gitUserEmailShell && gitUserName && gitUserEmail) {
    const matches = gitUserNameShell === gitUserName && gitUserEmailShell === gitUserEmail;
    console.log(`\n📊 Comparison: Shell vs simple-git match: ${matches ? '✅ YES' : '⚠️  NO'}`);
  }

  // 3. Current Git State
  logSection('Current Git State');
  
  console.log('\n--- Branch & Commit ---');
  console.log(`Current branch: ${runCommand('git rev-parse --abbrev-ref HEAD')}`);
  console.log(`Current commit: ${runCommand('git rev-parse HEAD')}`);
  console.log(`Current commit (short): ${runCommand('git rev-parse --short HEAD')}`);
  
  console.log('\n--- HEAD Commit Information ---');
  console.log(`Commit message (first line): ${runCommand('git log -1 --format=%s')}`);
  const headAuthorName = runCommand('git log -1 --format=%an');
  const headAuthorEmail = runCommand('git log -1 --format=%ae');
  console.log(`Commit author: ${headAuthorName} <${headAuthorEmail}>`);
  const headCommitterName = runCommand('git log -1 --format=%cn');
  const headCommitterEmail = runCommand('git log -1 --format=%ce');
  console.log(`Commit committer: ${headCommitterName} <${headCommitterEmail}>`);
  console.log(`Commit date: ${runCommand('git log -1 --format=%ai')}`);

  // 4. Working Directory Changes
  logSection('Working Directory Changes');
  
  const status = runCommand('git status --porcelain');
  const stagedFiles = runCommand('git diff --cached --name-only');
  const unstagedFiles = runCommand('git diff --name-only');
  
  console.log('\n--- Git Status ---');
  if (status) {
    console.log('Working directory has changes:');
    console.log(status.split('\n').map(line => `  ${line}`).join('\n'));
  } else {
    console.log('No changes detected (working directory clean)');
  }
  
  console.log('\n--- Staged Changes ---');
  if (stagedFiles && !stagedFiles.includes('ERROR')) {
    const stagedCount = stagedFiles.split('\n').filter(f => f.trim()).length;
    console.log(`Files staged: ${stagedCount}`);
    stagedFiles.split('\n').filter(f => f.trim()).forEach(file => {
      console.log(`  - ${file}`);
    });
    console.log('\n✅ Staged changes detected - git config user should be used for author');
  } else {
    console.log('No staged changes');
  }
  
  console.log('\n--- Unstaged Changes ---');
  if (unstagedFiles && !unstagedFiles.includes('ERROR')) {
    const unstagedCount = unstagedFiles.split('\n').filter(f => f.trim()).length;
    console.log(`Files with unstaged changes: ${unstagedCount}`);
    unstagedFiles.split('\n').filter(f => f.trim()).forEach(file => {
      console.log(`  - ${file}`);
    });
    console.log('\n✅ Unstaged changes detected - git config user should be used for author');
  } else {
    console.log('No unstaged changes');
  }

  // 5. Commit Author Detection Tests
  logSection('Commit Author Detection Tests');
  
  console.log('\n--- Test 1: Git Config (for uncommitted changes) ---');
  console.log(`   Method: simple-git getConfig() (same as CLI)`);
  if (gitUserName && gitUserEmail) {
    console.log(`   Result: ${gitUserName} <${gitUserEmail}>`);
    console.log(`   Status: ✅ AVAILABLE`);
    console.log(`   Use case: Staged/unstaged changes (who will commit)`);
  } else {
    console.log(`   Result: NOT AVAILABLE`);
    console.log(`   Status: ❌ Git config not set`);
    console.log(`   This would cause CLI to FAIL LOUDLY with error message`);
  }
  
  console.log('\n--- Test 2: HEAD Commit Author (for committed changes) ---');
  if (headAuthorName && headAuthorEmail && !headAuthorName.includes('ERROR') && !headAuthorEmail.includes('ERROR')) {
    console.log(`✅ Method: git log -1 --format=%an/%ae`);
    console.log(`   Result: ${headAuthorName} <${headAuthorEmail}>`);
    console.log(`   Use case: Specific commit or fallback if git config unavailable`);
  } else {
    console.log(`❌ HEAD commit author not available`);
  }
  
  console.log('\n--- Test 3: Specific Commit Author ---');
  const currentSha = runCommand('git rev-parse HEAD');
  if (currentSha && !currentSha.includes('ERROR')) {
    const commitAuthor = runCommand(`git log ${currentSha} -1 --format=%an`);
    const commitAuthorEmail = runCommand(`git log ${currentSha} -1 --format=%ae`);
    if (commitAuthor && commitAuthorEmail && !commitAuthor.includes('ERROR')) {
      console.log(`✅ Method: git log <sha> -1 --format=%an/%ae`);
      console.log(`   Commit: ${currentSha.substring(0, 7)}`);
      console.log(`   Result: ${commitAuthor} <${commitAuthorEmail}>`);
      console.log(`   Use case: When checking specific commit`);
    } else {
      console.log(`❌ Could not get commit author for ${currentSha.substring(0, 7)}`);
    }
  }

  // 6. Validation Summary
  logSection('Validation Summary');
  
  console.log('\n--- Recommended Approach for Local Environment ---');
  console.log('\n1. For staged/unstaged changes (uncommitted):');
  if (gitUserName && gitUserEmail && !gitUserName.includes('ERROR') && !gitUserEmail.includes('ERROR')) {
    console.log(`   ✅ Use git config: ${gitUserName} <${gitUserEmail}>`);
  } else {
    console.log(`   ❌ Git config not set - cannot determine who will commit`);
  }
  
  console.log('\n2. For specific commits (--commit flag):');
  if (currentSha && !currentSha.includes('ERROR')) {
    console.log(`   ✅ Use git log <sha>: ${currentSha.substring(0, 7)}`);
  } else {
    console.log(`   ❌ Cannot test - no commits available`);
  }

  // 7. Test Our Implementation
  logSection('Testing Our Implementation');
  
  console.log('\n--- Simulating collectMetadata() for Local ---');
  console.log('Context: { type: "local" }');
  console.log('Environment: local');
  console.log('Commit SHA: undefined (no explicit commit)');
  console.log('\nExpected behavior (matches CLI exactly):');
  console.log('  1. Use simple-git.getConfig("user.name") and getConfig("user.email")');
  console.log('  2. If git config not set → FAIL LOUDLY with error (NO FALLBACK)');
  
  const hasStagedOrUnstaged = (stagedFiles && !stagedFiles.includes('ERROR') && stagedFiles.trim()) ||
                               (unstagedFiles && !unstagedFiles.includes('ERROR') && unstagedFiles.trim());
  
  if (hasStagedOrUnstaged) {
    console.log('\n✅ Uncommitted changes detected - CLI will use git config');
    if (gitUserName && gitUserEmail) {
      console.log(`   Author would be: ${gitUserName} <${gitUserEmail}>`);
      console.log(`   ✅ This matches what CLI will collect`);
    } else {
      console.log(`   ❌ Git config not set - CLI will FAIL LOUDLY`);
      console.log(`   Error message: "Git config user.name or user.email is not set. Run: git config user.name "Your Name" && git config user.email "your.email@example.com"`);
    }
  } else {
    console.log('\n⚠️  No uncommitted changes detected');
    console.log('   Note: CLI still uses git config (not HEAD commit) for local environment');
    console.log('   This represents who WILL commit the changes, not who committed previous changes');
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test complete! Review the output above to validate the approach.');
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);

