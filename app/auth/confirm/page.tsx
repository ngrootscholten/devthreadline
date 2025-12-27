"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function ConfirmPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const handleConfirm = () => {
    if (!token || !email) {
      setError("Missing verification token or email. Please check your email and try the link again.");
      return;
    }

    setLoading(true);
    
    // Simply redirect to NextAuth's callback endpoint
    // NextAuth will handle token verification, user creation, and session setup
    window.location.href = `/api/auth/callback/email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  };

  if (error && !token) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-2 text-white">Verification failed</h1>
            <p className="text-slate-400 mb-4">{error}</p>
          </div>

          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="block w-full px-4 py-3 bg-green-400 text-black font-semibold rounded-lg hover:bg-green-500 transition-all"
            >
              Request new magic link
            </Link>
            <Link
              href="/"
              className="block w-full px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:border-slate-600 hover:text-white transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show button-click confirmation page
  return (
    <div className="w-full max-w-md">
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2 text-white">Confirm your email</h1>
          <p className="text-slate-400 mb-2">
            Click the button below to complete your sign-in.
          </p>
          {email && (
            <p className="text-sm text-slate-500 mb-4">
              Signing in as: <span className="text-slate-300">{email}</span>
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={loading || !token || !email}
          className="w-full px-4 py-3 bg-green-400 text-black font-semibold rounded-lg hover:bg-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Verifying...
            </span>
          ) : (
            "Confirm and Sign In"
          )}
        </button>

        <p className="text-xs text-slate-500 mb-4">
          This helps protect against spam bots and ensures you're a real person.
        </p>

        <Link
          href="/auth/signin"
          className="block text-sm text-green-400 hover:text-green-300 transition-colors"
        >
          Request a new magic link
        </Link>
      </div>
    </div>
  );
}
