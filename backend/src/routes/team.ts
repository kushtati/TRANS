// src/routes/team.ts
// ============================================
// GESTION D'ÉQUIPE — RÉSERVÉ AU DIRECTEUR GÉNÉRAL
//
// GET    /api/team/members            → Liste des collaborateurs
// POST   /api/team/members            → Ajouter un collaborateur
// DELETE /api/team/members/:id        → Supprimer un collaborateur
// PATCH  /api/team/members/:id/toggle → Activer/désactiver
// GET    /api/team/login-history      → Historique de connexion de toute l'équipe
// GET    /api/team/notifications      → Notifications du DG
// PATCH  /api/team/notifications/read → Marquer toutes comme lues
// PATCH  /api/team/notifications/:id/read → Marquer une notif comme lue
// GET    /api/team/stats              → Stats de l'équipe
// ============================================

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { log } from '../config/logger.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(auth);
router.use(requireRole('DIRECTOR'));

// ============================================
// VALIDATION
// ============================================

const addMemberSchema = z.object({
  name: z.string().min(2, 'Nom requis (min 2 caractères)'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Mot de passe min 8 caractères'),
  role: z.enum(['ACCOUNTANT', 'AGENT', 'CLIENT'], {
    errorMap: () => ({ message: 'Rôle invalide. Choix : ACCOUNTANT, AGENT, CLIENT' }),
  }),
});

// ============================================
// GET /api/team/members
// ============================================

router.get('/members', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const members = await prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        lastLogin: true,
        createdAt: true,
        invitedById: true,
        _count: {
          select: {
            shipments: true,
            loginHistory: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    res.json({
      success: true,
      data: { members },
    });
  } catch (error) {
    log.error('List team members error', error);
    res.status(500).json({ success: false, message: 'Erreur lors du chargement de l\'équipe' });
  }
});

// ============================================
// POST /api/team/members
// ============================================

router.post('/members', async (req: Request, res: Response) => {
  try {
    const data = addMemberSchema.parse(req.body);
    const companyId = req.user!.companyId;

    // Vérifier unicité email global
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé',
      });
    }

    // RÈGLE MÉTIER : 1 seul comptable par entreprise
    if (data.role === 'ACCOUNTANT') {
      const existingAccountant = await prisma.user.findFirst({
        where: {
          companyId,
          role: 'ACCOUNTANT',
          isActive: true,
        },
        select: { id: true, name: true },
      });

      if (existingAccountant) {
        return res.status(400).json({
          success: false,
          message: `Un comptable existe déjà : ${existingAccountant.name}. Supprimez-le d'abord pour en ajouter un nouveau.`,
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Créer le collaborateur (email vérifié par défaut car invité par le DG)
    const member = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        password: hashedPassword,
        role: data.role,
        companyId,
        emailVerified: true,
        isActive: true,
        invitedById: req.user!.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'MEMBER_CREATED',
        entity: 'User',
        entityId: member.id,
        details: {
          name: data.name,
          email: data.email,
          role: data.role,
        },
        userId: req.user!.id,
      },
    });

    log.audit('Team member created', {
      directorId: req.user!.id,
      memberId: member.id,
      role: data.role,
    });

    res.status(201).json({
      success: true,
      data: { member },
      message: `${data.name} ajouté(e) avec succès`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    log.error('Add team member error', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'ajout du collaborateur' });
  }
});

// ============================================
// DELETE /api/team/members/:id
// ============================================

