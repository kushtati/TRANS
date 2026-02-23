// src/services/workflow.service.ts

import { ShipmentStatus } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { log } from '../config/logger.js';

// ============================================
// 1. DOCUMENT → STATUS AUTO-PROGRESSION
// When a key document is added, auto-advance status
// ============================================

const DOCUMENT_STATUS_MAP: Record<string, string> = {
  // Document type → status to advance to
  'BL':               'PENDING',           // BL reçu → dossier en cours
  'DDI':              'DDI_OBTAINED',      // DDI reçu → DDI obtenu
  'DECLARATION':      'DECLARATION_FILED', // Déclaration → déclaration déposée
  'LIQUIDATION':      'LIQUIDATION_ISSUED',// Liquidation → liquidation émise
  'QUITTANCE':        'CUSTOMS_PAID',      // Quittance → droits payés
  'BAE':              'BAE_ISSUED',        // BAE → BAE émis
  'TERMINAL_INVOICE': 'TERMINAL_PAID',     // Facture terminal → terminal payé
  'TERMINAL_RECEIPT': 'TERMINAL_PAID',     // Reçu terminal → terminal payé
  'DO':               'DO_RELEASED',       // DO → DO libéré
  'EXIT_NOTE':        'EXIT_NOTE_ISSUED',  // Bon de sortie → bon émis
  'DELIVERY_NOTE':    'DELIVERED',         // Bon de livraison → livré
};

// Status order for comparison (can only go forward)
const STATUS_ORDER: string[] = [
  'DRAFT', 'PENDING', 'ARRIVED', 'DDI_OBTAINED',
  'DECLARATION_FILED', 'LIQUIDATION_ISSUED', 'CUSTOMS_PAID',
  'BAE_ISSUED', 'TERMINAL_PAID', 'DO_RELEASED',
  'EXIT_NOTE_ISSUED', 'IN_DELIVERY', 'DELIVERED',
  'INVOICED', 'CLOSED', 'ARCHIVED',
];

function getStatusIndex(status: string): number {
  return STATUS_ORDER.indexOf(status);
}

/**
 * After a document is added, check if we should auto-advance the status.
 * Only advances FORWARD, never backward.
 */
export async function autoAdvanceStatus(
  shipmentId: string,
  documentType: string,
  userId: string
): Promise<{ advanced: boolean; newStatus?: string; oldStatus?: string }> {
  try {
    const targetStatus = DOCUMENT_STATUS_MAP[documentType];
    if (!targetStatus) return { advanced: false };

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { status: true, trackingNumber: true },
    });

    if (!shipment) return { advanced: false };

    const currentIndex = getStatusIndex(shipment.status);
    const targetIndex = getStatusIndex(targetStatus);

    // Only advance forward
    if (targetIndex <= currentIndex) return { advanced: false };

    const userName = (await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    }))?.name;

    // Update status
    await prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: targetStatus as ShipmentStatus },
    });

    // Timeline entry
    await prisma.timelineEvent.create({
      data: {
        shipmentId,
        action: `Statut avancé automatiquement → ${targetStatus}`,
        description: `Document ${documentType} ajouté. Passage de ${shipment.status} à ${targetStatus}.`,
        userId,
        userName,
      },
    });

    log.info(`Auto-advanced ${shipment.trackingNumber}: ${shipment.status} → ${targetStatus}`);

    return { advanced: true, newStatus: targetStatus, oldStatus: shipment.status };
  } catch (error) {
    log.error('Auto-advance status failed', error);
    return { advanced: false };
  }
}

// ============================================
// 1b. EXPENSE PAID → STATUS AUTO-PROGRESSION
// When terminal-category expenses are paid, auto-advance BAE_ISSUED → TERMINAL_PAID
// ============================================

const TERMINAL_CATEGORIES = [
  'ACCONAGE', 'BRANCHEMENT', 'SURESTARIES', 'MANUTENTION',
  'PASSAGE_TERRE', 'RELEVAGE', 'SECURITE_TERMINAL',
];

/**
 * After an expense is paid, check if we should auto-advance.
 * Currently: if status is BAE_ISSUED and a terminal-category expense was paid → TERMINAL_PAID
 */
