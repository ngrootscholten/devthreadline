# Violation Fix Detection System - Design Document

## Executive Summary

This document outlines the design for an automated system that detects when threadline violations are fixed between consecutive checks. The system uses LLM analysis to determine if violations from a previous check have been addressed in the current check, and tracks how they were fixed (code changes, threadline modifications, or threadline deletions).

The system runs asynchronously after check responses are returned, ensuring zero impact on check performance while providing valuable analytics on fix effectiveness.

---

## 1. System Architecture

### 1.1 High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CLI Check Request                                        │
│    POST /api/threadline-check                              │
│    ↓                                                        │
│ 2. Process Threadlines (existing logic)                    │
│    ↓                                                        │
│ 3. Store Check + Results                                    │
│    ↓                                                        │
│ 4. Return Response to CLI IMMEDIATELY ✅                   │
│    ↓                                                        │
│ 5. Trigger Fix Detection (async, non-blocking)             │
│    └─→ HTTP request to internal endpoint                   │
│        OR                                                   │
│        Background job queue                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 6. Fix Detection Process (async)                            │
│    ├─ Find Previous Consecutive Check                       │
│    ├─ Extract Violations from Previous Check                │
│    ├─ IF violations exist:                                  │
│    │   ├─ Get Previous Diff (filtered by threadline)        │
│    │   ├─ Get Current Diff (filtered by threadline)        │
│    │   ├─ Get Threadline Contents (previous + current)      │
│    │   ├─ For Each Violation (parallel):                    │
│    │   │   └─ LLM Analysis: "Was this fixed? How?"           │
│    │   └─ Store Fix Results                                 │
│    └─ Log completion/failures                               │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Key Design Principles

1. **Non-blocking**: Check response returns immediately; fix detection runs asynchronously
2. **Best effort**: Failures are logged but don't affect check results
3. **Parallel processing**: Analyze multiple violations simultaneously
4. **Context-aware**: Works for local, branch, and PR contexts
5. **Analytics-ready**: Record time distances for effectiveness metrics

---

## 2. Data Model

### 2.1 Database Schema

```sql
-- New table to track violation fixes
CREATE TABLE violation_fixes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  
  -- References
  violation_check_id TEXT NOT NULL REFERENCES checks(id),
  fix_check_id TEXT NOT NULL REFERENCES checks(id),
  violation_threadline_id TEXT NOT NULL REFERENCES check_threadlines(id),
  
  -- Threadline identification
  threadline_id TEXT NOT NULL,
  threadline_version TEXT NOT NULL,
  
  -- Violation details
  file_references JSONB NOT NULL, -- Files that had violations
  
  -- Fix detection results
  fix_type TEXT NOT NULL CHECK (fix_type IN (
    'CODE_CHANGE',           -- Code was changed/removed
    'THREADLINE_CHANGED',    -- Threadline definition modified
    'THREADLINE_DELETED'     -- Threadline file deleted
  )),
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  explanation TEXT,          -- LLM explanation of how it was fixed
  evidence JSONB,           -- LLM evidence (files_changed, code_snippets)
  
  -- Analytics
  time_between_checks_seconds INTEGER, -- Time from violation to fix
  detection_method TEXT DEFAULT 'llm_analysis',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_violation_fixes_violation_check ON violation_fixes(violation_check_id);
CREATE INDEX idx_violation_fixes_fix_check ON violation_fixes(fix_check_id);
CREATE INDEX idx_violation_fixes_threadline ON violation_fixes(threadline_id);
CREATE INDEX idx_violation_fixes_fix_type ON violation_fixes(fix_type);
CREATE INDEX idx_violation_fixes_time_between ON violation_fixes(time_between_checks_seconds);
```

### 2.2 Data Relationships

```
checks (1) ──→ (many) check_threadlines
checks (1) ──→ (1) check_diffs
check_threadlines (1) ──→ (1) check_results

violation_fixes:
  violation_check_id ──→ checks (previous check)
  fix_check_id ──→ checks (current check)
  violation_threadline_id ──→ check_threadlines (violation record)
```

---

## 3. API Design