router.delete('/members/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const memberId = req.params.id;

    // Ne peut pas se supprimer soi-même
    if (memberId === req.user!.id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte',
      });
    }

    const member = await prisma.user.findFirst({
      where: { id: memberId, companyId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Collaborateur non trouvé',
      });
    }

    // Ne peut pas supprimer un autre DIRECTOR
    if (member.role === 'DIRECTOR') {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer un Directeur Général',
      });
    }

    // Révoquer tous les tokens
    await prisma.refreshToken.updateMany({
      where: { userId: memberId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Supprimer l'utilisateur (cascade supprime loginHistory, notifications, tokens)
    await prisma.user.delete({
      where: { id: memberId },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'MEMBER_DELETED',
        entity: 'User',
        entityId: memberId,
        details: {
          name: member.name,
          email: member.email,
          role: member.role,
        },
        userId: req.user!.id,
      },
    });

    log.audit('Team member deleted', {
      directorId: req.user!.id,
      deletedMember: member.name,
      role: member.role,
    });

    res.json({
      success: true,
      message: `${member.name} a été supprimé(e)`,
    });
  } catch (error) {
    log.error('Delete team member error', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression' });
  }
});

// ============================================
// PATCH /api/team/members/:id/toggle
// ============================================

router.patch('/members/:id/toggle', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const memberId = req.params.id;

    if (memberId === req.user!.id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas vous désactiver vous-même',
      });
    }

    const member = await prisma.user.findFirst({
      where: { id: memberId, companyId },
      select: { id: true, name: true, isActive: true, role: true },
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Collaborateur non trouvé' });
    }

    if (member.role === 'DIRECTOR') {
      return res.status(400).json({ success: false, message: 'Impossible de modifier un DG' });
    }

    const updated = await prisma.user.update({
      where: { id: memberId },
      data: { isActive: !member.isActive },
      select: { id: true, name: true, isActive: true, role: true },
    });

    // Si désactivé, révoquer les tokens
    if (!updated.isActive) {
      await prisma.refreshToken.updateMany({
        where: { userId: memberId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: updated.isActive ? 'MEMBER_ACTIVATED' : 'MEMBER_DEACTIVATED',
        entity: 'User',
        entityId: memberId,
        details: { name: member.name },
        userId: req.user!.id,
      },
    });

    res.json({
      success: true,
      data: { member: updated },
      message: `${member.name} ${updated.isActive ? 'activé(e)' : 'désactivé(e)'}`,
    });
  } catch (error) {
    log.error('Toggle member error', error);
    res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ============================================
// GET /api/team/login-history
// ============================================

router.get('/login-history', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));

    const where = {
      user: { companyId },
    };

    const [history, total] = await Promise.all([
      prisma.loginHistory.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.loginHistory.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    log.error('Login history error', error);
    res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ============================================
// GET /api/team/notifications
// ============================================

router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { recipientId: userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where: { recipientId: userId } }),
      prisma.notification.count({ where: { recipientId: userId, read: false } }),
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    log.error('Get notifications error', error);
    res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ============================================
// PATCH /api/team/notifications/read-all
// ============================================

router.patch('/notifications/read-all', async (req: Request, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { recipientId: req.user!.id, read: false },
      data: { read: true, readAt: new Date() },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ============================================
// PATCH /api/team/notifications/:id/read
// ============================================

router.patch('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true, readAt: new Date() },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ============================================
// GET /api/team/stats
// ============================================

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const [
      totalMembers,
      activeMembers,
      accountants,
      agents,
      clients,
      todayLogins,
      unreadNotifs,
    ] = await Promise.all([
      prisma.user.count({ where: { companyId } }),
      prisma.user.count({ where: { companyId, isActive: true } }),
      prisma.user.count({ where: { companyId, role: 'ACCOUNTANT', isActive: true } }),
      prisma.user.count({ where: { companyId, role: 'AGENT', isActive: true } }),
      prisma.user.count({ where: { companyId, role: 'CLIENT', isActive: true } }),
      prisma.loginHistory.count({
        where: {
          user: { companyId },
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.notification.count({
        where: { recipientId: req.user!.id, read: false },
      }),
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalMembers,
          activeMembers,
          byRole: { accountants, agents, clients },
          todayLogins,
          unreadNotifs,
          canAddAccountant: accountants === 0,
        },
      },
    });
  } catch (error) {
    log.error('Team stats error', error);
    res.status(500).json({ success: false, message: 'Erreur' });
  }
});

export default router;