export async function autoAdvanceOnExpensePaid(
  shipmentId: string,
  expenseCategory: string,
  userId: string
): Promise<{ advanced: boolean; newStatus?: string; oldStatus?: string }> {
  try {
    // Only react to terminal-category expenses
    if (!TERMINAL_CATEGORIES.includes(expenseCategory)) return { advanced: false };

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { status: true, trackingNumber: true },
    });

    if (!shipment || shipment.status !== 'BAE_ISSUED') return { advanced: false };

    const userName = (await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    }))?.name;

    await prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: 'TERMINAL_PAID' as ShipmentStatus },
    });

    await prisma.timelineEvent.create({
      data: {
        shipmentId,
        action: 'Statut avancé automatiquement → TERMINAL_PAID',
        description: `Frais terminal payés. Passage de BAE_ISSUED à TERMINAL_PAID.`,
        userId,
        userName,
      },
    });

    log.info(`Auto-advanced ${shipment.trackingNumber}: BAE_ISSUED → TERMINAL_PAID (expense paid)`);
    return { advanced: true, newStatus: 'TERMINAL_PAID', oldStatus: 'BAE_ISSUED' };
  } catch (error) {
    log.error('Auto-advance on expense paid failed', error);
    return { advanced: false };
  }
}

// ============================================
// 2. DOCUMENT → FIELD AUTO-FILL MAPPING
// Returns which shipment fields should be extracted from a document type
// ============================================

export interface ExtractedFields {
  blNumber?: string;
  doNumber?: string;
  declarationNumber?: string;
  liquidationNumber?: string;
  quittanceNumber?: string;
  baeNumber?: string;
  bsNumber?: string;
  vesselName?: string;
  voyageNumber?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  clientName?: string;
  clientNif?: string;
  description?: string;
  hsCode?: string;
  grossWeight?: number;
  cifValue?: number;
  totalDuties?: number;
}

/**
 * Map of document type → which fields the user should fill
 * This helps the frontend show contextual fields after upload
 */
export const DOCUMENT_FIELD_HINTS: Record<string, { fields: string[]; label: string }> = {
  BL: {
    label: 'Connaissement (BL)',
    fields: ['blNumber', 'vesselName', 'voyageNumber', 'portOfLoading', 'portOfDischarge', 'clientName', 'description', 'grossWeight', 'packageCount'],
  },
  INVOICE: {
    label: 'Facture commerciale',
    fields: ['cifValue', 'cifCurrency', 'supplierName', 'supplierCountry', 'description', 'hsCode'],
  },
  DDI: {
    label: 'DDI',
    fields: ['ddiNumber'],
  },
  DECLARATION: {
    label: 'Déclaration en douane',
    fields: ['declarationNumber', 'customsRegime', 'hsCode', 'cifValue', 'exchangeRate'],
  },
  LIQUIDATION: {
    label: 'Liquidation',
    fields: ['liquidationNumber', 'dutyDD', 'dutyRTL', 'dutyTVA', 'dutyPC', 'dutyCA', 'dutyBFU', 'totalDuties'],
  },
  QUITTANCE: {
    label: 'Quittance',
    fields: ['quittanceNumber'],
  },
  BAE: {
    label: 'BAE',
    fields: ['baeNumber'],
  },
  DO: {
    label: 'Delivery Order',
    fields: ['doNumber'],
  },
  EXIT_NOTE: {
    label: 'Bon de sortie',
    fields: ['bsNumber'],
  },
};

// ============================================
// 3. DEADLINE & ALERT ENGINE
// Check for upcoming deadlines, overdue items, missing docs
// ============================================

interface Alert {
  id: string;
  type: 'danger' | 'warning' | 'info';
  category: 'vessel' | 'document' | 'finance' | 'deadline';
  message: string;
  shipmentId: string;
  trackingNumber: string;
}

/**
 * Generate alerts for a specific company.
 * Checks: ETA arrivals, surestaries risk, missing documents, unpaid expenses, stale statuses.
 */
