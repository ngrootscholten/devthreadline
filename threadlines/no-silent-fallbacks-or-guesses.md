---
id: no-silent-fallbacks-or-guesses
version: 1.0.0
patterns:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
context_files: []
---

# No Silent Fallbacks or Guesses

Our code should be fact-based and show errors clearly. We should never silently fail or make assumptions without clear evidence.

## Guidelines

1. **No silent fallbacks** - Don't catch errors and silently continue or return null without logging
2. **No guesses** - Don't assume values or make up defaults without clear evidence
3. **Show errors clearly** - When something fails, log the error with context so it can be diagnosed
4. **Fact-based decisions** - Base decisions on actual data, not assumptions

## Examples

```typescript
// ❌ Bad - Silent fallback hides the problem
function getRepoName(): string | null {
  try {
    return parseRepoName();
  } catch {
    return null; // Silent failure - no one knows why it failed
  }
}

// ❌ Bad - Guessing without evidence
function getRepoName(): string | null {
  // Assumes GITHUB_REPOSITORY exists without checking
  return process.env.GITHUB_REPOSITORY || null;
}

// ✅ Good - Shows error clearly
function getRepoName(): string | null {
  try {
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(r => r.name === 'origin');
    
    if (!origin) {
      console.log('[DEBUG] No origin remote found');
      return null;
    }
    
    if (!origin.refs?.fetch) {
      console.log('[DEBUG] Origin remote found but no fetch URL');
      return null;
    }
    
    const url = origin.refs.fetch;
    console.log(`[DEBUG] Git remote URL: ${url}`);
    
    const repoName = parseRepoName(url);
    if (!repoName) {
      console.log('[DEBUG] Failed to parse repo name from URL');
      return null;
    }
    
    return repoName;
  } catch (error: any) {
    console.log(`[DEBUG] Error getting repo name: ${error.message}`);
    return null;
  }
}
```

## When to Use Debug Logging

- When a function returns null/undefined, log why
- When parsing fails, log what was being parsed
- When environment variables are missing, log which ones
- When git operations fail, log the error details

Debug logging helps diagnose issues in production and during development.

