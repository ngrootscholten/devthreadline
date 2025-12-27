"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    
    setIsResending(true);
    setResendSuccess(false);

    try {
      const response = await fetch("/api/auth/signin/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setResendSuccess(true);
      }
    } catch (error) {
      console.error("Failed to resend email:", error);
    } finally {
      setIsResending(false);
    }
  };

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
          <h1 className="text-3xl font-bold mb-2 text-white">Check your email</h1>
          <p className="text-slate-400">
            We've sent a magic link to
          </p>
          <p className="text-green-400 font-medium mt-1">{email}</p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-slate-300 mb-3">
            <strong className="text-white">What to do next:</strong>
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-400">
            <li>Check your inbox (and spam folder)</li>
            <li>Click the magic link in the email</li>
            <li>You'll be signed in automatically</li>
          </ol>
        </div>

        <div className="bg-yellow-950/30 border border-yellow-800/50 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-yellow-300">
            <strong className="text-yellow-400">Using enterprise email?</strong> Some email filters add redirect parameters to links. Our confirmation page handles this automatically.
          </p>
        </div>

        <div className="space-y-3">
          {resendSuccess && (
            <div className="p-3 bg-green-950/50 border border-green-800 rounded-lg">
              <p className="text-sm text-green-400">Magic link sent again!</p>
            </div>
          )}
          
          <button
            onClick={handleResend}
            disabled={isResending || !email}
            className="w-full px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:border-slate-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? "Sending..." : "Resend magic link"}
          </button>
        </div>
      </div>

      <p className="mt-6 text-center text-slate-500 text-sm">
        <Link href="/auth/signin" className="text-slate-400 hover:text-white transition-colors">
          ← Use a different email
        </Link>
      </p>
    </div>
  );
}

