// src/routes/invoices.ts
// ============================================
// ROUTES FACTURES
// GET    /api/invoices           → Liste factures (filtres)
// GET    /api/invoices/:id       → Détail facture
// POST   /api/invoices/generate  → Générer une facture depuis un dossier
// PATCH  /api/invoices/:id/issue → Émettre (DRAFT → ISSUED)
// PATCH  /api/invoices/:id/pay   → Marquer payée
// PATCH  /api/invoices/:id/cancel → Annuler
// GET    /api/invoices/:id/pdf   → Télécharger PDF
// ============================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import { prisma } from '../config/prisma.js';
import { log } from '../config/logger.js';
import { auth, requireRole } from '../middleware/auth.js';
import {
  generateInvoice,
  markInvoicePaid,
  cancelInvoice,
} from '../services/invoice.service.js';

const router = Router();
router.use(auth);

// GNF formatting
const fmtGNF = (n: number): string => `${Math.round(n).toLocaleString('fr-FR')} GNF`;

// ============================================
// VALIDATION SCHEMAS
// ============================================

const generateInvoiceSchema = z.object({
  shipmentId: z.string().min(1, 'ID du dossier requis'),
  honoraires: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
  autoIssue: z.boolean().default(false),
});

const invoiceQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['ALL', 'DRAFT', 'ISSUED', 'PAID', 'CANCELLED']).default('ALL'),
  search: z.string().optional(),
});

// ============================================
// GET /api/invoices
// ============================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = invoiceQuerySchema.parse(req.query);
    const companyId = req.user!.companyId;

    const where: any = { companyId };

    if (query.status !== 'ALL') {
      where.status = query.status;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { invoiceNumber: { contains: s, mode: 'insensitive' } },
        { clientName: { contains: s, mode: 'insensitive' } },
        { shipment: { trackingNumber: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          shipment: {
            select: { id: true, trackingNumber: true, description: true },
          },
          lines: true,
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        invoices,
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
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    log.error('List invoices error', error);
    res.status(500).json({ success: false, message: 'Erreur lors du chargement des factures' });
  }
});

// ============================================
// GET /api/invoices/summary
// ============================================

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const [totalAgg, issuedAgg, paidAgg, draftCount, issuedCount, paidCount, cancelledCount] = await Promise.all([
      prisma.invoice.aggregate({
        where: { companyId, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.invoice.aggregate({
        where: { companyId, status: 'ISSUED' },
        _sum: { totalAmount: true, amountDue: true },
      }),
      prisma.invoice.aggregate({
        where: { companyId, status: 'PAID' },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.count({ where: { companyId, status: 'DRAFT' } }),
      prisma.invoice.count({ where: { companyId, status: 'ISSUED' } }),
      prisma.invoice.count({ where: { companyId, status: 'PAID' } }),
      prisma.invoice.count({ where: { companyId, status: 'CANCELLED' } }),
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalInvoiced: Math.round(totalAgg._sum.totalAmount || 0),
          totalOutstanding: Math.round(issuedAgg._sum.amountDue || 0),
          totalPaid: Math.round(paidAgg._sum.totalAmount || 0),
          count: totalAgg._count,
          byStatus: {
            draft: draftCount,
            issued: issuedCount,
            paid: paidCount,
            cancelled: cancelledCount,
          },
        },
      },
    });
  } catch (error) {
    log.error('Invoice summary error', error);
    res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ============================================
// GET /api/invoices/:id
// ============================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
      include: {
        lines: true,
        shipment: {
          select: {
            id: true, trackingNumber: true, description: true,
            blNumber: true, vesselName: true, clientName: true,
          },
        },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    }

    res.json({ success: true, data: { invoice } });
  } catch (error) {
    log.error('Get invoice error', error);
    res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ============================================
// POST /api/invoices/generate
// ============================================

router.post(
  '/generate',
  requireRole('DIRECTOR', 'ACCOUNTANT'),
  async (req: Request, res: Response) => {
    try {
      const data = generateInvoiceSchema.parse(req.body);

      const invoice = await generateInvoice({
        shipmentId: data.shipmentId,
        companyId: req.user!.companyId,
        userId: req.user!.id,
        honoraires: data.honoraires,
        taxRate: data.taxRate,
        notes: data.notes,
        dueDate: data.dueDate,
        autoIssue: data.autoIssue,
      });

      res.status(201).json({
        success: true,
        data: { invoice },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
        });
      }
      log.error('Generate invoice error', error);
      const message = error instanceof Error ? error.message : 'Erreur lors de la génération';
      res.status(500).json({ success: false, message });
    }
  }
);

// ============================================
// PATCH /api/invoices/:id/issue
// ============================================

router.patch(
  '/:id/issue',
  requireRole('DIRECTOR', 'ACCOUNTANT'),
  async (req: Request, res: Response) => {
    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id: req.params.id, companyId: req.user!.companyId },
        include: { shipment: { select: { id: true, status: true } } },
      });

      if (!invoice) {
        return res.status(404).json({ success: false, message: 'Facture non trouvée' });
      }

      if (invoice.status !== 'DRAFT') {
        return res.status(400).json({
          success: false,
          message: 'Seules les factures en brouillon peuvent être émises',
        });
      }

      const userName = (await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { name: true },
      }))?.name;

      const updated = await prisma.$transaction(async (tx) => {
        const inv = await tx.invoice.update({
          where: { id: req.params.id },
          data: {
            status: 'ISSUED',
            issuedAt: new Date(),
          },
          include: { lines: true },
        });

        // Advance shipment to INVOICED
        if (invoice.shipment.status === 'DELIVERED') {
          await tx.shipment.update({
            where: { id: invoice.shipmentId },
            data: { status: 'INVOICED' },
          });

          await tx.timelineEvent.create({
            data: {
              shipmentId: invoice.shipmentId,
              action: 'Statut → INVOICED',
              description: `Facture ${invoice.invoiceNumber} émise`,
              userId: req.user!.id,
              userName,
            },
          });
        }

        await tx.timelineEvent.create({
          data: {
            shipmentId: invoice.shipmentId,
            action: `Facture ${invoice.invoiceNumber} émise`,
            userId: req.user!.id,
            userName,
          },
        });

        return inv;
      });

      res.json({ success: true, data: { invoice: updated } });
    } catch (error) {
      log.error('Issue invoice error', error);
      res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
);

