import { ThreadlineInput } from '../processors/single-expert';

export function buildPrompt(
  threadline: ThreadlineInput,
  diff: string,
  matchingFiles: string[]
): string {
  let prompt = `You are a code quality checker focused EXCLUSIVELY on: ${threadline.id}\n\n`;
  prompt += `CRITICAL: You must ONLY check for violations of THIS SPECIFIC threadline. `;
  prompt += `Do NOT flag other code quality issues, style problems, or unrelated concerns. `;
  prompt += `If the code does not violate THIS threadline's specific rules, return "compliant" even if other issues exist.\n\n`;
  
  prompt += `Threadline Guidelines:\n${threadline.content}\n\n`;

  // Add context files if available
  if (threadline.contextContent && Object.keys(threadline.contextContent).length > 0) {
    prompt += `Context Files:\n`;
    for (const [file, content] of Object.entries(threadline.contextContent)) {
      prompt += `\n--- ${file} ---\n${content}\n`;
    }
    prompt += `\n`;
  }

  prompt += `Code Changes (Git Diff Format):\n${diff}\n\n`;
  prompt += `Changed Files:\n${matchingFiles.join('\n')}\n\n`;

  prompt += `DIFF FORMAT EXPLANATION:\n`;
  prompt += `- Lines starting with "-" (minus) are DELETIONS - code being removed\n`;
  prompt += `- Lines starting with "+" (plus) are ADDITIONS - code being added\n`;
  prompt += `- Lines without prefix are context (unchanged)\n`;
  prompt += `- If a violating line is DELETED (marked with "-"), that is a FIX - the violation is being removed\n\n`;

  prompt += `Review the code changes AGAINST ONLY THE THREADLINE GUIDELINES ABOVE.\n\n`;
  prompt += `CRITICAL EVALUATION LOGIC:\n`;
  prompt += `1. Check the FINAL state after all changes (what remains after deletions and additions)\n`;
  prompt += `2. If a violation is DELETED (marked with "-"), that is a FIX - return "compliant"\n`;
  prompt += `3. Only flag violations that EXIST in the FINAL code (after changes are applied)\n`;
  prompt += `4. If violations are being removed, the code is being fixed - return "compliant"\n`;
  prompt += `5. Only return "attention" if there is a DIRECT violation in the FINAL code state\n\n`;
  
  prompt += `IMPORTANT:\n`;
  prompt += `- Only flag violations of the specific rules defined in this threadline\n`;
  prompt += `- Ignore all other code quality issues, style problems, or unrelated concerns\n`;
  prompt += `- If the threadline concern is not violated in the FINAL state, return "compliant" regardless of other issues\n`;
  prompt += `- Deletions of violations are fixes - do not flag them\n\n`;
  
  prompt += `Return JSON only with this exact structure:\n`;
  prompt += `{\n`;
  prompt += `  "status": "compliant" | "attention" | "not_relevant",\n`;
  prompt += `  "reasoning": "brief explanation",\n`;
  prompt += `  "line_references": [line numbers if attention needed]\n`;
  prompt += `}\n\n`;
  prompt += `Status meanings:\n`;
  prompt += `- "compliant": Code follows THIS threadline's guidelines, no violations found (even if other issues exist)\n`;
  prompt += `- "attention": Code DIRECTLY violates THIS threadline's specific guidelines\n`;
  prompt += `- "not_relevant": This threadline doesn't apply to these files/changes (e.g., wrong file type, no matching code patterns)\n`;
  
  return prompt;
}

