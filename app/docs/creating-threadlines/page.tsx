export default function CreatingThreadlines() {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 md:p-12">
      <h1 className="text-4xl font-bold mb-6 text-white">Creating Threadlines</h1>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Threadline Format</h2>
        <p className="text-slate-300 mb-4">
          Each threadline is a markdown file with YAML frontmatter. Place them in a <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">/threadlines</code> directory in your repository root.
        </p>
        
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>{`---
id: unique-threadline-id
version: 1.0.0
patterns:
  - "**/api/**"
  - "**/*.ts"
context_files:
  - "path/to/context-file.ts"
---

# Your Threadline Title

Your guidelines and standards here...`}</code>
        </pre>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Required Fields</h2>
        <ul className="list-disc list-inside mb-4 text-slate-300 space-y-2 ml-4">
          <li><strong className="text-white">id</strong>: Unique identifier (e.g., <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">sql-queries</code>, <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">error-handling</code>)</li>
          <li><strong className="text-white">version</strong>: Semantic version (e.g., <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">1.0.0</code>)</li>
          <li><strong className="text-white">patterns</strong>: Array of glob patterns matching files to check (e.g., <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">["**/api/**", "**/*.ts"]</code>)</li>
          <li><strong className="text-white">Body</strong>: Markdown content describing your standards</li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Optional Fields</h2>
        <ul className="list-disc list-inside mb-4 text-slate-300 space-y-2 ml-4">
          <li><strong className="text-white">context_files</strong>: Array of file paths that provide context (always included, even if unchanged)</li>
        </ul>
        <p className="text-slate-300 mb-4">
          Context files are useful when your threadline needs to reference other files. For example, SQL query standards might reference your database schema file.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Pattern Matching</h2>
        <p className="text-slate-300 mb-4">
          Patterns use glob syntax. Common patterns:
        </p>
        <ul className="list-disc list-inside mb-4 text-slate-300 space-y-2 ml-4">
          <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">**/*.ts</code> - All TypeScript files</li>
          <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">**/api/**</code> - All files in api directories</li>
          <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">**/*.sql</code> - All SQL files</li>
          <li><code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">src/components/**/*.tsx</code> - React components in src/components</li>
        </ul>
        <p className="text-slate-300 mb-4">
          <strong className="text-white">Remember:</strong> Threadlines only run on files that match their patterns. If a file doesn't match any pattern, it won't be checked.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Writing Effective Threadlines</h2>
        <ul className="list-disc list-inside mb-4 text-slate-300 space-y-2 ml-4">
          <li><strong className="text-white">Be specific:</strong> Focus on one concern per threadline</li>
          <li><strong className="text-white">Provide examples:</strong> Include good and bad examples in your markdown</li>
          <li><strong className="text-white">Explain why:</strong> Help developers understand the reasoning behind the standard</li>
          <li><strong className="text-white">Keep it focused:</strong> Each threadline should check one thing well</li>
        </ul>
      </section>
    </div>
  );
}

