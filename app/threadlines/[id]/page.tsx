"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

interface ThreadlineDetail {
  id: string;
  threadlineId: string;
  filePath: string;
  version: string;
  patterns: string[];
  content: string;
  repoName: string | null;
  createdAt: string;
}

export default function ThreadlineDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const threadlineId = params.id as string;
  const fromCheck = searchParams.get('fromCheck');

  const [threadline, setThreadline] = useState<ThreadlineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && threadlineId) {
      fetchThreadline();
    } else if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, threadlineId]);

  const fetchThreadline = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/threadlines/${threadlineId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Threadline not found");
        }
        throw new Error("Failed to fetch threadline details");
      }

      const data = await response.json();
      setThreadline(data.threadline);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load threadline details";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen">
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
            <p className="text-slate-400">Loading...</p>
          </div>
        </section>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (error || !threadline) {
    return (
      <main className="min-h-screen">
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
            <div className="mb-6">
              {fromCheck ? (
                <Link href={`/check/${fromCheck}`} className="text-green-400 hover:text-green-300 transition-colors">
                  ← Back to Check
                </Link>
              ) : (
                <Link href="/threadlines" className="text-green-400 hover:text-green-300 transition-colors">
                  ← Back to Threadlines
                </Link>
              )}
            </div>
            <p className="text-red-400">{error || "Threadline not found"}</p>
          </div>
        </section>
      </main>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRepoName = (repoName: string | null): string => {
    if (!repoName) return "—";
    
    // If it's already in format "user/repo", return as-is
    if (!repoName.includes('://') && repoName.includes('/')) {
      return repoName;
    }
    
    // Try to parse GitHub/GitLab URLs
    try {
      const url = new URL(repoName);
      const pathParts = url.pathname.split('/').filter(Boolean);
      
      // Remove .git suffix if present
      const lastPart = pathParts[pathParts.length - 1];
      const repoPart = lastPart?.endsWith('.git') ? lastPart.slice(0, -4) : lastPart;
      
      if (pathParts.length >= 2) {
        return `${pathParts[pathParts.length - 2]}/${repoPart}`;
      }
      
      // Fallback: return last part without .git
      return repoPart || repoName;
    } catch {
      // If URL parsing fails, return as-is
      return repoName;
    }
  };


  return (
    <main className="min-h-screen">
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-6">
          {fromCheck ? (
            <Link href={`/check/${fromCheck}`} className="text-green-400 hover:text-green-300 transition-colors">
              ← Back to Check
            </Link>
          ) : (
            <Link href="/threadlines" className="text-green-400 hover:text-green-300 transition-colors">
              ← Back to Threadlines
            </Link>
          )}
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-medium mb-4 text-white">{threadline.threadlineId}</h1>
            <p className="text-slate-400 mb-6">Created {formatDate(threadline.createdAt)}</p>

            {/* Metadata Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h2 className="text-sm font-semibold text-slate-400 mb-2">File Path</h2>
                <p className="text-white font-mono text-sm">{threadline.filePath}</p>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-400 mb-2">Repository</h2>
                <p className="text-white font-mono text-sm">
                  {threadline.repoName ? formatRepoName(threadline.repoName) : <span className="text-slate-500">—</span>}
                </p>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-400 mb-2">Version</h2>
                <p className="text-white font-mono">{threadline.version}</p>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-400 mb-2">Created</h2>
                <p className="text-white">{formatDate(threadline.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Patterns */}
          {threadline.patterns && threadline.patterns.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Patterns</h2>
              <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                <ul className="list-disc list-inside text-slate-300">
                  {threadline.patterns.map((pattern, idx) => (
                    <li key={idx} className="font-mono text-sm mb-1">
                      {pattern}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Threadline Guidelines - Expandable */}
          {threadline.content && (
            <div className="mb-8">
              <details className="group">
                <summary className="cursor-pointer text-2xl font-semibold text-white mb-4 hover:text-green-400 transition-colors list-none">
                  <div className="flex items-center gap-2">
                    <span>Threadline Guidelines</span>
                    <svg
                      className="w-5 h-5 text-slate-400 transition-transform group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </summary>
                <div className="mt-4 prose prose-invert prose-sm max-w-none bg-slate-900/50 p-6 rounded-lg border border-slate-800">
                  <ReactMarkdown className="text-slate-300">
                    {threadline.content}
                  </ReactMarkdown>
                </div>
              </details>
            </div>
          )}

        </div>
      </section>
    </main>
  );
}

