export default function UsingCLI() {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 md:p-12">
      <h1 className="text-4xl font-bold mb-6 text-white">Using the CLI</h1>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Basic Usage</h2>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>threadlines check</code>
        </pre>
        <p className="text-slate-300 mb-4">
          <strong className="text-white">Using npx?</strong> For non-interactive environments (CI/CD, AI assistants), use: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">npx --yes threadlines check</code>
        </p>
        <p className="text-slate-300 mb-4">
          By default, Threadline auto-detects your environment:
        </p>
        <ul className="list-disc list-inside mb-4 text-slate-300 space-y-2 ml-4">
          <li><strong className="text-white">CI with branch:</strong> Reviews all commits in the branch vs base</li>
          <li><strong className="text-white">CI without branch:</strong> Reviews the specific commit</li>
          <li><strong className="text-white">Local development:</strong> Reviews staged/unstaged changes</li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Review Options</h2>
        
        <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-300">Review a Branch</h3>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>threadlines check --branch feature/new-feature</code>
        </pre>
        <p className="text-slate-300 mb-4">
          Reviews all commits in the branch cumulatively (later commits can fix earlier violations).
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-300">Review a Commit</h3>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>threadlines check --commit abc123def</code>
        </pre>
        <p className="text-slate-300 mb-4">
          Reviews a specific commit in isolation.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-300">Review a File</h3>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>threadlines check --file src/api/users.ts</code>
        </pre>
        <p className="text-slate-300 mb-4">
          Reviews the entire file (all lines treated as additions). Useful for onboarding new threadlines to existing files.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-300">Review a Folder</h3>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>threadlines check --folder src/api</code>
        </pre>
        <p className="text-slate-300 mb-4">
          Reviews all files in the folder recursively.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-300">Review Multiple Files</h3>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>threadlines check --files src/file1.ts src/file2.ts</code>
        </pre>
        <p className="text-slate-300 mb-4">
          Reviews multiple specified files.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Result Filtering</h2>
        <p className="text-slate-300 mb-4">
          By default, Threadline only shows items that need attention. Use the <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">--full</code> flag to see all results:
        </p>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>threadlines check --full</code>
        </pre>
        <p className="text-slate-300 mb-4">
          This shows compliant, attention, and not_relevant items. Can be combined with any review option:
        </p>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>threadlines check --branch feature/x --full</code>
        </pre>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Exit Codes</h2>
        <p className="text-slate-300 mb-4">
          Threadline uses exit codes for CI/CD integration:
        </p>
        <ul className="list-disc list-inside mb-4 text-slate-300 space-y-2 ml-4">
          <li><strong className="text-white">0:</strong> All checks passed (no attention items)</li>
          <li><strong className="text-white">1:</strong> One or more attention items found</li>
        </ul>
        <p className="text-slate-300 mb-4">
          Use this in your CI/CD pipelines to fail builds when standards aren't met.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Other Options</h2>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>threadlines check --api-url http://your-server.com</code>
        </pre>
        <p className="text-slate-300 mb-4">
          Override the default server URL (default: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">http://localhost:3000</code>).
        </p>
      </section>
    </div>
  );
}

