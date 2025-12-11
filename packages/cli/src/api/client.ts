import axios, { AxiosInstance } from 'axios';

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

export interface ExpertResult {
  expertId: string;
  status: 'compliant' | 'attention' | 'not_relevant';
  reasoning?: string;
  lineReferences?: number[];
  fileReferences?: string[];
}

export interface ReviewResponse {
  results: ExpertResult[];
  metadata: {
    totalExperts: number;
    completed: number;
    timedOut: number;
    errors: number;
  };
}

export class ReviewAPIClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 60000, // 60s timeout for entire request
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async review(request: ReviewRequest): Promise<ReviewResponse> {
    try {
      const response = await this.client.post<ReviewResponse>('/api/threadline-check', request);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`API error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error(`Network error: Could not reach Threadline server at ${this.client.defaults.baseURL}`);
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }
}

