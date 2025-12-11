# Threadline Detailed Implementation Plan

## Pre-Implementation Questions

Before we start building, we need to decide:

### 1. Repository Structure
**Question**: Monorepo (single repo with packages/) or separate repos?
- **Option A**: Monorepo (easier to develop, single versioning)
- **Option B**: Separate repos (cli + server, independent versioning)

**Recommendation**: Start with monorepo for easier development, can split later if needed.

### 2. Expert Markdown Format
**Question**: What's the minimum required structure for expert files?
- **Option A**: Free-form markdown (just text, AI interprets)
- **Option B**: Structured format (title, description, rules sections)
- **Option C**: YAML frontmatter + markdown body

**Recommendation**: Start with Option A (free-form) for MVP, add structure validation later.

### 3. LLM Provider
**Question**: Which provider to start with?
- **Option A**: OpenAI (most common, well-documented)
- **Option B**: Anthropic (Claude, good for structured output)
- **Option C**: Configurable from start (more complex)

**Recommendation**: Start with OpenAI (GPT-4o-mini) for MVP, make configurable in Phase 2.

### 4. Error Handling Strategy
**Question**: How to handle LLM API failures?
- **Option A**: Fail fast (one failure = entire check fails)
- **Option B**: Partial results (return what succeeded, note failures)
- **Option C**: Retry with exponential backoff

**Recommendation**: Option B (partial results) for MVP, add retries in Phase 2.

### 5. Configuration
**Question**: Where should config live?
- **Option A**: Environment variables only
- **Option B**: `.threadlinerc` JSON file
- **Option C**: `package.json` threadline field

**Recommendation**: Start with env vars + `.threadlinerc` (optional) for flexibility.

---

## Phase 1: MVP Foundation (Week 1-2)

### Goal: Get basic end-to-end flow working

### Task 1.1: Project Setup
**Estimated Time**: 4 hours

- [ ] Create monorepo structure
  ```
  threadline/
  ├── packages/
  │   ├── cli/
  │   └── server/
  ├── package.json (root)
  └── tsconfig.json (root)
  ```
- [ ] Set up TypeScript configs for each package
- [ ] Set up build scripts (tsc or tsup)
- [ ] Set up basic package.json files
- [ ] Add .gitignore
- [ ] Add README files

**Dependencies**: None

**Deliverable**: Working monorepo structure with TypeScript compilation

---

### Task 1.2: CLI Package - Basic Skeleton
**Estimated Time**: 6 hours

- [ ] Initialize CLI package structure
- [ ] Set up Commander.js
- [ ] Create `threadline` command entry point
- [ ] Add `check` command (stub)
- [ ] Add basic CLI output formatting
- [ ] Test: `npx threadline check` runs (does nothing yet)

**Dependencies**: Task 1.1

**Deliverable**: CLI that runs and accepts `check` command

**Files to Create**:
```
packages/cli/
├── src/
│   ├── index.ts (main entry)
│   ├── commands/
│   │   └── check.ts
│   └── utils/
│       └── output.ts
├── bin/
│   └── threadline (executable)
├── package.json
└── tsconfig.json
```

---

### Task 1.3: Expert File Discovery & Validation
**Estimated Time**: 8 hours

- [ ] Find `/experts` folder in current directory
- [ ] Read all `.md` files from `/experts`
- [ ] Basic validation:
  - File exists and is readable
  - Is valid markdown (basic check)
  - Has content (not empty)
- [ ] Parse expert name from filename
- [ ] Return structured expert objects: `{ name: string, content: string }`
- [ ] Handle errors gracefully (no experts folder, empty folder, etc.)

**Dependencies**: Task 1.2

**Deliverable**: CLI can discover and validate expert files

**Files to Create**:
```
packages/cli/src/
├── validators/
│   └── experts.ts
└── utils/
    └── file-system.ts
```

**Test Cases**:
- ✅ Finds experts in `/experts` folder
- ✅ Handles missing `/experts` folder gracefully
- ✅ Handles empty `/experts` folder
- ✅ Validates markdown files
- ✅ Extracts expert names from filenames

---

### Task 1.4: Git Diff Collection
**Estimated Time**: 6 hours

- [ ] Detect if we're in a git repo
- [ ] Get git diff (staged or unstaged changes)
- [ ] Get list of changed files
- [ ] Parse diff into structured format
- [ ] Handle edge cases (no changes, no git repo, etc.)

**Dependencies**: Task 1.2

**Deliverable**: CLI can collect git diffs and changed files

**Files to Create**:
```
packages/cli/src/
└── git/
    └── diff.ts
```

