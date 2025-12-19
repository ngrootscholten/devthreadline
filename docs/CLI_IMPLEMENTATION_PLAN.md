# Self-Hosted Threadline Implementation Plan

## Overview

Enhance the CLI with additional review options while maintaining the same simple architecture. Add support for reviewing commits, branches, files, and folders. Auto-detect CI environment for seamless integration. Keep complexity in the CLI, use the same API structure.

## Goals

- **CLI Enhancements**: More flexible review options
- **CI Auto-Detection**: Automatically detect CI environment and use appropriate review target
- **Same Architecture**: Use existing API structure
- **Account Identification**: Add account key for self-hosted instances
- **Flexible Filtering**: Show attention items by default, full report with flag
- **Simple UX**: Easy-to-use commands, works out of the box in CI

---

## Architecture

### Self-Hosted Configuration

**Environment Variables:**
```bash
# Server URL (where Threadline is hosted)
THREADLINE_URL=http://localhost:3000  # or https://your-domain.com

# Account identifier (REQUIRED - not secret - email, company name, etc.)
THREADLINE_ACCOUNT=your-email@example.com

# API Key (REQUIRED - secret - for authentication)
THREADLINE_API_KEY=your-api-key-here

# OpenAI API Key (for LLM calls)
OPENAI_API_KEY=sk-...

# OpenAI Model (optional, defaults to gpt-4o-mini)
OPENAI_MODEL=gpt-4o-mini
```

**Key Points:**
- **Account key is REQUIRED**: Clear error if missing
- **Single-tenant**: One account per instance
- **Simple setup**: Just environment variables
- **Works locally**: `localhost:3000` or deployed

---

## CLI Commands

### Default Behavior (Auto-Detection)

```bash
threadlines check
```

**Auto-detection logic (fallback chain):**
1. **Branch detected** → Use `--branch` (test all commits in branch vs base)
2. **Else: Commit SHA detected** → Use `--commit` (test single commit)
3. **Else: Local development** → Use staged/unstaged changes (current behavior)

**CI Environment Variables:**
- **Branch**: `GITHUB_REF_NAME` (GitHub) | `CI_COMMIT_REF_NAME` (GitLab) | `VERCEL_GIT_COMMIT_REF` (Vercel)
- **Commit**: `GITHUB_SHA` (GitHub) | `CI_COMMIT_SHA` (GitLab) | `VERCEL_GIT_COMMIT_SHA` (Vercel)

**Behavior Summary:**
- **CI with branch**: Tests all commits in branch together (later commits can fix earlier violations)
- **CI without branch**: Tests single commit (fallback for tag builds, detached HEAD, etc.)
- **Local dev**: Tests staged/unstaged changes (incremental feedback as you work)
- **Explicit flags**: Always override auto-detection

### Explicit Commands

#### Review Branch

```bash
threadlines check --branch <branch-name>
threadlines check -b <branch-name>
```

