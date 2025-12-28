"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  // Show loading or redirecting state
  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  // If authenticated, we're redirecting (component will unmount)
  if (status === "authenticated") {
    return null;
  }

  // Show the public landing page for unauthenticated users
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-green-950/20 to-slate-900/40"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-green-400 to-green-500 bg-clip-text text-transparent leading-tight">
              Code standards that teach themselves
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-12 leading-relaxed">
              AI-powered code checks with parallel execution, and full auditability.
              Define your rules or principles - your choice. Your codebase, your control.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                href="/auth/signup"
                className="px-8 py-4 bg-green-400 text-black font-semibold rounded-lg hover:bg-green-500 transition-all shadow-lg shadow-green-500/25"
              >
                Get Started
              </Link>
              <Link
                href="/product"
                className="px-8 py-4 border border-slate-700 text-slate-300 font-semibold rounded-lg hover:border-slate-600 hover:text-white transition-all"
              >
                How It Works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-8 text-center">The Gap in Modern Tooling</h2>
          <p className="text-xl text-slate-300 mb-12 text-center leading-relaxed">
            Writing code is faster than ever, but <strong className="text-white">verifying it requires new techniques</strong>.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/50 hover:-translate-y-1 transition-all duration-200">
              <h3 className="text-xl font-semibold mb-2">Documentation</h3>
              <p className="text-slate-400">Nobody reads it. Or it's outdated before you finish writing it.</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/50 hover:-translate-y-1 transition-all duration-200">
              <h3 className="text-xl font-semibold mb-2">Linting</h3>
              <p className="text-slate-400">Catches syntax errors, but misses important nuance.</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/50 hover:-translate-y-1 transition-all duration-200">
              <h3 className="text-xl font-semibold mb-2">AI Code Reviewers</h3>
              <p className="text-slate-400">Powerful, but you can't audit them. Did they actually check each important thing you care about?</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/50 hover:-translate-y-1 transition-all duration-200">
              <h3 className="text-xl font-semibold mb-2">Team Ramp Up Time</h3>
              <p className="text-slate-400">Nuanced strategies and patterns for avoiding problems typically only live inside senior engineers' minds. Ramp-up times are long.</p>
            </div>
          </div>
        </div>
      </section>

{/* Solution Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 bg-gradient-to-b from-transparent to-slate-950/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-8 text-center">The Solution</h2>
          <p className="text-xl text-slate-300 mb-12 text-center leading-relaxed">
            <strong className="text-white">Threadline</strong> guides you to structure <strong className="text-white">active documentation</strong> right inside your repository, alongside your code. We then execute massively parallel AI-powered code checks, each focused on a single, specific concern, with <strong className="text-green-400">full auditability</strong> to ensure trustworthy results.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-slate-900/50 border border-green-900/30 rounded-xl p-6 hover:border-green-600 hover:shadow-lg hover:shadow-green-500/20 hover:-translate-y-1 transition-all duration-200">
              <h3 className="text-xl font-semibold mb-2">Focused AI Checks</h3>
              <p className="text-slate-400">Instead of one AI trying to check everything, Threadline runs multiple specialized checks in parallel. Each threadline focuses on one thing and does it well.</p>
            </div>
            <div className="bg-slate-900/50 border border-green-900/30 rounded-xl p-6 hover:border-green-600 hover:shadow-lg hover:shadow-green-500/20 hover:-translate-y-1 transition-all duration-200">
              <h3 className="text-xl font-semibold mb-2">Documentation That Lives With Your Code</h3>
              <p className="text-slate-400">Your coding standards live in your repo, in a <code className="bg-slate-800 px-2 py-1 rounded text-sm">/threadlines</code> folder. Each threadline is version-controlled, reviewable, and always in sync with your codebase.</p>
            </div>
            <div className="bg-gradient-to-br from-green-950/30 to-slate-900/50 border border-green-600/50 rounded-xl p-6 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20 hover:-translate-y-1 transition-all duration-200">
              <h3 className="text-xl font-semibold mb-2 text-green-400">Fully Auditable</h3>
              <p className="text-slate-300">Every AI review decision is logged and traceable. You can see exactly what was checked, why it passed or failed, and have confidence in the results. Creates a deterministic audit trail of code quality decisions.</p>
            </div>
            <div className="bg-slate-900/50 border border-green-900/30 rounded-xl p-6 hover:border-green-600 hover:shadow-lg hover:shadow-green-500/20 hover:-translate-y-1 transition-all duration-200">
              <h3 className="text-xl font-semibold mb-2">Fast & Parallel</h3>
              <p className="text-slate-400">Threadlines run as part of your local or CI build process, giving you immediate feedback and confidence. Multiple checks execute simultaneously, delivering comprehensive results in seconds - not minutes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-24">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center text-slate-500">
            <p>Threadline - Active Documentation, Parallel AI Checks, and Full Auditability</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
