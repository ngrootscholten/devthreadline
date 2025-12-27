"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";

function VerifyEmailContent() {
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
          <p className="text-slate-400 mb-6">
            We've sent you a magic link to sign in
          </p>

          {email && (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 mb-4 text-left">
              <p className="text-sm text-slate-300">
                Please check your inbox for{" "}
                <span className="font-semibold text-white">{email}</span>{" "}
                and click the magic link to sign in.
              </p>
            </div>
          )}

          <p className="text-sm text-slate-500 mb-6">
            The link will expire in 1 hour.
          </p>
        </div>

        {resendSuccess && (
          <div className="mb-4 p-3 bg-green-950/50 border border-green-800 rounded-lg">
            <p className="text-sm text-green-400">Magic link sent again!</p>
          </div>
        )}
        
        <button
          onClick={handleResend}
          disabled={isResending || !email}
          className="w-full px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:border-slate-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          {isResending ? "Sending..." : "Resend magic link"}
        </button>

        <Link
          href="/auth/signin"
          className="block text-sm text-green-400 hover:text-green-300 transition-colors"
        >
          Use a different email
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="animate-spin h-8 w-8 text-green-400"
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
            </div>
            <h1 className="text-3xl font-bold mb-2 text-white">Loading...</h1>
            <p className="text-slate-400">Please wait</p>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

