# CI Environment Detection

## Overview

Threadlines CLI detects the CI environment and uses environment-specific variables to determine repository name, branch name, and review context.

## Environments Detected

- **Vercel**: `VERCEL=1`
- **GitHub Actions**: `GITHUB_ACTIONS=1`
- **GitLab CI**: `GITLAB_CI=1` or `CI=1` + `CI_COMMIT_SHA`
- **Bitbucket Pipelines**: `BITBUCKET_BUILD_NUMBER` exists
- **Local**: None of the above

## Environment Variables by Platform

### Vercel
- `VERCEL=1` - Always set in Vercel builds
- `VERCEL_GIT_REPO_OWNER` - Repository owner (e.g., "ngrootscholten")
- `VERCEL_GIT_REPO_SLUG` - Repository name (e.g., "threadline")
- `VERCEL_GIT_REPO_ID` - Repository ID
- `VERCEL_GIT_COMMIT_REF` - Branch name (e.g., "main")
- `VERCEL_GIT_COMMIT_SHA` - Commit SHA

### GitHub Actions
- `GITHUB_ACTIONS=1` - Always set
- `GITHUB_REF_NAME` - Branch name
- `GITHUB_SHA` - Commit SHA (⚠️ **Warning**: On PR events, this is a merge commit, not the actual code SHA)
- `GITHUB_EVENT_NAME` - Event type (e.g., "pull_request", "push")
- `GITHUB_BASE_REF` - Target branch (PRs only)
- `GITHUB_HEAD_REF` - Source branch (PRs only)
- `GITHUB_HEAD_SHA` - Actual commit SHA for PRs (use this instead of `GITHUB_SHA` for PR events)
- `GITHUB_EVENT_PULL_REQUEST_NUMBER` - PR number (if available as env var)

**Note**: PR title (`github.event.pull_request.title`) is available in GitHub Actions YAML context but **NOT** as an environment variable. To get PR title in the CLI, we would need to:
1. Pass it as an env var from the workflow YAML: `PR_TITLE: ${{ github.event.pull_request.title }}`
2. Or fetch it via GitHub API using the PR number

**Commit Message**: Available via `github.event.head_commit.message` in YAML context for push events, but not as env var. For PRs, would need to fetch via git command or API.

### GitLab CI
- `GITLAB_CI=1` - Always set
- `CI_COMMIT_REF_NAME` - Branch name
- `CI_COMMIT_SHA` - Commit SHA
- `CI_MERGE_REQUEST_IID` - MR number
- `CI_MERGE_REQUEST_TARGET_BRANCH_NAME` - Target branch
- `CI_MERGE_REQUEST_SOURCE_BRANCH_NAME` - Source branch
- `CI_MERGE_REQUEST_TITLE` - MR title

### Bitbucket Pipelines (tested 2026-01-18)
- `BITBUCKET_BUILD_NUMBER` - Build number (used for detection)
- `BITBUCKET_WORKSPACE` - Workspace name (e.g., "ngrootscholten")
- `BITBUCKET_REPO_SLUG` - Repository slug (e.g., "threadline")
- `BITBUCKET_REPO_FULL_NAME` - Full repo name (e.g., "ngrootscholten/threadline")
- `BITBUCKET_BRANCH` - Branch name (e.g., "main")
- `BITBUCKET_COMMIT` - Commit SHA
- `BITBUCKET_GIT_HTTP_ORIGIN` - HTTP repo URL
- `BITBUCKET_GIT_SSH_ORIGIN` - SSH repo URL
- `BITBUCKET_PR_ID` - PR number (not tested)
- `BITBUCKET_PR_DESTINATION_BRANCH` - PR target branch (not tested)

**Note**: Bitbucket does not provide commit author as an environment variable. Use `git log` to get author info.

