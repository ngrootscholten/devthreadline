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
  prompt += `- Lines without prefix are context (unchanged)\n\n`;

  prompt += `Review the code changes AGAINST ONLY THE THREADLINE GUIDELINES ABOVE.\n\n`;
  prompt += `CRITICAL EVALUATION LOGIC - READ CAREFULLY:\n`;
  prompt += `1. FIRST PRIORITY: Scan ALL lines starting with "+" (additions) for violations\n`;
  prompt += `   - If ANY addition line contains a violation → IMMEDIATELY return "attention"\n`;
  prompt += `   - Additions introduce NEW code - if that new code violates the threadline, it's a problem\n`;
  prompt += `2. SECOND: Check lines starting with "-" (deletions)\n`;
  prompt += `   - If a deletion removes a violation → this is a FIX, return "compliant"\n`;
  prompt += `   - But ONLY if step 1 found NO violations in additions\n`;
  prompt += `3. DECISION RULE:\n`;
  prompt += `   - Violations in "+" lines = NEW violations = return "attention"\n`;
  prompt += `   - Violations only in "-" lines = violations being removed = return "compliant"\n`;
  prompt += `   - If both "+" and "-" have violations, additions take priority = return "attention"\n\n`;
  
  prompt += `CONCRETE EXAMPLES:\n`;
  prompt += `Example 1: "+ const fruit = 'banana';" (threadline forbids "banana")\n`;
  prompt += `→ This is an ADDITION with a violation → return "attention"\n\n`;
  prompt += `Example 2: "- const fruit = 'banana';" (threadline forbids "banana")\n`;
  prompt += `→ This is a DELETION removing a violation → return "compliant"\n\n`;
  prompt += `Example 3: "+ const fruit = 'banana';" AND "- const fruit = 'apple';"\n`;
  prompt += `→ Addition has violation → return "attention" (deletion doesn't matter)\n\n`;
  
  prompt += `IMPORTANT:\n`;
  prompt += `- Additions (lines with "+") are NEW code being added - check these FIRST\n`;
  prompt += `- If you see a violation in a "+" line, return "attention" immediately\n`;
  prompt += `- Do NOT say violations are "removed" if they appear in "+" lines - those are NEW violations\n`;
  prompt += `- Only flag violations of the specific rules defined in this threadline\n`;
  prompt += `- Ignore all other code quality issues, style problems, or unrelated concerns\n\n`;
  
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

