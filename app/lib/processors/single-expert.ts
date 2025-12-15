import OpenAI from 'openai';
import { ExpertResult } from '../types/result';
import { buildPrompt } from '../llm/prompt-builder';

export interface ThreadlineInput {
  id: string;
  version: string;
  patterns: string[];
  content: string;
  contextFiles?: string[];
  contextContent?: Record<string, string>;
}

export async function processThreadline(
  threadline: ThreadlineInput,
  diff: string,
  files: string[],
  apiKey: string
): Promise<ExpertResult> {
  const openai = new OpenAI({ apiKey });

  // Filter files that match threadline patterns
  const matchingFiles = files.filter(file => 
    threadline.patterns.some(pattern => matchesPattern(file, pattern))
  );

  // If no files match, return not_relevant
  if (matchingFiles.length === 0) {
    console.log(`   ⚠️  ${threadline.id}: No files matched patterns ${threadline.patterns.join(', ')}`);
    console.log(`      Files checked: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
    return {
      expertId: threadline.id,
      status: 'not_relevant',
      reasoning: `No files match threadline patterns: ${threadline.patterns.join(', ')}`
    };
  }

  // Build prompt
  const prompt = buildPrompt(threadline, diff, matchingFiles);
  
  console.log(`   📝 Processing ${threadline.id}: ${matchingFiles.length} matching files`);

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  console.log(`   🤖 Calling LLM (${model}) for ${threadline.id}...`);
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a code quality checker. Return only valid JSON, no other text.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from LLM');
  }

  console.log(`   📄 Raw LLM response: ${content.substring(0, 200)}...`);
  
  const parsed = JSON.parse(content);
  
  console.log(`   ✅ Parsed: status=${parsed.status}, reasoning=${parsed.reasoning?.substring(0, 100)}...`);
  
  // Extract file references from line references if possible
  const fileReferences: string[] = [];
  if (parsed.line_references && Array.isArray(parsed.line_references)) {
    // Try to match line numbers to files (simplified - would need more sophisticated parsing)
    matchingFiles.forEach(file => {
      if (diff.includes(file)) {
        fileReferences.push(file);
      }
    });
  }

  return {
    expertId: threadline.id,
    status: parsed.status || 'not_relevant',
    reasoning: parsed.reasoning,
    lineReferences: parsed.line_references,
    fileReferences: fileReferences.length > 0 ? fileReferences : matchingFiles
  };
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

