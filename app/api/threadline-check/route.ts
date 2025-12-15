import { NextRequest, NextResponse } from 'next/server';
import { processThreadlines } from '../../lib/processors/expert';

export interface ReviewRequest {
  threadlines: Array<{
    id: string;
    version: string;
    patterns: string[];
    content: string;
    contextFiles?: string[];
    contextContent?: Record<string, string>;
  }>;
  diff: string;
  files: string[];
}

function countLinesInDiff(diff: string): { added: number; removed: number; total: number } {
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

function calculateContextStats(threadlines: ReviewRequest['threadlines']): {
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

export async function POST(req: NextRequest) {
  try {
    const request: ReviewRequest = await req.json();

    // Calculate audit statistics
    const diffStats = countLinesInDiff(request.diff);
    const changedFilesCount = request.files.length;
    const contextStats = calculateContextStats(request.threadlines);
    
    // Audit logging
    console.log(`📥 Received request: POST /api/threadline-check`);
    console.log(`📊 Audit Statistics:`);
    console.log(`   Code Changes:`);
    console.log(`     - Files changed: ${changedFilesCount}`);
    console.log(`     - Lines added: ${diffStats.added}`);
    console.log(`     - Lines removed: ${diffStats.removed}`);
    console.log(`     - Total lines changed: ${diffStats.total}`);
    console.log(`   Changed Files Sent:`);
    console.log(`     - Count: ${changedFilesCount}`);
    // Calculate total lines in changed files (approximate from diff)
    const changedFilesTotalLines = request.files.length > 0 ? diffStats.total : 0;
    console.log(`     - Total lines (from diff): ${changedFilesTotalLines}`);
    console.log(`   Context Files:`);
    console.log(`     - Count: ${contextStats.fileCount}`);
    console.log(`     - Total lines: ${contextStats.totalLines}`);
    if (contextStats.files.length > 0) {
      console.log(`     - Files: ${contextStats.files.map(f => `${f.path} (${f.lines} lines)`).join(', ')}`);
    }
    console.log(`   Threadlines: ${request.threadlines?.length || 0}`);

    // Validate request
    if (!request.threadlines || !Array.isArray(request.threadlines) || request.threadlines.length === 0) {
      return NextResponse.json(
        { error: 'threadlines array is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (!request.diff || typeof request.diff !== 'string') {
      return NextResponse.json(
        { error: 'diff is required' },
        { status: 400 }
      );
    }

    if (!request.files || !Array.isArray(request.files)) {
      return NextResponse.json(
        { error: 'files array is required' },
        { status: 400 }
      );
    }

    // Get API key from server environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server configuration error: OPENAI_API_KEY not set' },
        { status: 500 }
      );
    }

    // Process threadlines
    const result = await processThreadlines({ ...request, apiKey });

    console.log(`✅ Processed: ${result.results.length} results, ${result.metadata.completed} completed, ${result.metadata.timedOut} timed out, ${result.metadata.errors} errors`);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ ERROR processing threadline-check:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

