// src/services/invoice.service.ts
// ============================================
// SERVICE DE FACTURATION AUTOMATIQUE
// Génère une facture à partir des dépenses d'un dossier
// Calcule : provisions, débours, honoraires, solde
// Numérotation séquentielle : FAC-2026-0001
// ============================================

import { prisma } from '../config/prisma.js';
import { log } from '../config/logger.js';

/**
 * Génère un numéro de facture séquentiel pour une entreprise.
 * Format : FAC-YYYY-NNNN (ex: FAC-2026-0042)
 */
export async function generateInvoiceNumber(companyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `FAC-${year}-`;

  // Find the last invoice number for this company this year
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      companyId,
      invoiceNumber: { startsWith: prefix },
    },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });

  let nextNum = 1;
  if (lastInvoice) {
    const lastNum = parseInt(lastInvoice.invoiceNumber.slice(prefix.length));
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

// Catégorie → libellé français pour les lignes de facture
const CATEGORY_LABELS: Record<string, string> = {
  DD: 'Droit de Douane', TVA: 'TVA', RTL: 'Redevance de Traitement et Liquidation',
  PC: 'Prélèvement Communautaire', CA: 'Contribution Africaine', BFU: 'BFU',
  DDI_FEE: 'Frais DDI', ACCONAGE: 'Acconage', BRANCHEMENT: 'Branchement',
  SURESTARIES: 'Surestaries', MANUTENTION: 'Manutention',
  PASSAGE_TERRE: 'Passage à terre', RELEVAGE: 'Relevage',
  SECURITE_TERMINAL: 'Sécurité terminal', DO_FEE: 'Frais DO',
  SEAWAY_BILL: 'Seaway Bill', MANIFEST_FEE: 'Frais manifeste',
  CONTAINER_DAMAGE: 'Dommage conteneur', SECURITE_MSC: 'Sécurité MSC',
  SURCHARGE: 'Surcharge', PAC: 'PAC', ADP_FEE: 'Frais ADP',
  TRANSPORT: 'Transport', TRANSPORT_ADD: 'Transport complémentaire',
  HONORAIRES: 'Honoraires', COMMISSION: 'Commission',
  ASSURANCE: 'Assurance', MAGASINAGE: 'Magasinage',
  SCANNER: 'Scanner', ESCORTE: 'Escorte', AUTRE: 'Autre',
};

interface GenerateInvoiceOptions {
  shipmentId: string;
  companyId: string;
  userId: string;
  honoraires?: number;     // Montant des honoraires du transitaire
  taxRate?: number;         // Taux de taxe sur honoraires (0.18 pour TVA 18%)
  notes?: string;
  dueDate?: string;         // Date d'échéance ISO
  autoIssue?: boolean;      // Émettre directement (pas en brouillon)
}

/**
 * Génère automatiquement une facture pour un dossier.
 *
 * Logique métier :
 * 1. Récupère toutes les dépenses (provisions + débours) du dossier
 * 2. Crée une ligne de facture par débours (détail des frais avancés)
 * 3. Ajoute une ligne "Honoraires" pour la commission du transitaire
 * 4. Calcule le total, la TVA sur les honoraires, et le solde
 * 5. Déduit les provisions déjà versées → reste à payer
 */
export async function generateInvoice(options: GenerateInvoiceOptions) {
  const { shipmentId, companyId, userId, notes, autoIssue = false } = options;

  // 1. Load shipment with all expenses
  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, companyId },
    include: {
      expenses: { orderBy: { createdAt: 'asc' } },
      invoices: { select: { id: true } },
    },
  });

  if (!shipment) {
    throw new Error('Dossier non trouvé');
  }

  // 2. Load company info for invoice header
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new Error('Entreprise non trouvée');
  }

  // 3. Calculate totals from expenses
  const provisions = shipment.expenses.filter(e => e.type === 'PROVISION');
  const disbursements = shipment.expenses.filter(e => e.type === 'DISBURSEMENT');

  const totalProvisions = provisions.reduce((sum, e) => sum + e.amount, 0);
  const totalDisbursements = disbursements.reduce((sum, e) => sum + e.amount, 0);

  // 4. Calculate honoraires
  // Default: 5% of total disbursements, minimum 500,000 GNF
  let honoraires = options.honoraires ?? Math.max(
    Math.round(totalDisbursements * 0.05),
    500000
  );
  // If no disbursements at all, no auto-honoraires
  if (totalDisbursements === 0 && !options.honoraires) {
    honoraires = 0;
  }

  // 5. Build invoice lines from disbursements (grouped by category)
  const categoryTotals = new Map<string, { amount: number; count: number }>();
  for (const d of disbursements) {
    const existing = categoryTotals.get(d.category) || { amount: 0, count: 0 };
    existing.amount += d.amount;
    existing.count += 1;
    categoryTotals.set(d.category, existing);
  }

  const invoiceLines: Array<{
    description: string;
    category: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }> = [];

  // Add one line per expense category (grouped)
  for (const [category, { amount, count }] of categoryTotals) {
    const label = CATEGORY_LABELS[category] || category;
    invoiceLines.push({
      description: count > 1 ? `${label} (${count} opérations)` : label,
      category,
      quantity: 1,
      unitPrice: Math.round(amount),
      amount: Math.round(amount),
    });
  }

  // Add honoraires line
  if (honoraires > 0) {
    invoiceLines.push({
      description: 'Honoraires de transit',
      category: 'HONORAIRES',
      quantity: 1,
      unitPrice: Math.round(honoraires),
      amount: Math.round(honoraires),
    });
  }

  // 6. Calculate totals
  const subtotal = invoiceLines.reduce((sum, l) => sum + l.amount, 0);

  // TVA applies only to honoraires (pas sur les débours avancés pour le compte du client)
  const taxRate = options.taxRate ?? 0;
  const taxAmount = Math.round(honoraires * taxRate);

  const totalAmount = subtotal + taxAmount;
  const amountDue = totalAmount - totalProvisions;

  // 7. Generate invoice number
  const invoiceNumber = await generateInvoiceNumber(companyId);

  // 8. Parse due date
  const dueDate = options.dueDate ? new Date(options.dueDate) : undefined;
  const issuedAt = autoIssue ? new Date() : undefined;
  const status = autoIssue ? 'ISSUED' as const : 'DRAFT' as const;

  // 9. Create invoice + lines in transaction
  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        invoiceNumber,
        shipmentId,
        companyId,
        companyName: company.name,
        companyNif: company.nif,
        companyPhone: company.phone,
        companyAddress: company.address,
        clientName: shipment.clientName,
        clientNif: shipment.clientNif,
        clientPhone: shipment.clientPhone,
        clientAddress: shipment.clientAddress,
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        totalProvisions: Math.round(totalProvisions),
        totalDisbursements: Math.round(totalDisbursements),
        honoraires: Math.round(honoraires),
        amountDue: Math.round(amountDue),
        status,
        issuedAt,
        dueDate,
        notes,
        createdById: userId,
        lines: {
          create: invoiceLines,
        },
      },
      include: { lines: true },
    });

    // Timeline entry on shipment
    const userName = (await tx.user.findUnique({
      where: { id: userId },
      select: { name: true },
    }))?.name;

    await tx.timelineEvent.create({
      data: {
        shipmentId,
        action: `Facture ${invoiceNumber} ${autoIssue ? 'émise' : 'créée (brouillon)'}`,
        description: `Montant : ${Math.round(totalAmount).toLocaleString('fr-FR')} GNF — Reste à payer : ${Math.round(amountDue).toLocaleString('fr-FR')} GNF`,
        userId,
        userName,
      },
    });

    // If auto-issue, advance shipment to INVOICED
    if (autoIssue && shipment.status === 'DELIVERED') {
      await tx.shipment.update({
        where: { id: shipmentId },
        data: { status: 'INVOICED' },
      });

      await tx.timelineEvent.create({
        data: {
          shipmentId,
          action: 'Statut → INVOICED',
          description: `Facture ${invoiceNumber} émise automatiquement`,
          userId,
          userName,
        },
      });
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        action: 'INVOICE_CREATED',
        entity: 'Invoice',
        entityId: inv.id,
        details: {
          invoiceNumber,
          totalAmount,
          amountDue,
          honoraires,
          lineCount: invoiceLines.length,
          shipmentTracking: shipment.trackingNumber,
        },
        userId,
      },
    });

    return inv;
  });

  log.audit('Invoice generated', {
    invoiceNumber,
    shipment: shipment.trackingNumber,
    totalAmount,
    amountDue,
  });

  return invoice;
}

