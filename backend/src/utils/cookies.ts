// src/utils/cookies.ts

import { Response } from 'express';
import { isProduction } from '../config/env.js';

// Build cookie string manually to include Partitioned attribute (Chrome requirement)
const buildCookieString = (
  name: string,
  value: string,
  maxAge: number
): string => {
  const parts = [
    `${name}=${value}`,
    `Path=/`,
    `Max-Age=${Math.floor(maxAge / 1000)}`,
    `HttpOnly`,
  ];

  if (isProduction) {
    parts.push('Secure');
    parts.push('SameSite=None');
    parts.push('Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }

  return parts.join('; ');
};

export const setAuthCookies = (
  res: Response,
  tokens: { accessToken: string; refreshToken: string }
): void => {
  const accessCookie = buildCookieString('accessToken', tokens.accessToken, 15 * 60 * 1000);
  const refreshCookie = buildCookieString('refreshToken', tokens.refreshToken, 7 * 24 * 60 * 60 * 1000);

  res.setHeader('Set-Cookie', [accessCookie, refreshCookie]);
};

export const clearAuthCookies = (res: Response): void => {
  const expiredAccess = buildCookieString('accessToken', '', 0);
  const expiredRefresh = buildCookieString('refreshToken', '', 0);

  res.setHeader('Set-Cookie', [expiredAccess, expiredRefresh]);
};
