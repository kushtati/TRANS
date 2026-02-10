// tests/auth-logic.test.ts

import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret-key-for-testing';
const REFRESH_SECRET = 'test-refresh-secret-for-testing';

// ============================================
// Password Hashing
// ============================================

describe('Password Hashing', () => {
  it('hashes password with bcrypt', async () => {
    const password = 'SecurePass123!';
    const hash = await bcrypt.hash(password, 12);

    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
  });

  it('verifies correct password', async () => {
    const password = 'SecurePass123!';
    const hash = await bcrypt.hash(password, 12);

    const isValid = await bcrypt.compare(password, hash);
    expect(isValid).toBe(true);
  });

  it('rejects incorrect password', async () => {
    const password = 'SecurePass123!';
    const hash = await bcrypt.hash(password, 12);

    const isValid = await bcrypt.compare('WrongPassword', hash);
    expect(isValid).toBe(false);
  });

  it('generates different hashes for same password', async () => {
    const password = 'SecurePass123!';
    const hash1 = await bcrypt.hash(password, 12);
    const hash2 = await bcrypt.hash(password, 12);

    expect(hash1).not.toBe(hash2);
    // Both should still verify
    expect(await bcrypt.compare(password, hash1)).toBe(true);
    expect(await bcrypt.compare(password, hash2)).toBe(true);
  });
});

// ============================================
// JWT Token Generation
// ============================================

describe('JWT Tokens', () => {
  it('generates valid access token', () => {
    const payload = { userId: 'user-123', role: 'AGENT', companyId: 'comp-456' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });

    expect(token).toBeTruthy();
    expect(token.split('.')).toHaveLength(3);
  });

  it('verifies access token', () => {
    const payload = { userId: 'user-123', role: 'DIRECTOR', companyId: 'comp-456' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });

    const decoded = jwt.verify(token, JWT_SECRET) as typeof payload;
    expect(decoded.userId).toBe('user-123');
    expect(decoded.role).toBe('DIRECTOR');
    expect(decoded.companyId).toBe('comp-456');
  });

  it('generates valid refresh token', () => {
    const payload = { userId: 'user-123', type: 'refresh' };
    const token = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });

    const decoded = jwt.verify(token, REFRESH_SECRET) as typeof payload;
    expect(decoded.userId).toBe('user-123');
    expect(decoded.type).toBe('refresh');
  });

  it('rejects token signed with wrong secret', () => {
    const token = jwt.sign({ userId: 'user-123' }, JWT_SECRET);

    expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
  });

  it('rejects expired token', () => {
    const token = jwt.sign({ userId: 'user-123' }, JWT_SECRET, { expiresIn: '0s' });

    // Wait a tick for expiry
    expect(() => jwt.verify(token, JWT_SECRET)).toThrow();
  });

  it('access and refresh tokens use different secrets', () => {
    const accessToken = jwt.sign({ userId: 'user-123' }, JWT_SECRET);
    const refreshToken = jwt.sign({ userId: 'user-123' }, REFRESH_SECRET);

    // Access token should NOT verify with refresh secret
    expect(() => jwt.verify(accessToken, REFRESH_SECRET)).toThrow();
    // Refresh token should NOT verify with access secret
    expect(() => jwt.verify(refreshToken, JWT_SECRET)).toThrow();
  });
});

// ============================================
// Role-Based Access Control Logic
// ============================================

describe('RBAC Logic', () => {
  const roles = ['DIRECTOR', 'ACCOUNTANT', 'AGENT', 'CLIENT'] as const;

  const permissions: Record<string, string[]> = {
    'shipment:create': ['DIRECTOR', 'AGENT'],
    'shipment:delete': ['DIRECTOR'],
    'expense:create': ['DIRECTOR', 'ACCOUNTANT'],
    'expense:pay': ['DIRECTOR', 'ACCOUNTANT'],
    'audit:view': ['DIRECTOR'],
    'shipment:view': ['DIRECTOR', 'ACCOUNTANT', 'AGENT', 'CLIENT'],
    'finance:view': ['DIRECTOR', 'ACCOUNTANT'],
  };

  function hasPermission(role: string, action: string): boolean {
    return permissions[action]?.includes(role) ?? false;
  }

  it('DIRECTOR has all permissions', () => {
    Object.keys(permissions).forEach(action => {
      expect(hasPermission('DIRECTOR', action)).toBe(true);
    });
  });

  it('CLIENT can only view shipments', () => {
    expect(hasPermission('CLIENT', 'shipment:view')).toBe(true);
    expect(hasPermission('CLIENT', 'shipment:create')).toBe(false);
    expect(hasPermission('CLIENT', 'shipment:delete')).toBe(false);
    expect(hasPermission('CLIENT', 'expense:create')).toBe(false);
    expect(hasPermission('CLIENT', 'audit:view')).toBe(false);
  });

  it('AGENT can create shipments but not delete', () => {
    expect(hasPermission('AGENT', 'shipment:create')).toBe(true);
    expect(hasPermission('AGENT', 'shipment:delete')).toBe(false);
    expect(hasPermission('AGENT', 'expense:create')).toBe(false);
  });

  it('ACCOUNTANT can manage finances', () => {
    expect(hasPermission('ACCOUNTANT', 'expense:create')).toBe(true);
    expect(hasPermission('ACCOUNTANT', 'expense:pay')).toBe(true);
    expect(hasPermission('ACCOUNTANT', 'finance:view')).toBe(true);
    expect(hasPermission('ACCOUNTANT', 'shipment:delete')).toBe(false);
  });

  it('only DIRECTOR can view audit logs', () => {
    roles.forEach(role => {
      expect(hasPermission(role, 'audit:view')).toBe(role === 'DIRECTOR');
    });
  });
});

// ============================================
// Verification Code
// ============================================

describe('Verification Code', () => {
  function generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  it('generates 6-digit code', () => {
    const code = generateVerificationCode();
    expect(code).toHaveLength(6);
    expect(/^\d{6}$/.test(code)).toBe(true);
  });

  it('generates codes in valid range', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateVerificationCode();
      const num = parseInt(code);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });

  it('generates different codes', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      codes.add(generateVerificationCode());
    }
    // With 50 random 6-digit codes, collisions should be extremely rare
    expect(codes.size).toBeGreaterThan(40);
  });
});
