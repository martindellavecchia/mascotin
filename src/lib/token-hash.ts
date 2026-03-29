import crypto from 'crypto';

/**
 * Hash a token for secure storage in the database.
 * Uses SHA-256 which is appropriate for random tokens (no need for bcrypt
 * since tokens are high-entropy random values, not user-chosen passwords).
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
