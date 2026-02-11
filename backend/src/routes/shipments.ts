// src/routes/shipments.ts

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { log } from '../config/logger.js';
import { auth, requireRole } from '../middleware/auth.js';
import { autoAdvanceStatus, generateAlerts, getNextSteps, DOCUMENT_FIELD_HINTS } from '../services/workflow.service.js';
import {
  createShipmentSchema,
  updateShipmentSchema,
  addDocumentSchema,
  shipmentQuerySchema,
  updateStatusSchema,
} from '../validators/shipment.validators.js';
import { generateTrackingNumber } from '../utils/tracking.js';

const router = Router();

// All shipment routes require authentication
router.use(auth);

// Shared select for user-facing shipment data
const shipmentInclude = {
  containers: true,
  documents: {
    orderBy: { createdAt: 'desc' as const },
  },
  expenses: {
    orderBy: { createdAt: 'desc' as const },
  },
  timeline: {
    orderBy: { date: 'desc' as const },
    take: 50,
  },
  createdBy: {
    select: { id: true, name: true },
  },
};

// ============================================
// GET /api/shipments/stats
// ============================================

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    // Get shipment counts by status
    const [
      total,
      pending,
      inProgress,
      delivered,
      thisMonth,
    ] = await Promise.all([
      prisma.shipment.count({ where: { companyId } }),
      prisma.shipment.count({
        where: { companyId, status: { in: ['PENDING', 'DRAFT'] } },
      }),
      prisma.shipment.count({
        where: {
          companyId,
          status: {
            in: [
              'ARRIVED', 'DDI_OBTAINED', 'DECLARATION_FILED',
              'LIQUIDATION_ISSUED', 'CUSTOMS_PAID', 'BAE_ISSUED',
              'TERMINAL_PAID', 'DO_RELEASED', 'EXIT_NOTE_ISSUED',
              'IN_DELIVERY',
            ],
          },
        },
      }),
      prisma.shipment.count({
        where: { companyId, status: 'DELIVERED' },
      }),
      prisma.shipment.count({
        where: {
          companyId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    // Financial aggregation
    const [provisionAgg, disbursementAgg, unpaidAgg] = await Promise.all([
      prisma.expense.aggregate({
        where: {
          type: 'PROVISION',
          shipment: { companyId },
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          type: 'DISBURSEMENT',
          shipment: { companyId },
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          type: 'DISBURSEMENT',
          paid: false,
          shipment: { companyId },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalProvisions = provisionAgg._sum.amount || 0;
    const totalDisbursements = disbursementAgg._sum.amount || 0;
    const unpaid = unpaidAgg._sum.amount || 0;

    // Container stats
    const containers = await prisma.container.count({
      where: { shipment: { companyId } },
    });

    const containersAtPort = await prisma.container.count({
      where: {
        shipment: {
          companyId,
          status: {
            in: ['ARRIVED', 'DDI_OBTAINED', 'DECLARATION_FILED',
              'LIQUIDATION_ISSUED', 'CUSTOMS_PAID', 'BAE_ISSUED',
              'TERMINAL_PAID', 'DO_RELEASED', 'EXIT_NOTE_ISSUED'],
          },
        },
      },
    });

    const containersInTransit = await prisma.container.count({
      where: {
        shipment: { companyId, status: 'IN_DELIVERY' },
      },
    });

    const containersDelivered = await prisma.container.count({
      where: {
        shipment: {
          companyId,
          status: { in: ['DELIVERED', 'INVOICED', 'CLOSED', 'ARCHIVED'] },
        },
      },
    });

    // Recent shipments
    const recentShipments = await prisma.shipment.findMany({
      where: { companyId },
      include: { containers: true, createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Smart alerts from workflow engine
    const workflowAlerts = await generateAlerts(companyId);

    // Add basic finance alerts
    const alerts: Array<{ id: string; type: string; message: string; shipmentId?: string; category?: string }> = [];

    if (totalProvisions - totalDisbursements < 0) {
      alerts.push({
        id: 'negative-balance',
        type: 'danger',
        category: 'finance',
        message: `Solde global négatif : ${Math.round(totalProvisions - totalDisbursements).toLocaleString('fr-FR')} GNF`,
      });
    }

    // Merge workflow alerts (vessel, document, deadline) + finance alerts
    const allAlerts = [
      ...alerts,
      ...workflowAlerts.map(a => ({
        id: a.id,
        type: a.type,
        message: a.message,
        shipmentId: a.shipmentId,
        category: a.category,
      })),
    ];

    res.json({
      success: true,
      data: {
        stats: {
          shipments: { total, pending, inProgress, delivered, thisMonth },
          finance: {
            totalProvisions: Math.round(totalProvisions),
            totalDisbursements: Math.round(totalDisbursements),
            balance: Math.round(totalProvisions - totalDisbursements),
            unpaid: Math.round(unpaid),
          },
          containers: {
            total: containers,
            atPort: containersAtPort,
            inTransit: containersInTransit,
            delivered: containersDelivered,
          },
          recentShipments,
          alerts: allAlerts,
        },
      },
    });
  } catch (error) {
    log.error('Get stats error', error);
    res.status(500).json({ success: false, message: 'Erreur lors du chargement des statistiques' });
  }
});

// ============================================
// GET /api/shipments
// ============================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = shipmentQuerySchema.parse(req.query);
    const companyId = req.user!.companyId;

    // Build where clause
    const where: Prisma.ShipmentWhereInput = { companyId };

    // Client role: only see their own shipments
    if (req.user!.role === 'CLIENT') {
      where.createdById = req.user!.id;
    }

    if (query.status !== 'ALL') {
      where.status = query.status as any;
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { clientName: { contains: search, mode: 'insensitive' } },
        { blNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { vesselName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [shipments, totalCount] = await Promise.all([
      prisma.shipment.findMany({
        where,
        include: {
          containers: true,
          documents: { select: { id: true, type: true } },
          expenses: { select: { id: true, type: true, amount: true, paid: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { [query.sort]: query.order },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.shipment.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        shipments,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: totalCount,
          pages: Math.ceil(totalCount / query.limit),
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Paramètres invalides',
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    log.error('List shipments error', error);
    res.status(500).json({ success: false, message: 'Erreur lors du chargement des dossiers' });
  }
});

// ============================================
// GET /api/shipments/:id
// ============================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const shipment = await prisma.shipment.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      include: shipmentInclude,
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Dossier non trouvé',
      });
    }

    res.json({
      success: true,
      data: { shipment },
    });
  } catch (error) {
    log.error('Get shipment error', error);
    res.status(500).json({ success: false, message: 'Erreur lors du chargement du dossier' });
  }
});

// ============================================
// GET /api/shipments/:id/next-steps
// ============================================

router.get('/:id/next-steps', async (req: Request, res: Response) => {
  try {
    const shipment = await prisma.shipment.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
      include: {
        documents: { select: { type: true } },
        expenses: { select: { type: true, paid: true } },
      },
    });

    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Dossier non trouvé' });
    }

    const steps = getNextSteps(shipment);

    res.json({ success: true, data: { steps } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================
// POST /api/shipments
// ============================================

router.post('/', requireRole('DIRECTOR', 'AGENT'), async (req: Request, res: Response) => {
  try {
    const data = createShipmentSchema.parse(req.body);
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    const trackingNumber = await generateTrackingNumber(companyId);

    // Parse ETA date if provided
    const eta = data.eta ? new Date(data.eta) : undefined;

    // Calculate CIF value in GNF if exchange rate is provided
    let cifValueGnf: number | undefined;
    if (data.cifValue && data.exchangeRate) {
      cifValueGnf = Math.round(data.cifValue * data.exchangeRate);
    }

    const shipment = await prisma.shipment.create({
      data: {
        trackingNumber,
        companyId,
        createdById: userId,
        clientName: data.clientName,
        clientNif: data.clientNif,
        clientPhone: data.clientPhone,
        clientAddress: data.clientAddress,
        clientId: data.clientId,
        description: data.description,
        hsCode: data.hsCode,
        packaging: data.packaging,
        packageCount: data.packageCount,
        grossWeight: data.grossWeight,
        netWeight: data.netWeight,
        cifValue: data.cifValue,
        cifCurrency: data.cifCurrency,
        exchangeRate: data.exchangeRate,
        cifValueGnf,
        fobValue: data.fobValue,
        freightValue: data.freightValue,
        insuranceValue: data.insuranceValue,
        blNumber: data.blNumber,
        vesselName: data.vesselName,
        voyageNumber: data.voyageNumber,
        portOfLoading: data.portOfLoading,
        portOfDischarge: data.portOfDischarge,
        eta,
        manifestNumber: data.manifestNumber,
        manifestYear: data.manifestYear,
        supplierName: data.supplierName,
        supplierCountry: data.supplierCountry,
        customsRegime: data.customsRegime as any,
        customsOffice: data.customsOffice,
        customsOfficeName: data.customsOfficeName,
        declarantCode: data.declarantCode,
        declarantName: data.declarantName,
        ddiNumber: data.ddiNumber,
        status: 'PENDING',
        containers: {
          create: data.containers.map(c => ({
            number: c.number,
            type: c.type as any,
            sealNumber: c.sealNumber,
            grossWeight: c.grossWeight,
            packageCount: c.packageCount,
            temperature: c.temperature,
            description: c.description,
          })),
        },
        timeline: {
          create: {
            action: 'Dossier créé',
            description: `Dossier ${trackingNumber} créé pour ${data.clientName}`,
            userId,
            userName: (await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name,
          },
        },
      },
      include: shipmentInclude,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'SHIPMENT_CREATED',
        entity: 'Shipment',
        entityId: shipment.id,
        details: { trackingNumber, clientName: data.clientName },
        userId,
      },
    });

    log.audit('Shipment created', { trackingNumber, userId, companyId });

    res.status(201).json({
      success: true,
      data: { shipment },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    log.error('Create shipment error', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la création du dossier' });
  }
});

// ============================================
// PATCH /api/shipments/:id
// ============================================

router.patch('/:id', requireRole('DIRECTOR', 'AGENT'), async (req: Request, res: Response) => {
  try {
    const data = updateShipmentSchema.parse(req.body);

    // Verify ownership
    const existing = await prisma.shipment.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Dossier non trouvé',
      });
    }

    // Build update data — only include defined fields
    const updateData: Prisma.ShipmentUpdateInput = {};
    const fields = Object.entries(data) as [string, unknown][];

    for (const [key, value] of fields) {
      if (value !== undefined && key !== 'containers') {
        // Handle date fields
        if (['eta', 'ata', 'deliveryDate'].includes(key) && typeof value === 'string') {
          (updateData as any)[key] = new Date(value);
        } else {
          (updateData as any)[key] = value;
        }
      }
    }

    // Recalculate CIF in GNF if value or rate changed
    const cifValue = data.cifValue ?? existing.cifValue;
    const exchangeRate = data.exchangeRate ?? existing.exchangeRate;
    if (cifValue && exchangeRate) {
      updateData.cifValueGnf = Math.round(cifValue * exchangeRate);
    }

    // Timeline entry for status change
    if (data.status && data.status !== existing.status) {
      const userName = (await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { name: true },
      }))?.name;

      await prisma.timelineEvent.create({
        data: {
          shipmentId: existing.id,
          action: `Statut changé → ${data.status}`,
          description: `Passage de ${existing.status} à ${data.status}`,
          userId: req.user!.id,
          userName,
        },
      });
    }

    const shipment = await prisma.shipment.update({
      where: { id: req.params.id },
      data: updateData,
      include: shipmentInclude,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'SHIPMENT_UPDATED',
        entity: 'Shipment',
        entityId: shipment.id,
        details: { changedFields: Object.keys(data) },
        userId: req.user!.id,
      },
    });

    res.json({
      success: true,
      data: { shipment },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    log.error('Update shipment error', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' });
  }
});

// ============================================
// PATCH /api/shipments/:id/status
// ============================================

router.patch('/:id/status', requireRole('DIRECTOR', 'AGENT'), async (req: Request, res: Response) => {
  try {
    const { status, comment } = updateStatusSchema.parse(req.body);

    const existing = await prisma.shipment.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Dossier non trouvé' });
    }

    const userName = (await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { name: true },
    }))?.name;

    const [shipment] = await prisma.$transaction([
      prisma.shipment.update({
        where: { id: req.params.id },
        data: { status: status as any },
        include: shipmentInclude,
      }),
      prisma.timelineEvent.create({
        data: {
          shipmentId: existing.id,
          action: `Statut → ${status}`,
          description: comment || `Passage de ${existing.status} à ${status}`,
          userId: req.user!.id,
          userName,
        },
      }),
      prisma.auditLog.create({
        data: {
          action: 'STATUS_CHANGED',
          entity: 'Shipment',
          entityId: existing.id,
          details: { from: existing.status, to: status },
          userId: req.user!.id,
        },
      }),
    ]);

    res.json({ success: true, data: { shipment } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    log.error('Update status error', error);
    res.status(500).json({ success: false, message: 'Erreur lors du changement de statut' });
  }
});

// ============================================
// POST /api/shipments/:id/documents
// ============================================

router.post('/:id/documents', async (req: Request, res: Response) => {
  try {
    const data = addDocumentSchema.parse(req.body);

    // Verify shipment belongs to company
    const shipment = await prisma.shipment.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
      select: { id: true, trackingNumber: true },
    });

    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Dossier non trouvé' });
    }

    const document = await prisma.document.create({
      data: {
        shipmentId: shipment.id,
        type: data.type as any,
        name: data.name,
        url: data.url,
        reference: data.reference,
        issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
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
        action: `Document ajouté : ${data.name}`,
        description: `Type: ${data.type}`,
        userId: req.user!.id,
        userName,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        document,
        // Auto-advance status if this document triggers a progression
        statusAdvanced: await autoAdvanceStatus(shipment.id, data.type, req.user!.id),
        // Hint which fields the user should fill from this document
        fieldHints: DOCUMENT_FIELD_HINTS[data.type] || null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    log.error('Add document error', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'ajout du document' });
  }
});

// ============================================
// DELETE /api/shipments/:id/documents/:docId
// ============================================

router.delete('/:id/documents/:docId', async (req: Request, res: Response) => {
  try {
    // Verify shipment belongs to company
    const shipment = await prisma.shipment.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
      select: { id: true },
    });

    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Dossier non trouvé' });
    }

    // Verify document belongs to this shipment
    const document = await prisma.document.findFirst({
      where: { id: req.params.docId, shipmentId: shipment.id },
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document non trouvé' });
    }

    await prisma.document.delete({
      where: { id: req.params.docId },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'DOCUMENT_DELETED',
        entity: 'Document',
        entityId: req.params.docId,
        details: { name: document.name, type: document.type, shipmentId: shipment.id },
        userId: req.user!.id,
      },
    });

    res.json({ success: true });
  } catch (error) {
    log.error('Delete document error', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression du document' });
  }
});

// ============================================
// DELETE /api/shipments/:id
// ============================================

router.delete('/:id', requireRole('DIRECTOR'), async (req: Request, res: Response) => {
  try {
    const shipment = await prisma.shipment.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
      select: { id: true, trackingNumber: true, status: true },
    });

    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Dossier non trouvé' });
    }

    // Only allow deletion of DRAFT or PENDING shipments
    if (!['DRAFT', 'PENDING'].includes(shipment.status)) {
      return res.status(400).json({
        success: false,
        message: 'Seuls les dossiers en brouillon ou en attente peuvent être supprimés',
      });
    }

    await prisma.shipment.delete({
      where: { id: req.params.id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'SHIPMENT_DELETED',
        entity: 'Shipment',
        entityId: shipment.id,
        details: { trackingNumber: shipment.trackingNumber },
        userId: req.user!.id,
      },
    });

    log.audit('Shipment deleted', { trackingNumber: shipment.trackingNumber, userId: req.user!.id });

    res.json({ success: true });
  } catch (error) {
    log.error('Delete shipment error', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression' });
  }
});

export default router;
