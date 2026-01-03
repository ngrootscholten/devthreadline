"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Pagination } from "../components/pagination";

interface Check {
  id: string;
  repoName: string | null;
  branchName: string | null;
  environment: string | null;
  commitSha: string | null;
  commitMessage: string | null;
  commitAuthorName: string | null;
  commitAuthorEmail: string | null;
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

interface CheckSummary {
  compliant: string[];
  attention: string[];
  notRelevant: string[];
  total: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface FilterOptions {
  authors: Array<{ value: string; label: string }>;
  environments: Array<{ value: string; label: string }>;
  repositories: Array<{ value: string; label: string }>;
}

function DashboardPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checks, setChecks] = useState<Check[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, CheckSummary>>({});
  const [loadingSummaries, setLoadingSummaries] = useState<Set<string>>(new Set());
  const [summaryErrors, setSummaryErrors] = useState<Set<string>>(new Set());
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [authorDropdownOpen, setAuthorDropdownOpen] = useState(false);

  // Get current page and filters from URL, default to 1
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const authorFilter = searchParams.get('author') || '';
  const environmentFilter = searchParams.get('environment') || '';
  const repoFilter = searchParams.get('repo') || '';

  // Get selected author for display
  const selectedAuthor = authorFilter
    ? filterOptions?.authors.find(a => a.value === authorFilter)
    : null;

  const fetchFilterOptions = useCallback(async () => {
    try {
      const response = await fetch('/api/checks/filters', {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch filter options");
      }

      const data = await response.json();
      setFilterOptions(data);
    } catch (err) {
      console.error("Failed to fetch filter options:", err);
      // Don't set error state - filters are optional
    }
  }, []);

  const fetchChecks = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '20');
      if (authorFilter) params.set('author', authorFilter);
      if (environmentFilter) params.set('environment', environmentFilter);
      if (repoFilter) params.set('repo', repoFilter);

      const response = await fetch(`/api/checks?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch checks");
      }

      const data = await response.json();
      setChecks(data.checks || []);
      setPagination(data.pagination || null);
    } catch (err: any) {
      setError(err.message || "Failed to load checks");
    } finally {
      setLoading(false);
    }
  }, [currentPage, authorFilter, environmentFilter, repoFilter]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchFilterOptions();
      fetchChecks();
    } else if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, fetchChecks, fetchFilterOptions, router]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && pagination && newPage <= pagination.totalPages) {
      const params = new URLSearchParams();
      params.set('page', newPage.toString());
      if (authorFilter) params.set('author', authorFilter);
      if (environmentFilter) params.set('environment', environmentFilter);
      if (repoFilter) params.set('repo', repoFilter);
      router.push(`/dashboard?${params.toString()}`);
    }
  };

  const handleFilterChange = (filterType: 'author' | 'environment' | 'repo', value: string) => {
    const params = new URLSearchParams();
    params.set('page', '1'); // Reset to page 1 when filters change
    
    if (filterType === 'author') {
      if (value) params.set('author', value);
      if (environmentFilter) params.set('environment', environmentFilter);
      if (repoFilter) params.set('repo', repoFilter);
    } else if (filterType === 'environment') {
      if (authorFilter) params.set('author', authorFilter);
      if (value) params.set('environment', value);
      if (repoFilter) params.set('repo', repoFilter);
    } else if (filterType === 'repo') {
      if (authorFilter) params.set('author', authorFilter);
      if (environmentFilter) params.set('environment', environmentFilter);
      if (value) params.set('repo', value);
    }
    
    router.push(`/dashboard?${params.toString()}`);
  };

  const handleClearFilters = () => {
    router.push('/dashboard?page=1');
  };

  const hasActiveFilters = authorFilter || environmentFilter || repoFilter;

  const fetchSummary = useCallback(async (checkId: string) => {
    // Don't fetch if already loaded or currently loading
    if (summaries[checkId] || loadingSummaries.has(checkId)) {
      return;
    }

    setLoadingSummaries(prev => new Set(prev).add(checkId));

    try {
      const response = await fetch(`/api/checks/${checkId}/summary`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch summary");
      }

      const data = await response.json();
      setSummaries(prev => ({ ...prev, [checkId]: data }));
    } catch (err) {
      console.error("Failed to fetch check summary:", err);
      setSummaryErrors(prev => new Set(prev).add(checkId));
    } finally {
      setLoadingSummaries(prev => {
        const next = new Set(prev);
        next.delete(checkId);
        return next;
      });
    }
  }, [summaries, loadingSummaries]);

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
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
          <h1 className="text-4xl font-medium mb-6 text-white">Threadline Checks</h1>

          {/* Filters */}
          {filterOptions && (
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 relative">
                <label htmlFor="author-filter" className="text-sm text-slate-400">Author:</label>
                <div className="relative">
                  <button
                    id="author-filter"
                    type="button"
                    onClick={() => setAuthorDropdownOpen(!authorDropdownOpen)}
                    className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-green-500/50 min-w-[200px] text-left flex items-center justify-between"
                  >
                    {selectedAuthor ? (
                      <span className="truncate">
                        {selectedAuthor.value.split('|')[0] || selectedAuthor.value.split('|')[1]}
                      </span>
                    ) : (
                      <span>All Authors</span>
                    )}
                    <span className="ml-2 text-slate-500 flex-shrink-0">▼</span>
                  </button>
                  {authorDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setAuthorDropdownOpen(false)}
                      />
                      <div className="absolute z-20 mt-1 bg-slate-800 border border-slate-700 rounded shadow-lg max-h-60 overflow-auto min-w-[200px]">
                        <button
                          type="button"
                          onClick={() => {
                            handleFilterChange('author', '');
                            setAuthorDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors ${
                            !authorFilter ? 'text-green-400' : 'text-slate-300'
                          }`}
                        >
                          All Authors
                        </button>
                        {filterOptions.authors.map((author) => {
                          const [name, email] = author.value.split('|');
                          const isSelected = authorFilter === author.value;
                          return (
                            <button
                              key={author.value}
                              type="button"
                              onClick={() => {
                                handleFilterChange('author', author.value);
                                setAuthorDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors ${
                                isSelected ? 'text-green-400 bg-slate-700/50' : 'text-slate-300'
                              }`}
                            >
                              {name && email ? (
                                <>
                                  <div>{name}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">{email}</div>
                                </>
                              ) : name ? (
                                <div>{name}</div>
                              ) : (
                                <div>{email}</div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="environment-filter" className="text-sm text-slate-400">Environment:</label>
                <select
                  id="environment-filter"
                  value={environmentFilter}
                  onChange={(e) => handleFilterChange('environment', e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-green-500/50"
                >
                  <option value="">All Environments</option>
                  {filterOptions.environments.map((env) => (
                    <option key={env.value} value={env.value}>
                      {env.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="repo-filter" className="text-sm text-slate-400">Repository:</label>
                <select
                  id="repo-filter"
                  value={repoFilter}
                  onChange={(e) => handleFilterChange('repo', e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-green-500/50"
                >
                  <option value="">All Repositories</option>
                  {filterOptions.repositories.map((repo) => (
                    <option key={repo.value} value={repo.value}>
                      {repo.label}
                    </option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

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
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Author</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Environment</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Branch</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Repository</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Date</th>
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
                      <td className="py-3 px-4">
                        {check.commitAuthorName ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-300 text-sm">{check.commitAuthorName}</span>
                            {check.commitAuthorEmail && (
                              <span className="text-slate-500 text-xs">{check.commitAuthorEmail}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {getEnvironmentBadge(check.environment) || <span className="text-slate-500">—</span>}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300 font-mono">
                        {check.branchName || <span className="text-slate-500">—</span>}
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
                      <td className="py-3 px-4">
                        {(() => {
                          const { display, tooltip } = formatRelativeTime(check.createdAt);
                          return (
                            <Link 
                              href={`/check/${check.id}`} 
                              className="text-slate-300 text-sm hover:text-white transition-colors"
                              title={tooltip}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {display}
                            </Link>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4">
                        {(() => {
                          const tooltipParts: string[] = [];
                          tooltipParts.push(`${check.filesChangedCount} file${check.filesChangedCount !== 1 ? 's' : ''} changed`);
                          if (check.commitMessage) {
                            tooltipParts.push('');
                            tooltipParts.push(`Commit: ${check.commitMessage}`);
                          } else {
                            tooltipParts.push('');
                            tooltipParts.push('(No commit message - local changes)');
                          }
                          return (
                            <span 
                              title={tooltipParts.join('\n')}
                              className="text-slate-300 text-sm cursor-help"
                            >
                              {formatDiffStats(check.diffStats)}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300">
                        {(() => {
                          const summary = summaries[check.id];
                          const hasError = summaryErrors.has(check.id);
                          const buildTooltip = (): string => {
                            if (hasError) {
                              return 'Error retrieving check summary';
                            }

                            if (!summary) {
                              // Summary not loaded yet - show basic counts
                              const parts: string[] = [];
                              parts.push('Results Breakdown:');
                              parts.push('');
                              if (check.results.compliant > 0) {
                                parts.push(`✓ ${check.results.compliant} compliant`);
                              }
                              if (check.results.attention > 0) {
                                parts.push(`⚠ ${check.results.attention} attention`);
                              }
                              if (check.results.notRelevant > 0) {
                                parts.push(`— ${check.results.notRelevant} not relevant`);
                              }
                              parts.push('');
                              parts.push(`Total: ${check.threadlinesCount} threadline${check.threadlinesCount !== 1 ? 's' : ''}`);
                              return parts.join('\n');
                            }

                            // Full tooltip with threadline IDs
                            const parts: string[] = [];
                            parts.push('Results Breakdown:');
                            parts.push('');

                            if (summary.compliant.length > 0) {
                              parts.push(`✓ ${summary.compliant.length} compliant:`);
                              summary.compliant.forEach(id => {
                                parts.push(`  • ${id}`);
                              });
                              parts.push('');
                            }

                            if (summary.attention.length > 0) {
                              parts.push(`⚠ ${summary.attention.length} attention:`);
                              summary.attention.forEach(id => {
                                parts.push(`  • ${id}`);
                              });
                              parts.push('');
                            }

                            if (summary.notRelevant.length > 0) {
                              parts.push(`— ${summary.notRelevant.length} not relevant:`);
                              summary.notRelevant.forEach(id => {
                                parts.push(`  • ${id}`);
                              });
                              parts.push('');
                            }

                            parts.push(`Total: ${summary.total} threadline${summary.total !== 1 ? 's' : ''}`);
                            return parts.join('\n');
                          };

                          return (
                            <div 
                              className="flex flex-col gap-1 cursor-help"
                              title={buildTooltip()}
                              onMouseEnter={() => fetchSummary(check.id)}
                            >
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
                itemName="check"
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

export default function DashboardPage() {
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
      <DashboardPageContent />
    </Suspense>
  );
}