/**
 * Marque une facture comme payée.
 */
export async function markInvoicePaid(
  invoiceId: string,
  companyId: string,
  userId: string
) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    include: { shipment: { select: { id: true, trackingNumber: true, status: true } } },
  });

  if (!invoice) throw new Error('Facture non trouvée');
  if (invoice.status === 'PAID') throw new Error('Facture déjà payée');
  if (invoice.status === 'CANCELLED') throw new Error('Facture annulée');

  const userName = (await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  }))?.name;

  const updated = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
      include: { lines: true },
    });

    await tx.timelineEvent.create({
      data: {
        shipmentId: invoice.shipmentId,
        action: `Facture ${invoice.invoiceNumber} payée`,
        description: `Paiement reçu : ${Math.round(invoice.totalAmount).toLocaleString('fr-FR')} GNF`,
        userId,
        userName,
      },
    });

    // Auto-close shipment if paid
    if (invoice.shipment.status === 'INVOICED') {
      await tx.shipment.update({
        where: { id: invoice.shipmentId },
        data: { status: 'CLOSED' },
      });

      await tx.timelineEvent.create({
        data: {
          shipmentId: invoice.shipmentId,
          action: 'Statut → CLOSED',
          description: 'Dossier clôturé automatiquement après paiement de la facture',
          userId,
          userName,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        action: 'INVOICE_PAID',
        entity: 'Invoice',
        entityId: invoiceId,
        details: {
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.totalAmount,
          shipment: invoice.shipment.trackingNumber,
        },
        userId,
      },
    });

    return inv;
  });

  return updated;
}

/**
 * Annule une facture (ne supprime pas, marque CANCELLED).
 */
export async function cancelInvoice(
  invoiceId: string,
  companyId: string,
  userId: string
) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
  });

  if (!invoice) throw new Error('Facture non trouvée');
  if (invoice.status === 'PAID') throw new Error('Impossible d\'annuler une facture payée');

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    },
    include: { lines: true },
  });

  await prisma.auditLog.create({
    data: {
      action: 'INVOICE_CANCELLED',
      entity: 'Invoice',
      entityId: invoiceId,
      details: { invoiceNumber: invoice.invoiceNumber },
      userId,
    },
  });

  return updated;
}