export async function generateAlerts(companyId: string): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const now = new Date();

  // Get active shipments (limit to 30, select only needed fields to reduce memory)
  const shipments = await prisma.shipment.findMany({
    where: {
      companyId,
      status: { notIn: ['DELIVERED', 'INVOICED', 'CLOSED', 'ARCHIVED'] },
    },
    select: {
      id: true,
      trackingNumber: true,
      status: true,
      eta: true,
      ata: true,
      vesselName: true,
      updatedAt: true,
      documents: { select: { type: true } },
      expenses: { select: { type: true, paid: true, amount: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 30,
  });

  for (const s of shipments) {
    const docTypes = s.documents.map(d => d.type);

    // === VESSEL ALERTS ===

    // ETA within 48h
    if (s.eta) {
      const eta = new Date(s.eta);
      const hoursUntilEta = (eta.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilEta > 0 && hoursUntilEta <= 48) {
        alerts.push({
          id: `eta-${s.id}`,
          type: 'warning',
          category: 'vessel',
          message: `Navire "${s.vesselName || 'N/C'}" arrive dans ${Math.round(hoursUntilEta)}h — ${s.trackingNumber}`,
          shipmentId: s.id,
          trackingNumber: s.trackingNumber,
        });
      }

      // ETA passed but status still PENDING
      if (hoursUntilEta < 0 && s.status === 'PENDING') {
        alerts.push({
          id: `eta-passed-${s.id}`,
          type: 'danger',
          category: 'vessel',
          message: `Navire arrivé depuis ${Math.abs(Math.round(hoursUntilEta / 24))}j — statut non mis à jour — ${s.trackingNumber}`,
          shipmentId: s.id,
          trackingNumber: s.trackingNumber,
        });
      }
    }

    // === SURESTARIES RISK ===
    // If arrived > 7 days ago and not yet DO_RELEASED
    if (s.ata && getStatusIndex(s.status) < getStatusIndex('DO_RELEASED')) {
      const daysSinceArrival = (now.getTime() - new Date(s.ata).getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceArrival > 7) {
        alerts.push({
          id: `surestaries-${s.id}`,
          type: 'danger',
          category: 'deadline',
          message: `⚠️ Risque surestaries : ${Math.round(daysSinceArrival)}j depuis l'arrivée, DO non libéré — ${s.trackingNumber}`,
          shipmentId: s.id,
          trackingNumber: s.trackingNumber,
        });
      } else if (daysSinceArrival > 4) {
        alerts.push({
          id: `surestaries-warn-${s.id}`,
          type: 'warning',
          category: 'deadline',
          message: `Attention : ${Math.round(daysSinceArrival)}j depuis l'arrivée — accélérer le dédouanement — ${s.trackingNumber}`,
          shipmentId: s.id,
          trackingNumber: s.trackingNumber,
        });
      }
    }

    // === MISSING DOCUMENT ALERTS ===
    const statusIdx = getStatusIndex(s.status);

    // After ARRIVED but no DDI
    if (statusIdx >= getStatusIndex('ARRIVED') && !docTypes.includes('DDI')) {
      alerts.push({
        id: `missing-ddi-${s.id}`,
        type: 'warning',
        category: 'document',
        message: `DDI manquant — ${s.trackingNumber}`,
        shipmentId: s.id,
        trackingNumber: s.trackingNumber,
      });
    }

    // After DDI but no DECLARATION
    if (statusIdx >= getStatusIndex('DDI_OBTAINED') && !docTypes.includes('DECLARATION')) {
      alerts.push({
        id: `missing-decl-${s.id}`,
        type: 'warning',
        category: 'document',
        message: `Déclaration non déposée — ${s.trackingNumber}`,
        shipmentId: s.id,
        trackingNumber: s.trackingNumber,
      });
    }

    // After CUSTOMS_PAID but no BAE
    if (statusIdx >= getStatusIndex('CUSTOMS_PAID') && !docTypes.includes('BAE')) {
      alerts.push({
        id: `missing-bae-${s.id}`,
        type: 'info',
        category: 'document',
        message: `BAE en attente — ${s.trackingNumber}`,
        shipmentId: s.id,
        trackingNumber: s.trackingNumber,
      });
    }

    // === FINANCE ALERTS ===
    const unpaidAmount = s.expenses
      .filter(e => e.type === 'DISBURSEMENT' && !e.paid)
      .reduce((sum, e) => sum + e.amount, 0);

    if (unpaidAmount > 50_000_000) {
      alerts.push({
        id: `unpaid-${s.id}`,
        type: 'warning',
        category: 'finance',
        message: `${Math.round(unpaidAmount / 1_000_000)}M GNF de débours non payés — ${s.trackingNumber}`,
        shipmentId: s.id,
        trackingNumber: s.trackingNumber,
      });
    }

    // === STALE STATUS ===
    const daysSinceUpdate = (now.getTime() - new Date(s.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 5 && statusIdx < getStatusIndex('DELIVERED')) {
      alerts.push({
        id: `stale-${s.id}`,
        type: 'info',
        category: 'deadline',
        message: `Aucune activité depuis ${Math.round(daysSinceUpdate)}j — ${s.trackingNumber}`,
        shipmentId: s.id,
        trackingNumber: s.trackingNumber,
      });
    }
  }

  // Sort: danger first, then warning, then info
  const priority = { danger: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => priority[a.type] - priority[b.type]);

  return alerts;
}

// ============================================
// 4. NEXT STEPS CALCULATOR
// For a given shipment, what are the next actions needed?
// ============================================

interface NextStep {
  label: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  documentNeeded?: string;
}

export function getNextSteps(shipment: {
  status: string;
  documents: { type: string }[];
  expenses: { type: string; paid: boolean }[];
}): NextStep[] {
  const steps: NextStep[] = [];
  const docTypes = shipment.documents.map(d => d.type);
  const hasUnpaidExpenses = shipment.expenses.some(e => e.type === 'DISBURSEMENT' && !e.paid);

  switch (shipment.status) {
    case 'DRAFT':
    case 'PENDING':
      if (!docTypes.includes('BL')) {
        steps.push({ label: 'Ajouter le BL', action: 'add_document', priority: 'high', documentNeeded: 'BL' });
      }
      if (!docTypes.includes('INVOICE')) {
        steps.push({ label: 'Ajouter la facture commerciale', action: 'add_document', priority: 'high', documentNeeded: 'INVOICE' });
      }
      steps.push({ label: 'Obtenir le DDI', action: 'add_document', priority: 'medium', documentNeeded: 'DDI' });
      break;

    case 'ARRIVED':
      if (!docTypes.includes('DDI')) {
        steps.push({ label: 'Obtenir le DDI', action: 'add_document', priority: 'high', documentNeeded: 'DDI' });
      }
      break;

    case 'DDI_OBTAINED':
      steps.push({ label: 'Déposer la déclaration', action: 'add_document', priority: 'high', documentNeeded: 'DECLARATION' });
      break;

    case 'DECLARATION_FILED':
      steps.push({ label: 'Obtenir la liquidation', action: 'add_document', priority: 'high', documentNeeded: 'LIQUIDATION' });
      break;

    case 'LIQUIDATION_ISSUED':
      if (hasUnpaidExpenses) {
        steps.push({ label: 'Payer les droits de douane', action: 'pay_expenses', priority: 'high' });
      }
      steps.push({ label: 'Ajouter la quittance', action: 'add_document', priority: 'high', documentNeeded: 'QUITTANCE' });
      break;

    case 'CUSTOMS_PAID':
      steps.push({ label: 'Obtenir le BAE', action: 'add_document', priority: 'high', documentNeeded: 'BAE' });
      break;

    case 'BAE_ISSUED':
      steps.push({ label: 'Payer les frais terminal', action: 'pay_expenses', priority: 'high' });
      if (!docTypes.includes('TERMINAL_INVOICE') && !docTypes.includes('TERMINAL_RECEIPT')) {
        steps.push({ label: 'Ajouter la facture/reçu terminal', action: 'add_document', priority: 'medium', documentNeeded: 'TERMINAL_INVOICE' });
      }
      break;

    case 'TERMINAL_PAID':
      steps.push({ label: 'Obtenir le DO', action: 'add_document', priority: 'high', documentNeeded: 'DO' });
      break;

    case 'DO_RELEASED':
      steps.push({ label: 'Obtenir le bon de sortie', action: 'add_document', priority: 'high', documentNeeded: 'EXIT_NOTE' });
      break;

    case 'EXIT_NOTE_ISSUED':
      steps.push({ label: 'Organiser la livraison', action: 'update_delivery', priority: 'high' });
      break;

    case 'IN_DELIVERY':
      steps.push({ label: 'Confirmer la livraison', action: 'add_document', priority: 'high', documentNeeded: 'DELIVERY_NOTE' });
      break;

    case 'DELIVERED':
      if (hasUnpaidExpenses) {
        steps.push({ label: 'Solder les débours restants', action: 'pay_expenses', priority: 'medium' });
      }
      steps.push({ label: 'Émettre la facture', action: 'invoice', priority: 'medium' });
      break;
  }

  return steps;
}
