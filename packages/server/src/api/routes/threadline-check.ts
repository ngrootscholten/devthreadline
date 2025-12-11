import { Request, Response } from 'express';
import { processExperts } from '../../processors/expert';

export interface ReviewRequest {
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

export async function threadlineCheckRoute(req: Request, res: Response) {
  try {
    const request: ReviewRequest = req.body;

    // Validate request
    if (!request.experts || !Array.isArray(request.experts) || request.experts.length === 0) {
      return res.status(400).json({ error: 'experts array is required and cannot be empty' });
    }

    if (!request.diff && typeof request.diff !== 'string') {
      return res.status(400).json({ error: 'diff is required' });
    }

    if (!request.files || !Array.isArray(request.files)) {
      return res.status(400).json({ error: 'files array is required' });
    }

    if (!request.apiKey || typeof request.apiKey !== 'string') {
      return res.status(400).json({ error: 'apiKey is required' });
    }

    // Process experts
    const result = await processExperts(request);

    res.json(result);
  } catch (error: any) {
    console.error('Error processing review:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

