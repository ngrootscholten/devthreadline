import crypto from 'crypto';

interface VersionHashInput {
  threadlineId: string;
  filePath: string;
  patterns: string[];
  content: string;
  version: string;
  repoName: string | null;
  account: string;
}

interface IdentityHashInput {
  threadlineId: string;
  filePath: string;
  repoName: string | null;
  account: string;
}

interface ContextFileHashInput {
  account: string;
  repoName: string | null;
  filePath: string;
  content: string;
}

/**
 * Generate a version-specific hash for a threadline definition.
 * This hash uniquely identifies an exact version of a threadline.
 * Same hash = exact same definition, can be reused.
 */
export function generateVersionHash(input: VersionHashInput): string {
  const data = JSON.stringify({
    threadlineId: input.threadlineId,
    filePath: input.filePath,
    patterns: input.patterns, // Not sorted - order from file is deterministic
    content: input.content,
    version: input.version,
    repoName: input.repoName || '',
    account: input.account,
  });
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate an identity hash for a threadline.
 * This hash identifies the threadline across versions.
 * Same identity_hash + different version_hash = new version of same threadline.
 */
export function generateIdentityHash(input: IdentityHashInput): string {
  const data = JSON.stringify({
    threadlineId: input.threadlineId,
    filePath: input.filePath,
    repoName: input.repoName || '',
    account: input.account,
  });
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a content hash for a context file snapshot.
 * This hash uniquely identifies a specific version of a context file.
 * Same hash = exact same file content, can be reused.
 */
export function generateContextHash(input: ContextFileHashInput): string {
  const data = JSON.stringify({
    account: input.account,
    repoName: input.repoName || '',
    filePath: input.filePath,
    content: input.content,
  });
  return crypto.createHash('sha256').update(data).digest('hex');
}

