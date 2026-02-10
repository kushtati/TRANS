// src/services/cleanup.service.ts

import { prisma } from '../config/prisma.js';
import { log } from '../config/logger.js';

/**
 * Clean up expired and revoked refresh tokens.
 * Should be called on a schedule (e.g. every 6 hours).
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { not: null } },
        ],
      },
    });

    if (result.count > 0) {
      log.info(`Cleaned up ${result.count} expired/revoked tokens`);
    }

    return result.count;
  } catch (error) {
    log.error('Token cleanup failed', error);
    return 0;
  }
}

/**
 * Start periodic cleanup. Runs every intervalMs milliseconds.
 */
export function startCleanupScheduler(intervalMs: number = 6 * 60 * 60 * 1000): NodeJS.Timeout {
  // Run once at startup after a short delay
  setTimeout(() => cleanupExpiredTokens(), 30_000);

  // Then run periodically
  return setInterval(() => cleanupExpiredTokens(), intervalMs);
}
