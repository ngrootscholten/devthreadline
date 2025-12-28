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

**STRICT RULE: Use snake_case only. A name is invalid if it contains ANY uppercase letters.**

**Evaluation Logic:**

- Is there an uppercase letter (A-Z) in the name?
  - If YES (and not in double quotes): It is a VIOLATION.
  - If NO: It is COMPLIANT.

**Examples of the logic:**

- ✅ COMPLIANT: `abc_def_ghi` (No uppercase letters)
- ✅ COMPLIANT: `x_y_z` (No uppercase letters)
- ❌ VIOLATION: `abcDefGhi` (Contains uppercase 'D' and 'G')
- ❌ VIOLATION: `X_y_z` (Contains uppercase 'X')

**Note on NextAuth:** Only columns wrapped in double-quotes like `"emailVerified"` may contain uppercase letters.

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

