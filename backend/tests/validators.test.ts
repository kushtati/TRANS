// tests/validators.test.ts

import { describe, it, expect } from 'vitest';
import { createShipmentSchema, updateShipmentSchema } from '../src/validators/shipment.validators.js';
import { createExpenseSchema } from '../src/validators/finance.validators.js';

// ============================================
// Shipment Validators
// ============================================

describe('createShipmentSchema', () => {
  it('accepts valid minimal shipment', () => {
    const result = createShipmentSchema.safeParse({
      clientName: 'Alpha Trading SARL',
      description: 'Riz brisé 25kg x 1000 sacs',
    });
    expect(result.success).toBe(true);
  });

  it('accepts full shipment with all fields', () => {
    const result = createShipmentSchema.safeParse({
      clientName: 'Alpha Trading SARL',
      clientNif: '123456789',
      clientPhone: '+224 621 00 00 00',
      clientAddress: 'Kaloum, Conakry',
      description: 'Riz brisé 25kg x 1000 sacs',
      hsCode: '1006.30',
      cifValue: 50000,
      cifCurrency: 'USD',
      exchangeRate: 8650,
      blNumber: 'MEDU1234567',
      vesselName: 'MSC ANNA',
      voyageNumber: 'VA234W',
      portOfLoading: 'Ningbo',
      portOfDischarge: 'Conakry',
      customsRegime: 'IM4',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing clientName', () => {
    const result = createShipmentSchema.safeParse({
      description: 'Test',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.some(e => e.path.includes('clientName'))).toBe(true);
    }
  });

  it('rejects missing description', () => {
    const result = createShipmentSchema.safeParse({
      clientName: 'Alpha',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.some(e => e.path.includes('description'))).toBe(true);
    }
  });

  it('rejects empty clientName', () => {
    const result = createShipmentSchema.safeParse({
      clientName: '',
      description: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid cifCurrency', () => {
    const result = createShipmentSchema.safeParse({
      clientName: 'Alpha',
      description: 'Test',
      cifCurrency: 'XYZ',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative cifValue', () => {
    const result = createShipmentSchema.safeParse({
      clientName: 'Alpha',
      description: 'Test',
      cifValue: -100,
    });
    expect(result.success).toBe(false);
  });

  it('defaults cifCurrency to USD', () => {
    const result = createShipmentSchema.safeParse({
      clientName: 'Alpha',
      description: 'Test',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cifCurrency).toBe('USD');
    }
  });

  it('accepts valid customsRegime values', () => {
    for (const regime of ['IM4', 'IM5', 'IM7']) {
      const result = createShipmentSchema.safeParse({
        clientName: 'Alpha',
        description: 'Test',
        customsRegime: regime,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('updateShipmentSchema', () => {
  it('accepts partial update', () => {
    const result = updateShipmentSchema.safeParse({
      clientName: 'New Name',
    });
    expect(result.success).toBe(true);
  });

  it('accepts status update', () => {
    const result = updateShipmentSchema.safeParse({
      status: 'CUSTOMS_PAID',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (no changes)', () => {
    const result = updateShipmentSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = updateShipmentSchema.safeParse({
      status: 'INVALID_STATUS',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================
// Finance Validators
// ============================================

describe('createExpenseSchema', () => {
  it('accepts valid provision', () => {
    const result = createExpenseSchema.safeParse({
      type: 'PROVISION',
      category: 'DD',
      amount: 15000000,
      description: 'Provision droit de douane',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid disbursement', () => {
    const result = createExpenseSchema.safeParse({
      type: 'DISBURSEMENT',
      category: 'TRANSPORT',
      amount: 2500000,
      description: 'Transport Conakry → Kankan',
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero amount', () => {
    const result = createExpenseSchema.safeParse({
      type: 'PROVISION',
      category: 'DD',
      amount: 0,
      description: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = createExpenseSchema.safeParse({
      type: 'DISBURSEMENT',
      category: 'TRANSPORT',
      amount: -500,
      description: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing description', () => {
    const result = createExpenseSchema.safeParse({
      type: 'PROVISION',
      category: 'DD',
      amount: 1000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid type', () => {
    const result = createExpenseSchema.safeParse({
      type: 'REFUND',
      category: 'DD',
      amount: 1000,
      description: 'Test',
    });
    expect(result.success).toBe(false);
  });
});
