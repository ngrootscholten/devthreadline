export interface ExpertResult {
  expertId: string;
  status: 'compliant' | 'attention' | 'not_relevant';
  reasoning?: string;
  lineReferences?: number[];
  fileReferences?: string[];
}

