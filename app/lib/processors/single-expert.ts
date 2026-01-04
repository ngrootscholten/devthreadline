import OpenAI from 'openai';
import { ExpertResult } from '../types/result';
import { buildPrompt } from '../llm/prompt-builder';
import { filterDiffByFiles, extractFilesFromDiff } from '../utils/diff-filter';
import { createSlimDiff } from '../utils/slim-diff';

export interface ThreadlineInput {
  id: string;
  version: string;
  patterns: string[];
  content: string;
  contextFiles?: string[];
  contextContent?: Record<string, string>;
}

export interface ProcessThreadlineResult extends ExpertResult {
  relevantFiles: string[]; // Files that matched threadline patterns
  filteredDiff: string; // The actual diff sent to LLM (filtered to only relevant files)
  filesInFilteredDiff: string[]; // Files actually present in the filtered diff sent to LLM
  llmCallMetrics?: {
    startedAt: string; // ISO 8601
    finishedAt: string; // ISO 8601
    responseTimeMs: number;
    tokens?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    } | null;
    status: 'success' | 'timeout' | 'error';
    errorMessage?: string | null;
  };
}

export async function processThreadline(
  threadline: ThreadlineInput,
  diff: string,
  files: string[],
  apiKey: string
): Promise<ProcessThreadlineResult> {
  const openai = new OpenAI({ apiKey });

  // Filter files that match threadline patterns
  const relevantFiles = files.filter(file => 
    threadline.patterns.some(pattern => matchesPattern(file, pattern))
  );

  // If no files match, return not_relevant
  if (relevantFiles.length === 0) {
    console.log(`   ⚠️  ${threadline.id}: No files matched patterns ${threadline.patterns.join(', ')}`);
    console.log(`      Files checked: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
    return {
      expertId: threadline.id,
      status: 'not_relevant',
      reasoning: `No files match threadline patterns: ${threadline.patterns.join(', ')}`,
      fileReferences: [],
      relevantFiles: [],
      filteredDiff: '',
      filesInFilteredDiff: []
    };
  }

  // Filter diff to only include relevant files
  const filteredDiff = filterDiffByFiles(diff, relevantFiles);
  
  // Extract files actually present in the filtered diff
  const filesInFilteredDiff = extractFilesFromDiff(filteredDiff);

  // Trim diff for LLM to reduce token costs (keep full diff for storage/UI)
  // The CLI sends diffs with -U200 (200 lines context), which can be expensive.
  // This trims the diff to only N context lines before sending to LLM.
  // Set DIFF_CONTEXT_LINES_FOR_LLM env var to control (default: 10 lines).
  // Note: Full filtered diff is still stored in DB for UI viewing.
  const contextLinesForLLM = parseInt(process.env.DIFF_CONTEXT_LINES_FOR_LLM || '10', 10);
  const trimmedDiffForLLM = createSlimDiff(filteredDiff, contextLinesForLLM);
  
  // Log diff trimming if it occurred
  const originalLines = filteredDiff.split('\n').length;
  const trimmedLines = trimmedDiffForLLM.split('\n').length;
  if (trimmedLines < originalLines) {
    const reductionPercent = Math.round(((originalLines - trimmedLines) / originalLines) * 100);
    console.log(`   ✂️  Trimmed diff for LLM: ${originalLines} → ${trimmedLines} lines (${reductionPercent}% reduction, ${contextLinesForLLM} context lines)`);
  }

  // Build prompt with trimmed diff (full filtered diff is still stored for UI)
  const prompt = buildPrompt(threadline, trimmedDiffForLLM, filesInFilteredDiff);
  
  console.log(`   📝 Processing ${threadline.id}: ${relevantFiles.length} relevant files, ${filesInFilteredDiff.length} files in filtered diff`);

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  console.log(`   🤖 Calling LLM (${model}) for ${threadline.id}...`);
  
  // Capture timing for LLM call
  const llmCallStartedAt = new Date().toISOString();
  let llmCallFinishedAt: string;
  let llmCallResponseTimeMs: number;
  let llmCallTokens: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null = null;
  let llmCallStatus: 'success' | 'timeout' | 'error' = 'success';
  let llmCallErrorMessage: string | null = null;

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a code quality checker. Analyze code changes against the threadline guidelines. Be precise - only flag actual violations. Return only valid JSON, no other text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    });

    llmCallFinishedAt = new Date().toISOString();
    llmCallResponseTimeMs = new Date(llmCallFinishedAt).getTime() - new Date(llmCallStartedAt).getTime();
    
    // Capture token usage if available
    if (response.usage) {
      llmCallTokens = {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens
      };
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from LLM');
    }

    console.log(`   📄 Raw LLM response: ${content.substring(0, 200)}...`);
    
    const parsed = JSON.parse(content);
    
    console.log(`   ✅ Parsed: status=${parsed.status}, reasoning=${parsed.reasoning?.substring(0, 100)}...`);
    
    // Extract file references - rely entirely on LLM to provide them
    let fileReferences: string[] = [];
    
    if (parsed.file_references && Array.isArray(parsed.file_references) && parsed.file_references.length > 0) {
      // LLM provided file references - validate they're in filesInFilteredDiff
      fileReferences = parsed.file_references.filter((file: string) => filesInFilteredDiff.includes(file));
      if (parsed.file_references.length !== fileReferences.length) {
        console.log(`   ⚠️  Warning: LLM provided ${parsed.file_references.length} file references, but only ${fileReferences.length} match the files sent to LLM`);
      }
    } else {
      // LLM did not provide file_references
      const status = parsed.status || 'not_relevant';
      
      if (status === 'attention') {
        // This is a problem - we have violations but don't know which files
        console.error(`   ❌ Error: LLM returned "attention" status but no file_references for threadline ${threadline.id}`);
        console.error(`   Cannot accurately report violations without file references. This may indicate a prompt/LLM issue.`);
        // Return empty file references - better than guessing
        fileReferences = [];
      }
      // For "compliant" or "not_relevant" status, file references are optional
    }

    return {
      expertId: threadline.id,
      status: parsed.status || 'not_relevant',
      reasoning: parsed.reasoning,
      fileReferences: fileReferences,
      relevantFiles: relevantFiles,
      filteredDiff: filteredDiff,
      filesInFilteredDiff: filesInFilteredDiff,
      llmCallMetrics: {
        startedAt: llmCallStartedAt,
        finishedAt: llmCallFinishedAt,
        responseTimeMs: llmCallResponseTimeMs,
        tokens: llmCallTokens,
        status: llmCallStatus,
        errorMessage: llmCallErrorMessage
      }
    };
  } catch (error: any) {
    // Capture error timing
    llmCallFinishedAt = new Date().toISOString();
    llmCallResponseTimeMs = new Date(llmCallFinishedAt).getTime() - new Date(llmCallStartedAt).getTime();
    llmCallStatus = 'error';
    llmCallErrorMessage = error?.message || 'Unknown error';
    
    // Return error result with metrics instead of throwing
    // This allows metrics to be captured even when LLM call fails
    return {
      expertId: threadline.id,
      status: 'not_relevant',
      reasoning: `Error: ${error?.message || 'Unknown error'}`,
      fileReferences: [],
      relevantFiles: relevantFiles,
      filteredDiff: filteredDiff,
      filesInFilteredDiff: filesInFilteredDiff,
      llmCallMetrics: {
        startedAt: llmCallStartedAt,
        finishedAt: llmCallFinishedAt,
        responseTimeMs: llmCallResponseTimeMs,
        tokens: llmCallTokens,
        status: llmCallStatus,
        errorMessage: llmCallErrorMessage
      }
    };
  }
}

function matchesPattern(filePath: string, pattern: string): boolean {
  // Convert glob pattern to regex
  // Handle ** first (before single *), escape it to avoid double replacement
  let regexPattern = pattern
    .replace(/\*\*/g, '__DOUBLE_STAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/__DOUBLE_STAR__/g, '.*')
    .replace(/\?/g, '.');
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}

