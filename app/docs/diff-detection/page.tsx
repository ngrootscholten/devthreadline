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
        <p className="text-slate-300 mb-4">
          Each environment has a specific strategy optimized for that platform's capabilities and limitations.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">GitHub Actions</h2>
        
        <p className="text-slate-300 mb-4">
          GitHub Actions provides rich context about PRs and pushes. Threadline handles two scenarios:
        </p>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">1. Pull Request Context</h3>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">When:</strong> <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">GITHUB_EVENT_NAME="pull_request"</code>
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">What's included:</strong> All changes in the PR (target branch vs source branch)
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">How:</strong> Compares <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">origin/&#123;GITHUB_BASE_REF&#125;...origin/&#123;GITHUB_HEAD_REF&#125;</code>
          </p>
          <p className="text-slate-300">
            This shows the cumulative changes across all commits in the PR, giving you complete coverage of what's being merged.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">2. Push (No PR)</h3>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">When:</strong> Any push event without a PR (main branch, feature branch, etc.)
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">What's included:</strong> Changes in the last commit only
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">How:</strong> Compares <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">HEAD~1...HEAD</code>
          </p>
          <p className="text-slate-300">
            This validates the most recent commit. For full branch-level review, create a PR.
          </p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">GitLab CI</h2>
        
        <p className="text-slate-300 mb-4">
          GitLab CI performs shallow clones (only the current branch), so Threadline fetches additional branches on-demand when needed for MR context.
        </p>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">1. Merge Request Context</h3>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">When:</strong> <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">CI_MERGE_REQUEST_IID</code> is set
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">What's included:</strong> All changes in the MR (target branch vs source branch)
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">How:</strong> Fetches target branch, then compares <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">origin/&#123;CI_MERGE_REQUEST_TARGET_BRANCH_NAME&#125;...origin/&#123;CI_MERGE_REQUEST_SOURCE_BRANCH_NAME&#125;</code>
          </p>
          <p className="text-slate-300">
            The target branch is fetched on-demand since GitLab only clones the source branch by default.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">2. Push (No MR)</h3>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">When:</strong> Any push event without an MR (main branch, feature branch, etc.)
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">What's included:</strong> Changes in the last commit only
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">How:</strong> Compares <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">HEAD~1...HEAD</code>
          </p>
          <p className="text-slate-300">
            This validates the most recent commit. For full branch-level review, create a Merge Request.
          </p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Bitbucket Pipelines</h2>
        
        <p className="text-slate-300 mb-4">
          Bitbucket Pipelines with <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">depth: full</code> has full git history available.
        </p>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">1. Pull Request Context</h3>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">When:</strong> <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">BITBUCKET_PR_ID</code> is set
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">What's included:</strong> All changes in the PR (target branch vs source branch)
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">How:</strong> Compares <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">origin/&#123;BITBUCKET_PR_DESTINATION_BRANCH&#125;...HEAD</code>
          </p>
          <p className="text-slate-300">
            Bitbucket provides the target branch via <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">BITBUCKET_PR_DESTINATION_BRANCH</code>.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">2. Push (No PR)</h3>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">When:</strong> Any push event without a PR (main branch, feature branch, etc.)
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">What's included:</strong> Changes in the last commit only
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">How:</strong> Compares <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">HEAD~1...HEAD</code>
          </p>
          <p className="text-slate-300">
            This validates the most recent commit. For full branch-level review, create a Pull Request.
          </p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Vercel</h2>
        
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <p className="text-slate-300 mb-2">
            <strong className="text-white">When:</strong> Vercel build/deployment
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">What's included:</strong> Changes in the commit being deployed
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">How:</strong> Uses <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">git show &#123;VERCEL_GIT_COMMIT_SHA&#125;</code>
          </p>
          <p className="text-slate-300">
            Vercel provides the commit SHA being deployed via <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">VERCEL_GIT_COMMIT_SHA</code>. 
            Threadline shows the diff for that specific commit, validating what's being deployed.
          </p>
        </div>

        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 mt-4">
          <p className="text-yellow-200 text-sm">
            <strong>Note:</strong> Vercel's CI environment only provides the current commit context, not branch comparisons. 
            This means you'll see the commit-level changes, not cumulative branch changes.
          </p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Local Development</h2>
        
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <p className="text-slate-300 mb-2">
            <strong className="text-white">When:</strong> Running <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">threadlines check</code> locally
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
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Understanding Your Test Coverage</h2>
        
        <p className="text-slate-300 mb-4">
          The diff detection strategy directly impacts what your threadlines test:
        </p>

        <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4 mb-4">
          <li><strong className="text-white">PR/MR context:</strong> Tests all changes that will be merged, giving you complete coverage of the feature</li>
          <li><strong className="text-white">Push (no PR/MR):</strong> Tests the last commit only - for full branch coverage, create a PR/MR</li>
          <li><strong className="text-white">Local (staged/unstaged):</strong> Tests your work-in-progress, catching issues before commit</li>
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

