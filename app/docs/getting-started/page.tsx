export default function GettingStarted() {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 md:p-12">
      <h1 className="text-4xl font-medium mb-6 text-white">Getting Started</h1>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Installation</h2>
        
        <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-300">Option 1: Global Installation</h3>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>npm install -g threadlines</code>
        </pre>
        <p className="text-slate-300 mb-4">Then use directly: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">threadlines check</code></p>

        <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-300">Option 2: Use with npx</h3>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>npx threadlines check</code>
        </pre>
        <p className="text-slate-300 mb-4">
          <strong className="text-white">For AI assistants (Cursor, GitHub Copilot):</strong> Use <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">npx --yes threadlines check</code> to avoid confirmation prompts.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-300">Option 3: Project Dependency</h3>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>npm install --save-dev threadlines</code>
        </pre>
        <p className="text-slate-300 mb-4">Ensures consistent version across your team.</p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Quick Start</h2>
        
        <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-300">1. Initialize Your First Threadline</h3>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>npx threadlines init</code>
        </pre>
        <p className="text-slate-300 mb-4">
          This creates a <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">/threadlines</code> directory and generates a template file.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-300">2. Configure Your API Key</h3>
        <p className="text-slate-300 mb-4">
          Create a <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">.env.local</code> file in your project root:
        </p>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>{`THREADLINE_API_KEY=your-api-key-here
THREADLINE_ACCOUNT=your-email@example.com`}</code>
        </pre>
        <p className="text-slate-300 mb-4">
          <strong className="text-white">Important:</strong> Add <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">.env.local</code> to your <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">.gitignore</code>.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-300">3. Edit Your Threadline</h3>
        <p className="text-slate-300 mb-4">
          Edit <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">threadlines/example.md</code> with your coding standards, then rename it to something descriptive (e.g., <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">error-handling.md</code>).
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-300">4. Run Your First Check</h3>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>npx threadlines check</code>
        </pre>
        <p className="text-slate-300 mb-4">
          Threadline will analyze your git changes against all threadlines in the <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">/threadlines</code> directory.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Self-Hosting</h2>
        <p className="text-slate-300 mb-4">
          Want to run your own Threadline server? The codebase is open source. See the{" "}
          <a href="https://github.com/ngrootscholten/threadline" className="text-green-400 hover:text-green-300 underline" target="_blank" rel="noopener noreferrer">
            GitHub repository
          </a>{" "}
          for setup instructions.
        </p>
      </section>
    </div>
  );
}