### 3.1 Main Check Endpoint (Existing)

**Endpoint**: `POST /api/threadline-check`

**Flow**:
1. Process threadlines (existing logic)
2. Store check + results
3. Return response immediately
4. Trigger fix detection async (non-blocking)

**Trigger Options**:

**Option A: Internal HTTP Request (Simplest)**
```typescript
// After storing check and returning response
setImmediate(() => {
  fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/fix-detection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checkId: checkId }),
  }).catch(err => {
    console.error('Failed to trigger fix detection:', err);
    // Non-blocking - don't throw
  });
});
```

**Option B: Background Job Queue (More Robust)**
- Use BullMQ or similar
- Enqueue job after check storage
- Worker processes jobs asynchronously
- Better for production scale

**Recommendation**: Start with Option A, migrate to Option B if needed.

### 3.2 Fix Detection Endpoint (New)

**Endpoint**: `POST /api/fix-detection`

**Request**:
```typescript
{
  checkId: string; // The newly completed check
}
```

**Response**:
```typescript
{
  success: boolean;
  violationsAnalyzed: number;
  fixesDetected: number;
  errors?: string[];
}
```

**Authentication**: Internal endpoint - use API key or server-side only

---

## 4. Core Logic

### 4.1 Finding Previous Consecutive Check

**For Local Context**:
```sql
SELECT 
  c.id,
  c.created_at,
  c.repo_name,
  c.branch_name,
  c.environment
FROM checks c
WHERE c.user_id = $1
  AND c.repo_name = $2
  AND c.branch_name = $3
  AND c.environment = 'local'
  AND c.created_at < (
    SELECT created_at FROM checks WHERE id = $4
  )
ORDER BY c.created_at DESC
LIMIT 1
```

**For Branch/PR Context**:
```sql
SELECT 
  c.id,
  c.created_at,
  c.commit_sha,
  c.repo_name,
  c.branch_name,
  c.environment
FROM checks c
WHERE c.user_id = $1
  AND c.repo_name = $2
  AND c.branch_name = $3
  AND c.environment IN ('github', 'gitlab', 'vercel')
  AND c.created_at < (
    SELECT created_at FROM checks WHERE id = $4
  )
ORDER BY c.created_at DESC
LIMIT 1
```

**Edge Cases**:
- No previous check found → Skip fix detection
- Different repo/branch → Skip (not consecutive)
- Time distance → Record it (no filtering)

### 4.2 Violation Extraction

```typescript
interface Violation {
  check_threadline_id: string;
  threadline_id: string;
  threadline_version: string;
  file_references: string[];
  reasoning: string;
  status: 'attention';
}

async function getViolationsFromCheck(checkId: string): Promise<Violation[]> {
  // Query violations (status = 'attention') from previous check
  // Return array of violations with full context
}
```

**Early Exit**: If `violations.length === 0`, skip fix detection.

### 4.3 Diff Filtering

**Key Insight**: Use existing diff filter logic for both previous and current diffs.

**Process**:
1. Get full previous diff from `check_diffs` table
2. Get full current diff from `check_diffs` table
3. For each violation's threadline:
   - Filter previous diff using threadline patterns (from previous check)
   - Filter current diff using threadline patterns (from current check)
   - Note: Patterns might differ if threadline changed

**Existing Function**: `filterDiffByFiles(diff: string, files: string[])`

**Enhancement Needed**: Filter by threadline patterns (not just files)
- Use `threadline_patterns` from `check_threadlines` table
- Apply pattern matching to filter diff

### 4.4 Threadline Content Detection

**Purpose**: Detect if threadline was changed or deleted.

**Query**:
```sql
-- Previous check threadline content
SELECT threadline_id, threadline_content, threadline_version
FROM check_threadlines
WHERE check_id = $previous_check_id
  AND threadline_id = $threadline_id

-- Current check threadline content (or null if deleted)
SELECT threadline_id, threadline_content, threadline_version
FROM check_threadlines
WHERE check_id = $current_check_id
  AND threadline_id = $threadline_id
```

