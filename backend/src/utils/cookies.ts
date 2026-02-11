// src/utils/cookies.ts

import { Response, CookieOptions } from 'express';
import { env, isProduction } from '../config/env.js';

const getBaseCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  // Don't set domain for cross-origin cookies (Vercel <-> Railway)
  // Setting domain can prevent cookies from working across different domains
  path: '/',
});

export const setAuthCookies = (
  res: Response,
  tokens: { accessToken: string; refreshToken: string }
): void => {
  const baseOptions = getBaseCookieOptions();

  // Access token — 15 minutes
  res.cookie('accessToken', tokens.accessToken, {
    ...baseOptions,
    maxAge: 15 * 60 * 1000,
  });

  // Refresh token — 7 days
  res.cookie('refreshToken', tokens.refreshToken, {
    ...baseOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearAuthCookies = (res: Response): void => {
  const baseOptions = getBaseCookieOptions();

  res.clearCookie('accessToken', baseOptions);
  res.clearCookie('refreshToken', baseOptions);
};
