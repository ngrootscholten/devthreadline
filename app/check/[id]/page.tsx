"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Diff, Hunk, parseDiff } from "react-diff-view";
import "react-diff-view/style/index.css";
import ReactMarkdown from "react-markdown";

interface CheckDetail {
  id: string;
  repoName: string | null;
  branchName: string | null;
  commitSha: string | null;
  reviewContext: string | null;
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
  diff: string | null;
  diffFormat: string;
  threadlines: Array<{
    checkThreadlineId: string;
    threadlineId: string;
    version: string;
    patterns: string[];
    content: string;
    contextFiles: any;
    contextContent: any;
    result: {
      id: string;
      status: string;
      reasoning: string | null;
      lineReferences: number[] | null;
      fileReferences: string[] | null;
    } | null;
  }>;
}

export default function CheckDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const checkId = params.id as string;

  const [check, setCheck] = useState<CheckDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && checkId) {
      fetchCheck();
    } else if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, checkId]); // Only depend on status and checkId, not session object

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

  if (error || !check) {
    return (
      <main className="min-h-screen">
        <section className="max-w-7xl mx-auto px-6 py-24">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 md:p-12">
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
    return date.toLocaleString("en-US", {
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
        return "text-green-400";
      case "attention":
        return "text-yellow-400";
      case "not_relevant":
        return "text-slate-400";
      default:
        return "text-slate-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return "✓";
      case "attention":
        return "⚠";
      case "not_relevant":
        return "—";
      default:
        return "?";
    }
  };

  return (
    <main className="min-h-screen">
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="mb-6">
          <Link href="/dashboard" className="text-green-400 hover:text-green-300 transition-colors">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 md:p-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4 text-white">Check Details</h1>
            <p className="text-slate-400">{formatDate(check.createdAt)}</p>
          </div>

          {/* Metadata */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <h2 className="text-sm font-semibold text-slate-400 mb-2">Repository</h2>
              <p className="text-white font-mono">{check.repoName || <span className="text-slate-500">—</span>}</p>
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
          </div>

          {/* Statistics */}
          <div className="grid md:grid-cols-4 gap-4 mb-8 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
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
              <p className="text-sm text-slate-400">Threadlines</p>
              <p className="text-2xl font-bold text-white">{check.threadlinesCount}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Context Files</p>
              <p className="text-2xl font-bold text-white">{check.contextFilesCount}</p>
            </div>
          </div>

          {/* Threadlines and Results */}
          <div className="space-y-6 mb-8">
            <h2 className="text-2xl font-semibold text-white">Threadline Results</h2>
            {check.threadlines.map((threadline) => (
              <div
                key={threadline.checkThreadlineId}
                className="border border-slate-800 rounded-lg bg-slate-950/30 overflow-hidden"
              >
                {/* Summary - Always Visible */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {threadline.threadlineId}
                      </h3>
                      <p className="text-sm text-slate-400">Version {threadline.version}</p>
                      <p className="text-sm text-slate-400 mt-1">
                        Patterns: {Array.isArray(threadline.patterns) ? threadline.patterns.join(", ") : "—"}
                      </p>
                    </div>
                    {threadline.result && (
                      <div className={`text-lg font-semibold ${getStatusColor(threadline.result.status)}`}>
                        {getStatusIcon(threadline.result.status)} {threadline.result.status}
                      </div>
                    )}
                  </div>

                  {/* Expandable Threadline Content */}
                  {threadline.content && (
                    <details className="mt-4 group">
                      <summary className="cursor-pointer px-3 py-2 -mx-3 -my-2 rounded hover:bg-slate-800/50 transition-colors flex items-center justify-between select-none">
                        <span className="text-sm text-slate-400 group-open:text-slate-300">Guidelines</span>
                        <svg 
                          className="w-5 h-5 text-slate-500 group-open:text-slate-400 group-open:rotate-180 transition-transform" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="mt-3 pt-3 border-t border-slate-800">
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown className="text-slate-300">
                            {threadline.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </details>
                  )}

                  {/* Result Details */}
                  {threadline.result && (
                    <div className="mt-4 space-y-2">
                      {threadline.result.reasoning && (
                        <div>
                          <p className="text-sm font-semibold text-slate-400 mb-1">Reasoning</p>
                          <p className="text-slate-300 whitespace-pre-wrap">{threadline.result.reasoning}</p>
                        </div>
                      )}
                      {threadline.result.fileReferences && threadline.result.fileReferences.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-slate-400 mb-1">Files</p>
                          <ul className="list-disc list-inside text-slate-300">
                            {threadline.result.fileReferences.map((file, idx) => (
                              <li key={idx} className="font-mono text-sm">
                                {file}
                                {threadline.result?.lineReferences?.[idx] && (
                                  <span className="text-slate-500">:{threadline.result.lineReferences[idx]}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {!threadline.result && (
                    <p className="text-slate-500 text-sm mt-4">No result available</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Diff Content */}
          {check.diff && (() => {
            try {
              const files = parseDiff(check.diff);
              if (files.length === 0) return null;
              
              return (
                <div>
                  <h2 className="text-2xl font-semibold text-white mb-4">
                    Diff ({files.length} {files.length === 1 ? 'file' : 'files'})
                  </h2>
                  <div className="space-y-4">
                    {files.map((file, fileIdx) => (
                      <details key={fileIdx} open className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden group">
                        <summary className="bg-slate-800 px-4 py-2 cursor-pointer hover:bg-slate-750 select-none flex items-center gap-2">
                          <span className="text-slate-400 group-open:rotate-90 transition-transform">▶</span>
                          <span className="text-sm font-mono text-slate-300">
                            {file.newPath || file.oldPath || 'Unknown file'}
                          </span>
                        </summary>
                        <div className="p-4 overflow-x-auto">
                          <Diff
                            viewType="unified"
                            diffType={file.type}
                            hunks={file.hunks}
                          >
                            {(hunks) =>
                              hunks.map((hunk, idx) => (
                                <Hunk key={idx} hunk={hunk} />
                              ))
                            }
                          </Diff>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              );
            } catch (error) {
              console.error('Failed to parse diff:', error);
              return (
                <div>
                  <h2 className="text-2xl font-semibold text-white mb-4">Diff</h2>
                  <div className="bg-red-950 border border-red-800 rounded-lg p-4 mb-4">
                    <p className="text-red-400 font-semibold">
                      ⚠️ Parsing diff failed: {error instanceof Error ? error.message : 'Unknown error'}
                    </p>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto">
                    <p className="text-slate-400 text-sm mb-2">Raw diff content:</p>
                    <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap">
                      {check.diff}
                    </pre>
                  </div>
                </div>
              );
            }
          })()}
        </div>
      </section>
    </main>
  );
}

