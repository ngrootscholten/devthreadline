"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import "react-diff-view/style/index.css";
import ReactMarkdown from "react-markdown";
import { DiffViewer } from "../../components/DiffViewer";

interface CheckSummary {
  id: string;
  repoName: string | null;
  branchName: string | null;
  commitSha: string | null;
  reviewContext: string | null;
  environment: string | null;
  llmModel: string | null;
  cliVersion: string | null;
  diffStats: {
    added: number;
    removed: number;
    total: number;
  };
  filesChangedCount: number;
  contextFilesCount: number;
  contextFilesTotalLines: number;
  threadlinesCount: number;
  createdAt: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    notRelevant: number;
    allPassed: boolean;
  };
  threadlines: Array<{
    checkThreadlineId: string;
    threadlineId: string;
    threadlineDefinitionId: string;
    version: string;
    status: string;
    resultId: string | null;
    hasViolations: boolean;
    fileReferences: string[];
  }>;
}

interface ThreadlineDetail {
  checkThreadlineId: string;
  threadlineId: string;
  threadlineDefinitionId: string;
  version: string;
  patterns: string[];
  content: string;
  contextFiles: any;
  contextContent: any;
  relevantFiles: string[];
  filteredDiff: string | null;
  filesInFilteredDiff: string[];
  allChangedFiles?: string[];
  result: {
    id: string;
    status: string;
    reasoning: string | null;
    fileReferences: string[] | null;
  } | null;
}

