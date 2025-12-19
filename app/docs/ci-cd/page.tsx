export default function CICD() {
  const githubActionsExample = [
    "- name: Run Threadline checks",
    "  run: npx threadlines check",
    "  env:",
    "    THREADLINE_ACCOUNT: ${{ secrets.THREADLINE_ACCOUNT }}",
    "    THREADLINE_API_KEY: ${{ secrets.THREADLINE_API_KEY }}",
    "    THREADLINE_API_URL: ${{ secrets.THREADLINE_API_URL }}"
  ].join("\n");

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 md:p-12">
      <h1 className="text-4xl font-bold mb-6 text-white">CI/CD Integration</h1>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Auto-Detection</h2>
        <p className="text-slate-300 mb-4">
          Threadline automatically detects CI environments and adjusts behavior:
        </p>
        <ul className="list-disc list-inside mb-4 text-slate-300 space-y-2 ml-4">
          <li><strong className="text-white">Branch detected:</strong> Reviews all commits in branch vs base (cumulative)</li>
          <li><strong className="text-white">Commit SHA detected:</strong> Reviews the specific commit</li>
          <li><strong className="text-white">Local development:</strong> Reviews staged/unstaged changes</li>
        </ul>
        <p className="text-slate-300 mb-4">
          No configuration needed - just run <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">threadlines check</code>.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">GitHub Actions</h2>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>{githubActionsExample}</code>
        </pre>
        <p className="text-slate-300 mb-4">
          Threadline auto-detects <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">GITHUB_REF_NAME</code> (branch) or <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">GITHUB_SHA</code> (commit).
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">GitLab CI</h2>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>{`threadline_check:
  script:
    - npx threadlines check
  variables:
    THREADLINE_ACCOUNT: $THREADLINE_ACCOUNT
    THREADLINE_API_KEY: $THREADLINE_API_KEY
    THREADLINE_API_URL: $THREADLINE_API_URL`}</code>
        </pre>
        <p className="text-slate-300 mb-4">
          Threadline auto-detects <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">CI_COMMIT_REF_NAME</code> (branch) or <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">CI_COMMIT_SHA</code> (commit).
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Vercel</h2>
        <p className="text-slate-300 mb-4">
          Add to your build command or <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">vercel.json</code>:
        </p>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>{`{
  "buildCommand": "npx threadlines check && npm run build"
}`}</code>
        </pre>
        <p className="text-slate-300 mb-4">
          Threadline auto-detects <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">VERCEL_GIT_COMMIT_REF</code> (branch) or <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">VERCEL_GIT_COMMIT_SHA</code> (commit).
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Required Environment Variables</h2>
        <ul className="list-disc list-inside mb-4 text-slate-300 space-y-2 ml-4">
          <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">THREADLINE_ACCOUNT</code> - Your account identifier (email, company name, etc.)</li>
          <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">THREADLINE_API_KEY</code> - Your API key for authentication</li>
          <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">THREADLINE_API_URL</code> - Server URL (if not using default)</li>
        </ul>
        <p className="text-slate-300 mb-4">
          Set these as secrets/environment variables in your CI/CD platform.
        </p>
      </section>
    </div>
  );
}
