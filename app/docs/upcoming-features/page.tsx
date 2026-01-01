import Link from "next/link";

export default function UpcomingFeatures() {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 md:p-12">
      <h1 className="text-4xl font-bold mb-6 text-white">Upcoming Features</h1>

      <section className="mb-12">
        <p className="text-slate-300 mb-4">
          We're constantly working on new features to make Threadline more powerful and useful. 
          Here's what's coming soon:
        </p>
      </section>

      <section className="mb-12">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-3 text-yellow-400">🚧 Violation Fix Detection</h2>
          <p className="text-slate-300 mb-4">
            We're working on an automated system that detects when threadline violations are fixed between consecutive checks. 
            This will help track fix effectiveness and provide insights into how quickly violations are addressed.
          </p>
          <p className="text-slate-300 mb-4">
            The system will automatically analyze previous violations against current code changes to determine if fixes occurred, 
            and track metrics like average time-to-fix and fix type distribution.
          </p>
          <p className="text-slate-300 mb-4">
            <strong className="text-white">Key capabilities:</strong>
          </p>
          <ul className="list-disc list-inside mb-4 text-slate-300 space-y-2 ml-4">
            <li>Automatic detection of fixes between consecutive checks</li>
            <li>Support for local, branch, and PR contexts</li>
            <li>Detection of three fix types: code changes, threadline modifications, and threadline deletions</li>
            <li>Analytics on fix effectiveness and time-to-fix metrics</li>
          </ul>
          <p className="text-slate-400 text-sm">
            <a 
              href="/docs/fix-detection-design" 
              className="text-green-400 hover:text-green-300 underline"
            >
              View Design Document →
            </a>
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-3 text-yellow-400">👥 Account/Customer Entity</h2>
          <p className="text-slate-300 mb-4">
            We're introducing an Account entity to enable team collaboration. This will allow multiple engineers to share 
            a codebase and view the same threadline checks, while maintaining proper access control.
          </p>
          <p className="text-slate-300 mb-4">
            The Account will own the API key and account identifier, enabling teams to use a single shared API key 
            instead of individual per-user keys. This makes Threadline more suitable for team environments and provides 
            a foundation for team-wide dashboard statistics.
          </p>
          <p className="text-slate-300 mb-4">
            <strong className="text-white">Key capabilities:</strong>
          </p>
          <ul className="list-disc list-inside mb-4 text-slate-300 space-y-2 ml-4">
            <li>Account-level API keys (shared across team members)</li>
            <li>Multiple users per account (team collaboration)</li>
            <li>Account-scoped dashboard statistics (team-wide metrics)</li>
            <li>Foundation for future team features (invitations, roles, billing)</li>
            <li>Backward compatibility during migration period</li>
          </ul>
          <p className="text-slate-400 text-sm">
            <a 
              href="/docs/account-entity-design" 
              className="text-green-400 hover:text-green-300 underline"
            >
              View Design Document →
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}