**Detection Logic**:
- `current_content === null` → `THREADLINE_DELETED`
- `current_content !== previous_content` → `THREADLINE_CHANGED`
- `current_content === previous_content` → Check code changes

### 4.5 LLM Analysis Per Violation

**Input Structure**:
```typescript
interface FixDetectionInput {
  violation: {
    threadline_id: string;
    threadline_version: string;
    file_references: string[];
    reasoning: string;
  };
  previous_diff_filtered: string;  // Filtered by threadline patterns
  current_diff_filtered: string;   // Filtered by threadline patterns
  previous_threadline_content: string;
  current_threadline_content: string | null;
  threadline_patterns_previous: string[];
  threadline_patterns_current: string[];
  context: 'local' | 'branch' | 'pr';
  time_between_checks_seconds: number;
}
```

**LLM Prompt**:
```
You are analyzing whether a threadline violation was fixed between two consecutive code checks.

CONTEXT: {context} environment, {time_between_checks_seconds} seconds between checks

PREVIOUS CHECK VIOLATION:
- Threadline ID: {threadline_id} (version {threadline_version})
- Files with violations: {file_references}
- Issue description: {reasoning}
- Threadline definition: {previous_threadline_content}
- Threadline patterns: {threadline_patterns_previous}

PREVIOUS DIFF (filtered to relevant files):
{previous_diff_filtered}

CURRENT CHECK:
- Threadline definition: {current_threadline_content} (null if deleted)
- Threadline patterns: {threadline_patterns_current}
- Current diff (filtered to relevant files): {current_diff_filtered}

QUESTION: Was this violation fixed? If yes, HOW was it fixed?

Possible Fix Types:
1. CODE_CHANGE - The problematic code was changed/removed/fixed in the current diff
2. THREADLINE_CHANGED - The threadline definition itself was modified (rules changed, patterns changed)
3. THREADLINE_DELETED - The threadline file was deleted (no longer enforced)

Analyze the diffs carefully:
- Look for code changes that address the violation
- Check if threadline definition changed (compare previous vs current)
- Check if threadline was deleted (current_threadline_content is null)
- Consider that patterns might have changed (affecting which files are relevant)

Return JSON:
{
  "was_fixed": boolean,
  "fix_type": "CODE_CHANGE" | "THREADLINE_CHANGED" | "THREADLINE_DELETED" | null,
  "confidence": 0.0-1.0,
  "explanation": "Detailed explanation of how it was fixed or why it wasn't",
  "evidence": {
    "files_changed": ["file1.ts", "file2.ts"],
    "code_snippets": ["relevant code from diff"],
    "threadline_changes": "description of threadline changes if applicable"
  }
}
```

