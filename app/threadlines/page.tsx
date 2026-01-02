"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Threadline {
  id: string;
  threadlineId: string;
  filePath: string;
  repoName: string | null;
  createdAt: string;
}

export default function ThreadlinesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [threadlines, setThreadlines] = useState<Threadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchThreadlines();
    } else if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status]);

  const fetchThreadlines = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/threadlines", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch threadlines");
      }

      const data = await response.json();
      setThreadlines(data.threadlines || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load threadlines";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen">
        <section className="max-w-7xl mx-auto px-6 py-24">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 md:p-12">
            <p className="text-slate-400">Loading...</p>
          </div>
        </section>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

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
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 md:p-12">
          <h1 className="text-4xl font-bold mb-6 text-white">Threadlines</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {threadlines.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg mb-2">No threadlines yet</p>
              <p className="text-slate-500 text-sm">
                Run <code className="bg-slate-800 px-2 py-1 rounded">threadlines check</code> to see your threadlines here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Repository</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">File Path</th>
                  </tr>
                </thead>
                <tbody>
                  {threadlines.map((threadline) => (
                    <tr
                      key={threadline.id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/threadlines/${threadline.id}`)}
                    >
                      <td className="py-3 px-4 text-sm text-white font-mono">
                        {threadline.threadlineId}
                      </td>
                      <td className="py-3 px-4 text-sm text-white font-mono">
                        {threadline.repoName ? (
                          <span 
                            title={threadline.repoName}
                            className="cursor-help"
                          >
                            {formatRepoName(threadline.repoName)}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300 font-mono">
                        {threadline.filePath}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

