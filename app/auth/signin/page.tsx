"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
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
        <h1 className="text-3xl font-bold mb-2 text-white">Sign in to Threadline</h1>
        <p className="text-slate-400 mb-8">
          Enter your email and we'll send you a magic link to sign in.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-950/50 border border-red-800 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="you@example.com"
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
          By continuing, you agree to Threadline's terms of service.
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

