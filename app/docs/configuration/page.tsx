export default function Configuration() {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 md:p-12">
      <h1 className="text-4xl font-medium mb-6 text-white">Configuration</h1>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Environment Variables</h2>
        <p className="text-slate-300 mb-4">
          Threadline uses environment variables for configuration. Create a <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">.env.local</code> file in your project root:
        </p>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>{`# Required
THREADLINE_API_KEY=your-api-key-here
THREADLINE_ACCOUNT=your-email@example.com

# Optional
THREADLINE_API_URL=http://localhost:3000`}</code>
        </pre>
        <p className="text-slate-300 mb-4">
          <strong className="text-white">Important:</strong> Add <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">.env.local</code> to your <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">.gitignore</code>.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Required Variables</h2>
        <dl className="space-y-4">
          <div>
            <dt className="text-white font-semibold mb-1">THREADLINE_API_KEY</dt>
            <dd className="text-slate-300 ml-4">
              Your API key for authenticating with the Threadline server. Required for all operations.
            </dd>
          </div>
          <div>
            <dt className="text-white font-semibold mb-1">THREADLINE_ACCOUNT</dt>
            <dd className="text-slate-300 ml-4">
              Your account identifier (email, company name, etc.). Not secret, used for identification. Required for all operations.
            </dd>
          </div>
        </dl>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Optional Variables</h2>
        <dl className="space-y-4">
          <div>
            <dt className="text-white font-semibold mb-1">THREADLINE_API_URL</dt>
            <dd className="text-slate-300 ml-4">
              Server URL (default: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">http://localhost:3000</code>). Can also be set with <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">--api-url</code> flag.
            </dd>
          </div>
        </dl>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">CI/CD Configuration</h2>
        <p className="text-slate-300 mb-4">
          In CI/CD environments, set environment variables as secrets in your platform:
        </p>
        <ul className="list-disc list-inside mb-4 text-slate-300 space-y-2 ml-4">
          <li><strong className="text-white">GitHub Actions:</strong> Repository secrets</li>
          <li><strong className="text-white">GitLab CI:</strong> CI/CD variables</li>
          <li><strong className="text-white">Vercel:</strong> Environment variables</li>
        </ul>
        <p className="text-slate-300 mb-4">
          Never commit API keys to your repository. Always use platform secrets management.
        </p>
      </section>
    </div>
  );
}