**Test Cases**:
- ✅ Gets diff for staged changes
- ✅ Gets diff for unstaged changes
- ✅ Gets list of changed files
- ✅ Handles no changes gracefully
- ✅ Handles not in git repo gracefully

---

### Task 1.5: Server Package - Basic Skeleton
**Estimated Time**: 6 hours

- [ ] Initialize server package structure
- [ ] Set up Express (or Fastify)
- [ ] Create `/api/threadline-check` POST endpoint
- [ ] Add basic request validation
- [ ] Add CORS middleware
- [ ] Add error handling middleware
- [ ] Test: Server runs and accepts POST requests

**Dependencies**: Task 1.1

**Deliverable**: Server that runs and accepts API requests

**Files to Create**:
```
packages/server/
├── src/
│   ├── server.ts
│   ├── api/
│   │   └── routes/
│   │       └── threadline-check.ts
│   └── middleware/
│       ├── cors.ts
│       └── error-handler.ts
├── package.json
└── tsconfig.json
```

---

### Task 1.6: API Client in CLI
**Estimated Time**: 4 hours

- [ ] Create HTTP client for review API
- [ ] Build request payload:
  ```typescript
  {
    experts: Array<{ name: string, content: string }>,
    diff: string,
    files: string[],
    apiKey: string
  }
  ```
- [ ] Handle API errors gracefully
- [ ] Parse response
- [ ] Connect CLI to server endpoint

**Dependencies**: Task 1.3, Task 1.4, Task 1.5

**Deliverable**: CLI can call server API

**Files to Create**:
```
packages/cli/src/
└── api/
    └── client.ts
```

**Configuration**:
- Server URL: `THREADLINE_API_URL` env var or `.threadlinerc`
- Default: `http://localhost:3000`

---

### Task 1.7: Basic LLM Integration (Single Expert)
**Estimated Time**: 8 hours

- [ ] Set up OpenAI SDK
- [ ] Create prompt builder function
- [ ] Call OpenAI API with single expert
- [ ] Parse JSON response
- [ ] Handle API errors
- [ ] Return structured result

**Dependencies**: Task 1.5

**Deliverable**: Server can call LLM for one expert

**Files to Create**:
```
packages/server/src/
├── llm/
│   ├── client.ts
│   └── prompt-builder.ts
└── processors/
    └── expert.ts
```

**Prompt Template**:
```
You are an expert code reviewer focused on: {expert_name}

Expert Guidelines:
{expert_content}

Code Changes:
{diff}

Changed Files:
{files}

Review the code changes against the expert guidelines above.
Return JSON only:
{
  "status": "compliant" | "attention" | "not_relevant",
  "reasoning": "brief explanation",
  "line_references": [line numbers if attention needed]
}
```

**Test Cases**:
- ✅ Calls OpenAI API successfully
- ✅ Parses JSON response
- ✅ Handles API errors
- ✅ Handles invalid JSON responses
- ✅ Handles rate limits

---

### Task 1.8: Parallel Expert Processing
**Estimated Time**: 6 hours

- [ ] Process multiple experts in parallel (Promise.all)
- [ ] Aggregate results
- [ ] Filter out "not_relevant" status
- [ ] Return structured response

**Dependencies**: Task 1.7

**Deliverable**: Server processes all experts in parallel

**Files to Update**:
```
packages/server/src/
└── processors/
    └── expert.ts (update to handle array)
```

**Test Cases**:
- ✅ Processes 3+ experts in parallel
- ✅ Aggregates results correctly
- ✅ Filters "not_relevant" correctly
- ✅ Handles partial failures (some experts fail)

---

### Task 1.9: Result Display in CLI
**Estimated Time**: 6 hours

- [ ] Format results for display
- [ ] Show statistics (total, compliant, attention, not_relevant)
- [ ] Display attention items with file:line format
- [ ] Color coding (green for compliant, yellow for attention)
- [ ] Exit codes (0 = all compliant, 1 = attention needed)

**Dependencies**: Task 1.6, Task 1.8

**Deliverable**: CLI displays results nicely

**Files to Update**:
```
packages/cli/src/
└── utils/
    └── output.ts (enhance)
```

**Output Format**:
```
25 expert reviews done
8 not relevant
16 compliant
1 attention

⚠️  Feature Flag Expert
   src/api/users.ts:23 - Using direct SDK call instead of FeatureFlagService
   src/components/Header.tsx:67 - Missing fallback behavior when flag is unavailable
```

---

### Task 1.10: End-to-End Testing
**Estimated Time**: 4 hours

- [ ] Create test repository with `/experts` folder
- [ ] Create sample expert files
- [ ] Make code changes
- [ ] Run `npx threadline check`
- [ ] Verify end-to-end flow works
- [ ] Fix any bugs found