export default function CheckDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const checkId = params.id as string;

  const [check, setCheck] = useState<CheckSummary | null>(null);
  const [expandedThreadlines, setExpandedThreadlines] = useState<Set<string>>(new Set());
  const [threadlineDetails, setThreadlineDetails] = useState<Map<string, ThreadlineDetail>>(new Map());
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && checkId) {
      fetchCheck();
    } else if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, checkId]);

  const fetchCheck = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/checks/${checkId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Check not found");
        }
        throw new Error("Failed to fetch check details");
      }

      const data = await response.json();
      setCheck(data.check);
    } catch (err: any) {
      setError(err.message || "Failed to load check details");
    } finally {
      setLoading(false);
    }
  };

  const fetchThreadlineDetail = async (threadlineId: string) => {
    if (threadlineDetails.has(threadlineId)) {
      return; // Already loaded
    }

    setLoadingDetails(prev => new Set(prev).add(threadlineId));

    try {
      const response = await fetch(`/api/checks/${checkId}/threadlines/${threadlineId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch threadline details");
      }

      const data = await response.json();
      setThreadlineDetails(prev => new Map(prev).set(threadlineId, data.threadline));
    } catch (err: any) {
      console.error(`Failed to load threadline ${threadlineId}:`, err);
    } finally {
      setLoadingDetails(prev => {
        const next = new Set(prev);
        next.delete(threadlineId);
        return next;
      });
    }
  };

  const toggleThreadline = (threadlineId: string) => {
    const newExpanded = new Set(expandedThreadlines);
    if (newExpanded.has(threadlineId)) {
      newExpanded.delete(threadlineId);
    } else {
      newExpanded.add(threadlineId);
      fetchThreadlineDetail(threadlineId);
    }
    setExpandedThreadlines(newExpanded);
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

  if (error || !check) {
    return (
      <main className="min-h-screen">
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
            <div className="mb-6">
              <Link href="/dashboard" className="text-green-400 hover:text-green-300 transition-colors">
                ← Back to Dashboard
              </Link>
            </div>
            <p className="text-red-400">{error || "Check not found"}</p>
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "attention":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "not_relevant":
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
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
        <div className="mb-6">
          <Link href="/dashboard" className="text-green-400 hover:text-green-300 transition-colors">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
          {/* Summary Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4 text-white">Check Summary</h1>
            <p className="text-slate-400 mb-6">{formatDate(check.createdAt)}</p>

            {/* Enhanced Statistics Panel with Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 p-6 bg-slate-950/50 rounded-lg border border-slate-800 mb-6">
              <div>
                <p className="text-sm text-slate-400">Failed</p>
                <p className="text-2xl font-bold text-yellow-400">{check.summary.failed}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Passed</p>
                <p className="text-2xl font-bold text-green-400">{check.summary.passed}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Not Relevant</p>
                <p className="text-2xl font-bold text-slate-400">{check.summary.notRelevant}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Total</p>
                <p className="text-2xl font-bold text-white">{check.summary.total}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Files Changed</p>
                <p className="text-2xl font-bold text-white">{check.filesChangedCount}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Lines Changed</p>
                <p className="text-2xl font-bold text-white">
                  {check.diffStats.total > 0 
                    ? `${check.diffStats.added > 0 ? `+${check.diffStats.added}` : ''}${check.diffStats.removed > 0 ? `-${check.diffStats.removed}` : ''}`
                    : '0'
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Context Files</p>
                <p className="text-2xl font-bold text-white">{check.contextFilesCount}</p>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h2 className="text-sm font-semibold text-slate-400 mb-2">Repository</h2>
                <p className="text-white font-mono text-sm">
                  {check.repoName ? check.repoName.replace("https://github.com/", "").replace(".git", "") : <span className="text-slate-500">—</span>}
                </p>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-400 mb-2">Branch</h2>
                <p className="text-white font-mono">{check.branchName || <span className="text-slate-500">—</span>}</p>
              </div>
              {check.commitSha && (
                <div>
                  <h2 className="text-sm font-semibold text-slate-400 mb-2">Commit</h2>
                  <p className="text-white font-mono text-sm">{check.commitSha.substring(0, 7)}</p>
                </div>
              )}
              <div>
                <h2 className="text-sm font-semibold text-slate-400 mb-2">Review Context</h2>
                <p className="text-white">{check.reviewContext || <span className="text-slate-500">—</span>}</p>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-400 mb-2">Environment</h2>
                {getEnvironmentBadge(check.environment) || <span className="text-slate-500">—</span>}
              </div>
              {check.llmModel && (
                <div>
                  <h2 className="text-sm font-semibold text-slate-400 mb-2">LLM Model</h2>
                  <p className="text-white font-mono text-sm">{check.llmModel}</p>
                </div>
              )}
              {check.cliVersion && (
                <div>
                  <h2 className="text-sm font-semibold text-slate-400 mb-2">CLI Version</h2>
                  <p className="text-white font-mono text-sm">{check.cliVersion}</p>
                </div>
              )}
            </div>
          </div>

          {/* Threadlines List */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">Threadlines ({check.threadlines.length})</h2>
            {check.threadlines.map((threadline) => {
              const isExpanded = expandedThreadlines.has(threadline.threadlineId);
              const detail = threadlineDetails.get(threadline.threadlineId);
              const isLoading = loadingDetails.has(threadline.threadlineId);

              return (
                <div
                  key={threadline.checkThreadlineId}
                  className="border border-slate-800 rounded-lg bg-slate-950/30 overflow-hidden"
                >
                  {/* Collapsed Summary */}
                  <div 
                    onClick={() => toggleThreadline(threadline.threadlineId)}
                    className="w-full p-4 hover:bg-slate-800/50 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(threadline.status)}`}>
                        {threadline.status}
                      </span>
                      <div className="flex-1">
                        <Link
                          href={`/threadlines/${threadline.threadlineDefinitionId}?fromCheck=${checkId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-lg font-semibold text-white hover:underline"
                        >
                          {threadline.threadlineId}
                        </Link>
                        <p className="text-sm text-slate-400">Version {threadline.version}</p>
                      </div>
                    </div>
                    <div className="p-2">
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
                      {isLoading && (
                        <div className="text-center py-8">
                          <p className="text-slate-400">Loading threadline details...</p>
                        </div>
                      )}
                      {!isLoading && detail && (
                        <div className="space-y-6">
                          {/* Result Details - Most Important */}
                          {detail.result ? (
                            <div>
                              <h4 className="text-sm font-semibold text-slate-400 mb-2">Result</h4>
                              <div className={`p-4 rounded-lg border ${getStatusColor(detail.result.status)}`}>
                                <p className="text-sm font-semibold mb-2">
                                  Status: {detail.result.status}
                                </p>
                                {detail.result.reasoning && (
                                  <div>
                                    <p className="text-sm font-semibold text-slate-400 mb-1">Reasoning</p>
                                    <p className="text-slate-300 whitespace-pre-wrap text-sm">
                                      {detail.result.reasoning}
                                    </p>
                                  </div>
                                )}
                                {detail.result.fileReferences && detail.result.fileReferences.length > 0 && (
                                  <div className="mt-3">
                                    <p className="text-sm font-semibold text-slate-400 mb-1">Files with Violations</p>
                                    <ul className="list-disc list-inside text-slate-300">
                                      {detail.result.fileReferences.map((file: string, idx: number) => (
                                        <li key={idx} className="font-mono text-sm">
                                          {file}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-slate-500 text-sm">
                              No result available
                            </div>
                          )}

                          {/* Files Changed vs Relevant Files */}
                          {detail.allChangedFiles && detail.allChangedFiles.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-slate-400 mb-2">
                                Files Changed ({detail.allChangedFiles.length})
                              </h4>
                              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 space-y-4">
                                {/* Relevant Files */}
                                {detail.relevantFiles && detail.relevantFiles.length > 0 ? (
                                  <div>
                                    <p className="text-sm font-semibold text-green-400 mb-2">
                                      ✓ Relevant to this threadline ({detail.relevantFiles.length})
                                    </p>
                                    <ul className="list-disc list-inside text-slate-300 ml-4">
                                      {detail.relevantFiles.map((file: string, idx: number) => (
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
                                      Patterns: {detail.patterns?.join(', ') || 'none'}
                                    </p>
                                  </div>
                                )}
                                
                                {/* Not Relevant Files */}
                                {detail.relevantFiles && detail.relevantFiles.length > 0 && detail.relevantFiles.length < detail.allChangedFiles.length && (
                                  <div className="border-t border-slate-700 pt-4">
                                    <p className="text-sm font-semibold text-slate-500 mb-2">
                                      Not relevant ({detail.allChangedFiles.length - detail.relevantFiles.length})
                                    </p>
                                    <ul className="list-disc list-inside text-slate-500 ml-4">
                                      {detail.allChangedFiles
                                        .filter((file: string) => !detail.relevantFiles.includes(file))
                                        .map((file: string, idx: number) => (
                                          <li key={idx} className="font-mono text-sm">
                                            {file}
                                          </li>
                                        ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {/* Show all files when none are relevant */}
                                {(!detail.relevantFiles || detail.relevantFiles.length === 0) && (
                                  <div>
                                    <p className="text-sm font-semibold text-slate-500 mb-2">
                                      All changed files:
                                    </p>
                                    <ul className="list-disc list-inside text-slate-500 ml-4">
                                      {detail.allChangedFiles.map((file: string, idx: number) => (
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
                          
                          {/* Files Sent to LLM (if different from relevant files) */}
                          {detail.filesInFilteredDiff && detail.filesInFilteredDiff.length > 0 && 
                           detail.filesInFilteredDiff.length !== detail.relevantFiles?.length && (
                            <div>
                              <h4 className="text-sm font-semibold text-slate-400 mb-2">
                                Files Sent to LLM ({detail.filesInFilteredDiff.length})
                              </h4>
                              <p className="text-xs text-slate-500 mb-2">
                                Note: Some relevant files may not appear in the diff if they had no actual code changes.
                              </p>
                              <ul className="list-disc list-inside text-slate-300 bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                                {detail.filesInFilteredDiff.map((file: string, idx: number) => (
                                  <li key={idx} className="font-mono text-sm">
                                    {file}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Context Files (renamed from Relevant Files) */}
                          {detail.relevantFiles && detail.relevantFiles.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-slate-400 mb-2">
                                Context Files ({detail.relevantFiles.length})
                              </h4>
                              <ul className="list-disc list-inside text-slate-300 bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                                {detail.relevantFiles.map((file: string, idx: number) => (
                                  <li key={idx} className="font-mono text-sm">
                                    {file}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Filtered Diff - Collapsed by default */}
                          {detail.filteredDiff !== null && detail.filteredDiff !== undefined && (
                            <details className="group">
                              <summary className="cursor-pointer text-sm font-semibold text-slate-400 mb-2 hover:text-slate-300 transition-colors">
                                Filtered Diff
                              </summary>
                              <div className="mt-2 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                                {detail.filteredDiff && detail.filteredDiff.trim() ? (
                                  <DiffViewer diff={detail.filteredDiff} />
                                ) : (
                                  <div className="p-6 text-center">
                                    <p className="text-slate-400 text-sm">
                                      None of the files that were changed matched this threadline's patterns, so there is no filtered diff to display.
                                    </p>
                                    {detail.relevantFiles && detail.relevantFiles.length === 0 && (
                                      <p className="text-slate-500 text-xs mt-2">
                                        This threadline checks files matching: {detail.patterns?.join(', ') || 'no patterns'}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </details>
                          )}

                          {/* Threadline Guidelines - Collapsed by default */}
                          {detail.content && (
                            <details className="group">
                              <summary className="cursor-pointer text-sm font-semibold text-slate-400 mb-2 hover:text-slate-300 transition-colors">
                                Threadline Guidelines
                              </summary>
                              <div className="mt-2 prose prose-invert prose-sm max-w-none bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                                <ReactMarkdown className="text-slate-300">
                                  {detail.content}
                                </ReactMarkdown>
                              </div>
                            </details>
                          )}
                        </div>
                      )}
                      {!isLoading && !detail && (
                        <div className="text-red-400 text-sm">
                          Failed to load threadline details
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
