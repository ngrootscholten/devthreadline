import Link from "next/link";

export default function CLILocalLLMDesign() {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
      <div className="mb-3">
        <Link href="/docs/upcoming-features" className="text-green-400 hover:text-green-300 transition-colors">
          ← Back to Upcoming Features
        </Link>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-8">
        <p className="text-yellow-400 font-semibold mb-2">🚧 Upcoming Feature</p>
        <p className="text-slate-300 text-sm">
          This design document describes a feature currently in planning. CLI Local LLM Processing will enable checks without sending diffs to the Threadline web application, with optional syncing of results for analytics and collaboration.
        </p>
      </div>

      <h1 className="text-4xl font-medium mb-3 text-white">CLI Local LLM Processing</h1>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Summary</h2>
        <p className="text-slate-300 mb-4">
          CLI calls LLM directly, so code diffs don't have to go to Threadline. You can still optionally send diffs and check results to Threadline, thereby benefiting from convenience and analysis capabilities. When syncing, the full request (diffs + threadlines + results) is sent to the web app, which stores everything but skips LLM processing since it's already done.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Problem It Solves</h2>
        <p className="text-slate-300 mb-4">
          This creates greater flexibility on which LLM provider and models to use, makes the user directly responsible for LLM costs, and allows you to opt out of sending code diffs up to Threadline's servers.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">How It Works</h2>
        
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">Current Flow</h3>
          <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4 font-mono">
{`CLI (check.ts)
  ↓
Collects: git context, diffs, threadlines
  ↓
POST /api/threadline-check
  ↓
Web App (route.ts)
  ↓
processThreadlines() → calls OpenAI API
  ↓
storeCheck() → saves to database
  ↓
Return results → CLI
  ↓
displayResults()`}
          </pre>
          <p className="text-slate-300 text-sm">
            Currently, the CLI sends all threadline data, diffs, and context files to the web app. The web app processes everything using OpenAI, stores results, and returns them to the CLI.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">New Flow</h3>
          <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4 font-mono">
{`CLI (check.ts)
  ↓
Collects: git context, diffs, threadlines
  ↓
processThreadlines() → calls OpenAI API locally
  ↓
displayResults()
  ↓
[STOP HERE - Local only]
  OR
  ↓
[Optional] POST /api/threadline-check-results
  ↓
Send: diffs + threadlines + results
  ↓
Web App (new route.ts)
  ↓
storeCheck() → saves to database
(Skips LLM processing - already done)`}
          </pre>
          <p className="text-slate-300 text-sm">
            With local processing, the CLI handles all LLM calls directly. Results are displayed immediately. The process can stop here for local-only usage. Optionally, the full request (diffs + threadlines + results) can be synced to the web app for storage and analytics. The web app stores everything but skips LLM processing since it's already complete.
          </p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Detailed Analysis of Current Implementation</h2>
        
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">1. Request Object Structure</h3>
          
          <p className="text-slate-300 mb-3 text-sm">
            The CLI sends a <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">ReviewRequest</code> object via <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">POST /api/threadline-check</code>:
          </p>
          
          <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4 font-mono">
{`ReviewRequest {
  threadlines: Array<{
    id: string;              // Threadline identifier
    version: string;         // Version string from file
    patterns: string[];      // File patterns (e.g., ["**/*.ts"])
    content: string;         // Threadline guidelines text
    filePath: string;        // Path to threadline file
    contextFiles?: string[]; // Optional: paths to context files
    contextContent?: {       // Optional: full content of context files
      [filePath: string]: string;
    };
  }>;
  diff: string;              // Full git diff (unified format)
  files: string[];           // List of changed file paths
  apiKey: string;            // Threadline API key (for auth)
  account: string;           // Account identifier (email)
  repoName?: string;         // Git remote URL
  branchName?: string;       // Branch name
  commitSha?: string;        // Commit SHA
  commitMessage?: string;    // Commit message
  commitAuthorName?: string; // Author name
  commitAuthorEmail?: string;// Author email
  prTitle?: string;          // PR/MR title
  environment?: string;      // 'github' | 'gitlab' | 'vercel' | 'local'
  cliVersion?: string;       // CLI version
  reviewContext: 'local' | 'commit' | 'pr' | 'file' | 'folder' | 'files';
}`}
          </pre>
          
          <p className="text-slate-300 text-sm mb-2">
            <strong className="text-white">Key Points:</strong>
          </p>
          <ul className="list-disc list-inside text-slate-300 text-sm space-y-1 ml-4 mb-4">
            <li>CLI reads threadline files and context files from disk, includes full content</li>
            <li>CLI generates git diff using git commands (varies by context: commit, PR, file, etc.)</li>
            <li>All metadata (repo, branch, commit, author) is collected by CLI before sending</li>
            <li>Full diff is sent (can be large with -U200 context lines)</li>
          </ul>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">2. Endpoint Processing Flow</h3>
          
          <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4 font-mono">
{`POST /api/threadline-check (route.ts)
│
├─ Step 1: Parse & Validate Request
│  ├─ Validate threadlines array (required, non-empty)
│  ├─ Validate filePath on each threadline (required)
│  ├─ Validate diff (must be string, empty allowed)
│  ├─ Validate reviewContext (must be valid enum)
│  └─ Validate apiKey & account (required)
│
├─ Step 2: Calculate Statistics (for audit)
│  ├─ countLinesInDiff(diff) → {added, removed, total}
│  ├─ calculateContextStats(threadlines) → {fileCount, totalLines, files}
│  └─ Log audit statistics
│
├─ Step 3: Early Return for Zero Diffs
│  └─ If diff.trim() === '':
│     └─ Return all threadlines as 'not_relevant' (no LLM calls)
│
├─ Step 4: Authentication
│  ├─ Look up account in database by identifier
│  ├─ Compare apiKey (plaintext comparison)
│  ├─ Get accountId and userId
│  └─ Fallback to env vars (backward compatibility)
│
├─ Step 5: Get OpenAI API Key
│  └─ Read OPENAI_API_KEY from server environment
│
├─ Step 6: Process Threadlines (LLM Calls)
│  └─ processThreadlines({...request, apiKey: openaiApiKey})
│     │
│     ├─ For each threadline (parallel):
│     │  └─ processThreadline(threadline, diff, files, apiKey)
│     │     │
│     │     ├─ Filter files matching patterns
│     │     │  └─ If no matches → return 'not_relevant'
│     │     │
│     │     ├─ Filter diff to relevant files
│     │     │  └─ filterDiffByFiles(diff, relevantFiles)
│     │     │
│     │     ├─ Extract files from filtered diff
│     │     │  └─ extractFilesFromDiff(filteredDiff)
│     │     │
│     │     ├─ Trim diff for LLM (reduce tokens)
│     │     │  └─ createSlimDiff(filteredDiff, contextLines)
│     │     │     (Default: 10 context lines, configurable)
│     │     │
│     │     ├─ Build prompt
│     │     │  └─ buildPrompt(threadline, trimmedDiff, filesInDiff)
│     │     │     ├─ Includes threadline content
│     │     │     ├─ Includes context files content
│     │     │     ├─ Includes trimmed diff
│     │     │     └─ Includes changed files list
│     │     │
│     │     ├─ Call OpenAI API
│     │     │  └─ openai.chat.completions.create({
│     │     │       model: 'gpt-5.2',
│     │     │       messages: [system, user],
│     │     │       response_format: {type: 'json_object'},
│     │     │       temperature: 0.1
│     │     │     })
│     │     │
│     │     └─ Return ProcessThreadlineResult
│     │        ├─ status: 'compliant' | 'attention' | 'not_relevant' | 'error'
│     │        ├─ reasoning: string
│     │        ├─ fileReferences: string[]
│     │        ├─ relevantFiles: string[]
│     │        ├─ filteredDiff: string (full filtered diff, not trimmed)
│     │        ├─ filesInFilteredDiff: string[]
│     │        └─ llmCallMetrics: {...}
│     │
│     └─ Return ProcessThreadlinesResponse
│        ├─ results: ProcessThreadlineResult[]
│        └─ metadata: {totalThreadlines, completed, timedOut, errors, llmModel}
│
├─ Step 7: Store Check in Database
│  └─ storeCheck({request, result, diffStats, contextStats, ...})
│     │
│     ├─ Begin Transaction
│     │
│     ├─ Insert check record
│     │  └─ INSERT INTO checks (repo_name, branch_name, commit_sha, ...)
│     │
│     ├─ Insert diff content
│     │  └─ INSERT INTO check_diffs (check_id, diff_content, diff_format)
│     │
│     ├─ For each threadline:
│     │  ├─ Generate hashes
│     │  │  ├─ versionHash = generateVersionHash({
│     │  │  │     threadlineId, filePath, patterns, content,
│     │  │  │     version, repoName, accountId
│     │  │  │   })
│     │  │  └─ identityHash = generateIdentityHash({
│     │  │        threadlineId, filePath, repoName, accountId
│     │  │      })
│     │  │
│     │  ├─ Check if version_hash exists
│     │  │  └─ If yes → reuse threadline_definition_id
│     │  │  └─ If no → check identity_hash for predecessor
│     │  │     └─ Insert new threadline_definition
│     │  │
│     │  ├─ Process context files
│     │  │  ├─ For each context file:
│     │  │  │  ├─ contextHash = generateContextHash({
│     │  │  │  │     accountId, repoName, filePath, content
│     │  │  │  │   })
│     │  │  │  └─ Check if content_hash exists
│     │  │  │     └─ Reuse or create context_file_snapshot
│     │  │  └─ Collect snapshot IDs
│     │  │
│     │  └─ Insert check_threadlines
│     │     └─ INSERT INTO check_threadlines (
│     │          threadline_definition_id,
│     │          context_snapshot_ids,
│     │          relevant_files,
│     │          filtered_diff,
│     │          files_in_filtered_diff
│     │        )
│     │
│     ├─ Insert check_results
│     │  └─ INSERT INTO check_results (
│     │       status, reasoning, file_references
│     │     )
│     │
│     └─ Commit Transaction
│
├─ Step 8: Log Metrics (non-blocking)
│  ├─ Log LLM call metrics for each threadline
│  └─ Log check summary metrics
│
└─ Step 9: Return Response
   └─ NextResponse.json(result)`}
          </pre>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">3. What Needs to Move vs. Stay</h3>
          
          <div className="mb-4">
            <p className="text-slate-200 font-semibold mb-2 text-sm">✅ Move to CLI (Required for Local Processing)</p>
            <ul className="list-disc list-inside text-slate-300 text-xs space-y-1 ml-4">
              <li><code className="bg-slate-800 px-1 py-0.5 rounded">processThreadlines()</code> - Main orchestration with parallel execution</li>
              <li><code className="bg-slate-800 px-1 py-0.5 rounded">processThreadline()</code> - Single threadline processing with OpenAI API</li>
              <li><code className="bg-slate-800 px-1 py-0.5 rounded">buildPrompt()</code> - Prompt construction</li>
              <li><code className="bg-slate-800 px-1 py-0.5 rounded">filterDiffByFiles()</code> - Filter diff by threadline patterns</li>
              <li><code className="bg-slate-800 px-1 py-0.5 rounded">extractFilesFromDiff()</code> - Extract file list from diff</li>
              <li><code className="bg-slate-800 px-1 py-0.5 rounded">createSlimDiff()</code> - Trim diff for LLM (token reduction)</li>
              <li>OpenAI SDK integration</li>
              <li>Timeout handling (40s per threadline)</li>
              <li>Parallel processing logic</li>
            </ul>
          </div>

          <div className="mb-4">
            <p className="text-slate-200 font-semibold mb-2 text-sm">❌ Stay in Web App (Storage & Analytics Only)</p>
            <ul className="list-disc list-inside text-slate-300 text-xs space-y-1 ml-4">
              <li><code className="bg-slate-800 px-1 py-0.5 rounded">storeCheck()</code> - Database storage logic</li>
              <li>Hash calculations (<code className="bg-slate-800 px-1 py-0.5 rounded">generateVersionHash</code>, <code className="bg-slate-800 px-1 py-0.5 rounded">generateIdentityHash</code>, <code className="bg-slate-800 px-1 py-0.5 rounded">generateContextHash</code>) - Only done on server for analysis purposes, after LLM results are received</li>
              <li>Authentication logic (apiKey validation, account lookup)</li>
              <li>Metrics logging (LLM call metrics, check summary metrics)</li>
              <li>Audit statistics calculation (for logging, not needed for processing)</li>
            </ul>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">4. Data Flow Summary</h3>
          
          <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4 font-mono">
{`CLI → Web App (Current):
  ├─ Sends: threadlines[], diff, files[], metadata
  ├─ Web App: Processes with LLM
  ├─ Web App: Stores in DB (with hashes)
  └─ Returns: results[], metadata

CLI → Web App (New - Sync):
  ├─ Sends: threadlines[], diff, files[], metadata, results[], metadata
  ├─ Web App: Skips LLM (already processed)
  ├─ Web App: Stores in DB (with hashes)
  └─ Returns: success/error

Key Insight:
  - Web app still needs full diff for UI diff viewer
  - Web app still needs results for storage
  - Web app still generates hashes for deduplication
  - Only LLM processing moves to CLI`}
          </pre>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Implementation Plan</h2>
        
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
          <p className="text-slate-300 text-sm">
            <strong className="text-white">Prerequisite:</strong> Storage function <code className="bg-slate-800 px-1 py-0.5 rounded">storeCheckAndMetrics()</code> exists at <code className="bg-slate-800 px-1 py-0.5 rounded">app/lib/audit/store-check-and-metrics.ts</code>. Both paths (web app LLM, CLI sync) use this function with the same <code className="bg-slate-800 px-1 py-0.5 rounded">ProcessThreadlinesResponse</code> interface.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">Next: Add Sync Endpoint</h3>
          
          <p className="text-slate-300 mb-3 text-sm">
            Create <code className="bg-slate-800 px-1 py-0.5 rounded">POST /api/threadline-check-results</code> — same as current endpoint minus LLM processing.
          </p>

          <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4 font-mono">
{`// CLI sends: ReviewRequest + results + metadata
{
  ...reviewRequest,                                         // Same as today
  results: ProcessThreadlineResult[],                       // Already processed
  metadata: { totalThreadlines, completed, timedOut, errors, llmModel }
}

// Endpoint: validate → auth → storeCheckAndMetrics() → return success`}
          </pre>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">Then: Port Processing to CLI</h3>
          
          <p className="text-slate-300 mb-3 text-sm">
            Port <code className="bg-slate-800 px-1 py-0.5 rounded">processThreadlines()</code>, <code className="bg-slate-800 px-1 py-0.5 rounded">buildPrompt()</code>, diff filtering to CLI. Returns same <code className="bg-slate-800 px-1 py-0.5 rounded">ProcessThreadlinesResponse</code>.
          </p>

          <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 font-mono">
{`// CLI: process locally, optionally sync
const result = await processThreadlines({...});
displayResults(result);
if (shouldSync) await client.syncResults({...reviewRequest, ...result});`}
          </pre>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Changes</h2>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">CLI Changes</h3>
          
          <p className="text-slate-300 mb-2">
            <strong className="text-white">New Files:</strong>
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4 mb-4">
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">src/api/openai.ts</code> - OpenAI client wrapper</li>
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">src/processors/expert.ts</code> - Port <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">processThreadlines</code> from web app</li>
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">src/processors/single-expert.ts</code> - Port <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">processThreadline</code> from web app</li>
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">src/llm/prompt-builder.ts</code> - Port <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">buildPrompt</code> from web app</li>
          </ul>

          <p className="text-slate-300 mb-2">
            <strong className="text-white">Modified Files:</strong>
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4 mb-4">
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">src/commands/check.ts</code> - Replace <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">ReviewAPIClient.review()</code> call with local processing</li>
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">src/api/client.ts</code> - Add new <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">syncResults()</code> method for optional web app sync</li>
          </ul>

          <p className="text-slate-300 mb-2">
            <strong className="text-white">Key Implementation Details:</strong>
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4 mb-4">
            <li>CLI currently calls <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">ReviewAPIClient.review()</code> at line 283 in <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">check.ts</code>, sending full request including diffs</li>
            <li>Replace with local <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">processThreadlines()</code> that calls OpenAI directly</li>
            <li>Port timeout logic (40s per threadline) and parallel processing from web app</li>
            <li>Port prompt building logic - includes threadline content, context files, diff, and changed files</li>
            <li>After local processing, optionally call new sync endpoint with full request (diffs + threadlines + results) - web app stores everything but skips LLM processing</li>
          </ul>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">Web App Changes</h3>
          
          <p className="text-slate-300 mb-2">
            <strong className="text-white">New Endpoint:</strong>
          </p>
            <p className="text-slate-300 text-sm mb-4 ml-4">
              <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">POST /api/threadline-check-results</code> - Accepts full request (diffs + threadlines + results). Stores in database using existing <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">storeCheck()</code> function, but skips LLM processing since results are already provided.
            </p>

            <p className="text-slate-300 mb-2">
              <strong className="text-white">Request Format:</strong>
            </p>
            <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
{`{
  // Full request (same as current /api/threadline-check)
  threadlines: [...],  // Threadline definitions
  diff: string,        // Full git diff
  files: string[],     // Changed files
  results: ExpertResult[];  // Already processed results
  metadata: {
    totalThreadlines: number;
    completed: number;
    timedOut: number;
    errors: number;
    llmModel: string;
  };
  // Same metadata as current: repoName, branchName, commitSha, etc.
  apiKey: string;
  account: string;
}`}
            </pre>
            <p className="text-slate-300 text-sm mb-4">
              The web app needs the full diff for the UI diff viewer, analytics, and fix detection. It just skips calling the LLM since results are already provided.
            </p>

          <p className="text-slate-300 mb-2">
            <strong className="text-white">Existing Endpoint:</strong>
          </p>
          <p className="text-slate-300 text-sm ml-4">
            Keep <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">POST /api/threadline-check</code> for backward compatibility. Can be deprecated later.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">Configuration</h3>
          
          <p className="text-slate-300 mb-2">
            <strong className="text-white">Environment Variables:</strong>
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4 mb-4">
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">OPENAI_API_KEY</code> - Required for local processing</li>
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">THREADLINE_SYNC</code> - <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">true</code> | <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">false</code> - Control whether to sync results to web app</li>
          </ul>

          <p className="text-slate-300 mb-2">
            <strong className="text-white">CLI Flags:</strong>
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">--no-sync</code> - Skip syncing results to web app</li>
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">--sync</code> - Explicitly enable syncing (default: enabled for backward compatibility)</li>
          </ul>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">Code to Port</h3>
          
          <p className="text-slate-300 mb-2">
            <strong className="text-white">From Web App to CLI:</strong>
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4 mb-4">
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">app/lib/processors/expert.ts</code> → <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">src/processors/expert.ts</code> - Main processing logic with parallel execution and timeout handling</li>
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">app/lib/processors/single-expert.ts</code> → <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">src/processors/single-expert.ts</code> - Single threadline processing with OpenAI API calls</li>
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">app/lib/llm/prompt-builder.ts</code> → <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">src/llm/prompt-builder.ts</code> - Prompt construction logic</li>
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">app/lib/utils/diff-filter.ts</code> → <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">src/utils/diff-filter.ts</code> - Filter diffs by threadline patterns</li>
          </ul>

          <p className="text-slate-300 mb-2">
            <strong className="text-white">Dependencies to Add:</strong>
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">openai</code> - OpenAI SDK for Node.js</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
