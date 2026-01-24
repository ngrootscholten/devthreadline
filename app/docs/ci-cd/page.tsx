export default function CICD() {
  const githubActionsExample = [
    "- name: Run Threadline checks",
    "  run: npx --yes threadlines check --debug",
    "  env:",
    "    THREADLINE_ACCOUNT: ${{ secrets.THREADLINE_ACCOUNT }}",
    "    THREADLINE_API_KEY: ${{ secrets.THREADLINE_API_KEY }}"
  ].join("\n");

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
      <h1 className="text-4xl font-medium mb-3 text-white">CI/CD Integration</h1>

      <section className="mb-12">
        <p className="text-slate-300 mb-4">
          Threadline automatically detects CI environments and uses platform-specific environment variables to determine context. 
          No configuration needed - just run <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">npx --yes threadlines check --debug</code>.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">CI Platform Setup</h2>
        
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 mb-3">
          <p className="text-slate-300 text-sm mb-1"><strong className="text-white">GitHub Actions:</strong> <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs">npx --yes threadlines check --debug</code></p>
          <p className="text-slate-300 text-xs">Variables: <code className="bg-slate-800 px-1 py-0.5 rounded">GITHUB_EVENT_NAME</code>, <code className="bg-slate-800 px-1 py-0.5 rounded">GITHUB_BASE_REF</code>, <code className="bg-slate-800 px-1 py-0.5 rounded">GITHUB_REF_NAME</code>, <code className="bg-slate-800 px-1 py-0.5 rounded">GITHUB_SHA</code></p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 mb-3">
          <p className="text-slate-300 text-sm mb-1"><strong className="text-white">GitLab CI:</strong> <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs">npx --yes threadlines check --debug</code></p>
          <p className="text-slate-300 text-xs">Variables: <code className="bg-slate-800 px-1 py-0.5 rounded">CI_MERGE_REQUEST_IID</code>, <code className="bg-slate-800 px-1 py-0.5 rounded">CI_MERGE_REQUEST_TARGET_BRANCH_NAME</code>, <code className="bg-slate-800 px-1 py-0.5 rounded">CI_COMMIT_REF_NAME</code>, <code className="bg-slate-800 px-1 py-0.5 rounded">CI_COMMIT_SHA</code></p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 mb-3">
          <p className="text-slate-300 text-sm mb-1"><strong className="text-white">Bitbucket Pipelines:</strong> <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs">npx --yes threadlines check --debug</code></p>
          <p className="text-slate-300 text-xs">Variables: <code className="bg-slate-800 px-1 py-0.5 rounded">BITBUCKET_PR_ID</code>, <code className="bg-slate-800 px-1 py-0.5 rounded">BITBUCKET_PR_DESTINATION_BRANCH</code>, <code className="bg-slate-800 px-1 py-0.5 rounded">BITBUCKET_BRANCH</code>, <code className="bg-slate-800 px-1 py-0.5 rounded">BITBUCKET_COMMIT</code></p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 mb-3">
          <p className="text-slate-300 text-sm mb-1"><strong className="text-white">Vercel:</strong> <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs">npx --yes threadlines check --debug</code></p>
          <p className="text-slate-300 text-xs">Variables: <code className="bg-slate-800 px-1 py-0.5 rounded">VERCEL_GIT_COMMIT_REF</code>, <code className="bg-slate-800 px-1 py-0.5 rounded">VERCEL_GIT_COMMIT_SHA</code></p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Required Environment Variables</h2>
        <ul className="list-disc list-inside mb-4 text-slate-300 space-y-2 ml-4">
          <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">THREADLINE_ACCOUNT</code> - Your account identifier (email)</li>
          <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">THREADLINE_API_KEY</code> - Your API key for authentication</li>
        </ul>
        <p className="text-slate-300 mb-4">
          Set these as secrets/environment variables in your CI/CD platform. Get your credentials at <a href="https://devthreadline.com/settings" className="text-green-400 hover:underline">devthreadline.com/settings</a>.
        </p>
        <p className="text-slate-300 mb-4">
          To customize the API URL, create a <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">.threadlinerc</code> file in your project root (see Configuration documentation).
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">CLI Flags</h2>
        
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">Required in CI/CD</h3>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">--yes</code> or <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">-y</code> - Auto-confirms package installation (prevents prompts that block automation)</li>
          </ul>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">Recommended in CI/CD</h3>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">--debug</code> - Enable verbose debug logging for troubleshooting</li>
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">--full</code> - Show all results (compliant, attention, not_relevant) instead of only attention items</li>
          </ul>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold mb-3 text-slate-200">Ignored in CI/CD</h3>
          <p className="text-slate-300 mb-2">
            These flags are for local development only and are ignored in CI environments with a warning:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">--commit</code> - CI uses auto-detected commit context</li>
            <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">--file</code>, <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">--folder</code>, <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">--files</code> - CI uses auto-detected diff context</li>
          </ul>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Review Context Types</h2>
        <p className="text-slate-300 mb-4">
          Threadline assigns a review context type to each check, visible in the dashboard:
        </p>
        <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
          <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">pr</code> - Pull Request/Merge Request (auto-detected in CI)</li>
          <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">commit</code> - Specific commit (auto-detected in CI push, or <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">--commit</code> flag locally)</li>
          <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">local</code> - Staged/unstaged changes (default for local development)</li>
          <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">file</code> - Single file (<code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">--file</code> flag, local only)</li>
          <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">folder</code> - Folder contents (<code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">--folder</code> flag, local only)</li>
          <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">files</code> - Multiple files (<code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">--files</code> flag, local only)</li>
        </ul>
      </section>
    </div>
  );
}
