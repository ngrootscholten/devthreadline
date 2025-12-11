import OpenAI from 'openai';
import { ExpertResult } from '../types/result';
import { buildPrompt } from '../llm/prompt-builder';

export interface ExpertInput {
  id: string;
  version: string;
  patterns: string[];
  content: string;
  contextFiles?: string[];
  contextContent?: Record<string, string>;
}

export async function processExpert(
  expert: ExpertInput,
  diff: string,
  files: string[],
  apiKey: string
): Promise<ExpertResult> {
  const openai = new OpenAI({ apiKey });

  // Filter files that match expert patterns
  const matchingFiles = files.filter(file => 
    expert.patterns.some(pattern => matchesPattern(file, pattern))
  );

  // If no files match, return not_relevant
  if (matchingFiles.length === 0) {
    return {
      expertId: expert.id,
      status: 'not_relevant',
      reasoning: 'No files match expert patterns'
    };
  }

  // Build prompt
  const prompt = buildPrompt(expert, diff, matchingFiles);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a code reviewer. Return only valid JSON, no other text.'
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

    const parsed = JSON.parse(content);
    
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
      expertId: expert.id,
      status: parsed.status || 'not_relevant',
      reasoning: parsed.reasoning,
      lineReferences: parsed.line_references,
      fileReferences: fileReferences.length > 0 ? fileReferences : matchingFiles
    };
  } catch (error: any) {
    return {
      expertId: expert.id,
      status: 'not_relevant',
      reasoning: `Error processing expert: ${error.message}`
    };
  }
}

function matchesPattern(filePath: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.');
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}

