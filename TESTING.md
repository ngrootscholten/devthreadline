# Testing Threadline Locally

This guide will help you test Threadline in a different codebase.

## Step 1: Build and Link the CLI

From the `devthreadline` repository:

```bash
# Build the CLI
cd packages/cli
npm install
npm run build

# Link it globally so you can use `npx threadline` from anywhere
npm link
```

This makes the `threadline` command available globally. You can now use `npx threadline check` or just `threadline check` from any directory.

## Step 2: Start the Server

In a separate terminal, from the `devthreadline` repository:

```bash
# Build the server
cd packages/server
npm install
npm run build

# Set your OpenAI API key
export OPENAI_API_KEY=your_key_here

# Start the server (runs on localhost:3000 by default)
npm start
```

Or use dev mode for auto-reload:
```bash
npm run dev
```

The server will run on `http://localhost:3000` by default.

## Step 3: Set Up Your Test Codebase

In your **other codebase** (the one you want to test Threadline with):

1. **Create a `/threadlines` folder** in the root of your repository

2. **Add a threadline file**, for example `threadlines/feature-flags.md`:

```markdown
---
id: feature-flags
version: 1.0.0
patterns:
  - "**/api/**"
  - "**/components/**"
context_files: []
---

# Feature Flag Standards

All feature flags must use our FeatureFlagService wrapper instead of direct SDK calls.
Include fallback behavior when flags are unavailable.
```

3. **Make some code changes** (so there's a git diff to check)

4. **Set your OpenAI API key**:
```bash
export OPENAI_API_KEY=your_key_here
```

5. **Run the check**:
```bash
npx threadline check
```

Or if you want to explicitly set the API URL:
```bash
npx threadline check --api-url http://localhost:3000
```

## What Happens

1. The CLI finds all `.md` files in `/threadlines`
2. It collects your git changes (diff + changed files)
3. It sends them to `http://localhost:3000/api/threadline-check`
4. The server runs parallel AI checks for each threadline
5. You see the results in your terminal

## Troubleshooting

- **"No /threadlines folder found"**: Make sure you created the folder in the root of your repo
- **"Could not reach Threadline server"**: Make sure the server is running on localhost:3000
- **"OpenAI API key required"**: Set the `OPENAI_API_KEY` environment variable
- **"No changes detected"**: Make sure you have uncommitted changes in your git repo

## Example Threadline Files

See `docs/EXPERT_FORMAT.md` for the full format specification.

Basic example:
```markdown
---
id: error-handling
version: 1.0.0
patterns:
  - "**/*.ts"
  - "**/*.tsx"
context_files: []
---

# Error Handling Standards

All API routes must return consistent error response formats.
Include proper HTTP status codes.
Log errors before returning responses.
```

