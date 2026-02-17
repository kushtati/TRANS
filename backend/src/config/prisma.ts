// server/config/prisma.ts

import { PrismaClient } from '@prisma/client';
import { isDevelopment } from './env.js';

declare global {
  var prisma: PrismaClient | undefined;
}

// Limit connection pool in production to prevent overwhelming Railway DB
// Must be set BEFORE PrismaClient is created
function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || isDevelopment) return url;
  if (url.includes('connection_limit')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}connection_limit=5&pool_timeout=10`;
}

export const prisma = globalThis.prisma ?? new PrismaClient({
  log: isDevelopment ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
});

if (isDevelopment) {
  globalThis.prisma = prisma;
}
