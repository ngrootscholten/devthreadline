import { ThreadlineInput } from '../processors/single-expert';

export function buildPrompt(
  threadline: ThreadlineInput,
  diff: string,
  matchingFiles: string[]
): string {
  let prompt = `You are a code quality checker focused on: ${threadline.id}\n\n`;
  prompt += `Threadline Guidelines:\n${threadline.content}\n\n`;

  // Add context files if available
  if (threadline.contextContent && Object.keys(threadline.contextContent).length > 0) {
    prompt += `Context Files:\n`;
    for (const [file, content] of Object.entries(threadline.contextContent)) {
      prompt += `\n--- ${file} ---\n${content}\n`;
    }
    prompt += `\n`;
  }

  prompt += `Code Changes:\n${diff}\n\n`;
  prompt += `Changed Files:\n${matchingFiles.join('\n')}\n\n`;

  prompt += `Review the code changes against the threadline guidelines above.\n\n`;
  prompt += `Return JSON only with this exact structure:\n`;
  prompt += `{\n`;
  prompt += `  "status": "compliant" | "attention" | "not_relevant",\n`;
  prompt += `  "reasoning": "brief explanation",\n`;
  prompt += `  "line_references": [line numbers if attention needed]\n`;
  prompt += `}\n\n`;
  prompt += `Status meanings:\n`;
  prompt += `- "compliant": Code follows the guidelines, no issues found\n`;
  prompt += `- "attention": Code violates the guidelines, needs to be fixed\n`;
  prompt += `- "not_relevant": This threadline doesn't apply to these files/changes (e.g., wrong file type, no matching code patterns)\n`;
  
  return prompt;
}

