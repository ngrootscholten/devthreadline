import * as crypto from 'crypto'

/**
 * Generate a secure random API key
 * Returns a base64-encoded 32-byte random string (44 characters)
 */
export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(32)
  return randomBytes.toString('base64')
}

/**
 * Hash an API key using SHA256
 * This is what we store in the database
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex')
}

/**
 * Verify a provided API key against a stored hash
 */
export function verifyApiKey(providedKey: string, storedHash: string): boolean {
  const providedHash = hashApiKey(providedKey)
  return providedHash === storedHash
}

