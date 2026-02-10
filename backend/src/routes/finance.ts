// src/routes/finance.ts

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { log } from '../config/logger.js';
import { auth, requireRole } from '../middleware/auth.js';
import { createExpenseSchema, updateExpenseSchema } from '../validators/finance.validators.js';

const router = Router();

// All finance routes require authentication
router.use(auth);

// ============================================
// GET /api/finance/summary
// Company-wide financial summary
// ============================================

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const [provisionAgg, disbursementAgg, paidAgg, unpaidAgg] = await Promise.all([
      prisma.expense.aggregate({
        where: { type: 'PROVISION', shipment: { companyId } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.expense.aggregate({
        where: { type: 'DISBURSEMENT', shipment: { companyId } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.expense.aggregate({
        where: { type: 'DISBURSEMENT', paid: true, shipment: { companyId } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { type: 'DISBURSEMENT', paid: false, shipment: { companyId } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const totalProvisions = provisionAgg._sum.amount || 0;
    const totalDisbursements = disbursementAgg._sum.amount || 0;
    const paidDisbursements = paidAgg._sum.amount || 0;
    const unpaidDisbursements = unpaidAgg._sum.amount || 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalProvisions: Math.round(totalProvisions),
          totalDisbursements: Math.round(totalDisbursements),
          paidDisbursements: Math.round(paidDisbursements),
          unpaidDisbursements: Math.round(unpaidDisbursements),
          balance: Math.round(totalProvisions - paidDisbursements),
          totalBalance: Math.round(totalProvisions - totalDisbursements),
          provisionCount: provisionAgg._count,
          disbursementCount: disbursementAgg._count,
          unpaidCount: unpaidAgg._count,
        },
      },
    });
  } catch (error) {
    log.error('Finance summary error', error);
    res.status(500).json({ success: false, message: 'Erreur lors du chargement du résumé financier' });
  }
});

// ============================================
// GET /api/finance/expenses
// List expenses (with optional shipment filter)
// ============================================

router.get('/expenses', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { shipmentId, type, paid, page = '1', limit = '50' } = req.query;

    const where: any = {
      shipment: { companyId },
    };

    if (shipmentId && typeof shipmentId === 'string') {
      where.shipmentId = shipmentId;
    }
    if (type === 'PROVISION' || type === 'DISBURSEMENT') {
      where.type = type;
    }
    if (paid === 'true') where.paid = true;
    if (paid === 'false') where.paid = false;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          shipment: {
            select: { id: true, trackingNumber: true, clientName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        expenses,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    log.error('List expenses error', error);
    res.status(500).json({ success: false, message: 'Erreur lors du chargement des dépenses' });
  }
});

// ============================================
// POST /api/finance/expenses
// Create a new expense (provision or disbursement)
// ============================================

router.post('/expenses', async (req: Request, res: Response) => {
  try {
    const data = createExpenseSchema.parse(req.body);

    // Verify shipment belongs to company
    const shipment = await prisma.shipment.findFirst({
      where: {
        id: data.shipmentId,
        companyId: req.user!.companyId,
      },
      select: { id: true, trackingNumber: true },
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Dossier non trouvé',
      });
    }

    const expense = await prisma.expense.create({
      data: {
        shipmentId: shipment.id,
        type: data.type as any,
        category: data.category as any,
        description: data.description,
        amount: data.amount,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        reference: data.reference,
        supplier: data.supplier,
        notes: data.notes,
      },
    });

    // Timeline entry
    const userName = (await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { name: true },
    }))?.name;

    await prisma.timelineEvent.create({
      data: {
        shipmentId: shipment.id,
        action: data.type === 'PROVISION'
          ? `Provision ajoutée : ${Math.round(data.amount).toLocaleString('fr-FR')} GNF`
          : `Débours ajouté : ${Math.round(data.amount).toLocaleString('fr-FR')} GNF`,
        description: `${data.description} (${data.category})`,
        userId: req.user!.id,
        userName,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'EXPENSE_CREATED',
        entity: 'Expense',
        entityId: expense.id,
        details: {
          type: data.type,
          category: data.category,
          amount: data.amount,
          shipmentId: shipment.id,
          trackingNumber: shipment.trackingNumber,
        },
        userId: req.user!.id,
      },
    });

    log.audit('Expense created', {
      type: data.type,
      amount: data.amount,
      shipment: shipment.trackingNumber,
    });

    res.status(201).json({
      success: true,
      data: { expense },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    log.error('Create expense error', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'ajout de la dépense' });
  }
});

// ============================================
// POST /api/finance/expenses/:id/pay
// Mark an expense as paid
// ============================================

router.post('/expenses/:id/pay', async (req: Request, res: Response) => {
  try {
    // Find expense and verify company ownership
    const expense = await prisma.expense.findFirst({
      where: {
        id: req.params.id,
        shipment: { companyId: req.user!.companyId },
      },
      include: {
        shipment: { select: { id: true, trackingNumber: true } },
      },
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Dépense non trouvée',
      });
    }

    if (expense.paid) {
      return res.status(400).json({
        success: false,
        message: 'Cette dépense est déjà payée',
      });
    }

    const updated = await prisma.expense.update({
      where: { id: req.params.id },
      data: {
        paid: true,
        paidAt: new Date(),
        paidBy: req.user!.id,
      },
    });

    // Timeline entry
    const userName = (await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { name: true },
    }))?.name;

    await prisma.timelineEvent.create({
      data: {
        shipmentId: expense.shipmentId,
        action: `Débours payé : ${Math.round(expense.amount).toLocaleString('fr-FR')} GNF`,
        description: expense.description,
        userId: req.user!.id,
        userName,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'EXPENSE_PAID',
        entity: 'Expense',
        entityId: expense.id,
        details: {
          amount: expense.amount,
          category: expense.category,
          shipmentId: expense.shipmentId,
          trackingNumber: expense.shipment.trackingNumber,
        },
        userId: req.user!.id,
      },
    });

    log.audit('Expense paid', {
      amount: expense.amount,
      shipment: expense.shipment.trackingNumber,
    });

    res.json({
      success: true,
      data: { expense: updated },
    });
  } catch (error) {
    log.error('Pay expense error', error);
    res.status(500).json({ success: false, message: 'Erreur lors du paiement' });
  }
});

