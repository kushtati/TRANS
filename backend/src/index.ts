// src/index.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { env, isProduction } from './config/env.js';
import { prisma } from './config/prisma.js';
import { log } from './config/logger.js';

// Routes
import authRoutes from './routes/auth.js';
import shipmentRoutes from './routes/shipments.js';
import financeRoutes from './routes/finance.js';
import aiRoutes from './routes/ai.js';
import userRoutes from './routes/user.js';
import auditRoutes from './routes/audit.js';
import exportRoutes from './routes/export.js';
import uploadRoutes from './routes/upload.js';
import invoiceRoutes from './routes/invoices.js';
import teamRoutes from './routes/team.js';
import ocrRoutes from './routes/ocr.js';
import templateRoutes from './routes/templates.js';
import { startCleanupScheduler } from './services/cleanup.service.js';

const app = express();

// Trust proxy (Railway, Vercel)
if (isProduction) {
  app.set('trust proxy', 1);
}

// Security
app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false,
}));

// CORS
const allowedOrigins = isProduction
  ? [env.FRONTEND_URL, /\.vercel\.app$/, /\.railway\.app$/]
  : [/localhost/, /127\.0\.0\.1/];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some(allowed =>
      allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
    );

    callback(null, isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookies
app.use(cookieParser());

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 500 : 1000,
  message: { success: false, message: 'Trop de requêtes, réessayez plus tard' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 20 : 1000,
  message: { success: false, message: 'Trop de tentatives, réessayez dans 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

app.use(globalLimiter);

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    log.http(`${req.method} ${req.path}`, { status: res.statusCode, duration: `${duration}ms` });
  });
  next();
});

// ============================================
// Health check (public)
// ============================================

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      version: '3.2.0',
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Database connection failed',
    });
  }
});

// ============================================
// API Routes
// ============================================

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/shipments', shipmentRoutes);   // auth middleware applied inside the router
app.use('/api/finance', financeRoutes);       // auth middleware applied inside the router
app.use('/api/ai', aiRoutes);
app.use('/api/user', userRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/templates', templateRoutes);

// ============================================
// 404 handler
// ============================================

app.use('/api/*', (_req, res) => {
  res.status(404).json({ success: false, message: 'Route non trouvée' });
});

// ============================================
// Global error handler
// ============================================

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log.error('Unhandled error', err);
  res.status(500).json({
    success: false,
    message: isProduction ? 'Erreur interne du serveur' : err.message,
  });
});

// ============================================
// Crash protection — prevent 502s from unhandled errors
// ============================================

process.on('uncaughtException', (error) => {
  log.error('Uncaught exception (process kept alive)', error);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection (process kept alive)', reason as Error);
});

// ============================================
// Graceful shutdown
// ============================================

const gracefulShutdown = async () => {
  log.info('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// ============================================
// Start server
// ============================================

const PORT = env.PORT;
app.listen(PORT, () => {
  log.info(`🚀 E-Trans v3.2 running on port ${PORT}`);
  log.info(`📍 Environment: ${env.NODE_ENV}`);
  if (isProduction) {
    log.info(`🌐 Frontend: ${env.FRONTEND_URL}`);
  }
  // Start periodic cleanup of expired tokens
  startCleanupScheduler();
});

export default app;
