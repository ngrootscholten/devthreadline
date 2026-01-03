"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pagination } from "../components/pagination";

interface Threadline {
  id: string;
  threadlineId: string;
  filePath: string;
  repoName: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function ThreadlinesPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [threadlines, setThreadlines] = useState<Threadline[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current page from URL, default to 1
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const fetchThreadlines = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/threadlines?page=${currentPage}&limit=20`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch threadlines");
      }

      const data = await response.json();
      setThreadlines(data.threadlines || []);
      setPagination(data.pagination || null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load threadlines";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchThreadlines();
    } else if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, fetchThreadlines, router]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && pagination && newPage <= pagination.totalPages) {
      router.push(`/threadlines?page=${newPage}`);
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

  const formatRelativeTime = (dateString: string): { display: string; tooltip: string } => {
    // dateString is ISO 8601 with 'Z' (UTC indicator) from API
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


  return (
    <main className="min-h-screen">
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
          <h1 className="text-4xl font-medium mb-3 text-white">Threadlines</h1>

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
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Repository</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">File Path</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {threadlines.map((threadline) => (
                      <tr
                        key={threadline.id}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                        onClick={() => router.push(`/threadlines/${threadline.id}`)}
                      >
                        <td className="py-3 px-4">
                          <span className="text-slate-300 text-sm font-mono">{threadline.threadlineId}</span>
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
                        <td className="py-3 px-4">
                          {(() => {
                            const { display, tooltip } = formatRelativeTime(threadline.createdAt);
                            return (
                              <span title={tooltip} className="text-slate-300 text-sm cursor-help">
                                {display}
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pagination && (
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={pagination.limit}
                  itemName="threadline"
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default function ThreadlinesPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen">
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
            <p className="text-slate-400">Loading...</p>
          </div>
        </section>
      </main>
    }>
      <ThreadlinesPageContent />
    </Suspense>
  );
}