// ============================================
// PATCH /api/finance/expenses/:id
// Update an expense
// ============================================

router.patch('/expenses/:id', async (req: Request, res: Response) => {
  try {
    const data = updateExpenseSchema.parse(req.body);

    const expense = await prisma.expense.findFirst({
      where: {
        id: req.params.id,
        shipment: { companyId: req.user!.companyId },
      },
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Dépense non trouvée' });
    }

    if (expense.paid) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de modifier une dépense déjà payée',
      });
    }

    const updated = await prisma.expense.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: { expense: updated } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    log.error('Update expense error', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la modification' });
  }
});

// ============================================
// DELETE /api/finance/expenses/:id
// Delete an unpaid expense (Director/Accountant only)
// ============================================

router.delete('/expenses/:id', requireRole('DIRECTOR', 'ACCOUNTANT'), async (req: Request, res: Response) => {
  try {
    const expense = await prisma.expense.findFirst({
      where: {
        id: req.params.id,
        shipment: { companyId: req.user!.companyId },
      },
      include: {
        shipment: { select: { id: true, trackingNumber: true } },
      },
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Dépense non trouvée' });
    }

    if (expense.paid) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une dépense déjà payée',
      });
    }

    await prisma.expense.delete({
      where: { id: req.params.id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'EXPENSE_DELETED',
        entity: 'Expense',
        entityId: expense.id,
        details: {
          type: expense.type,
          amount: expense.amount,
          description: expense.description,
          trackingNumber: expense.shipment.trackingNumber,
        },
        userId: req.user!.id,
      },
    });

    log.audit('Expense deleted', {
      amount: expense.amount,
      shipment: expense.shipment.trackingNumber,
    });

    res.json({ success: true });
  } catch (error) {
    log.error('Delete expense error', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression' });
  }
});

export default router;
