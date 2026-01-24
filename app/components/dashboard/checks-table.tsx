"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pagination } from "../pagination";

interface ResultDetail {
  threadline_id: string;
  status: 'compliant' | 'attention' | 'not_relevant' | 'error';
  fixId: string | null;
}

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
  results: ResultDetail[];
  createdAt: string;
}

interface CheckSummary {
  compliant: string[];
  attention: string[];
  attentionFixed: string[];
  notRelevant: string[];
  errors: string[];
  total: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ChecksTableProps {
  checks: Check[];
  pagination: PaginationData | null;
  onPageChange: (page: number) => void;
}

export function ChecksTable({ checks, pagination, onPageChange }: ChecksTableProps) {
  const router = useRouter();
  const [summaries, setSummaries] = useState<Record<string, CheckSummary>>({});
  const [loadingSummaries, setLoadingSummaries] = useState<Set<string>>(new Set());
  const [summaryErrors, setSummaryErrors] = useState<Set<string>>(new Set());

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

  const getReviewContextBadge = (reviewContext: string | null) => {
    if (!reviewContext) return null;
    
    const colors: Record<string, string> = {
      commit: 'bg-green-500/20 text-green-400 border-green-500/30',
      pr: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      file: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      folder: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      files: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      local: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    };
    
    const color = colors[reviewContext] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    
    // Capitalize first letter for display
    const displayText = reviewContext.charAt(0).toUpperCase() + reviewContext.slice(1);
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium border ${color}`}>
        {displayText}
      </span>
    );
  };

  if (checks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400 text-lg mb-2">No checks yet</p>
        <p className="text-slate-500 text-sm">
          Run <code className="bg-slate-800 px-2 py-1 rounded">threadlines check</code> to see your checks here
        </p>
      </div>
    );
  }

  return (
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
            {checks.map((check) => {
              const summary = summaries[check.id];
              const hasError = summaryErrors.has(check.id);
              // Calculate counts from results array
              const compliantCount = check.results.filter(r => r.status === 'compliant').length;
              const attentionCount = check.results.filter(r => r.status === 'attention' && !r.fixId).length;
              const attentionFixedCount = check.results.filter(r => r.status === 'attention' && r.fixId).length;
              const notRelevantCount = check.results.filter(r => r.status === 'not_relevant').length;
              const errorCount = check.results.filter(r => r.status === 'error').length;

              const buildTooltip = (): string => {
                if (hasError) {
                  return 'Error retrieving check summary';
                }

                if (!summary) {
                  // Summary not loaded yet - show basic counts from results array
                  const parts: string[] = [];
                  parts.push('Results Breakdown:');
                  parts.push('');
                  if (attentionCount > 0) {
                    parts.push(`⚠ ${attentionCount} attention`);
                  }
                  if (attentionFixedCount > 0) {
                    parts.push(`✓ ${attentionFixedCount} attention (fixed)`);
                  }
                  if (compliantCount > 0) {
                    parts.push(`✓ ${compliantCount} compliant`);
                  }
                  if (notRelevantCount > 0) {
                    parts.push(`— ${notRelevantCount} not relevant`);
                  }
                  if (errorCount > 0) {
                    parts.push(`❌ ${errorCount} error${errorCount !== 1 ? 's' : ''}`);
                  }
                  parts.push('');
                  parts.push(`Total: ${check.threadlinesCount} threadline${check.threadlinesCount !== 1 ? 's' : ''}`);
                  return parts.join('\n');
                }

                // Full tooltip with threadline IDs from API
                const parts: string[] = [];
                parts.push('Results Breakdown:');
                parts.push('');

                if (summary.attention.length > 0) {
                  parts.push(`⚠ ${summary.attention.length} attention:`);
                  summary.attention.forEach(id => {
                    parts.push(`  • ${id}`);
                  });
                  parts.push('');
                }

                if (summary.attentionFixed.length > 0) {
                  parts.push(`✓ ${summary.attentionFixed.length} attention (fixed):`);
                  summary.attentionFixed.forEach(id => {
                    parts.push(`  • ${id}`);
                  });
                  parts.push('');
                }

                if (summary.compliant.length > 0) {
                  parts.push(`✓ ${summary.compliant.length} compliant:`);
                  summary.compliant.forEach(id => {
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

                if (summary.errors && summary.errors.length > 0) {
                  parts.push(`❌ ${summary.errors.length} error${summary.errors.length !== 1 ? 's' : ''}:`);
                  summary.errors.forEach(id => {
                    parts.push(`  • ${id}`);
                  });
                  parts.push('');
                }

                parts.push(`Total: ${summary.total} threadline${summary.total !== 1 ? 's' : ''}`);
                return parts.join('\n');
              };

              return (
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
                    <div className="flex items-center gap-2 flex-wrap">
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
                      {getReviewContextBadge(check.reviewContext)}
                    </div>
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
                    <div 
                      className="flex flex-col gap-1 cursor-help"
                      title={buildTooltip()}
                      onMouseEnter={() => fetchSummary(check.id)}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {attentionCount > 0 && (
                          <span className="text-yellow-400">{attentionCount} ⚠</span>
                        )}
                        {attentionFixedCount > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-slate-300">{attentionFixedCount}</span>
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-semibold" title="Fixed">
                              ✓
                            </span>
                          </span>
                        )}
                        {compliantCount > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-slate-300">{compliantCount}</span>
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-xs font-semibold">
                              ✓
                            </span>
                          </span>
                        )}
                        {notRelevantCount > 0 && (
                          <span className="text-slate-500">{notRelevantCount} —</span>
                        )}
                        {attentionCount === 0 && 
                         attentionFixedCount === 0 &&
                         compliantCount === 0 && 
                         notRelevantCount === 0 && (
                          <span className="text-slate-500">—</span>
                        )}
                      </div>
                      <span className="text-slate-500 text-xs">
                        {check.threadlinesCount} threadline{check.threadlinesCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
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
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}

