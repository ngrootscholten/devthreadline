---
id: no-error-swallowing
version: 1.0.0
patterns:
  - "**/*.ts"
  - "**/*.js"
context_files: []
---

# No Error Swallowing

Errors must never be silently swallowed or converted to generic "not_relevant" statuses. All errors must bubble up and be logged clearly.

## Guidelines

- **Never** catch errors and return a default/fallback value without logging the actual error
- **Never** convert exceptions into "success" responses (e.g., returning `not_relevant` when an error occurs)
- **Always** log the full error message and stack trace
- **Always** let errors propagate to the caller unless you can meaningfully handle them
- If you must catch an error, re-throw it or return an error response, don't hide it

## Anti-Patterns

```typescript
// ❌ BAD - Swallowing error, returning default
try {
  return await processSomething();
} catch (error) {
  return { status: 'not_relevant' }; // Error is hidden!
}

// ❌ BAD - Generic error message, no details
catch (error) {
  console.error('Error occurred');
  return defaultValue;
}

// ❌ BAD - Converting error to success
catch (error) {
  return { success: true }; // This is a lie!
}
```

## Good Patterns

```typescript
// ✅ GOOD - Let error propagate
return await processSomething(); // No try-catch if you can't handle it

// ✅ GOOD - Log and re-throw
try {
  return await processSomething();
} catch (error) {
  console.error('Failed to process:', error.message);
  console.error('Stack:', error.stack);
  throw error; // Let caller handle it
}

// ✅ GOOD - Return error response
catch (error) {
  console.error('Error:', error);
  return { error: error.message, status: 'error' };
}
```