// ============================================
// PATCH /api/invoices/:id/pay
// ============================================

router.patch(
  '/:id/pay',
  requireRole('DIRECTOR', 'ACCOUNTANT'),
  async (req: Request, res: Response) => {
    try {
      const invoice = await markInvoicePaid(
        req.params.id,
        req.user!.companyId,
        req.user!.id
      );

      res.json({ success: true, data: { invoice } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur';
      log.error('Pay invoice error', error);
      res.status(400).json({ success: false, message });
    }
  }
);

// ============================================
// PATCH /api/invoices/:id/cancel
// ============================================

router.patch(
  '/:id/cancel',
  requireRole('DIRECTOR'),
  async (req: Request, res: Response) => {
    try {
      const invoice = await cancelInvoice(
        req.params.id,
        req.user!.companyId,
        req.user!.id
      );

      res.json({ success: true, data: { invoice } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur';
      log.error('Cancel invoice error', error);
      res.status(400).json({ success: false, message });
    }
  }
);

// ============================================
// GET /api/invoices/:id/pdf
// ============================================

router.get('/:id/pdf', async (req: Request, res: Response) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
      include: {
        lines: true,
        shipment: {
          select: {
            trackingNumber: true, blNumber: true, vesselName: true,
            description: true, grossWeight: true, containers: true,
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=facture-${invoice.invoiceNumber}.pdf`);
    doc.pipe(res);

    // ============ EN-TÊTE ENTREPRISE ============
    doc.fontSize(16).font('Helvetica-Bold').text(invoice.companyName, { align: 'left' });
    doc.fontSize(9).font('Helvetica');
    if (invoice.companyAddress) doc.text(invoice.companyAddress);
    if (invoice.companyPhone) doc.text(`Tél : ${invoice.companyPhone}`);
    if (invoice.companyNif) doc.text(`NIF : ${invoice.companyNif}`);
    doc.moveDown(1.5);

    // ============ TITRE FACTURE ============
    doc.fontSize(20).font('Helvetica-Bold').text('FACTURE', { align: 'center' });
    doc.fontSize(12).text(invoice.invoiceNumber, { align: 'center' });
    doc.moveDown(0.5);

    // Status badge
    if (invoice.status === 'CANCELLED') {
      doc.fontSize(14).fillColor('#DC2626').text('*** ANNULÉE ***', { align: 'center' });
      doc.fillColor('#000');
    } else if (invoice.status === 'PAID') {
      doc.fontSize(14).fillColor('#16A34A').text('*** PAYÉE ***', { align: 'center' });
      doc.fillColor('#000');
    }
    doc.moveDown();

    // ============ INFOS CLIENT + DATES ============
    const infoY = doc.y;

    // Left: Client
    doc.fontSize(10).font('Helvetica-Bold').text('FACTURÉ À :', 50, infoY);
    doc.fontSize(10).font('Helvetica');
    doc.text(invoice.clientName, 50, infoY + 15);
    if (invoice.clientAddress) doc.text(invoice.clientAddress);
    if (invoice.clientPhone) doc.text(`Tél : ${invoice.clientPhone}`);
    if (invoice.clientNif) doc.text(`NIF : ${invoice.clientNif}`);

    // Right: Dates
    doc.fontSize(9).font('Helvetica');
    const rightX = 350;
    doc.text(`Date d'émission : ${invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString('fr-FR') : '—'}`, rightX, infoY);
    doc.text(`Échéance : ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-FR') : '—'}`, rightX);
    doc.text(`Dossier : ${invoice.shipment.trackingNumber}`, rightX);
    if (invoice.shipment.blNumber) doc.text(`BL : ${invoice.shipment.blNumber}`, rightX);
    if (invoice.shipment.vesselName) doc.text(`Navire : ${invoice.shipment.vesselName}`, rightX);

    doc.y = Math.max(doc.y, infoY + 70);
    doc.moveDown(1.5);

    // ============ TABLEAU DES LIGNES ============
    doc.strokeColor('#333').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // Header
    const tableY = doc.y;
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Description', 50, tableY, { width: 300 });
    doc.text('Qté', 355, tableY, { width: 40, align: 'center' });
    doc.text('P.U.', 400, tableY, { width: 70, align: 'right' });
    doc.text('Montant', 475, tableY, { width: 70, align: 'right' });

    doc.moveDown(0.5);
    doc.strokeColor('#ddd').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    // Lines
    doc.fontSize(9).font('Helvetica');
    for (const line of invoice.lines) {
      if (doc.y > 700) doc.addPage();

      const rowY = doc.y;
      doc.text(line.description, 50, rowY, { width: 300 });
      doc.text(String(line.quantity), 355, rowY, { width: 40, align: 'center' });
      doc.text(fmtGNF(line.unitPrice), 400, rowY, { width: 70, align: 'right' });
      doc.text(fmtGNF(line.amount), 475, rowY, { width: 70, align: 'right' });
      doc.moveDown(0.6);
    }

    // ============ TOTAUX ============
    doc.moveDown(0.5);
    doc.strokeColor('#333').lineWidth(1).moveTo(350, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    const totalX = 350;
    const valX = 475;

    doc.fontSize(9).font('Helvetica');
    doc.text('Sous-total débours :', totalX, doc.y, { width: 120 });
    doc.text(fmtGNF(invoice.subtotal - invoice.honoraires), valX, doc.y - 11, { width: 70, align: 'right' });
    doc.moveDown(0.3);

    if (invoice.honoraires > 0) {
      doc.text('Honoraires :', totalX, doc.y, { width: 120 });
      doc.text(fmtGNF(invoice.honoraires), valX, doc.y - 11, { width: 70, align: 'right' });
      doc.moveDown(0.3);
    }

    doc.text('Sous-total HT :', totalX, doc.y, { width: 120 });
    doc.text(fmtGNF(invoice.subtotal), valX, doc.y - 11, { width: 70, align: 'right' });
    doc.moveDown(0.3);

    if (invoice.taxAmount > 0) {
      doc.text(`TVA (${Math.round(invoice.taxRate * 100)}%) sur honoraires :`, totalX, doc.y, { width: 120 });
      doc.text(fmtGNF(invoice.taxAmount), valX, doc.y - 11, { width: 70, align: 'right' });
      doc.moveDown(0.3);
    }

    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('TOTAL TTC :', totalX, doc.y, { width: 120 });
    doc.text(fmtGNF(invoice.totalAmount), valX, doc.y - 13, { width: 70, align: 'right' });
    doc.moveDown(0.8);

    // Provisions and due
    doc.fontSize(9).font('Helvetica');
    doc.text(`Provisions reçues : ${fmtGNF(invoice.totalProvisions)}`, totalX, doc.y);
    doc.moveDown(0.3);

    doc.fontSize(11).font('Helvetica-Bold');
    const dueLabel = invoice.amountDue >= 0 ? 'RESTE À PAYER :' : 'TROP-PERÇU :';
    doc.text(dueLabel, totalX, doc.y, { width: 120 });
    doc.fillColor(invoice.amountDue >= 0 ? '#DC2626' : '#16A34A');
    doc.text(fmtGNF(Math.abs(invoice.amountDue)), valX, doc.y - 13, { width: 70, align: 'right' });
    doc.fillColor('#000');

    // ============ NOTES ============
    if (invoice.notes) {
      doc.moveDown(2);
      doc.fontSize(9).font('Helvetica-Bold').text('Notes :');
      doc.font('Helvetica').text(invoice.notes);
    }

    // ============ PIED DE PAGE ============
    doc.moveDown(3);
    doc.strokeColor('#ccc').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(8).fillColor('#999');
    doc.text(
      `${invoice.companyName} — Facture ${invoice.invoiceNumber}`,
      { align: 'center' }
    );
    doc.text(
      `Générée le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} — E-Trans v3.0`,
      { align: 'center' }
    );

    doc.end();

    log.audit('Invoice PDF exported', { userId: req.user!.id, invoiceId: invoice.id });
  } catch (error) {
    log.error('Invoice PDF export error', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la génération du PDF' });
  }
});

export default router;
