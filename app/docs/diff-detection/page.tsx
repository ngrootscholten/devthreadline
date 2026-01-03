export default function DiffDetection() {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 md:p-12">
      <h1 className="text-4xl font-medium mb-6 text-white">How Threadline Detects Code Changes</h1>

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
          GitHub Actions provides rich context about PRs and branch pushes. Threadline handles four scenarios:
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
          <h3 className="text-xl font-semibold mb-3 text-slate-200">2. Merge Commit to Default Branch</h3>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">When:</strong> Push event to default branch (e.g., <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">main</code>), merge commit
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">What's included:</strong> All changes that were merged in
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">How:</strong> Compares <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">origin/default~1...origin/default</code>
          </p>
          <p className="text-slate-300">
            This captures all changes introduced by the merge, ensuring threadlines validate everything that entered the default branch.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">3. Feature Branch Push</h3>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">When:</strong> Push event to a feature branch (not default branch)
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">What's included:</strong> Cumulative changes in feature branch vs default branch
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">How:</strong> Compares <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">origin/default...origin/&#123;GITHUB_REF_NAME&#125;</code>
          </p>
          <p className="text-slate-300">
            This shows all commits in the feature branch compared to the default branch, giving you full branch-level coverage.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">4. Direct Commit to Default Branch</h3>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">When:</strong> Push event to default branch, non-merge commit
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">What's included:</strong> Changes in the direct commit
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">How:</strong> Compares <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">origin/default~1...origin/default</code>
          </p>
          <p className="text-slate-300">
            This validates direct commits to the default branch, ensuring even hotfixes are checked.
          </p>
        </div>

        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 mt-4">
          <p className="text-yellow-200 text-sm">
            <strong>Note:</strong> Default branch detection uses <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs">GITHUB_EVENT_PATH</code> 
            to read <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs">repository.default_branch</code>, 
            so it works even if your default branch isn't named "main".
          </p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">GitLab CI</h2>
        
        <p className="text-slate-300 mb-4">
          GitLab CI performs shallow clones (only the current branch), so Threadline fetches additional branches on-demand when needed.
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
          <h3 className="text-xl font-semibold mb-3 text-slate-200">2. Feature Branch Push</h3>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">When:</strong> Push to feature branch (<code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">CI_COMMIT_REF_NAME != CI_DEFAULT_BRANCH</code>)
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">What's included:</strong> Cumulative changes in feature branch vs default branch
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">How:</strong> Fetches default branch, then compares <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">origin/&#123;CI_DEFAULT_BRANCH&#125;...origin/&#123;CI_COMMIT_REF_NAME&#125;</code>
          </p>
          <p className="text-slate-300">
            The default branch is fetched on-demand for comparison, ensuring you see all changes relative to main.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">3. Default Branch Push</h3>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">When:</strong> Push to default branch (<code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">CI_COMMIT_REF_NAME == CI_DEFAULT_BRANCH</code>)
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">What's included:</strong> Changes in the last commit
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-white">How:</strong> Compares <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">HEAD~1...HEAD</code>
          </p>
          <p className="text-slate-300">
            No fetch needed since we're already on the default branch. This shows the changes in the most recent commit.
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
          <li><strong className="text-white">Branch pushes:</strong> Tests cumulative changes in the branch vs default, showing the full scope of work</li>
          <li><strong className="text-white">Commit-level (Vercel, direct commits):</strong> Tests individual commits, useful for validating specific changes</li>
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

