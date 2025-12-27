import Link from "next/link";

export default function Product() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-green-950/20 to-slate-900/40"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-green-400 to-green-500 bg-clip-text text-transparent leading-tight">
              How Threadline Works
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-12 leading-relaxed">
              An AI-powered linter based on your natural language documentation. Define your standards as rules or principles - your choice.
            </p>
          </div>
        </div>
      </section>

      {/* Flow Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold mb-16 text-center">The Flow</h2>

          {/* Step 1 */}
          <div className="mb-24">
            <div className="flex items-start gap-6 mb-8">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-white to-green-500 flex items-center justify-center text-xl font-bold text-black">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-3xl font-bold mb-4">Define Your Threadlines</h3>
                <p className="text-lg text-slate-300 mb-6">
                  Create a <code className="bg-slate-800 px-2 py-1 rounded text-sm">/threadlines</code> folder in your repository. Add markdown files ('threadlines') defining your team's coding standards. Each file is a single code quality standard or convention.
                </p>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 overflow-x-auto">
                  <div className="text-sm text-slate-400 mb-2">Example: <code className="text-slate-300">threadlines/feature-flags.md</code></div>
                  <pre className="text-slate-300"><code>{`# Feature Flag Standards

All feature flags must:
- Use our FeatureFlagService (not direct SDK calls)
- Include fallback behavior for when flags are unavailable
- Log flag evaluations to our analytics service`}</code></pre>
                </div>
                <p className="text-slate-400 mt-4 italic">
                  Your threadlines live with your code, get version-controlled, and evolve with your code base.
                </p>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="mb-24">
            <div className="flex items-start gap-6 mb-8">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-white to-green-500 flex items-center justify-center text-xl font-bold text-black">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-3xl font-bold mb-4">Run the Check</h3>
                <p className="text-lg text-slate-300 mb-6">
                  The <code className="bg-slate-800 px-2 py-1 rounded text-sm">npx threadline check</code> command runs in a few seconds from your local CLI and CI pipeline, validating your changes against your team's coding standards.
                </p>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                  <pre className="text-green-400"><code>{`npx threadline check`}</code></pre>
                </div>
                <p className="text-slate-400 mt-4 italic">
                  That's it. One command.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="mb-24">
            <div className="flex items-start gap-6 mb-8">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-white to-green-500 flex items-center justify-center text-xl font-bold text-black">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-3xl font-bold mb-4">Get Focused Feedback</h3>
                <p className="text-lg text-slate-300 mb-6">
                  The command returns simple status for each coding standard: compliant, needs attention, or not relevant. You only see the threadlines that require attention - no noise, just actionable feedback.
                </p>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 font-mono text-sm">
                  <div className="text-slate-300 mb-4">25 threadlines checked</div>
                  <div className="text-slate-400 mb-1 ml-4">8 not relevant</div>
                  <div className="text-green-400 mb-1 ml-4">16 compliant</div>
                  <div className="text-yellow-400 mb-2 ml-4">1 attention</div>
                  <div className="text-yellow-400 mb-2 mt-4">Feature Flag Threadline</div>
                  <div className="text-slate-300 ml-4 mb-1">src/api/users.ts:23 - Using direct SDK call instead of FeatureFlagService</div>
                  <div className="text-slate-300 ml-4">src/components/Header.tsx:67 - Missing fallback behavior when flag is unavailable</div>
                </div>
                <p className="text-slate-400 mt-4 italic">
                  Fix the issues, run <code className="bg-slate-800 px-1 py-0.5 rounded text-sm">threadline check</code> again, and iterate until everything passes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 bg-gradient-to-b from-transparent to-slate-950/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center">Why It Works</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/50 hover:-translate-y-1 transition-all duration-200">
              <h3 className="text-xl font-semibold mb-2">Focused AI Checks</h3>
              <p className="text-slate-400">Each threadline checks one thing. No AI trying to be everything to everyone.</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/50 hover:-translate-y-1 transition-all duration-200">
              <h3 className="text-xl font-semibold mb-2">Parallel & Fast</h3>
              <p className="text-slate-400">All threadlines run simultaneously. Get comprehensive feedback in seconds.</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/50 hover:-translate-y-1 transition-all duration-200">
              <h3 className="text-xl font-semibold mb-2">Fully Auditable</h3>
              <p className="text-slate-400">Every check is logged. Trace exactly what was reviewed and why.</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/50 hover:-translate-y-1 transition-all duration-200">
              <h3 className="text-xl font-semibold mb-2">Simple Configuration</h3>
              <p className="text-slate-400">Works out of the box. Just add your threadlines and run.</p>
            </div>
          </div>
        </div>
      </section>

      

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-24">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center text-slate-500">
            <p>Threadline - Code Quality That Actually Works</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

