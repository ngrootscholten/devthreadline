export interface Expert {
  id: string;
  version: string;
  patterns: string[];
  contextFiles?: string[];
  content: string;
  filePath: string;
}

export interface ExpertValidationResult {
  valid: boolean;
  expert?: Expert;
  errors?: string[];
}

