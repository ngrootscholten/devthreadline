export default function DiffDetection() {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
      <h1 className="text-4xl font-medium mb-3 text-white">How Threadline Detects Code Changes</h1>

      <section className="mb-12">
        <p className="text-slate-300 mb-4">
          Threadline automatically detects your CI/CD environment and gathers the appropriate code changes (diff) 
          for analysis. Understanding what changes are included helps you know exactly what your threadlines are 
          testing.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Diff Detection Strategy</h2>
        
        <p className="text-slate-300 mb-4">
          Threadline uses different git diff strategies depending on the context and clone depth. Understanding these strategies helps you know exactly what changes are being reviewed.
        </p>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">Two Dots vs Three Dots</h3>
          
          <p className="text-slate-300 mb-2">
            <strong className="text-white">Three Dots (<code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">A...B</code>):</strong> Merge-base comparison. Shows only changes from the common ancestor (merge base) to the target commit. This excludes unrelated changes that happened in the base branch after branching.
          </p>
          <p className="text-slate-300 mb-4 text-sm">
            <strong className="text-white">Example:</strong> <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">git diff origin/main...HEAD</code> shows only what the developer changed, not changes that happened in main after they branched.
          </p>

          <p className="text-slate-300 mb-2">
            <strong className="text-white">Two Dots (<code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">A..B</code>):</strong> Direct comparison. Shows all differences between the two branch tips, including unrelated changes that happened in the base branch after branching (drift).
          </p>
          <p className="text-slate-300 text-sm">
            <strong className="text-white">Example:</strong> <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">git diff origin/main..HEAD</code> shows all differences, potentially including files the developer didn't touch.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">Clone Depth Impact</h3>
          
          <p className="text-slate-300 mb-4">
            CI environments often use shallow clones (<code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">depth=1</code>) for performance. This affects which diff strategy works:
          </p>

          <p className="text-slate-300 mb-2">
            <strong className="text-white">Full Clone or Sufficient Depth:</strong>
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4 mb-4">
            <li>Three-dot diff works perfectly - shows only developer's changes</li>
            <li>Merge base can be calculated: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">git merge-base origin/main HEAD</code></li>
            <li>This is the preferred strategy for PR/MR reviews</li>
          </ul>

          <p className="text-slate-300 mb-2">
            <strong className="text-white">Shallow Clone (depth=1):</strong>
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4 mb-4">
            <li>Three-dot diff may fail if merge base isn't available locally</li>
            <li>Threadline falls back to two-dot diff (direct comparison)</li>
            <li>May include drift from main, but provides working diff instead of crashing</li>
            <li>A warning is logged when fallback occurs</li>
          </ul>

          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
            <p className="text-yellow-200 text-sm">
              <strong>Note:</strong> Threadline always tries three-dot diff first (merge-base). If it fails due to shallow clone limitations, it automatically falls back to two-dot diff. This ensures checks always run, even if the diff includes some unrelated changes.
            </p>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">Context-Specific Strategies</h3>
          
          <p className="text-slate-300 mb-2">
            <strong className="text-white">PR/MR Context:</strong>
          </p>
          <ol className="list-decimal list-inside text-slate-300 space-y-2 ml-4 mb-4">
            <li>Fetch target branch: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">git fetch origin &#123;targetBranch&#125;</code></li>
            <li>Find merge base: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">git merge-base origin/&#123;targetBranch&#125; HEAD</code></li>
            <li>Try three-dot diff: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">git diff origin/&#123;targetBranch&#125;...HEAD</code></li>
            <li>If that fails, fallback to two-dot: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">git diff origin/&#123;targetBranch&#125;..HEAD</code></li>
          </ol>

          <p className="text-slate-300 mb-2">
            <strong className="text-white">Commit/Push Context:</strong>
          </p>
          <ol className="list-decimal list-inside text-slate-300 space-y-2 ml-4 mb-2">
            <li>Extract parent SHA using plumbing: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">git cat-file -p HEAD</code></li>
            <li>Fetch parent commit: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">git fetch origin &#123;parentSha&#125; --depth=1</code></li>
            <li>Compare using two-dot: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">git diff &#123;parentSha&#125;..HEAD</code></li>
          </ol>
          <p className="text-slate-300 text-sm">
            Uses plumbing commands to work reliably in shallow clones. Two-dot is appropriate here since we're comparing a commit to its parent.
          </p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Local Development</h2>
        
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">Default: Staged/Unstaged Changes</h3>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">When:</strong> Running <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">threadlines check</code> locally without flags
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">What's included:</strong> Staged changes (if any), otherwise unstaged changes
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">How:</strong> 
          </p>
          <ul className="list-disc list-inside text-slate-300 ml-4 mb-2">
            <li>Priority 1: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">git diff --cached</code> (staged changes)</li>
            <li>Priority 2: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">git diff</code> (unstaged changes)</li>
          </ul>
          <p className="text-slate-300">
            This allows you to review what you've staged before committing, or review unstaged changes if nothing is staged. 
            Perfect for catching issues before they reach your CI pipeline.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">Flags for Specific Contexts</h3>
          
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">--commit &lt;ref&gt;</code> - Review a specific commit. Extracts parent SHA using <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">git cat-file -p &lt;ref&gt;</code>, fetches parent, then compares <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">git diff &lt;parentSha&gt;..&lt;ref&gt;</code></li>
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">--file &lt;path&gt;</code> - Review entire file (all lines as additions). Creates artificial diff in git diff format. Populates repo name and author from git config.</li>
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">--folder &lt;path&gt;</code> - Review all files in folder recursively. Reads all files in folder and creates combined diff. Populates repo name and author from git config.</li>
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">--files &lt;paths...&gt;</code> - Review multiple specified files. Reads multiple files and creates combined diff. Populates repo name and author from git config.</li>
          </ul>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Understanding Your Test Coverage</h2>
        
        <p className="text-slate-300 mb-4">
          The diff detection strategy directly impacts what your threadlines test:
        </p>

        <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4 mb-4">
          <li><strong className="text-white">PR/MR context:</strong> Tests all changes that will be merged (using merge-base to exclude drift from main), giving you complete coverage of the feature</li>
          <li><strong className="text-white">Push (no PR/MR):</strong> Tests the last commit only - for full branch coverage, create a PR/MR</li>
          <li><strong className="text-white">Local (staged/unstaged):</strong> Tests your work-in-progress, catching issues before commit</li>
          <li><strong className="text-white">Local flags:</strong> <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">--commit</code>, <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">--file</code>, <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">--folder</code>, <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">--files</code> provide specific review contexts</li>
        </ul>

        <p className="text-slate-300 mb-4">
          Each threadline filters the diff to only include files matching its patterns. This means:
        </p>

        <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
          <li>A threadline for <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">*.ts</code> files won't see changes to <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">*.md</code> files</li>
          <li>If no files match a threadline's patterns, that threadline is marked as "not relevant"</li>
          <li>You can see exactly which files were sent to each threadline in the check details page</li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Context Lines</h2>
        
        <p className="text-slate-300 mb-4">
          Threadline requests 200 lines of context around each change (<code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">-U200</code>) 
          to give the LLM sufficient surrounding code for accurate analysis. The diff viewer in the UI shows only 
          the changes by default, with an option to expand and see the full context.
        </p>
      </section>
    </div>
  );
}

