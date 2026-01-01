# Analysis: Consecutive Violation Detection

## Current Approach (Design Document)

**Matching Strategy**:
- Uses `threadline_id` + `threadline_version` to match violations
- Compares `threadline_content` (stored in database) between checks
- Detection logic:
  - `current_content === null` → `THREADLINE_DELETED`
  - `current_content !== previous_content` → `THREADLINE_CHANGED`
  - `current_content === previous_content` → Check code changes

## Proposed Approach (User Suggestion)

**Matching Strategy**:
- Use `threadline_id` only (don't trust version numbers)
- Use LLM to evaluate if threadline file changed by examining diffs
- Let LLM determine if threadline changes are the "fix" vs code changes

## Critical Issues & Edge Cases

### 1. **Threadline File Path Detection**

**Problem**: How do we identify which file in the diff corresponds to a threadline ID?

**Current State**:
- Threadlines are stored in `/threadlines/*.md` files
- Each file has an `id` field in YAML frontmatter
- We store `threadline_content` but not the file path

**Issues**:
- **File Renaming**: `threadlines/error-handling.md` → `threadlines/error-handling-v2.md`
  - Same ID, different path
  - How do we match? Need to check diff for file renames
  
- **File Path Not Stored**: We don't currently store the threadline file path (`filePath` exists in CLI but not in DB)
  - Can't directly check if `threadlines/error-handling.md` changed in diff
  - Would need to search diff for any `/threadlines/*.md` changes

**Solution Options**:
1. **Store file path**: Add `threadline_file_path` to `check_threadlines` table
2. **Search diff**: Look for any `/threadlines/*.md` files in diff, then parse frontmatter to match IDs
3. **Hybrid**: Store path, but also verify via diff

---

### 2. **Version Number Reliability**

**Problem**: Users might not update version numbers consistently.

**Scenarios**:
- User fixes threadline rules but forgets to bump version
- User uses inconsistent versioning (1.0.0 vs 1.0 vs 1)
- User copies threadline file, changes it, but keeps same version

**Current Approach**: Relies on version + content comparison
- If version doesn't change but content does → Still detects `THREADLINE_CHANGED`
- But version is still used for matching (could cause issues)

**Proposed Approach**: Ignore version, use ID + content comparison
- ✅ More reliable
- ✅ Handles version inconsistencies
- ⚠️ Still need content comparison (or diff analysis)

---

### 3. **Content Comparison vs Diff Analysis**

**Current**: Compares stored `threadline_content` strings
- Simple string equality check
- Fast and reliable for exact matches

**Proposed**: Use LLM to analyze diffs
- More nuanced (can detect "meaningful" vs "formatting" changes)
- But: Requires threadline file to be in the diff

**Issues**:
- **Threadline Not in Diff**: If threadline file wasn't changed, it won't appear in diff
  - Can't use diff to detect if it changed
  - Still need stored content comparison as fallback
  
- **Whitespace/Formatting**: Diff shows all changes, including formatting
  - LLM needs to distinguish "rules changed" vs "formatting changed"
  - Current content comparison is exact (catches any change)

**Hybrid Approach**:
1. Check if threadline file is in diff (for current check)
2. If yes: Use LLM to analyze if changes are meaningful
3. If no: Compare stored content (fast path)
4. For previous check: Always use stored content (diff might not be available)

---

### 4. **Threadline File Identification in Diff**

**Problem**: How do we find the threadline file in the diff?

**Current Diff Structure**:
```
diff --git a/threadlines/error-handling.md b/threadlines/error-handling.md
index abc123..def456 100644
--- a/threadlines/error-handling.md
+++ b/threadlines/error-handling.md
@@ -1,5 +1,5 @@
 ---
-id: error-handling
+id: error-handling  # Same ID
 version: 1.0.0
 patterns:
   - "**/api/**"
```

**Challenges**:
- Need to parse diff to find `/threadlines/*.md` files
- Need to extract ID from frontmatter in diff (might be changed!)
- If ID changes in diff, how do we match to previous violation?

**Solution**:
1. **Store file path**: `threadline_file_path` in `check_threadlines` table
2. **Search diff**: Look for file path in diff
3. **Parse frontmatter**: Extract ID from diff (handle ID changes)
4. **Match by path first**: If path matches, it's the same threadline (even if ID changed)

---

### 5. **Multiple Threadlines with Same ID**

**Problem**: What if user accidentally creates two threadline files with same ID?

**Scenario**:
- `threadlines/api-standards.md` has `id: api-standards`
- `threadlines/api-v2.md` also has `id: api-standards` (user error)
- Previous check: Used first file
- Current check: Uses second file (different content, same ID)

**Current Approach**: Matches by ID only → Would incorrectly match violations

**Solution**: Match by file path + ID
- If file path changes but ID stays same → Treat as different threadline
- Or: Validate uniqueness during check (prevent duplicate IDs)

---

### 6. **Threadline Deletion Detection**

**Current Logic**: `current_content === null` → `THREADLINE_DELETED`

**Issues**:
- What if threadline file is deleted but ID appears in different file?
- What if threadline file is moved/renamed (not deleted)?

**Better Detection**:
1. Check if threadline ID exists in current check → If no, check diff
2. Look for `/threadlines/*.md` file deletions in diff
3. Match deleted file to threadline ID (parse frontmatter from diff)

---

### 7. **Pattern Changes**

**Problem**: If threadline patterns change, which files are "relevant" changes?

**Scenario**:
- Previous: Patterns `["**/api/**"]` → Violation in `api/users.ts`
- Current: Patterns `["**/api/v2/**"]` → `api/users.ts` no longer matches
- Violation "fixed" because file no longer matches patterns?

**Current Approach**: Uses patterns from respective checks
- Previous diff filtered by previous patterns
- Current diff filtered by current patterns
- LLM sees different file sets

**Issue**: LLM might think violation fixed because file disappeared, but it's just pattern change

**Solution**: LLM prompt should explicitly consider pattern changes
- "Note: Patterns might have changed. A violation isn't 'fixed' just because the file no longer matches patterns."

---

### 8. **Matching Violations Across Checks**

**Current Flow**:
1. Find previous check
2. Get violations from previous check (by `threadline_id`)
3. For each violation, check if threadline exists in current check

**Issues**:
- What if threadline ID doesn't exist in current check?
  - Could be deleted
  - Could be renamed (new ID)
  - Could be missing from current check (user removed it temporarily)

**Better Flow**:
1. Find previous check
2. Get violations from previous check
3. For each violation:
   - Check if threadline ID exists in current check
   - If no: Check diff for threadline file deletion/rename
   - If yes: Compare content (or analyze diff if file changed)

---

## Recommended Approach

### Hybrid Strategy: ID + File Path + Content Comparison + Diff Analysis

**Database Schema Enhancement**:
```sql
-- Add threadline file path to check_threadlines
ALTER TABLE check_threadlines
ADD COLUMN threadline_file_path TEXT; -- e.g., "threadlines/error-handling.md"
```

**Matching Logic**:
1. **Primary Match**: `threadline_id` (stable identifier)
2. **Secondary Match**: `threadline_file_path` (handles renames)
3. **Change Detection**: 
   - If file path in current diff → Use LLM to analyze changes
   - If file path not in diff → Compare stored content
4. **Deletion Detection**: 
   - Check if ID missing in current check
   - Verify via diff (look for `/threadlines/*.md` deletions)

**LLM Prompt Enhancement**:
- Explicitly ask: "Did the threadline file itself change?"
- Provide both stored content AND diff (if available)
- Ask LLM to distinguish: code fix vs threadline rule change vs formatting change

**Benefits**:
- ✅ Doesn't rely on version numbers
- ✅ Handles file renames
- ✅ Uses diff when available (more accurate)
- ✅ Falls back to content comparison (reliable)
- ✅ LLM can make nuanced decisions

---

## Open Questions

1. **Should we store threadline file path?**
   - ✅ Yes: Enables direct diff lookup
   - ⚠️ But: File paths can change (renames)

2. **How to handle threadline file renames?**
   - Option A: Match by ID only (ignore path changes)
   - Option B: Match by path + ID (treat rename as new threadline)
   - Option C: Detect renames in diff and match accordingly

3. **What if threadline file is modified but ID changes?**
   - Current: Would be treated as deletion + new threadline
   - Better: Detect ID change in diff, link old → new ID

4. **Performance**: LLM analysis for every violation?
   - Current: Only analyzes if threadline file in diff
   - Fallback: Fast content comparison

---

## Conclusion

**User's intuition is correct**: Don't trust version numbers. But we need:

1. **Store threadline file path** for direct diff lookup
2. **Hybrid detection**: Use diff when available, content comparison as fallback
3. **LLM analysis** for nuanced change detection (not just string comparison)
4. **Robust matching**: ID + path + content comparison

The key insight: **We already have the diffs** - we should use them to detect threadline file changes, not just rely on stored content comparison.