**LLM Call**:
```typescript
async function analyzeViolationFix(input: FixDetectionInput): Promise<FixDetectionResult> {
  const prompt = buildFixDetectionPrompt(input);
  
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a code analysis expert. Analyze whether violations were fixed and how.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

### 4.6 Parallel Processing

**Implementation**:
```typescript
async function detectViolationFixes(newCheckId: string) {
  try {
    // 1. Find previous check
    const previousCheck = await findPreviousCheck(newCheckId);
    if (!previousCheck) {
      console.log(`No previous check found for ${newCheckId}`);
      return;
    }
    
    // 2. Calculate time distance
    const timeDistance = await calculateTimeDistance(previousCheck.id, newCheckId);
    
    // 3. Get violations from previous check
    const violations = await getViolationsFromCheck(previousCheck.id);
    if (violations.length === 0) {
      console.log(`No violations in previous check ${previousCheck.id}`);
      return;
    }
    
    // 4. Get diffs
    const previousDiffFull = await getDiff(previousCheck.id);
    const currentDiffFull = await getDiff(newCheckId);
    
    // 5. Process violations in parallel
    const analysisPromises = violations.map(violation => 
      analyzeSingleViolation({
        violation,
        previousCheck,
        newCheckId,
        previousDiffFull,
        currentDiffFull,
        timeDistance
      })
    );
    
    const results = await Promise.allSettled(analysisPromises);
    
    // 6. Store successful fix detections
    let fixesDetected = 0;
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const violation = violations[i];
      
      if (result.status === 'fulfilled' && result.value.was_fixed) {
        await storeViolationFix({
          violation_check_id: previousCheck.id,
          fix_check_id: newCheckId,
          violation_threadline_id: violation.check_threadline_id,
          threadline_id: violation.threadline_id,
          threadline_version: violation.threadline_version,
          file_references: violation.file_references,
          fix_type: result.value.fix_type,
          confidence: result.value.confidence,
          explanation: result.value.explanation,
          evidence: result.value.evidence,
          time_between_checks_seconds: timeDistance
        });
        fixesDetected++;
      } else if (result.status === 'rejected') {
        console.error(`Failed to analyze violation ${violation.threadline_id}:`, result.reason);
      }
    }
    
    console.log(`Fix detection complete: ${fixesDetected}/${violations.length} fixes detected`);
  } catch (error) {
    console.error('Fix detection failed:', error);
    // Best effort - don't throw
  }
}
```

---

## 5. Error Handling & Logging

### 5.1 Error Handling Strategy

**Principle**: Best effort - log failures but don't fail the system.

**Error Scenarios**:
1. Previous check not found → Log and return early
2. No violations in previous check → Log and return early
3. LLM call fails → Log error, continue with other violations
4. Database write fails → Log error, continue
5. Diff filtering fails → Log error, skip that violation

**Logging**:
```typescript
// Success
console.log(`Fix detection: ${fixesDetected} fixes detected for check ${newCheckId}`);

// Errors
console.error(`Fix detection failed for check ${newCheckId}:`, error);
console.error(`Failed to analyze violation ${threadline_id}:`, error);
```

### 5.2 Monitoring

**Metrics to Track**:
- Fix detection trigger rate
- LLM call success rate
- Average fixes detected per check
- Average time between violation and fix
- Error rates by error type

---

## 6. Analytics & Metrics

### 6.1 Time Distance Metrics

**Purpose**: Measure effectiveness (e.g., "95% of fixes happen within 5 minutes in local environment").

**Queries**:
```sql
-- Average time to fix by environment
SELECT 
  c.environment,
  AVG(vf.time_between_checks_seconds) as avg_seconds,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY vf.time_between_checks_seconds) as p95_seconds
FROM violation_fixes vf
JOIN checks c ON vf.fix_check_id = c.id
GROUP BY c.environment;

-- Fix distribution by time buckets
SELECT 
  CASE
    WHEN time_between_checks_seconds < 300 THEN '< 5 minutes'
    WHEN time_between_checks_seconds < 3600 THEN '5-60 minutes'
    WHEN time_between_checks_seconds < 86400 THEN '1-24 hours'
    ELSE '> 24 hours'
  END as time_bucket,
  COUNT(*) as fix_count
FROM violation_fixes
GROUP BY time_bucket;
```

### 6.2 Fix Type Distribution

```sql
SELECT 
  fix_type,
  COUNT(*) as count,
  AVG(confidence) as avg_confidence
