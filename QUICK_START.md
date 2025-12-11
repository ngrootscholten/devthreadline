# Threadline Quick Start

## What's Been Built

✅ **Monorepo structure** with CLI and Server packages
✅ **Expert file format** with YAML frontmatter (id, version, patterns, context_files)
✅ **CLI package** with `check` command
✅ **Server package** with `/api/threadline-check` endpoint
✅ **Parallel expert processing** with 40s timeout
✅ **OpenAI integration** (GPT-4o-mini default)
✅ **Result display** with statistics

## Next Steps to Test

### 1. Build the packages

```bash
# Build CLI
cd packages/cli
npm run build

# Build Server
cd ../server
npm run build
```

### 2. Start the server

```bash
cd packages/server
npm run dev
# Server runs on http://localhost:3000
```

### 3. Create a test repository

In a separate directory:

```bash
mkdir test-repo
cd test-repo
git init
```

Create `experts/feature-flags.md`:
```markdown
---
id: feature-flags
version: 1.0.0
patterns:
  - "**/api/**"
  - "**/components/**"
context_files:
  - "lib/FeatureFlagService.ts"
---

# Feature Flag Standards

All feature flags must use our FeatureFlagService wrapper.
```

Create some test code and make changes.

### 4. Run the CLI

```bash
# From test-repo directory
export OPENAI_API_KEY=your_key_here
export THREADLINE_API_URL=http://localhost:3000

# Link the CLI locally for testing
cd ../devthreadline/packages/cli
npm link

# Or use the built version directly
node dist/index.js check
```

## File Structure Created

```
packages/
├── cli/
│   ├── src/
│   │   ├── commands/check.ts
│   │   ├── validators/experts.ts
│   │   ├── git/diff.ts
│   │   ├── api/client.ts
│   │   ├── types/expert.ts
│   │   └── index.ts
│   ├── bin/threadline
│   └── package.json
└── server/
    ├── src/
    │   ├── server.ts
    │   ├── api/routes/threadline-check.ts
    │   ├── processors/expert.ts
    │   ├── processors/single-expert.ts
    │   ├── llm/prompt-builder.ts
    │   └── types/result.ts
    └── package.json
```

## Key Features Implemented

1. **Expert Format**: YAML frontmatter with id, version, patterns, context_files
2. **Pattern Matching**: Glob patterns to determine which files each expert reviews
3. **Context Files**: Reads and includes context files in LLM prompt
4. **40s Timeout**: Each expert has 40s timeout, shows partial results
5. **No Retries**: Simple timeout handling, no exponential backoff
6. **Parallel Processing**: All experts processed simultaneously
7. **Result Filtering**: Only shows "attention" and "compliant", filters "not_relevant"

## Notes

- Server uses environment variables (PORT)
- CLI uses environment variables (THREADLINE_API_URL, OPENAI_API_KEY)
- Expert files must have YAML frontmatter
- Pattern matching uses glob syntax
- Timeout is 40s per expert (as requested)

## Testing Checklist

- [ ] Build both packages
- [ ] Start server
- [ ] Create test repo with experts
- [ ] Run CLI check command
- [ ] Verify results display correctly
- [ ] Test with multiple experts
- [ ] Test timeout behavior
- [ ] Test pattern matching

