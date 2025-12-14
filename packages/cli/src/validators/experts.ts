import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Threadline, ThreadlineValidationResult } from '../types/expert';

const REQUIRED_FIELDS = ['id', 'version', 'patterns'];

export async function findThreadlines(repoRoot: string): Promise<Threadline[]> {
  const expertsDir = path.join(repoRoot, 'threadlines');
  
  if (!fs.existsSync(expertsDir)) {
    throw new Error('No /threadlines folder found. Run `npx threadlines init` to create your first threadline.');
  }

  const files = fs.readdirSync(expertsDir);
  const expertFiles = files.filter(f => f.endsWith('.md'));

  if (expertFiles.length === 0) {
    throw new Error('No threadline files found in /threadlines folder. Run `npx threadlines init` to create a template.');
  }

  const threadlines: Threadline[] = [];

  for (const file of expertFiles) {
    const result = await validateThreadline(path.join(expertsDir, file), repoRoot);
    if (result.valid && result.threadline) {
      threadlines.push(result.threadline);
    } else {
      console.warn(`⚠️  Skipping ${file}: ${result.errors?.join(', ')}`);
    }
  }

  return threadlines;
}

export async function validateThreadline(
  filePath: string,
  repoRoot: string
): Promise<ThreadlineValidationResult> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Parse YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    if (!frontmatterMatch) {
      return {
        valid: false,
        errors: ['Missing YAML frontmatter. Threadline files must start with ---']
      };
    }

    const frontmatter = yaml.load(frontmatterMatch[1]) as any;
    const body = frontmatterMatch[2].trim();

    // Validate required fields
    const errors: string[] = [];
    
    for (const field of REQUIRED_FIELDS) {
      if (!frontmatter[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate patterns
    if (frontmatter.patterns && !Array.isArray(frontmatter.patterns)) {
      errors.push('patterns must be an array');
    }

    if (frontmatter.patterns && frontmatter.patterns.length === 0) {
      errors.push('patterns array cannot be empty');
    }

    // Validate context_files if present
    if (frontmatter.context_files) {
      if (!Array.isArray(frontmatter.context_files)) {
        errors.push('context_files must be an array');
      } else {
        // Check if context files exist
        for (const contextFile of frontmatter.context_files) {
          const fullPath = path.join(repoRoot, contextFile);
          if (!fs.existsSync(fullPath)) {
            errors.push(`Context file not found: ${contextFile}`);
          }
        }
      }
    }

    // Validate body has content
    if (!body || body.length === 0) {
      errors.push('Threadline body cannot be empty');
    }

    // Validate version format (basic semver check)
    if (frontmatter.version && !/^\d+\.\d+\.\d+/.test(frontmatter.version)) {
      errors.push('version must be in semver format (e.g., 1.0.0)');
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    const threadline: Threadline = {
      id: frontmatter.id,
      version: frontmatter.version,
      patterns: frontmatter.patterns,
      contextFiles: frontmatter.context_files || [],
      content: body,
      filePath: path.relative(repoRoot, filePath)
    };

    return { valid: true, threadline };
  } catch (error: any) {
    return {
      valid: false,
      errors: [`Failed to parse threadline file: ${error.message}`]
    };
  }
}

