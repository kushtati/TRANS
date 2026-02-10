// src/routes/audit.ts

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(auth);
router.use(requireRole('DIRECTOR'));

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  entity: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().optional(),
  entityId: z.string().optional(),
  from: z.string().optional(), // ISO date
  to: z.string().optional(),   // ISO date
});

// ============================================
// GET /api/audit
// ============================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = auditQuerySchema.parse(req.query);

    const where: Record<string, unknown> = {};

    // Only show audit logs for user's company
    // We filter via the user relation
    if (query.entity) where.entity = query.entity;
    if (query.action) where.action = { contains: query.action };
    if (query.userId) where.userId = query.userId;
    if (query.entityId) where.entityId = query.entityId;

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) (where.createdAt as Record<string, Date>).gte = new Date(query.from);
      if (query.to) (where.createdAt as Record<string, Date>).lte = new Date(query.to);
    }

    // Filter to only show logs from users in the same company
    where.user = { companyId: req.user!.companyId };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          pages: Math.ceil(total / query.limit),
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Paramètres invalides',
        errors: error.errors,
      });
    }
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================
// GET /api/audit/stats
// ============================================

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalLogs, recentLogs, topActions] = await Promise.all([
      prisma.auditLog.count({
        where: { user: { companyId: req.user!.companyId } },
      }),
      prisma.auditLog.count({
        where: {
          user: { companyId: req.user!.companyId },
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          user: { companyId: req.user!.companyId },
          createdAt: { gte: sevenDaysAgo },
        },
        _count: true,
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalLogs,
        recentLogs,
        topActions: topActions.map(a => ({ action: a.action, count: a._count })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;
