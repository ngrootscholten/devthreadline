"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import "react-diff-view/style/index.css";
import { DiffViewer } from "../../components/DiffViewer";

interface ThreadlineDetail {
  id: string;
  threadlineId: string;
  filePath: string;
  version: string;
  patterns: string[];
  content: string;
  repoName: string | null;
  predecessorId: string | null;
  createdAt: string;
}

interface ThreadlineStatistics {
  thisVersion: {
    totalChecks: number;
    compliant: number;
    attention: number;
    notRelevant: number;
  };
  totalVersions: number;
  allVersions: {
    totalChecks: number;
    compliant: number;
    attention: number;
    notRelevant: number;
  };
}

interface ThreadlineCheck {
  checkId: string;
  createdAt: string;
  repoName: string | null;
  branchName: string | null;
  commitSha: string | null;
  commitMessage: string | null;
  environment: string | null;
  status: 'compliant' | 'attention' | 'not_relevant';
  result: {
    status: string;
    reasoning: string | null;
    fileReferences: string[];
  };
  relevantFiles: string[];
  filesInFilteredDiff: string[];
  filteredDiff: string | null;
  allChangedFiles: string[];
  patterns: string[];
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
  const [statistics, setStatistics] = useState<ThreadlineStatistics | null>(null);
  const [recentChecks, setRecentChecks] = useState<ThreadlineCheck[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingChecks, setLoadingChecks] = useState(false);
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === "authenticated" && threadlineId) {
      fetchThreadline();
      fetchStatistics();
      fetchRecentChecks();
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

  const fetchStatistics = async () => {
    try {
      setLoadingStats(true);
      const response = await fetch(`/api/threadlines/${threadlineId}/stats`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setStatistics(data.statistics);
      }
    } catch (err: unknown) {
      console.error("Failed to fetch statistics:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchRecentChecks = async () => {
    try {
      setLoadingChecks(true);
      const response = await fetch(`/api/threadlines/${threadlineId}/checks?limit=10`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setRecentChecks(data.checks || []);
      }
    } catch (err: unknown) {
      console.error("Failed to fetch recent checks:", err);
    } finally {
      setLoadingChecks(false);
    }
  };

  const toggleCheck = (checkId: string) => {
    setExpandedChecks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(checkId)) {
        newSet.delete(checkId);
      } else {
        newSet.add(checkId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'attention':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'not_relevant':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
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

  const formatRelativeTime = (dateString: string): { display: string; tooltip: string } => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    const tooltip = date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    
    if (diffSeconds < 60) {
      return { display: `${diffSeconds}s ago`, tooltip };
    } else if (diffMinutes < 60) {
      return { display: `${diffMinutes}m ago`, tooltip };
    } else if (diffHours < 24) {
      return { display: `${diffHours}h ago`, tooltip };
    } else if (diffDays < 7) {
      return { display: `${diffDays}d ago`, tooltip };
    }
    
    return { display: date.toLocaleDateString(), tooltip };
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
                <div className="flex items-center gap-2">
                  <p className="text-white font-mono">{threadline.version}</p>
                  {threadline.predecessorId && (
                    <Link
                      href={`/threadlines/${threadline.predecessorId}`}
                      className="text-sm text-slate-400 hover:text-green-400 hover:underline transition-colors"
                    >
                      (Previous Version)
                    </Link>
                  )}
                </div>
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

          {/* Statistics Panel */}
          {statistics && (
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Statistics</h2>
              <div className="bg-slate-950/50 p-6 rounded-lg border border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* This Version Column */}
                  <div className="flex flex-col items-center text-center">
                    <h3 className="text-lg font-semibold text-slate-300 mb-4">This Version</h3>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {statistics.thisVersion.compliant > 0 && (
                          <span className="text-green-400">{statistics.thisVersion.compliant} ✓</span>
                        )}
                        {statistics.thisVersion.attention > 0 && (
                          <span className="text-yellow-400">{statistics.thisVersion.attention} ⚠</span>
                        )}
                        {statistics.thisVersion.notRelevant > 0 && (
                          <span className="text-slate-500">{statistics.thisVersion.notRelevant} —</span>
                        )}
                        {statistics.thisVersion.compliant === 0 && 
                         statistics.thisVersion.attention === 0 && 
                         statistics.thisVersion.notRelevant === 0 && (
                          <span className="text-slate-500">—</span>
                        )}
                      </div>
                      <span className="text-slate-500 text-xs">
                        {statistics.thisVersion.totalChecks} check{statistics.thisVersion.totalChecks !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Version Count Column */}
                  <div className="flex flex-col items-center text-center">
                    <h3 className="text-lg font-semibold text-slate-300 mb-4">Version Count</h3>
                    <div>
                      <p className="text-2xl font-semibold text-white">{statistics.totalVersions}</p>
                    </div>
                  </div>

                  {/* All Versions Column */}
                  <div className="flex flex-col items-center text-center">
                    <h3 className="text-lg font-semibold text-slate-300 mb-4">All Versions</h3>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {statistics.allVersions.compliant > 0 && (
                          <span className="text-green-400">{statistics.allVersions.compliant} ✓</span>
                        )}
                        {statistics.allVersions.attention > 0 && (
                          <span className="text-yellow-400">{statistics.allVersions.attention} ⚠</span>
                        )}
                        {statistics.allVersions.notRelevant > 0 && (
                          <span className="text-slate-500">{statistics.allVersions.notRelevant} —</span>
                        )}
                        {statistics.allVersions.compliant === 0 && 
                         statistics.allVersions.attention === 0 && 
                         statistics.allVersions.notRelevant === 0 && (
                          <span className="text-slate-500">—</span>
                        )}
                      </div>
                      <span className="text-slate-500 text-xs">
                        {statistics.allVersions.totalChecks} check{statistics.allVersions.totalChecks !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Checks */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Recent Checks {recentChecks.length > 0 && `(${recentChecks.length})`}
            </h2>
            {loadingChecks ? (
              <div className="bg-slate-950/50 p-6 rounded-lg border border-slate-800">
                <p className="text-slate-400">Loading checks...</p>
              </div>
            ) : recentChecks.length === 0 ? (
              <div className="bg-slate-950/50 p-6 rounded-lg border border-slate-800">
                <p className="text-slate-400">No checks found for this threadline yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentChecks.map((check) => {
                  const isExpanded = expandedChecks.has(check.checkId);
                  const timeInfo = formatRelativeTime(check.createdAt);

                  return (
                    <div
                      key={check.checkId}
                      className="border border-slate-800 rounded-lg bg-slate-950/30 overflow-hidden"
                    >
                      {/* Collapsed Summary */}
                      <div 
                        onClick={() => toggleCheck(check.checkId)}
                        className="w-full p-4 hover:bg-slate-800/50 transition-colors flex items-center justify-between cursor-pointer gap-4"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold border flex-shrink-0 ${getStatusColor(check.status)}`}>
                            {check.status}
                          </span>
                          <Link
                            href={`/check/${check.checkId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-semibold text-white hover:underline flex-shrink-0"
                          >
                            Check {check.checkId.substring(0, 8)}
                          </Link>
                          {getEnvironmentBadge(check.environment)}
                          <p className="text-sm text-slate-400 flex-shrink-0" title={timeInfo.tooltip}>
                            {timeInfo.display}
                          </p>
                          {check.branchName && (
                            <p className="text-sm text-slate-500 font-mono flex-shrink-0">{check.branchName}</p>
                          )}
                          {check.repoName && (
                            <p className="text-sm text-slate-500 flex-shrink-0 truncate">{formatRepoName(check.repoName)}</p>
                          )}
                        </div>
                        <div className="p-2 flex-shrink-0">
                          <svg
                            className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="border-t border-slate-800 p-6">
                          <div className="space-y-6">
                            {/* Result Details */}
                            {check.result && (
                              <div>
                                <h4 className="text-sm font-semibold text-slate-400 mb-2">Result</h4>
                                <div className={`p-4 rounded-lg border ${getStatusColor(check.result.status)}`}>
                                  <p className="text-sm font-semibold mb-2">
                                    Status: {check.result.status}
                                  </p>
                                  {check.result.reasoning && (
                                    <div>
                                      <p className="text-sm font-semibold text-slate-400 mb-1">Reasoning</p>
                                      <p className="text-slate-300 whitespace-pre-wrap text-sm">
                                        {check.result.reasoning}
                                      </p>
                                    </div>
                                  )}
                                  {check.result.fileReferences && check.result.fileReferences.length > 0 && (
                                    <div className="mt-3">
                                      <p className="text-sm font-semibold text-slate-400 mb-1">Files with Violations</p>
                                      <ul className="list-disc list-inside text-slate-300">
                                        {check.result.fileReferences.map((file: string, idx: number) => (
                                          <li key={idx} className="font-mono text-sm">
                                            {file}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Files Changed vs Relevant Files */}
                            {check.allChangedFiles && check.allChangedFiles.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-slate-400 mb-2">
                                  Files Changed ({check.allChangedFiles.length})
                                </h4>
                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 space-y-4">
                                  {/* Relevant Files */}
                                  {check.relevantFiles && check.relevantFiles.length > 0 ? (
                                    <div>
                                      <p className="text-sm font-semibold text-green-400 mb-2">
                                        ✓ Relevant to this threadline ({check.relevantFiles.length})
                                      </p>
                                      <ul className="list-disc list-inside text-slate-300 ml-4">
                                        {check.relevantFiles.map((file: string, idx: number) => (
                                          <li key={idx} className="font-mono text-sm">
                                            {file}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : (
                                    <div>
                                      <p className="text-sm font-semibold text-yellow-400 mb-2">
                                        ⚠️ None of the changed files match this threadline's patterns
                                      </p>
                                      <p className="text-xs text-slate-500 mb-2">
                                        Patterns: {check.patterns?.join(', ') || 'none'}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {/* Not Relevant Files */}
                                  {check.relevantFiles && check.relevantFiles.length > 0 && check.relevantFiles.length < check.allChangedFiles.length && (
                                    <div className="border-t border-slate-700 pt-4">
                                      <p className="text-sm font-semibold text-slate-500 mb-2">
                                        Not relevant ({check.allChangedFiles.length - check.relevantFiles.length})
                                      </p>
                                      <ul className="list-disc list-inside text-slate-500 ml-4">
                                        {check.allChangedFiles
                                          .filter((file: string) => !check.relevantFiles.includes(file))
                                          .map((file: string, idx: number) => (
                                            <li key={idx} className="font-mono text-sm">
                                              {file}
                                            </li>
                                          ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  {/* Show all files when none are relevant */}
                                  {(!check.relevantFiles || check.relevantFiles.length === 0) && (
                                    <div>
                                      <p className="text-sm font-semibold text-slate-500 mb-2">
                                        All changed files:
                                      </p>
                                      <ul className="list-disc list-inside text-slate-500 ml-4">
                                        {check.allChangedFiles.map((file: string, idx: number) => (
                                          <li key={idx} className="font-mono text-sm">
                                            {file}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Files Sent to LLM */}
                            {check.filesInFilteredDiff && check.filesInFilteredDiff.length > 0 && 
                             check.filesInFilteredDiff.length !== check.relevantFiles?.length && (
                              <div>
                                <h4 className="text-sm font-semibold text-slate-400 mb-2">
                                  Files Sent to LLM ({check.filesInFilteredDiff.length})
                                </h4>
                                <p className="text-xs text-slate-500 mb-2">
                                  Note: Some relevant files may not appear in the diff if they had no actual code changes.
                                </p>
                                <ul className="list-disc list-inside text-slate-300 bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                                  {check.filesInFilteredDiff.map((file: string, idx: number) => (
                                    <li key={idx} className="font-mono text-sm">
                                      {file}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Filtered Diff */}
                            {check.filteredDiff !== null && check.filteredDiff !== undefined && (
                              <details className="group">
                                <summary className="cursor-pointer text-sm font-semibold text-slate-400 mb-2 hover:text-slate-300 transition-colors">
                                  Filtered Diff
                                </summary>
                                <div className="mt-2 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                                  {check.filteredDiff && check.filteredDiff.trim() ? (
                                    <DiffViewer diff={check.filteredDiff} />
                                  ) : (
                                    <div className="p-6 text-center">
                                      <p className="text-slate-400 text-sm">
                                        None of the files that were changed matched this threadline's patterns, so there is no filtered diff to display.
                                      </p>
                                      {check.relevantFiles && check.relevantFiles.length === 0 && (
                                        <p className="text-slate-500 text-xs mt-2">
                                          This threadline checks files matching: {check.patterns?.join(', ') || 'no patterns'}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </details>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </section>
    </main>
  );
}