**Dependencies**: All previous tasks

**Deliverable**: Working MVP

---

## Phase 2: Polish & Parallel Processing (Week 3)

### Goal: Make it production-ready

### Task 2.1: Enhanced Error Handling
**Estimated Time**: 6 hours

- [ ] Retry logic for LLM API calls (exponential backoff)
- [ ] Better error messages
- [ ] Partial results handling (if some experts fail)
- [ ] Timeout handling
- [ ] Rate limit handling

**Dependencies**: Task 1.7

---

### Task 2.2: Expert Validation Improvements
**Estimated Time**: 4 hours

- [ ] Better markdown validation
- [ ] Check for minimum content length
- [ ] Warn about very long experts (token limits)
- [ ] Validate expert names (no special chars, etc.)

**Dependencies**: Task 1.3

---

### Task 2.3: Configuration File Support
**Estimated Time**: 4 hours

- [ ] Support `.threadlinerc` JSON file
- [ ] Configuration options:
  - `apiUrl`: Server URL
  - `apiKey`: OpenAI API key (optional, can use env var)
  - `model`: LLM model name (default: gpt-4o-mini)
- [ ] Merge with environment variables (env vars override config)

**Dependencies**: Task 1.6

**Files to Create**:
```
packages/cli/src/
└── config/
    └── loader.ts
```

---

### Task 2.4: Docker Setup
**Estimated Time**: 4 hours

- [ ] Create Dockerfile for server
- [ ] Create docker-compose.yml
- [ ] Add health check endpoint
- [ ] Document how to run with Docker
- [ ] Test Docker setup

**Dependencies**: Task 1.5

**Files to Create**:
```
packages/server/
├── Dockerfile
└── docker-compose.yml
```

---

### Task 2.5: Improved Output Formatting
**Estimated Time**: 4 hours

- [ ] Better table formatting for results
- [ ] Progress indicators (when processing)
- [ ] Summary statistics
- [ ] JSON output option (`--json` flag)

**Dependencies**: Task 1.9

---

## Phase 3: Documentation & Testing (Week 4)

### Task 3.1: Unit Tests
**Estimated Time**: 8 hours

- [ ] Expert validation tests
- [ ] Git diff collection tests
- [ ] LLM response parsing tests
- [ ] Result aggregation tests
- [ ] Configuration loading tests

**Dependencies**: All Phase 1 & 2 tasks

---

### Task 3.2: Integration Tests
**Estimated Time**: 6 hours

- [ ] CLI → Server communication tests
- [ ] Server → LLM API tests (mocked)
- [ ] End-to-end tests with test repo

**Dependencies**: All Phase 1 & 2 tasks

---

### Task 3.3: Documentation
**Estimated Time**: 8 hours

- [ ] CLI README (usage, installation)
- [ ] Server README (deployment, configuration)
- [ ] Expert file format guide
- [ ] Troubleshooting guide
- [ ] Examples repository

**Dependencies**: All previous tasks

---

## Implementation Checklist Summary

### Week 1
- [ ] Task 1.1: Project Setup
- [ ] Task 1.2: CLI Skeleton
- [ ] Task 1.3: Expert Discovery
- [ ] Task 1.4: Git Diff Collection
- [ ] Task 1.5: Server Skeleton

### Week 2
- [ ] Task 1.6: API Client
- [ ] Task 1.7: LLM Integration
- [ ] Task 1.8: Parallel Processing
- [ ] Task 1.9: Result Display
- [ ] Task 1.10: End-to-End Testing

### Week 3
- [ ] Task 2.1: Error Handling
- [ ] Task 2.2: Expert Validation
- [ ] Task 2.3: Configuration File
- [ ] Task 2.4: Docker Setup
- [ ] Task 2.5: Output Formatting

### Week 4
- [ ] Task 3.1: Unit Tests
- [ ] Task 3.2: Integration Tests
- [ ] Task 3.3: Documentation

---

## Questions to Answer Before Starting

1. **Monorepo vs Separate Repos?** → Recommendation: Monorepo
2. **Expert Format?** → Recommendation: Free-form markdown for MVP
3. **LLM Provider?** → Recommendation: OpenAI (GPT-4o-mini) for MVP
4. **Error Handling?** → Recommendation: Partial results
5. **Configuration?** → Recommendation: Env vars + `.threadlinerc`

## Next Steps

1. **Answer the questions above** (or approve recommendations)
2. **Set up development environment**
3. **Start with Task 1.1: Project Setup**
4. **Work through tasks sequentially**

---

**Ready to start?** Let's begin with Task 1.1!

