// server/utils/cookies.ts

import { Response } from 'express';
import { env, isProduction } from '../config/env.js';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export const setAuthCookies = (res: Response, tokens: TokenPair) => {
  // For cross-origin cookies between Vercel and Railway
  // We need: Secure, SameSite=None, and manual Set-Cookie headers
  
  if (isProduction) {
    // Manual Set-Cookie headers with Partitioned for Chrome
    const accessCookie = [
      `accessToken=${tokens.accessToken}`,
      'HttpOnly',
      'Secure',
      'SameSite=None',
      'Path=/',
      `Max-Age=${15 * 60}`, // 15 minutes
      'Partitioned', // Required for Chrome cross-site cookies
    ].join('; ');
    
    const refreshCookie = [
      `refreshToken=${tokens.refreshToken}`,
      'HttpOnly',
      'Secure',
      'SameSite=None',
      'Path=/',
      `Max-Age=${7 * 24 * 60 * 60}`, // 7 days
      'Partitioned', // Required for Chrome cross-site cookies
    ].join('; ');
    
    res.setHeader('Set-Cookie', [accessCookie, refreshCookie]);
  } else {
    // Development: use standard cookies
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });
    
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
};

export const clearAuthCookies = (res: Response) => {
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' as const : 'lax' as const,
    // Domain NOT set for cross-origin cookies
    path: '/',
  };

  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
};
