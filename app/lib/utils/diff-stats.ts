/**
 * Utility functions for calculating statistics from diffs and threadlines
 */

export function countLinesInDiff(diff: string): { added: number; removed: number; total: number } {
  // Count lines that start with + or - (excluding the diff header lines)
  const lines = diff.split('\n');
  let added = 0;
  let removed = 0;
  
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      added++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      removed++;
    }
  }
  
  return { added, removed, total: added + removed };
}

export function calculateContextStats(threadlines: Array<{
  contextContent?: Record<string, string>;
}>): {
  fileCount: number;
  totalLines: number;
  files: Array<{ path: string; lines: number }>;
} {
  const contextFiles: Map<string, number> = new Map();
  
  for (const threadline of threadlines) {
    if (threadline.contextContent) {
      for (const [filePath, content] of Object.entries(threadline.contextContent)) {
        const lines = content.split('\n').length;
        // If file appears in multiple threadlines, take the max (should be same, but just in case)
        const existing = contextFiles.get(filePath) || 0;
        contextFiles.set(filePath, Math.max(existing, lines));
      }
    }
  }
  
  const files = Array.from(contextFiles.entries()).map(([path, lines]) => ({ path, lines }));
  const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
  
  return {
    fileCount: files.length,
    totalLines,
    files
  };
}
