# Bitbucket CI Testing Guide

## Prerequisites
- You have uncommitted changes in `app/layout.tsx` - handle these first
- Ensure Bitbucket repo variables are set: `THREADLINE_API_KEY` and `THREADLINE_ACCOUNT`

## Step 1: Commit to main → Test

```bash
# First, handle your current changes (either commit or stash)
git stash  # or commit them if you want to keep them

# Switch to main and ensure it's up to date
git checkout main
git pull origin main  # Get latest from GitHub

# Make a test commit (or use existing changes)
echo "# Bitbucket CI Test - Main Branch" >> TEST.md
git add TEST.md
git commit -m "test: bitbucket CI - direct push to main"

# Push to Bitbucket (this will trigger the pipeline)
git push bitbucket main

# Watch the pipeline in Bitbucket UI:
# https://bitbucket.org/ngrootscholten/threadline/addon/pipelines/home
```

## Step 2: Check out a branch, commit → Test

```bash
# Create and checkout a new feature branch
git checkout -b test/bitbucket-feature-branch

# Make a test commit
echo "# Feature Branch Test" >> TEST.md
git add TEST.md
git commit -m "test: bitbucket CI - feature branch push"

# Push to Bitbucket (this will trigger the pipeline)
git push bitbucket test/bitbucket-feature-branch

# Watch the pipeline in Bitbucket UI
```

## Step 3: Set up a PR in Bitbucket → Test

```bash
# You should already have the branch from Step 2
# If not, create it:
# git checkout -b test/bitbucket-feature-branch

# Make sure it's pushed to Bitbucket
git push bitbucket test/bitbucket-feature-branch

# Now create the PR in Bitbucket UI:
# 1. Go to: https://bitbucket.org/ngrootscholten/threadline/pull-requests/
# 2. Click "Create pull request"
# 3. Source: test/bitbucket-feature-branch
# 4. Destination: main
# 5. Create the PR
# 
# This will trigger the pull-requests pipeline automatically
```

## Step 4: Another commit in that PR → Test

```bash
# Make sure you're on the PR branch
git checkout test/bitbucket-feature-branch

# Make another commit
echo "# Additional PR commit" >> TEST.md
git add TEST.md
git commit -m "test: bitbucket CI - additional commit in PR"

# Push to Bitbucket (this will trigger the PR pipeline again)
git push bitbucket test/bitbucket-feature-branch

# Watch the pipeline in Bitbucket UI
```

## Cleanup (after testing)

```bash
# Delete local branch
git checkout main
git branch -D test/bitbucket-feature-branch

# Delete remote branch (optional - or close PR in UI)
git push bitbucket --delete test/bitbucket-feature-branch

# Restore your stashed changes if you stashed earlier
git stash pop
```

## Notes

- **Pipeline URL**: https://bitbucket.org/ngrootscholten/threadline/addon/pipelines/home
- **PR URL**: https://bitbucket.org/ngrootscholten/threadline/pull-requests/
- The test script (`scripts/test-bitbucket-context.ts`) will run automatically and show detailed context
- Check pipeline logs to see what environment variables are available in each scenario