**Behavior:**
- Get diff between branch and its base (typically `main` or `master`)
- Use `git diff main...<branch>` (git handles base automatically)
- Get list of changed files
- Test all commits in branch together (cumulative diff)
- Works for PRs/MRs too (they're just branches)

**Example:**
```bash
threadlines check --branch feature/new-feature
```

**Use cases:**
- Local testing before pushing branch
- Explicit branch review
- PR/MR testing (just use branch name)

#### Review Commit

```bash
threadlines check --commit <sha>
threadlines check -c <sha>
```

**Behavior:**
- Get diff for specific commit using `git show <sha>` or `git diff <sha>^..<sha>`
- Get list of changed files from commit
- Test single commit in isolation
- Useful for debugging specific commits

**Example:**
```bash
threadlines check --commit abc123def
```

**Use cases:**
- Debugging specific commits
- Testing single commit (not recommended for CI)

#### Review File

```bash
threadlines check --file <path>
threadlines check -f <path>
```

**Behavior:**
- Read entire file content (treat as new)
- No diff (or empty diff)
- Apply threadlines to full file content
- Show results

**Example:**
```bash
threadlines check --file src/api/users.ts
```

#### Review Folder

```bash
threadlines check --folder <path>
```

**Behavior:**
- Find all files in folder (recursive)
- Read each file content
- Apply threadlines to all files
- Show aggregated results

**Example:**
```bash
threadlines check --folder src/api
```

#### Review Multiple Files

```bash
threadlines check --files <path1> <path2> ...
```

**Behavior:**
- Read each file content
- Apply threadlines to all files
- Show aggregated results

**Example:**
```bash
threadlines check --files src/file1.ts src/file2.ts src/file3.ts
```

#### Full Report Flag

```bash
threadlines check --full
threadlines check --all
```

**Behavior:**
- Show all results: compliant, attention, not_relevant
- Default (without flag): Show only "attention" items
- Can combine with any other flag

**Examples:**
```bash
threadlines check --full
threadlines check --commit abc123 --full
threadlines check --file src/api/users.ts --full
threadlines check --branch feature/x --full
```

---

## Implementation Details

### Account Key Handling

**CLI Changes:**
- Read `THREADLINE_ACCOUNT` from `.env.local` or environment variables
- Validate that it exists before making API call
- Get repository name from git remote (via `simple-git`)
- Get branch name from git (via `simple-git`)
- Send all three fields in API request
- Clear error message if account missing:
  ```
  ❌ Error: THREADLINE_ACCOUNT is required
  
  To fix this:
    1. Create a .env.local file in your project root
    2. Add: THREADLINE_ACCOUNT=your-email@example.com
    3. Or set it as an environment variable
  
  For CI/CD: Set THREADLINE_ACCOUNT as an environment variable in your platform settings.
  ```

**API Changes:**
- Add `account` field to request body (REQUIRED)
- Add `repoName` field to request body (optional, from git remote)
- Add `branchName` field to request body (optional, from git branch)
- Log all fields for self-hosted instances (useful for audit/debugging)

### CI Auto-Detection

**Function:**
```typescript
function getAutoReviewTarget(): { type: 'branch' | 'commit' | 'local', value?: string } {
  // Check for branch name (all CI platforms)
  const branch = process.env.GITHUB_REF_NAME ||           // GitHub Actions
                 process.env.CI_COMMIT_REF_NAME ||          // GitLab CI
                 process.env.VERCEL_GIT_COMMIT_REF;        // Vercel
  
  if (branch) {
    return { type: 'branch', value: branch };
  }
  
  // Check for commit SHA (all CI platforms)
  const commit = process.env.GITHUB_SHA ||                // GitHub Actions
                 process.env.CI_COMMIT_SHA ||              // GitLab CI
                 process.env.VERCEL_GIT_COMMIT_SHA;       // Vercel
  
  if (commit) {
    return { type: 'commit', value: commit };
  }
  
  // Local development
  return { type: 'local' };
}
```

**Integration:**
- Call `getAutoReviewTarget()` in `check` command
- If no explicit flags provided, use auto-detection
- Explicit flags override auto-detection

### Git Diff Functions

**New Functions Needed:**

```typescript
// Get diff for specific commit
async function getCommitDiff(repoRoot: string, sha: string): Promise<GitDiffResult>

// Get diff for branch (all commits vs base)
async function getBranchDiff(repoRoot: string, branchName: string): Promise<GitDiffResult>
```

**Implementation:**
- Use `simple-git` for commit/branch diffs
- For branch: `git diff main...<branch>` (cumulative diff of all commits)
- For commit: `git show <sha>` or `git diff <sha>^..<sha>`
- Parse responses into same `GitDiffResult` format

### File Reading Functions

**New Functions Needed:**

```typescript
// Read file content
async function readFileContent(repoRoot: string, filePath: string): Promise<string>

// Read folder files
async function readFolderFiles(repoRoot: string, folderPath: string): Promise<string[]>

// Convert file content to diff format (for API compatibility)
function fileContentToDiff(filePath: string, content: string): string
```

**Implementation:**
- Use Node.js `fs` module
- For file review: create artificial diff (all lines as additions)
- Or send empty diff + full file content separately

### Result Filtering

**CLI Changes:**
- Default: Filter to only `status === 'attention'`
- With `--full` flag: Show all results
- Apply filtering after API response

```typescript
function filterResults(results: ExpertResult[], showFull: boolean): ExpertResult[] {
  if (showFull) {
    return results;
  }
  return results.filter(r => r.status === 'attention');
}
```

### Repository & Branch Detection

**CLI Changes:**
- Get repository name from git remote URL
- Get current branch name from git
- Use `simple-git` (already in dependencies) for git operations

**Implementation:**
```typescript
// Get repository name from git remote
async function getRepoName(repoRoot: string): Promise<string | null> {
  const git = simpleGit(repoRoot);
  try {
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(r => r.name === 'origin');
    if (origin?.refs?.fetch) {
      // Parse repo name from URL (e.g., "github.com/user/repo.git" -> "user/repo")
      const url = origin.refs.fetch;
      const match = url.match(/(?:github\.com|gitlab\.com)[\/:]([^\/]+\/[^\/]+?)(?:\.git)?$/);
      return match ? match[1] : null;
    }
  } catch (error) {
    // If no remote or error, return null
  }
  return null;
}

// Get current branch name
async function getBranchName(repoRoot: string): Promise<string | null> {
  const git = simpleGit(repoRoot);
  try {
    const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
    return branch || null;
  } catch (error) {
    return null;
  }
}
```

**Why this is simple:**
- Uses standard git commands (no env variables needed)
- `simple-git` already in dependencies
- Works in all environments (local, CI, etc.)
- Gracefully handles missing remotes/branches (returns null)

### API Request Updates

**Request Body:**
```typescript
interface ReviewRequest {
  threadlines: Array<{...}>;
  diff: string;
  files: string[];
  apiKey: string;
  account: string;        // REQUIRED: Account identifier
  repoName?: string;     // NEW: Repository name (e.g., "user/repo")
  branchName?: string;   // NEW: Branch name (e.g., "feature/x")
}
```

**Server:**
- Accept `account`, `repoName`, and `branchName` fields
- Log all fields for self-hosted instances (useful for audit/debugging)
- All fields optional for backward compatibility (except `account` which is required)

---

## Implementation Phases

### Phase 1: Account Key & Full Report Flag

**Goal**: Add account key requirement and filtering option

**Tasks:**
- [ ] Add `THREADLINE_ACCOUNT` to CLI config utility
- [ ] Validate account key exists before API call
- [ ] Add clear error message if missing
- [ ] Implement `getRepoName()` function (parse from git remote)
- [ ] Implement `getBranchName()` function (get from git)
- [ ] Add `account`, `repoName`, and `branchName` fields to API request
- [ ] Add `--full` flag to CLI command
- [ ] Implement result filtering logic
- [ ] Update display logic to show filtered/unfiltered results
- [ ] Update API route to accept `account`, `repoName`, `branchName` fields
- [ ] Verify account key validation works
- [ ] Verify repo/branch detection works (with and without git remote)
- [ ] Verify filtering behavior works

**Deliverables:**
- Account key is required with clear error
- `--full` flag shows all results
- Default shows only attention items

### Phase 2: CI Auto-Detection & Branch Review

**Goal**: Auto-detect CI environment and support branch reviews

**Tasks:**
- [ ] Implement `getAutoReviewTarget()` function
- [ ] Implement `getBranchDiff()` function
- [ ] Add CI environment detection (GitHub, GitLab, Vercel)
- [ ] Integrate auto-detection into `check` command
- [ ] Add `--branch` flag to CLI
- [ ] Update `check` command to handle branch flag
- [ ] Handle git errors gracefully
- [ ] Verify in GitHub Actions
- [ ] Verify in GitLab CI
- [ ] Verify in Vercel
- [ ] Verify locally (should use staged/unstaged)
- [ ] Verify flag combinations (`--branch feature/x --full`)

**Deliverables:**
- Auto-detection works in CI (GitHub, GitLab, Vercel)
- `--branch` flag works
- Local dev still uses staged/unstaged
- Flags can combine with `--full`
- Clear error messages for invalid branches

### Phase 3: Review Commit & File/Folder

**Goal**: Review specific commits and files/folders

**Tasks:**
- [ ] Implement `getCommitDiff()` function
- [ ] Implement `readFileContent()` function
- [ ] Implement `readFolderFiles()` function
- [ ] Implement `fileContentToDiff()` helper
- [ ] Add `--commit` flag to CLI
- [ ] Add `--file` flag to CLI
- [ ] Add `--folder` flag to CLI
- [ ] Add `--files` flag (multiple files) to CLI
- [ ] Update `check` command to handle commit/file/folder flags
- [ ] Handle file not found errors
- [ ] Verify with single files
- [ ] Verify with folders
- [ ] Verify with multiple files
- [ ] Verify with commits
- [ ] Verify flag combinations

**Deliverables:**
- `--commit` flag works
- `--file` flag works
- `--folder` flag works
- `--files` flag works
- Files are reviewed as if new (full content)
- Commits can be reviewed individually

---

## File Structure

```
packages/cli/
  src/
    commands/
      check.ts              # Updated: Handle all flags + auto-detection
    git/
      diff.ts               # Updated: Add commit/branch functions
      file.ts               # New: File reading functions
      repo.ts               # New: Repo name and branch name detection
    utils/
      config.ts             # Updated: Add account key handling
      filter.ts             # New: Result filtering logic
      ci-detection.ts       # New: CI environment detection
    api/
      client.ts             # Updated: Add account, repoName, branchName fields
```

---

## Error Handling

### Account Key Missing

```
❌ Error: THREADLINE_ACCOUNT is required

To fix this:
  1. Create a .env.local file in your project root
  2. Add: THREADLINE_ACCOUNT=your-email@example.com
  3. Or set it as an environment variable: export THREADLINE_ACCOUNT=your-email@example.com

For CI/CD: Set THREADLINE_ACCOUNT as an environment variable in your platform settings.
```

### Invalid Branch

```
❌ Error: Branch 'feature/x' not found

Make sure:
  - The branch name is correct
  - The branch exists locally or remotely
  - You've fetched the latest changes: git fetch
```

### Invalid Commit

```
❌ Error: Commit 'abc123' not found

Make sure:
  - The commit SHA is correct
  - You're in a git repository
  - The commit exists in your repository
```

### File Not Found

```
❌ Error: File 'src/api/users.ts' not found

Make sure:
  - The file path is correct
  - The file exists in your repository
  - You're running the command from the repository root
```

---

## CI/CD Integration Examples

### GitHub Actions

```yaml
- name: Run Threadline checks
  run: npx threadlines check
  env:
    THREADLINE_ACCOUNT: ${{ secrets.THREADLINE_ACCOUNT }}
    THREADLINE_API_KEY: ${{ secrets.THREADLINE_API_KEY }}
    THREADLINE_API_URL: ${{ secrets.THREADLINE_API_URL }}
```

**Behavior:**
- Auto-detects `GITHUB_REF_NAME` → uses `--branch` (tests all commits in branch/PR)
- Fallback: If no branch, uses `GITHUB_SHA` → uses `--commit` (tests single commit)
- Works for PR, push, and tag events

### GitLab CI

```yaml
threadline_check:
  script:
    - npx threadlines check
  variables:
    THREADLINE_ACCOUNT: $THREADLINE_ACCOUNT
    THREADLINE_API_KEY: $THREADLINE_API_KEY
    THREADLINE_API_URL: $THREADLINE_API_URL
```

**Behavior:**
- Auto-detects `CI_COMMIT_REF_NAME` → uses `--branch` (tests all commits in branch/MR)
- Fallback: If no branch, uses `CI_COMMIT_SHA` → uses `--commit` (tests single commit)
- Works for MR, push, and tag events

### Vercel

**In `vercel.json` or build command:**
```json
{
  "buildCommand": "npx threadlines check && npm run build"
}
```

**Behavior:**
- Auto-detects `VERCEL_GIT_COMMIT_REF` → uses `--branch` (tests all commits in branch)
- Fallback: If no branch, uses `VERCEL_GIT_COMMIT_SHA` → uses `--commit` (tests single commit)
- Works for preview and production deployments

---

## Open Questions

1. **Branch Base Detection**: How to detect base branch?
   - **Recommendation**: Try `main`, then `master`, then `develop`
   - Or use `git merge-base` to find common ancestor

2. **File Review Diff Format**: How to format file content as diff?
   - **Recommendation**: Create artificial diff with all lines as additions
   - Or send empty diff + full content in separate field

3. **Multiple Flags**: Can flags combine? (e.g., `--commit abc123 --file path.ts`)
   - **Recommendation**: No, mutually exclusive (except `--full`)

4. **CI Detection Override**: Should explicit flags override auto-detection?
   - **Recommendation**: Yes, explicit flags always win

---

## Success Metrics

- **Account Key Adoption**: % of users who set account key
- **CI Usage**: % of checks run in CI vs local
- **Flag Usage**: Which flags are used most?
- **Full Report Usage**: How often is `--full` used?
- **Branch Review Usage**: How often is branch review used?
- **File Review Usage**: How often is file review used?

---

---

## Next Steps

1. **Review this plan** and confirm approach
2. **Start Phase 1** implementation (Account key + Full report)
3. **Add Phase 2** (CI auto-detection + Branch review)
4. **Add Phase 3** (Commit + File/Folder review)
5. **Iterate based on usage** and feedback
