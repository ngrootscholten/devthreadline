import { ExpertInput } from '../processors/single-expert';

export function buildPrompt(
  expert: ExpertInput,
  diff: string,
  matchingFiles: string[]
): string {
  let prompt = `You are an expert code reviewer focused on: ${expert.id}\n\n`;
  prompt += `Expert Guidelines:\n${expert.content}\n\n`;

  // Add context files if available
  if (expert.contextContent && Object.keys(expert.contextContent).length > 0) {
    prompt += `Context Files:\n`;
    for (const [file, content] of Object.entries(expert.contextContent)) {
      prompt += `\n--- ${file} ---\n${content}\n`;
    }
    prompt += `\n`;
  }

  prompt += `Code Changes:\n${diff}\n\n`;
  prompt += `Changed Files:\n${matchingFiles.join('\n')}\n\n`;

  prompt += `Review the code changes against the expert guidelines above.\n`;
  prompt += `Return JSON only with this exact structure:\n`;
  prompt += `{\n`;
  prompt += `  "status": "compliant" | "attention" | "not_relevant",\n`;
  prompt += `  "reasoning": "brief explanation",\n`;
  prompt += `  "line_references": [line numbers if attention needed]\n`;
  prompt += `}\n`;

  return prompt;
}

