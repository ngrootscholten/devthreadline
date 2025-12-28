---
id: schema-standards
version: 1.0.0
patterns:
  - "schema.sql"
context_files: []
---

# Database Schema Standards

This threadline enforces critical database schema standards for `schema.sql` to ensure consistency, security, and proper timezone handling.

## Rules

### 1. Timestamp Columns Must Use TIMESTAMPTZ

**Always use `TIMESTAMPTZ`, never `TIMESTAMP`.**

```sql
-- ✅ Good
created_at TIMESTAMPTZ DEFAULT NOW()
expires TIMESTAMPTZ NOT NULL

-- ❌ Bad
created_at TIMESTAMP DEFAULT NOW()
expires TIMESTAMP NOT NULL
```

### 2. Column Naming Convention

**Constraint:** All columns must be snake_case (lowercase only, underscores between words). The only exception is NextAuth system columns, which must be "quotedCamelCase".

**Validation Checklist for the LLM:**

- Does the column name contain any uppercase letters?
  - If yes and it is NOT inside double quotes, it is a VIOLATION.
- Does the column name use camelCase (e.g., filteredDiff)?
  - If yes, it is a VIOLATION.

```sql
-- ✅ Good: lowercase_with_underscores
relevant_files JSONB
filtered_diff TEXT
created_at TIMESTAMPTZ
"emailVerified" TIMESTAMPTZ  -- Exception: Quoted NextAuth

-- ❌ Bad: Contains uppercase or lacks underscores
relevantFiles JSONB          -- camelCase (Illegal)
Relevant_Files JSONB         -- PascalCase (Illegal)
filteredDiff TEXT            -- camelCase (Illegal)
relevantfiles JSONB          -- Hard to read (Should be relevant_files)
```

### 3. Row Level Security (RLS) Must Be Enabled

**Every table must have RLS enabled. No policies that allow public access.**

```sql
-- ✅ Good
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE checks ENABLE ROW LEVEL SECURITY;

-- ❌ Bad - Missing RLS
CREATE TABLE checks (...);
-- No ALTER TABLE ... ENABLE ROW LEVEL SECURITY

-- ❌ Bad - Policy opens access
CREATE POLICY "Allow public read" ON checks FOR SELECT USING (true);
```

## Summary

- Timestamps: `TIMESTAMPTZ` only
- Column names: `snake_case` for our columns, `"camelCase"` (quoted) for NextAuth
- RLS: Enabled on all tables, no public access policies