FROM violation_fixes
GROUP BY fix_type;
```

### 6.3 Dashboard Stats

**New Metrics**:
- Total violations fixed
- Average time to fix
- Fix rate (% of violations that get fixed)
- Most common fix type
- Fix effectiveness by threadline

---

## 7. Implementation Phases

### Phase 1: Infrastructure (Week 1)
- [ ] Create `violation_fixes` table
- [ ] Add indexes
- [ ] Create helper functions:
  - [ ] `findPreviousCheck(checkId)`
  - [ ] `getViolationsFromCheck(checkId)`
  - [ ] `getDiff(checkId)`
  - [ ] `getThreadlineContents(threadlineIds, previousCheckId, currentCheckId)`
  - [ ] `calculateTimeDistance(checkId1, checkId2)`

### Phase 2: Diff Filtering Enhancement (Week 1)
- [ ] Enhance diff filtering to use threadline patterns
- [ ] Create `filterDiffByThreadlinePatterns(diff, patterns)`
- [ ] Test with various pattern types

### Phase 3: LLM Integration (Week 2)
- [ ] Create `buildFixDetectionPrompt()` function
- [ ] Create `analyzeViolationFix()` function
- [ ] Test LLM responses
- [ ] Handle edge cases (threadline deleted, changed, etc.)

### Phase 4: Core Logic (Week 2)
- [ ] Create `analyzeSingleViolation()` function
- [ ] Create `detectViolationFixes()` main function
- [ ] Implement parallel processing
- [ ] Add error handling

### Phase 5: API Integration (Week 3)
- [ ] Create `/api/fix-detection` endpoint
- [ ] Add async trigger to `/api/threadline-check`
- [ ] Test end-to-end flow
- [ ] Add logging

### Phase 6: Analytics (Week 3-4)
- [ ] Create analytics queries
- [ ] Add dashboard API endpoint: `/api/dashboard/fix-stats`
- [ ] Display metrics on dashboard
- [ ] Show fix details on check detail pages

---

## 8. Edge Cases & Considerations

### 8.1 Threadline Version Changes
- **Scenario**: Threadline content changed between checks
- **Handling**: Compare content, detect `THREADLINE_CHANGED` fix type
- **Note**: Still analyze code changes even if threadline changed

### 8.2 File Renames
- **Scenario**: File renamed but violation still exists
- **Handling**: LLM might detect, but `file_references` won't match
- **Future**: Could enhance with file rename detection

### 8.3 Large Diffs
- **Scenario**: Very large diffs exceed LLM context
- **Handling**: Diff filtering already limits to relevant files
- **Future**: Could add additional filtering if needed

### 8.4 Multiple Violations in Same File
- **Scenario**: File has multiple violations, some fixed, some not
- **Handling**: Analyze each violation separately
- **Result**: Some marked as fixed, some not

### 8.5 Threadline Pattern Changes
- **Scenario**: Patterns changed, affecting which files are relevant
- **Handling**: Filter diffs using patterns from respective checks
- **Result**: Accurate analysis even if patterns changed

---

## 9. Future Enhancements

### 9.1 Rate Limiting
- Add rate limiting for LLM calls if needed
- Queue system for high-volume scenarios

### 9.2 Retry Logic
- Retry failed LLM calls with exponential backoff
- Configurable retry attempts

### 9.3 File Rename Detection
- Detect file renames in git history
- Match violations across renamed files

### 9.4 Confidence Thresholds
- Filter low-confidence fix detections
- Allow users to review/confirm fixes

### 9.5 User Feedback
- Allow users to mark fixes as correct/incorrect
- Use feedback to improve LLM prompts

---

## 10. Success Criteria

### 10.1 Functional Requirements
- ✅ Fix detection runs asynchronously (non-blocking)
- ✅ Detects all three fix types (code, threadline changed, threadline deleted)
- ✅ Works for local, branch, and PR contexts
- ✅ Records time distances for analytics
- ✅ Handles errors gracefully (best effort)

### 10.2 Performance Requirements
- ✅ Check response time unaffected (< 100ms overhead)
- ✅ Fix detection completes within 30 seconds (for typical cases)
- ✅ Parallel processing for multiple violations

### 10.3 Quality Requirements
- ✅ High confidence scores (> 0.8) for clear fixes
- ✅ Accurate fix type detection
- ✅ Comprehensive logging for debugging

---

## 11. Open Questions

1. **Internal HTTP Request**: Use `fetch()` with internal URL, or environment variable for API URL?
2. **Authentication**: How to secure internal `/api/fix-detection` endpoint?
3. **Diff Filtering**: Enhance existing `filterDiffByFiles()` or create new `filterDiffByPatterns()`?
4. **LLM Model**: Use same model as threadline checks, or different model?
5. **Cost Monitoring**: Track LLM costs for fix detection separately?

---

## 12. Conclusion

This system provides real-time violation fix detection with minimal impact on check performance. The async, best-effort approach ensures reliability while providing valuable analytics on fix effectiveness.

The phased implementation allows for iterative development and testing, with clear success criteria and future enhancement paths.

**Next Steps**: Review this document, address open questions, then proceed with Phase 1 implementation.

