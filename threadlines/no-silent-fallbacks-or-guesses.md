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

Our code should show errors clearly. We should never silently fail or fallback to a different strategy. This Threadline is mainly intended to detect a common behaviour of AI Agents.

## Guidelines

1. **No silent fallbacks** - Don't catch errors and silently continue or return null/undefined without logging or explicit error communication. Multiple silent fallbacks make code harder to maintain because you lose track of which code paths were intended or expected to work.
   - **Note**: Error propagation (where errors bubble up and fail loudly) is acceptable and NOT a silent fallback.
   - **Note**: Explicit error responses (returning error objects with status codes in API routes) are acceptable and NOT a silent fallback - the error is clearly communicated to the client.
   - **Silent fallbacks specifically refer to**: Trying alternative methods when one fails without logging (e.g., try method A, if it fails silently try method B).

2. **Show errors clearly** - When something fails internally (not an API response), log the error with context so it can be diagnosed. For API endpoints, returning a clear error response with status code is sufficient.

3. We're ok with having sensible, documented defaults for environment variables: users may not wish to override those.  

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

// ✅ Good - Error propagation (not a silent fallback)
async function getDiff(commitSha: string): Promise<string> {
  // If git.show() fails, error propagates and fails loudly
  // This is NOT a silent fallback - no alternative method is tried
  const diff = await git.show([commitSha, '--format=', '--no-color', '-U200']);
  return diff || '';
}

// ✅ Good - Explicit error response (not a silent fallback)
export async function POST(req: NextRequest) {
  if (!request.reviewContext) {
    // Explicit error response - clearly communicated to client
    // This is NOT a silent fallback - error is returned with status code
    return NextResponse.json(
      { error: 'reviewContext is required', received: request.reviewContext || '(missing)' },
      { status: 400 }
    );
  }
}

// ❌ Bad - Silent fallback to alternative method
async function getDiff(commitSha: string): Promise<string> {
  try {
    return await git.show([commitSha, '--format=', '--no-color', '-U200']);
  } catch {
    // Silent fallback - tries alternative method without logging
    return await git.diff([`${commitSha}^..${commitSha}`, '-U200']);
  }
}

// ❌ Bad - Silent fallback in catch block
async function getRepoName(): Promise<string | null> {
  try {
    return await parseRepoName();
  } catch {
    // Silent failure - returns null without logging why it failed
    return null;
  }
}
```

## When to Use Debug Logging

- **Internal functions**: When a function returns null/undefined, log why
- **Internal functions**: When parsing fails, log what was being parsed
- **Internal functions**: When environment variables are missing, log which ones
- **Internal functions**: When git operations fail, log the error details

## When NOT to Require Logging

- **API endpoints**: Returning error responses (400/500) with clear error messages is sufficient - the error is communicated to the client
- **Error propagation**: Throwing errors that bubble up is acceptable - no logging needed
- **Validation**: Early returns with error responses are explicit failures, not silent ones

Debug logging helps diagnose issues in production and during development, but explicit error responses in API routes are already clear communication.