**Note**: Bitbucket does not provide a default branch environment variable (unlike GitLab's `CI_DEFAULT_BRANCH`).

## Real-World Examples

### GitHub Actions (Working Correctly ✅)

From actual GitHub Actions build log:

```
[DEBUG] getAutoReviewTarget: GITHUB_EVENT_NAME = "push"
[DEBUG] getAutoReviewTarget: GITHUB_REF_NAME = "main"
[DEBUG] getAutoReviewTarget: Detected branch "main"

[DEBUG] getRepoName: Found origin remote: fetch="https://github.com/ngrootscholten/threadline"
[DEBUG] getRepoName: Success - returning "https://github.com/ngrootscholten/threadline"

[DEBUG] getBranchName: git revparse --abbrev-ref HEAD returned: "main"
[DEBUG] getBranchName: Success - returning "main"

[DEBUG] detectEnvironment: GITHUB_ACTIONS = "true"
[DEBUG] detectEnvironment: Detected GITHUB_ACTIONS

Final values:
- repoName: "https://github.com/ngrootscholten/threadline" ✅
- branchName: "main" ✅
- environment: "github" ✅
- reviewContext: {"type":"branch","value":"main"} ✅
```

**Status**: ✅ Working correctly
- Git remotes are available and working
- Git branch detection works correctly
- Environment detection works correctly
- All values are correct

### Vercel (Needs Fix ❌)

From actual Vercel build log:

```
[DEBUG] Vercel environment variables:
[DEBUG]   VERCEL_GIT_REPO_OWNER = "ngrootscholten"
[DEBUG]   VERCEL_GIT_REPO_SLUG = "threadline"
[DEBUG]   VERCEL_GIT_COMMIT_REF = "main"
[DEBUG]   VERCEL_GIT_COMMIT_SHA = "6ba9b1f79cc50f162fe0cf7eb0254fc1c6c02df3"

[DEBUG] getRepoName: Found 0 remote(s)
[DEBUG] getRepoName: No "origin" remote found

[DEBUG] getBranchName: git revparse --abbrev-ref HEAD returned: "master"
[DEBUG] getBranchName: Success - returning "master"

[DEBUG] detectEnvironment: VERCEL = "1"
[DEBUG] detectEnvironment: Detected VERCEL

Final values:
- repoName: null/undefined ❌ (should be constructed from env vars)
- branchName: "master" ❌ (should be "main" from VERCEL_GIT_COMMIT_REF)
- environment: "vercel" ✅
- reviewContext: {"type":"local"} ❌ (should be "branch" because branchName is null)
```

**Status**: ✅ Fixes implemented (pending verification)
- ✅ **Fixed**: Repo name now uses Vercel env vars (`VERCEL_GIT_REPO_OWNER` + `VERCEL_GIT_REPO_SLUG`)
- ✅ **Fixed**: Branch name now uses Vercel env var (`VERCEL_GIT_COMMIT_REF`)
- ✅ Environment detection works correctly
- ✅ Vercel env vars are available and correct
- ⏳ **Pending**: Verify fixes work in next Vercel build

### Strategy

**For Vercel:**
- **Repository name**: Construct from `VERCEL_GIT_REPO_OWNER` + `VERCEL_GIT_REPO_SLUG` → `https://github.com/${OWNER}/${SLUG}.git`
- **Branch name**: Use `VERCEL_GIT_COMMIT_REF` directly (don't rely on git command)
- **Fallback**: Use git commands only for local development

**For GitHub Actions:**
- ✅ Current implementation works correctly
- Git remotes are available
- Git branch detection works
- No changes needed

### Bitbucket Pipelines (Direct Commit to Main ✅)

From actual Bitbucket Pipelines build log (2026-01-18):

```
--- Repository ---
BITBUCKET_WORKSPACE                           = ngrootscholten
BITBUCKET_REPO_SLUG                           = threadline
BITBUCKET_REPO_FULL_NAME                      = ngrootscholten/threadline
BITBUCKET_GIT_HTTP_ORIGIN                     = http://bitbucket.org/ngrootscholten/threadline
BITBUCKET_GIT_SSH_ORIGIN                      = git@bitbucket.org:ngrootscholten/threadline.git

--- Branch & Commit ---
BITBUCKET_BRANCH                              = main
BITBUCKET_COMMIT                              = f0f0c737c9367c9f58e2cea075d4175320a6d397

--- Pull Request (not applicable for direct push) ---
BITBUCKET_PR_ID                               = (not set)
BITBUCKET_PR_DESTINATION_BRANCH               = (not set)

--- Git State ---
Current branch: main
Commit author: ngrootscholten <niels.grootscholten@gmail.com>
Is merge commit: NO

--- Diff Test (HEAD~1...HEAD) ---
bitbucket-pipelines.yml           |  62 +++++++
scripts/test-bitbucket-context.ts | 343 ++++++++++++++++++++++++++++++++++++++
2 files changed, 405 insertions(+)
```

**Status**: ✅ Working correctly

### Bitbucket Pipelines (Feature Branch Push ✅)

From actual Bitbucket Pipelines build log (2026-01-18):

```
--- Branch & Commit ---
BITBUCKET_BRANCH                              = bitbucket-test
BITBUCKET_COMMIT                              = 51e2498123bbc0f89f7bba14a575c65a22bbef1e

--- Pull Request (not a PR) ---
BITBUCKET_PR_ID                               = (not set)
BITBUCKET_PR_DESTINATION_BRANCH               = (not set)

--- Available Branches ---
Local branches:
bitbucket-test
Remote branches:
origin/HEAD
origin/bitbucket-test
origin/main

--- Key Finding ---
origin/main exists: YES ✅ (no fetch needed, unlike GitLab)

--- Diff Tests ---
origin/main...origin/bitbucket-test: 1 file changed ✅
origin/main...HEAD: 1 file changed ✅ (use this - simpler)
HEAD~1...HEAD: 1 file changed (only last commit, not full branch diff)
```

**Status**: ✅ Working correctly
- `origin/main` is already available with `depth: full` (unlike GitLab which needs a fetch)
- Use `origin/main...HEAD` for feature branch diffs

**Not Yet Tested:**
- PR context (`BITBUCKET_PR_ID` etc.)

**For Bitbucket Pipelines:**
- **Repository name**: Construct from `BITBUCKET_REPO_FULL_NAME` → `https://bitbucket.org/${REPO_FULL_NAME}.git`
- **Branch name**: Use `BITBUCKET_BRANCH` directly
- **Commit author**: Use `git log` (not available as env var)
- **Diff strategy (main)**: `HEAD~1...HEAD` for direct commits to main
- **Diff strategy (feature branch)**: `origin/main...HEAD` (no fetch needed)

