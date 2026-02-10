// src/utils/format.ts

/**
 * Format a number as GNF currency
 * @param amount The amount in GNF
 * @param options.compact Use abbreviated format (K, M, Md)
 * @param options.showCurrency Append "GNF" suffix
 */
export const formatGNF = (
  amount: number | undefined | null,
  options?: { compact?: boolean; showCurrency?: boolean }
): string => {
  if (amount === undefined || amount === null) return '—';

  const { compact = false, showCurrency = true } = options ?? {};

  if (compact) {
    const abs = Math.abs(amount);
    let formatted: string;

    if (abs >= 1_000_000_000) {
      formatted = `${(amount / 1_000_000_000).toFixed(1)} Md`;
    } else if (abs >= 1_000_000) {
      formatted = `${(amount / 1_000_000).toFixed(1)} M`;
    } else if (abs >= 1_000) {
      formatted = `${(amount / 1_000).toFixed(0)} K`;
    } else {
      formatted = Math.round(amount).toString();
    }

    // Remove .0 trailing
    formatted = formatted.replace('.0 ', ' ');

    return showCurrency ? `${formatted} GNF` : formatted;
  }

  const formatted = Math.round(amount).toLocaleString('fr-FR');
  return showCurrency ? `${formatted} GNF` : formatted;
};

/**
 * Format a date string to French locale
 */
export const formatDate = (
  date: string | Date | undefined | null,
  options?: { time?: boolean }
): string => {
  if (!date) return '—';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return '—';

  if (options?.time) {
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format a shipment status to human-readable French label
 */
export const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  PENDING: 'En attente',
  ARRIVED: 'Arrivé',
  DDI_OBTAINED: 'DDI obtenue',
  DECLARATION_FILED: 'Déclaration déposée',
  LIQUIDATION_ISSUED: 'Liquidation émise',
  CUSTOMS_PAID: 'Droits payés',
  BAE_ISSUED: 'BAE émis',
  TERMINAL_PAID: 'Terminal payé',
  DO_RELEASED: 'DO délivré',
  EXIT_NOTE_ISSUED: 'Bon de sortie émis',
  IN_DELIVERY: 'En livraison',
  DELIVERED: 'Livré',
  INVOICED: 'Facturé',
  CLOSED: 'Clôturé',
  ARCHIVED: 'Archivé',
};

export const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING: 'bg-amber-100 text-amber-700',
  ARRIVED: 'bg-blue-100 text-blue-700',
  DDI_OBTAINED: 'bg-indigo-100 text-indigo-700',
  DECLARATION_FILED: 'bg-violet-100 text-violet-700',
  LIQUIDATION_ISSUED: 'bg-purple-100 text-purple-700',
  CUSTOMS_PAID: 'bg-fuchsia-100 text-fuchsia-700',
  BAE_ISSUED: 'bg-pink-100 text-pink-700',
  TERMINAL_PAID: 'bg-rose-100 text-rose-700',
  DO_RELEASED: 'bg-cyan-100 text-cyan-700',
  EXIT_NOTE_ISSUED: 'bg-teal-100 text-teal-700',
  IN_DELIVERY: 'bg-orange-100 text-orange-700',
  DELIVERED: 'bg-green-100 text-green-700',
  INVOICED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-slate-100 text-slate-600',
  ARCHIVED: 'bg-gray-100 text-gray-500',
};
