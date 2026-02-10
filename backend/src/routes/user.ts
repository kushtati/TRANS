// src/routes/user.ts

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { log } from '../config/logger.js';
import { auth } from '../middleware/auth.js';
import { generateVerificationCode, sendVerificationEmail } from '../services/email.service.js';

const router = Router();

// All user routes require authentication
router.use(auth);

// Validation schemas
const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nom requis (min 2 caractères)').optional(),
  phone: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(8, 'Nouveau mot de passe min 8 caractères'),
});

// ============================================
// PATCH /api/user/profile
// ============================================

router.patch('/profile', async (req: Request, res: Response) => {
  try {
    const data = updateProfileSchema.parse(req.body);

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        company: {
          select: { id: true, name: true, slug: true, phone: true, address: true },
        },
      },
    });

    log.audit('Profile updated', { userId: req.user!.id });

    res.json({
      success: true,
      data: { user: updated },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    log.error('Update profile error', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du profil' });
  }
});

// ============================================
// POST /api/user/change-password
// ============================================

router.post('/change-password', async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, password: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel incorrect',
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashedPassword },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'PASSWORD_CHANGED',
        entity: 'User',
        entityId: req.user!.id,
        userId: req.user!.id,
      },
    });

    log.audit('Password changed', { userId: req.user!.id });

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    log.error('Change password error', error);
    res.status(500).json({ success: false, message: 'Erreur lors du changement de mot de passe' });
  }
});

export default router;
