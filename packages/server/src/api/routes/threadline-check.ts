import { Request, Response } from 'express';
import { processThreadlines } from '../../processors/expert';

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

export async function threadlineCheckRoute(req: Request, res: Response) {
  console.log(`📥 Received request: ${req.method} ${req.path}`);
  console.log(`   Threadlines: ${req.body?.threadlines?.length || 0}`);
  console.log(`   Files: ${req.body?.files?.length || 0}`);
  
  try {
    const request: ReviewRequest = req.body;

    // Validate request
    if (!request.threadlines || !Array.isArray(request.threadlines) || request.threadlines.length === 0) {
      return res.status(400).json({ error: 'threadlines array is required and cannot be empty' });
    }

    if (!request.diff && typeof request.diff !== 'string') {
      return res.status(400).json({ error: 'diff is required' });
    }

    if (!request.files || !Array.isArray(request.files)) {
      return res.status(400).json({ error: 'files array is required' });
    }

    // Get API key from server environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error: OPENAI_API_KEY not set' });
    }

    // Process threadlines
    const result = await processThreadlines({ ...request, apiKey });

    console.log(`✅ Processed: ${result.results.length} results, ${result.metadata.completed} completed, ${result.metadata.timedOut} timed out, ${result.metadata.errors} errors`);
    
    res.json(result);
  } catch (error: any) {
    console.error('Error processing review:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

