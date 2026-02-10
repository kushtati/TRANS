// src/__tests__/api.test.ts

import { describe, it, expect } from 'vitest';
import { ApiError } from '../lib/api';

// ============================================
// ApiError
// ============================================

describe('ApiError', () => {
  it('creates error with message and status', () => {
    const error = new ApiError('Not found', 404);
    expect(error.message).toBe('Not found');
    expect(error.status).toBe(404);
    expect(error instanceof Error).toBe(true);
  });

  it('defaults to status 500', () => {
    const error = new ApiError('Server error');
    expect(error.status).toBe(500);
  });

  it('is instanceof Error', () => {
    const error = new ApiError('Test');
    expect(error instanceof Error).toBe(true);
    expect(error instanceof ApiError).toBe(true);
  });
});

// ============================================
// GNF Financial Logic
// ============================================

describe('Financial Calculations', () => {
  // Simulate the balance calculation done in the app
  function calculateBalance(
    expenses: Array<{ type: 'PROVISION' | 'DISBURSEMENT'; amount: number }>
  ): { totalProvisions: number; totalDisbursements: number; balance: number } {
    const totalProvisions = expenses
      .filter(e => e.type === 'PROVISION')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalDisbursements = expenses
      .filter(e => e.type === 'DISBURSEMENT')
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      totalProvisions,
      totalDisbursements,
      balance: totalProvisions - totalDisbursements,
    };
  }

  it('calculates positive balance', () => {
    const result = calculateBalance([
      { type: 'PROVISION', amount: 10_000_000 },
      { type: 'DISBURSEMENT', amount: 7_000_000 },
    ]);

    expect(result.totalProvisions).toBe(10_000_000);
    expect(result.totalDisbursements).toBe(7_000_000);
    expect(result.balance).toBe(3_000_000);
  });

  it('calculates negative balance', () => {
    const result = calculateBalance([
      { type: 'PROVISION', amount: 5_000_000 },
      { type: 'DISBURSEMENT', amount: 8_000_000 },
    ]);

    expect(result.balance).toBe(-3_000_000);
  });

  it('handles empty expenses', () => {
    const result = calculateBalance([]);
    expect(result.totalProvisions).toBe(0);
    expect(result.totalDisbursements).toBe(0);
    expect(result.balance).toBe(0);
  });

  it('handles multiple provisions and disbursements', () => {
    const result = calculateBalance([
      { type: 'PROVISION', amount: 5_000_000 },
      { type: 'PROVISION', amount: 3_000_000 },
      { type: 'PROVISION', amount: 2_000_000 },
      { type: 'DISBURSEMENT', amount: 4_000_000 },
      { type: 'DISBURSEMENT', amount: 1_500_000 },
    ]);

    expect(result.totalProvisions).toBe(10_000_000);
    expect(result.totalDisbursements).toBe(5_500_000);
    expect(result.balance).toBe(4_500_000);
  });
});
