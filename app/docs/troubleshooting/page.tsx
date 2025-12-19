export default function Troubleshooting() {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 md:p-12">
      <h1 className="text-4xl font-bold mb-6 text-white">Troubleshooting</h1>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Common Errors</h2>
        
        <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-300">THREADLINE_API_KEY is required</h3>
        <p className="text-slate-300 mb-4">
          Make sure you've created a <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">.env.local</code> file with your API key, or set it as an environment variable.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-300">THREADLINE_ACCOUNT is required</h3>
        <p className="text-slate-300 mb-4">
          Add <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">THREADLINE_ACCOUNT</code> to your <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">.env.local</code> file or environment variables.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-300">No valid threadlines found</h3>
        <p className="text-slate-300 mb-4">
          Run <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">npx threadlines init</code> to create your first threadline, or check that your <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">/threadlines</code> directory contains valid markdown files.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-300">Network error: Could not reach Threadline server</h3>
        <p className="text-slate-300 mb-4">
          Check that <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">THREADLINE_API_URL</code> is correct, or use <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">--api-url</code> flag to specify the server URL.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-300">Invalid API key</h3>
        <p className="text-slate-300 mb-4">
          Verify your <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">THREADLINE_API_KEY</code> is correct and matches the server configuration.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Debug Tips</h2>
        <ul className="list-disc list-inside mb-4 text-slate-300 space-y-2 ml-4">
          <li>Use <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">--full</code> flag to see all results, not just attention items</li>
          <li>Check that your threadline patterns match the files you're changing</li>
          <li>Verify context files exist if your threadline references them</li>
          <li>Ensure your git repository is initialized and has changes to review</li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Pattern Matching Issues</h2>
        <p className="text-slate-300 mb-4">
          If a threadline isn't running on files you expect:
        </p>
        <ul className="list-disc list-inside mb-4 text-slate-300 space-y-2 ml-4">
          <li>Verify the glob pattern matches your file paths</li>
          <li>Remember patterns are relative to repository root</li>
          <li>Test patterns with tools like <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">globtester.com</code></li>
          <li>Check that file paths in your diff match the pattern</li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">CI/CD Issues</h2>
        <p className="text-slate-300 mb-4">
          If auto-detection isn't working in CI:
        </p>
        <ul className="list-disc list-inside mb-4 text-slate-300 space-y-2 ml-4">
          <li>Verify CI environment variables are set (check platform documentation)</li>
          <li>Use explicit flags (<code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">--branch</code>, <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">--commit</code>) if auto-detection fails</li>
          <li>Check that git repository is properly initialized in CI environment</li>
          <li>Ensure environment variables are set as secrets, not plain text</li>
        </ul>
      </section>
    </div>
  );
}

