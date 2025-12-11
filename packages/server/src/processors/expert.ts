import { processExpert } from './single-expert';
import { ExpertResult } from '../types/result';

export interface ProcessExpertsRequest {
  experts: Array<{
    id: string;
    version: string;
    patterns: string[];
    content: string;
    contextFiles?: string[];
    contextContent?: Record<string, string>;
  }>;
  diff: string;
  files: string[];
  apiKey: string;
}

export interface ProcessExpertsResponse {
  results: ExpertResult[];
  metadata: {
    totalExperts: number;
    completed: number;
    timedOut: number;
    errors: number;
  };
}

const EXPERT_TIMEOUT = 40000; // 40 seconds

export async function processExperts(request: ProcessExpertsRequest): Promise<ProcessExpertsResponse> {
  const { experts, diff, files, apiKey } = request;
  
  // Create promises with timeout
  const promises = experts.map(expert => 
    Promise.race([
      processExpert(expert, diff, files, apiKey),
      new Promise<ExpertResult>((resolve) => 
        setTimeout(() => {
          resolve({
            expertId: expert.id,
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
    const expert = experts[i];

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
        expertId: expert.id,
        status: 'not_relevant',
        reasoning: `Error: ${result.reason?.message || 'Unknown error'}`
      });
    }
  }

  // Filter out "not_relevant" for final results
  const filteredResults = expertResults.filter(r => r.status !== 'not_relevant');

  return {
    results: filteredResults,
    metadata: {
      totalExperts: experts.length,
      completed,
      timedOut,
      errors
    }
  };
}

