"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Store name in a cookie if provided (will be read by NextAuth createUser event)
      if (name) {
        // Set cookie that expires in 24 hours (same as magic link)
        document.cookie = `pendingUserName=${encodeURIComponent(name)}; path=/; max-age=${24 * 60 * 60}; SameSite=Lax`;
      }

      // Use NextAuth's signIn function - handles CSRF tokens automatically
      // It will call our custom sendVerificationRequest (Postmark) automatically
      const result = await signIn("email", {
        email,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error || "Failed to send magic link");
        setIsLoading(false);
      } else {
        // Redirect to verify-email page
        router.push("/auth/verify-email?email=" + encodeURIComponent(email));
      }
    } catch (err: any) {
      setError(err.message || "Failed to send magic link");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
        <h1 className="text-3xl font-bold mb-2 text-white">Join Threadline</h1>
        <p className="text-slate-400 mb-8">
          Enter your email to get started
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-950/50 border border-red-800 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
              Full Name (Optional)
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Jane Smith"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
              Work Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="you@company.com"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full px-4 py-3 bg-green-400 text-black font-semibold rounded-lg hover:bg-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Sending magic link..." : "Continue with email"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-400 text-center">
          No password needed. We'll send you a secure link to sign in.
        </p>

        <p className="mt-6 text-sm text-slate-400 text-center">
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-green-400 hover:text-green-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center text-slate-500 text-sm">
        <Link href="/" className="text-slate-400 hover:text-white transition-colors">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}

