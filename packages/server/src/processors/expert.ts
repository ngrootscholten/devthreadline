import { processThreadline } from './single-expert';
import { ExpertResult } from '../types/result';

export interface ProcessThreadlinesRequest {
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
  apiKey: string; // Passed from server route, not from CLI
}

export interface ProcessThreadlinesResponse {
  results: ExpertResult[];
  metadata: {
    totalThreadlines: number;
    completed: number;
    timedOut: number;
    errors: number;
  };
}

const EXPERT_TIMEOUT = 40000; // 40 seconds

export async function processThreadlines(request: ProcessThreadlinesRequest): Promise<ProcessThreadlinesResponse> {
  const { threadlines, diff, files, apiKey } = request;
  
  // Create promises with timeout
  const promises = threadlines.map(threadline => 
    Promise.race([
      processThreadline(threadline, diff, files, apiKey),
      new Promise<ExpertResult>((resolve) => 
        setTimeout(() => {
          resolve({
            expertId: threadline.id,
            status: 'not_relevant',
            reasoning: 'Request timed out after 40s'
          });
        }, EXPERT_TIMEOUT)
      )
    ])
  );

  // Wait for all (some may timeout)
  const results = await Promise.allSettled(promises);

  // Process results
  const expertResults: ExpertResult[] = [];
  let completed = 0;
  let timedOut = 0;
  let errors = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const threadline = threadlines[i];

    if (result.status === 'fulfilled') {
      const expertResult = result.value;
      // Check if it timed out (has timeout message)
      if (expertResult.reasoning?.includes('timed out')) {
        timedOut++;
      } else {
        completed++;
      }
      expertResults.push(expertResult);
    } else {
      errors++;
      expertResults.push({
        expertId: threadline.id,
        status: 'not_relevant',
        reasoning: `Error: ${result.reason?.message || 'Unknown error'}`
      });
    }
  }

  // Return all results - CLI will handle filtering/display
  return {
    results: expertResults,
    metadata: {
      totalThreadlines: threadlines.length,
      completed,
      timedOut,
      errors
    }
  };
}

