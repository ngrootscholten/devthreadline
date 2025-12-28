# Open Bugs

## Threadline Checker Issues

### Bug 1: Incorrect Direction Detection - Flagging Fixes as Violations

**Issue**: The threadline checker incorrectly flags code changes that **fix** violations as if they're **introducing** violations.

**Example**: 
- A change from `files_changed_counts` (incorrect) → `files_changed_count` (correct) is flagged as:
  > "The addition of 'c.files_changed_counts' is a violation as it does not match the defined column 'files_changed_count' in schema.sql."

**Expected Behavior**: When a change moves from non-compliant → compliant, the checker should either:
- Recognize it as a fix and not flag it
- Or explicitly state "Fixed: changed from non-compliant 'files_changed_counts' to compliant 'files_changed_count'"

**Reference**: https://www.devthreadline.com/check/31c922fb-d3db-4de7-ba9d-eda93c560363

**Affected Threadline**: `database-field-validation`

---

### Bug 2: Duplicate Violation Messages Across Multiple Files

**Issue**: When a violation exists in one file, the checker reports the same violation message for every file that changed in the commit, even if those files don't contain the violation.

**Example Output**:
```
⚠️  database-field-validation
   app/api/checks/route.ts:8 - The addition of 'c.files_changed_counts' is a violation...
   app/page.tsx - The addition of 'c.files_changed_counts' is a violation...
   app/product/page.tsx - The addition of 'c.files_changed_counts' is a violation...
   packages/cli/src/commands/check.ts - The addition of 'c.files_changed_counts' is a violation...
   packages/cli/src/git/diff.ts - The addition of 'c.files_changed_counts' is a violation...
   packages/cli/src/utils/ci-detection.ts - The addition of 'c.files_changed_counts' is a violation...
```

**Expected Behavior**: Only report violations for files that actually contain the violation. If multiple files have the same violation, that's fine, but don't report violations for files that don't have them.

**Reference**: https://www.devthreadline.com/check/31c922fb-d3db-4de7-ba9d-eda93c560363

**Affected Threadline**: `database-field-validation`, `no-silent-fallbacks-or-guesses`

---

### Bug 3: Stale File References

**Issue**: The checker reports violations for files that have been deleted (e.g., `packages/cli/src/utils/ci-detection.ts`).

**Expected Behavior**: Filter out deleted files from violation reports, or explicitly mark them as "file deleted" if the violation existed before deletion.

---

## Full Error Output

```
⚠️  database-field-validation
   app/api/checks/route.ts:8 - The addition of 'c.files_changed_counts' is a violation as it does not match the defined column 'files_changed_count' in schema.sql.
   app/page.tsx - The addition of 'c.files_changed_counts' is a violation as it does not match the defined column 'files_changed_count' in schema.sql.
   app/product/page.tsx - The addition of 'c.files_changed_counts' is a violation as it does not match the defined column 'files_changed_count' in schema.sql.
   packages/cli/src/commands/check.ts - The addition of 'c.files_changed_counts' is a violation as it does not match the defined column 'files_changed_count' in schema.sql.
   packages/cli/src/git/diff.ts - The addition of 'c.files_changed_counts' is a violation as it does not match the defined column 'files_changed_count' in schema.sql.
   packages/cli/src/utils/ci-detection.ts - The addition of 'c.files_changed_counts' is a violation as it does not match the defined column 'files_changed_count' in schema.sql.
⚠️  no-silent-fallbacks-or-guesses
   app/api/checks/route.ts:1 - New code introduces silent fallbacks and guesses, violating the threadline guidelines.
   app/page.tsx:2 - New code introduces silent fallbacks and guesses, violating the threadline guidelines.
   app/product/page.tsx:3 - New code introduces silent fallbacks and guesses, violating the threadline guidelines.
   packages/cli/src/commands/check.ts:4 - New code introduces silent fallbacks and guesses, violating the threadline guidelines.
   packages/cli/src/git/diff.ts:5 - New code introduces silent fallbacks and guesses, violating the threadline guidelines.
   packages/cli/src/utils/ci-detection.ts:6 - New code introduces silent fallbacks and guesses, violating the threadline guidelines.
```

