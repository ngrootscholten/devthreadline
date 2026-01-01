"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Check {
  id: string;
  repoName: string | null;
  branchName: string | null;
  environment: string | null;
  commitSha: string | null;
  reviewContext: string | null;
  diffStats: {
    added: number;
    removed: number;
    total: number;
  };
  filesChangedCount: number;
  threadlinesCount: number;
  results: {
    compliant: number;
    attention: number;
    notRelevant: number;
  };
  createdAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchChecks();
    } else if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status]); // Only depend on status, not session object - YESS!

  const fetchChecks = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/checks", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch checks");
      }

      const data = await response.json();
      setChecks(data.checks || []);
    } catch (err: any) {
      setError(err.message || "Failed to load checks");
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

  const formatRelativeTime = (dateString: string): { display: string; tooltip: string } => {
    // dateString is now ISO 8601 with 'Z' (UTC indicator) from API
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    
    // Precise tooltip with seconds
    const tooltip = date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    
    // Relative time for recent items (< 2 hours)
    if (diffSeconds < 60) {
      return { display: `${diffSeconds} seconds ago`, tooltip };
    } else if (diffMinutes < 60) {
      return { display: `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`, tooltip };
    } else if (diffHours < 2) {
      return { display: `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`, tooltip };
    }
    
    // Absolute time for older items
    const display = date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    
    return { display, tooltip };
  };

  const formatDiffStats = (stats: Check["diffStats"]) => {
    if (stats.total === 0) return "No changes";
    return `${stats.added > 0 ? `+${stats.added}` : ""}${stats.removed > 0 ? `-${stats.removed}` : ""} lines`;
  };

  const formatResults = (results: Check["results"], threadlinesCount: number) => {
    const parts = [];
    if (results.compliant > 0) parts.push(`${results.compliant} compliant`);
    if (results.attention > 0) parts.push(`${results.attention} attention`);
    if (results.notRelevant > 0) parts.push(`${results.notRelevant} not relevant`);
    const resultsText = parts.join(", ") || "No results";
    return `${resultsText} (${threadlinesCount} threadline${threadlinesCount !== 1 ? 's' : ''})`;
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

  const getEnvironmentBadge = (env: string | null) => {
    if (!env) return null;
    
    const colors: Record<string, string> = {
      vercel: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      github: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      gitlab: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      local: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
    
    const color = colors[env] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium border ${color}`}>
        {env}
      </span>
    );
  };

  return (
    <main className="min-h-screen">
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 md:p-12">
          <h1 className="text-4xl font-bold mb-6 text-white">Dashboard</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {checks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg mb-2">No checks yet</p>
              <p className="text-slate-500 text-sm">
                Run <code className="bg-slate-800 px-2 py-1 rounded">threadlines check</code> to see your checks here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Repository</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Branch</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Environment</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Changes</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Results</th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map((check) => (
                    <tr
                      key={check.id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/check/${check.id}`)}
                    >
                      <td className="py-3 px-4 text-sm text-slate-300">
                        {(() => {
                          const { display, tooltip } = formatRelativeTime(check.createdAt);
                          return (
                            <Link 
                              href={`/check/${check.id}`} 
                              className="hover:text-white transition-colors"
                              title={tooltip}
                            >
                              {display}
                            </Link>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-sm text-white font-mono">
                        {check.repoName ? (
                          <span 
                            title={check.repoName}
                            className="cursor-help"
                          >
                            {formatRepoName(check.repoName)}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300 font-mono">
                        {check.branchName || <span className="text-slate-500">—</span>}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {getEnvironmentBadge(check.environment) || <span className="text-slate-500">—</span>}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300">
                        {formatDiffStats(check.diffStats)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {check.results.compliant > 0 && (
                              <span className="text-green-400">{check.results.compliant} ✓</span>
                            )}
                            {check.results.attention > 0 && (
                              <span className="text-yellow-400">{check.results.attention} ⚠</span>
                            )}
                            {check.results.notRelevant > 0 && (
                              <span className="text-slate-500">{check.results.notRelevant} —</span>
                            )}
                            {check.results.compliant === 0 && 
                             check.results.attention === 0 && 
                             check.results.notRelevant === 0 && (
                              <span className="text-slate-500">—</span>
                            )}
                          </div>
                          <span className="text-slate-500 text-xs">
                            {check.threadlinesCount} threadline{check.threadlinesCount !== 1 ? 's' : ''}
                          </span>
                        </div>
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

