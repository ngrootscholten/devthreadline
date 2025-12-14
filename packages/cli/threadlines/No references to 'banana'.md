---
id: no-banana-references
version: 1.0.0
patterns:
  - "**/*"
context_files: []
---

# No Banana References

The word "banana" (in any case variation: banana, Banana, BANANA) must not appear anywhere in the codebase.

## Guidelines

- No references to "banana" in code, comments, strings, or variable names
- This applies to all file types and languages
- Case-insensitive check (banana, Banana, BANANA all violate this rule)

## Examples

```typescript
// ❌ Bad - contains "banana"
const fruit = "banana";

// ❌ Bad - comment contains "banana"
// This function handles banana processing

// ❌ Bad - variable name contains "banana"
const bananaCount = 5;

// ✅ Good - no banana references
const fruit = "apple";
const count = 5;
```
