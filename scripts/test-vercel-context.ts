#!/usr/bin/env node

/**
 * Vercel CI Context Test Script
 * 
 * This script collects and displays Vercel environment variables and git state
 * to help understand what's available for commit author detection.
 * 
 * Run from Vercel build or locally:
 *   npx tsx scripts/test-vercel-context.ts
 */

import { execSync } from 'child_process';
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
  console.log(`${name.padEnd(45)} = ${value || '(not set)'}`);
}

async function main() {
  console.log('\n🔍 Vercel CI Context Test Script\n');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Working Directory: ${process.cwd()}`);

  // 1. Vercel Environment Variables
  logSection('Vercel Environment Variables');
  
  console.log('\n--- Build & Deployment ---');
  logEnvVar('VERCEL');
  logEnvVar('VERCEL_ENV');
  logEnvVar('VERCEL_URL');
  logEnvVar('VERCEL_REGION');
  
  console.log('\n--- Git Repository ---');
  logEnvVar('VERCEL_GIT_REPO_OWNER');
  logEnvVar('VERCEL_GIT_REPO_SLUG');
  logEnvVar('VERCEL_GIT_REPO_ID');
  
  console.log('\n--- Git Commit ---');
  logEnvVar('VERCEL_GIT_COMMIT_REF');
  logEnvVar('VERCEL_GIT_COMMIT_SHA');
  logEnvVar('VERCEL_GIT_COMMIT_MESSAGE');
  
  console.log('\n--- Git Commit Author (PROPOSED) ---');
  logEnvVar('VERCEL_GIT_COMMIT_AUTHOR_NAME');
  logEnvVar('VERCEL_GIT_COMMIT_AUTHOR_LOGIN');
  logEnvVar('VERCEL_GIT_COMMIT_AUTHOR_EMAIL');
  
  // 2. Git State
  logSection('Git State');
  
  console.log('\n--- Current Branch & Commit ---');
  const currentBranch = runCommand('git rev-parse --abbrev-ref HEAD');
  const currentCommit = runCommand('git rev-parse HEAD');
  const currentCommitShort = runCommand('git rev-parse --short HEAD');
  console.log(`Current branch: ${currentBranch || '(detached HEAD)'}`);
  console.log(`Current commit: ${currentCommit || 'N/A'}`);
  console.log(`Current commit (short): ${currentCommitShort || 'N/A'}`);
  
  // 3. Commit Information from Git
  if (currentCommit && !currentCommit.includes('ERROR')) {
    console.log('\n--- Commit Information (from git log) ---');
    const commitMessage = runCommand(`git log ${currentCommit} -1 --format=%s`);
    const commitAuthorName = runCommand(`git log ${currentCommit} -1 --format=%an`);
    const commitAuthorEmail = runCommand(`git log ${currentCommit} -1 --format=%ae`);
    console.log(`Commit message (first line): ${commitMessage || 'N/A'}`);
    console.log(`Commit author (from git): ${commitAuthorName || 'N/A'} <${commitAuthorEmail || 'N/A'}>`);
    console.log(`Commit date: ${runCommand(`git log ${currentCommit} -1 --format=%ai`)}`);
  }
  
  // 4. Analysis
  logSection('Analysis & Recommendations');
  
  const vercelAuthorName = process.env.VERCEL_GIT_COMMIT_AUTHOR_NAME;
  const vercelAuthorLogin = process.env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN;
  const vercelAuthorEmail = process.env.VERCEL_GIT_COMMIT_AUTHOR_EMAIL;
  
  console.log('\n--- Proposed Approach Evaluation ---');
  console.log(`VERCEL_GIT_COMMIT_AUTHOR_NAME: ${vercelAuthorName ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`);
  console.log(`VERCEL_GIT_COMMIT_AUTHOR_LOGIN: ${vercelAuthorLogin ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`);
  console.log(`VERCEL_GIT_COMMIT_AUTHOR_EMAIL: ${vercelAuthorEmail ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`);
  
  if (currentCommit && !currentCommit.includes('ERROR')) {
    const gitAuthorName = runCommand(`git log ${currentCommit} -1 --format=%an`);
    const gitAuthorEmail = runCommand(`git log ${currentCommit} -1 --format=%ae`);
    
    console.log('\n--- Comparison ---');
    if (vercelAuthorName && gitAuthorName && !gitAuthorName.includes('ERROR')) {
      const nameMatches = vercelAuthorName === gitAuthorName;
      console.log(`Name match (Vercel vs git): ${nameMatches ? '✅ YES' : '⚠️  NO'}`);
      console.log(`  Vercel: ${vercelAuthorName}`);
      console.log(`  Git:    ${gitAuthorName}`);
    }
    
    if (vercelAuthorEmail && gitAuthorEmail && !gitAuthorEmail.includes('ERROR')) {
      const emailMatches = vercelAuthorEmail === gitAuthorEmail;
      console.log(`Email match (Vercel vs git): ${emailMatches ? '✅ YES' : '⚠️  NO'}`);
      console.log(`  Vercel: ${vercelAuthorEmail}`);
      console.log(`  Git:    ${gitAuthorEmail}`);
    } else if (gitAuthorEmail && !gitAuthorEmail.includes('ERROR')) {
      console.log(`Email from git: ${gitAuthorEmail}`);
      console.log(`  Status: ⚠️  Vercel env var not available, would need git log fallback`);
    }
  }
  
  console.log('\n--- Recommended Approach ---');
  if (vercelAuthorName) {
    console.log(`✅ Use VERCEL_GIT_COMMIT_AUTHOR_NAME: ${vercelAuthorName}`);
    if (vercelAuthorEmail) {
      console.log(`✅ Use VERCEL_GIT_COMMIT_AUTHOR_EMAIL: ${vercelAuthorEmail}`);
      console.log(`   Result: ${vercelAuthorName} <${vercelAuthorEmail}>`);
    } else {
      console.log(`⚠️  Email not available in env vars`);
      if (currentCommit && !currentCommit.includes('ERROR')) {
        const gitEmail = runCommand(`git log ${currentCommit} -1 --format=%ae`);
        if (gitEmail && !gitEmail.includes('ERROR')) {
          console.log(`   Fallback: Use git log for email: ${gitEmail}`);
          console.log(`   Result: ${vercelAuthorName} <${gitEmail}>`);
        } else {
          console.log(`   ⚠️  Git log also unavailable (shallow clone?)`);
          console.log(`   Result: ${vercelAuthorName} <null>`);
        }
      }
    }
  } else {
    console.log(`❌ VERCEL_GIT_COMMIT_AUTHOR_NAME not available`);
    console.log(`   Would need to use git log for both name and email`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test complete! Review the output above to validate the approach.');
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);

