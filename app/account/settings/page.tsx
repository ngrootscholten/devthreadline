"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null); // Current API key (plaintext)
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null); // Newly generated key
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session) {
      fetchApiKeyInfo();
    }
  }, [status, session]);

  const fetchApiKeyInfo = async () => {
    try {
      const response = await fetch("/api/auth/api-key", {
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok) {
        setHasApiKey(data.hasApiKey);
        setApiKey(data.apiKey); // Store plaintext key
        setCreatedAt(data.createdAt);
      }
    } catch (err) {
      console.error("Failed to fetch API key info:", err);
    }
  };

  const handleGenerateClick = () => {
    setShowConfirmModal(true);
  };

  const handleGenerateConfirm = async () => {
    setShowConfirmModal(false);
    setGenerating(true);
    setError(null);
    setNewApiKey(null);

    try {
      const response = await fetch("/api/auth/api-key", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to generate API key");
        setGenerating(false);
        return;
      }

      setNewApiKey(data.apiKey);
      setApiKey(data.apiKey); // Also update current key
      setHasApiKey(true);
      setCreatedAt(data.createdAt);
      setGenerating(false);
    } catch (err: any) {
      setError(err.message || "Failed to generate API key");
      setGenerating(false);
    }
  };

  const handleCopyEmail = async () => {
    if (session?.user?.email) {
      await navigator.clipboard.writeText(session.user.email);
      setCopied("email");
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const handleCopyApiKey = async () => {
    const keyToCopy = newApiKey || apiKey;
    if (keyToCopy) {
      await navigator.clipboard.writeText(keyToCopy);
      setCopied("apikey");
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const handleCopyEnvFormat = async () => {
    const keyToCopy = newApiKey || apiKey;
    if (session?.user?.email && keyToCopy) {
      const envContent = `THREADLINE_ACCOUNT='${session.user.email}'\nTHREADLINE_API_KEY='${keyToCopy}'`;
      await navigator.clipboard.writeText(envContent);
      setCopied("env");
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const ClipboardIcon = ({ className }: { className?: string }) => (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );

  if (status === "loading") {
    return (
      <main className="min-h-screen">
        <section className="max-w-4xl mx-auto px-6 py-12">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
            <p className="text-slate-400">Loading...</p>
          </div>
        </section>
      </main>
    );
  }

  if (status === "unauthenticated" || !session) {
    router.push("/auth/signin");
    return null;
  }

  return (
    <main className="min-h-screen">
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
          <h1 className="text-4xl font-medium mb-3 text-white">Settings</h1>
          
          <div className="space-y-6">
            {/* Account Identifier */}
            <div>
              <label className="block text-base font-semibold text-white mb-1">
                Account Identifier
              </label>
              <div className="flex items-center gap-2">
                <div
                  onClick={handleCopyEmail}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-4 py-2 text-white font-mono text-sm cursor-pointer hover:opacity-80 transition-opacity"
                  title="Click to copy"
                >
                  {session.user?.email}
                </div>
                <button
                  onClick={handleCopyEmail}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                  title="Copy to clipboard"
                >
                  <ClipboardIcon className="w-4 h-4" />
                </button>
                {copied === "email" && (
                  <span className="text-green-400 text-xs">Copied!</span>
                )}
              </div>
              <p className="text-slate-500 text-xs mt-1">
                <code className="bg-slate-800 px-1 py-0.5 rounded">THREADLINE_ACCOUNT</code>
              </p>
            </div>

            {/* API Key Section */}
            <div className="border-t border-slate-800 pt-6">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-base font-semibold text-white">
                  API Key
                </label>
                <button
                  onClick={handleGenerateClick}
                  disabled={generating}
                  className="px-3 py-1.5 text-sm bg-green-400 text-black font-semibold rounded-lg hover:bg-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? "Generating..." : hasApiKey ? "Regenerate" : "Generate"}
                </button>
              </div>
              <div className="mb-4">
                {(newApiKey || apiKey) ? (
                  <div className="flex items-start gap-2">
                    <div
                      onClick={handleCopyApiKey}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded px-4 py-2 text-white font-mono text-sm break-all cursor-pointer hover:opacity-80 transition-opacity"
                      title="Click to copy"
                    >
                      {newApiKey || apiKey}
                    </div>
                    <button
                      onClick={handleCopyApiKey}
                      className="mt-1 p-2 text-slate-400 hover:text-white transition-colors"
                      title="Copy to clipboard"
                    >
                      <ClipboardIcon className="w-4 h-4" />
                    </button>
                    {copied === "apikey" && (
                      <span className="mt-1 text-green-400 text-xs">Copied!</span>
                    )}
                  </div>
                ) : (
                  <p className="text-white font-mono text-sm">Not generated</p>
                )}
                {newApiKey ? (
                  <p className="text-green-400 text-xs mt-1">
                    ✓ New API key generated. You can view this key anytime in Settings.
                  </p>
                ) : hasApiKey && createdAt ? (
                  <p className="text-slate-500 text-xs mt-1">
                    Generated on {new Date(createdAt).toLocaleDateString()} at {new Date(createdAt).toLocaleTimeString()}. 
                    Share this key with your team members.
                  </p>
                ) : (
                  <p className="text-slate-500 text-xs mt-1">
                    Generate an API key to authenticate your CLI requests. Click "Generate" to get started.
                  </p>
                )}
                <p className="text-slate-500 text-xs mt-1">
                  <code className="bg-slate-800 px-1 py-0.5 rounded">THREADLINE_API_KEY</code>
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Convenience .env.local copy - shown when API key is available */}
              {(newApiKey || apiKey) && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <label className="block text-base font-semibold text-white mb-1">
                    Environment Variables
                  </label>
                  <div className="flex items-start gap-2">
                    <textarea
                      readOnly
                      onClick={handleCopyEnvFormat}
                      value={`THREADLINE_ACCOUNT='${session.user?.email}'\nTHREADLINE_API_KEY='${newApiKey || apiKey}'`}
                      rows={2}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded px-4 py-2 text-white font-mono text-sm resize-none cursor-pointer hover:opacity-80 transition-opacity"
                      title="Click to copy"
                    />
                    <button
                      onClick={handleCopyEnvFormat}
                      className="mt-1 p-2 text-slate-400 hover:text-white transition-colors"
                      title="Copy to clipboard"
                    >
                      <ClipboardIcon className="w-4 h-4" />
                    </button>
                    {copied === "env" && (
                      <span className="mt-1 text-green-400 text-xs">Copied!</span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs mt-1">
                    Copy environment variables
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Generate New API Key</h3>
            <p className="text-slate-300 mb-6">
              This will generate a new API key. Any existing API key will be immediately invalidated.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleGenerateConfirm}
                className="flex-1 px-4 py-2 bg-green-400 text-black font-semibold rounded-lg hover:bg-green-500 transition-all"
              >
                Continue
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:border-slate-600 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

