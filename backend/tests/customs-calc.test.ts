// tests/customs-calc.test.ts

import { describe, it, expect } from 'vitest';

// ============================================
// Customs Duty Calculation Logic (IM4 Guinea)
// ============================================

interface DutyRates {
  dd: number;   // Droit de Douane
  rtl: number;  // Redevance de Traitement et de Liquidation
  tva: number;  // TVA
  pc: number;   // Prélèvement Communautaire
  ca: number;   // Contribution Africaine
  bfu: number;  // Bureau de Fret Unifié
}

interface DutyResult {
  dd: number;
  rtl: number;
  tva: number;
  pc: number;
  ca: number;
  bfu: number;
  total: number;
}

const IM4_RATES: DutyRates = {
  dd: 0.35,   // 35%
  rtl: 0.02,  // 2%
  tva: 0.18,  // 18%
  pc: 0.005,  // 0.5%
  ca: 0,      // 0%
  bfu: 0.005, // 0.5%
};

function calculateDuties(cifGnf: number, rates: DutyRates = IM4_RATES): DutyResult {
  const dd = Math.round(cifGnf * rates.dd);
  const rtl = Math.round(cifGnf * rates.rtl);
  // TVA is calculated on (CIF + DD)
  const tvaBase = cifGnf + dd;
  const tva = Math.round(tvaBase * rates.tva);
  const pc = Math.round(cifGnf * rates.pc);
  const ca = Math.round(cifGnf * rates.ca);
  const bfu = Math.round(cifGnf * rates.bfu);
  const total = dd + rtl + tva + pc + ca + bfu;

  return { dd, rtl, tva, pc, ca, bfu, total };
}

describe('Customs Duty Calculator', () => {
  it('calculates correct duties for standard IM4 import', () => {
    // CIF = 100,000,000 GNF
    const result = calculateDuties(100_000_000);

    expect(result.dd).toBe(35_000_000);       // 35%
    expect(result.rtl).toBe(2_000_000);        // 2%
    expect(result.tva).toBe(24_300_000);       // 18% of (100M + 35M)
    expect(result.pc).toBe(500_000);           // 0.5%
    expect(result.ca).toBe(0);                 // 0%
    expect(result.bfu).toBe(500_000);          // 0.5%
    expect(result.total).toBe(62_300_000);
  });

  it('calculates zero duties for zero CIF', () => {
    const result = calculateDuties(0);

    expect(result.dd).toBe(0);
    expect(result.rtl).toBe(0);
    expect(result.tva).toBe(0);
    expect(result.pc).toBe(0);
    expect(result.total).toBe(0);
  });

  it('handles small CIF values correctly', () => {
    const result = calculateDuties(1_000_000); // 1M GNF

    expect(result.dd).toBe(350_000);
    expect(result.rtl).toBe(20_000);
    expect(result.tva).toBe(243_000);
    expect(result.pc).toBe(5_000);
    expect(result.bfu).toBe(5_000);
    expect(result.total).toBe(623_000);
  });

  it('handles very large CIF values', () => {
    const result = calculateDuties(10_000_000_000); // 10 Md GNF

    expect(result.dd).toBe(3_500_000_000);
    expect(result.total).toBeGreaterThan(6_000_000_000);
  });

  it('TVA base includes DD', () => {
    const cif = 50_000_000;
    const result = calculateDuties(cif);

    // TVA = 18% × (CIF + DD) = 18% × (50M + 17.5M) = 18% × 67.5M = 12,150,000
    const expectedTva = Math.round((cif + cif * 0.35) * 0.18);
    expect(result.tva).toBe(expectedTva);
  });

  it('total equals sum of all components', () => {
    const result = calculateDuties(75_000_000);

    const sum = result.dd + result.rtl + result.tva + result.pc + result.ca + result.bfu;
    expect(result.total).toBe(sum);
  });

  it('supports custom rates for different regimes', () => {
    // IM7 regime (transit) — reduced rates
    const im7Rates: DutyRates = {
      dd: 0.10,  // 10%
      rtl: 0.02,
      tva: 0.18,
      pc: 0.005,
      ca: 0,
      bfu: 0.005,
    };

    const result = calculateDuties(100_000_000, im7Rates);
    expect(result.dd).toBe(10_000_000); // 10% instead of 35%
    expect(result.total).toBeLessThan(62_300_000);
  });
});

// ============================================
// CIF Conversion
// ============================================

describe('CIF Currency Conversion', () => {
  function convertToGNF(amount: number, currency: string, rate: number): number {
    if (currency === 'GNF') return amount;
    return Math.round(amount * rate);
  }

  it('converts USD to GNF', () => {
    expect(convertToGNF(10000, 'USD', 8650)).toBe(86_500_000);
  });

  it('converts EUR to GNF', () => {
    expect(convertToGNF(10000, 'EUR', 9500)).toBe(95_000_000);
  });

  it('returns same amount for GNF', () => {
    expect(convertToGNF(50_000_000, 'GNF', 1)).toBe(50_000_000);
  });

  it('handles fractional conversions', () => {
    const result = convertToGNF(12345.67, 'USD', 8650);
    expect(result).toBe(Math.round(12345.67 * 8650));
  });
});
