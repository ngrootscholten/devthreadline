---
id: database-field-validation
version: 1.0.0
patterns:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
context_files:
  - "schema.sql"
---

# Database Field Validation

All column names referenced in SQL queries MUST exist in `schema.sql`. This prevents runtime errors from typos, renamed columns, or references to non-existent fields.

## Rules

1. **All column references in SQL queries must match columns defined in `schema.sql`**
   - SELECT clauses: `SELECT c.repo_name, c.branch_name FROM checks c`
   - INSERT column lists: `INSERT INTO checks (repo_name, branch_name) VALUES (...)`
   - UPDATE SET clauses: `UPDATE users SET name = $1 WHERE id = $2`
   - WHERE clauses: `WHERE c.user_id = $1`
   - JOIN conditions: `LEFT JOIN check_threadlines ct ON c.id = ct.check_id`
   - ORDER BY, GROUP BY: `ORDER BY c.created_at DESC`

2. **Table aliases must reference valid tables**
   - `FROM checks c` - `checks` must exist in schema.sql
   - `LEFT JOIN check_threadlines ct` - `check_threadlines` must exist

3. **Column references with table aliases must match**
   - `c.repo_name` - `repo_name` must exist in the `checks` table
   - `ct.check_id` - `check_id` must exist in the `check_threadlines` table

4. **Quoted column names (camelCase) must match exactly**
   - `"emailVerified"` - must match exactly as defined (case-sensitive)
   - `"userId"` - must match exactly as defined (case-sensitive)

5. **Functions and expressions are allowed, but column references within them must be valid**
   - `TO_CHAR(c.created_at AT TIME ZONE 'UTC', ...)` - `created_at` must exist in `checks` table
   - `COUNT(cr.id)` - `id` must exist in the referenced table
   - `JSON.stringify(threadline.patterns)` - This is JavaScript, not SQL, so ignore

## Examples

### ✅ Correct

```typescript
// All columns exist in schema.sql
const result = await pool.query(
  `SELECT c.id, c.repo_name, c.branch_name, c.created_at
   FROM checks c
   WHERE c.user_id = $1`,
  [userId]
);

// INSERT with valid columns
await pool.query(
  `INSERT INTO checks (repo_name, branch_name, user_id, account)
   VALUES ($1, $2, $3, $4)`,
  [repoName, branchName, userId, account]
);

// NextAuth camelCase columns (quoted)
await pool.query(
  `SELECT id, email, "emailVerified" FROM users WHERE id = $1`,
  [userId]
);
```

### ❌ Incorrect

```typescript
// ❌ Typo: repo_nam instead of repo_name
const result = await pool.query(
  `SELECT c.repo_nam FROM checks c`, // Column doesn't exist
  []
);

// ❌ Wrong column name: branch instead of branch_name
await pool.query(
  `INSERT INTO checks (repo_name, branch) VALUES ($1, $2)`, // branch doesn't exist
  [repoName, branchName]
);

// ❌ Table doesn't exist: check instead of checks
await pool.query(
  `SELECT * FROM check WHERE id = $1`, // Table 'check' doesn't exist
  [checkId]
);

// ❌ Wrong camelCase: emailVerified instead of "emailVerified" (quoted)
await pool.query(
  `SELECT emailVerified FROM users`, // Should be "emailVerified" (quoted)
  []
);

// ❌ Column doesn't exist in table: user_id in check_threadlines
await pool.query(
  `SELECT ct.user_id FROM check_threadlines ct`, // user_id doesn't exist in check_threadlines
  []
);
```

## Verification Process

When reviewing SQL queries:

1. **Identify all SQL strings** in the code (template literals, string literals)
2. **Extract table names** from `FROM`, `JOIN`, `INSERT INTO`, `UPDATE` clauses
3. **Extract column names** from:
   - SELECT clauses
   - INSERT column lists
   - UPDATE SET clauses
   - WHERE conditions
   - JOIN ON conditions
   - ORDER BY, GROUP BY clauses
4. **Cross-reference with `schema.sql`**:
   - Verify table exists
   - Verify column exists in that table
   - Verify quoted column names match exactly (case-sensitive)
5. **Check table aliases** map to correct tables

## Common Mistakes

- **Typos**: `repo_nam` instead of `repo_name`, `user_id` instead of `user_id`
- **Wrong table**: Using `check` instead of `checks`, `threadline` instead of `check_threadlines`
- **Case sensitivity**: Using `emailverified` instead of `"emailVerified"` (quoted)
- **Missing quotes**: Using `userId` instead of `"userId"` for NextAuth camelCase columns
- **Column in wrong table**: Referencing `user_id` from `check_threadlines` (it doesn't exist there)

## Rationale

- **Prevents runtime errors**: Catches typos before they cause database errors in production
- **Schema evolution**: When columns are renamed or removed, queries are flagged immediately
- **Type safety**: Ensures code matches the actual database schema
- **Documentation**: Makes schema.sql the single source of truth for database structure

