// src/__tests__/format.test.ts

import { describe, it, expect } from 'vitest';
import { formatGNF, formatDate, statusLabels, statusColors } from '../utils/format';

// ============================================
// formatGNF
// ============================================

describe('formatGNF', () => {
  it('formats zero', () => {
    expect(formatGNF(0)).toBe('0 GNF');
  });

  it('formats small amounts', () => {
    const result = formatGNF(500);
    expect(result).toContain('500');
    expect(result).toContain('GNF');
  });

  it('formats thousands with locale separators', () => {
    const result = formatGNF(1500000);
    expect(result).toContain('GNF');
    // French locale uses space as thousands separator
    expect(result).toMatch(/1[\s\u00a0]500[\s\u00a0]000/);
  });

  it('compact mode: shows K for thousands', () => {
    const result = formatGNF(5000, { compact: true });
    expect(result).toContain('K');
    expect(result).toContain('GNF');
  });

  it('compact mode: shows M for millions', () => {
    const result = formatGNF(2500000, { compact: true });
    expect(result).toContain('M');
    expect(result).toContain('GNF');
  });

  it('compact mode: shows Md for billions', () => {
    const result = formatGNF(3000000000, { compact: true });
    expect(result).toContain('Md');
    expect(result).toContain('GNF');
  });

  it('hides currency when showCurrency is false', () => {
    const result = formatGNF(1000, { showCurrency: false });
    expect(result).not.toContain('GNF');
  });

  it('handles negative amounts', () => {
    const result = formatGNF(-500000);
    expect(result).toContain('-');
    expect(result).toContain('GNF');
  });

  it('handles decimal amounts (rounds)', () => {
    const result = formatGNF(1234.56);
    // GNF has no decimal places
    expect(result).not.toContain('.');
  });
});

// ============================================
// formatDate
// ============================================

describe('formatDate', () => {
  it('formats date string', () => {
    const result = formatDate('2026-02-09T10:30:00Z');
    // Should contain French date elements
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('formats Date object', () => {
    const result = formatDate(new Date('2026-01-15'));
    expect(result).toBeTruthy();
  });

  it('includes time when option is set', () => {
    const result = formatDate('2026-02-09T14:30:00Z', { time: true });
    expect(result).toBeTruthy();
    // Should be longer than without time
    const withoutTime = formatDate('2026-02-09T14:30:00Z');
    expect(result.length).toBeGreaterThanOrEqual(withoutTime.length);
  });
});

// ============================================
// Status Labels
// ============================================

describe('statusLabels', () => {
  it('has all 16 statuses', () => {
    const expectedStatuses = [
      'DRAFT', 'PENDING', 'ARRIVED', 'DDI_OBTAINED',
      'DECLARATION_FILED', 'LIQUIDATION_ISSUED', 'CUSTOMS_PAID',
      'BAE_ISSUED', 'TERMINAL_PAID', 'DO_RELEASED',
      'EXIT_NOTE_ISSUED', 'IN_DELIVERY', 'DELIVERED',
      'INVOICED', 'CLOSED', 'ARCHIVED',
    ];

    expectedStatuses.forEach(status => {
      expect(statusLabels[status]).toBeTruthy();
      expect(typeof statusLabels[status]).toBe('string');
    });
  });

  it('labels are in French', () => {
    expect(statusLabels['DRAFT']).toBe('Brouillon');
    expect(statusLabels['DELIVERED']).toBe('Livré');
    expect(statusLabels['CUSTOMS_PAID']).toBe('Droits payés');
  });
});

describe('statusColors', () => {
  it('has color for each status', () => {
    Object.keys(statusLabels).forEach(status => {
      expect(statusColors[status]).toBeTruthy();
    });
  });

  it('colors are valid Tailwind classes', () => {
    Object.values(statusColors).forEach(colorClass => {
      expect(colorClass).toMatch(/^(bg-|text-)/);
    });
  });
});
