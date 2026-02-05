// server/utils/cookies.ts

import { Response } from 'express';
import { env, isProduction } from '../config/env.js';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export const setAuthCookies = (res: Response, tokens: TokenPair) => {
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' as const : 'lax' as const,
    path: '/',
  };

  // Add Partitioned attribute for cross-site cookies in Chrome
  const partitionedCookieString = isProduction ? '; Partitioned' : '';

  res.cookie('accessToken', tokens.accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  
  // Manually add Partitioned header for modern browsers
  if (isProduction) {
    const existingSetCookie = res.getHeader('Set-Cookie') as string[];
    if (existingSetCookie && existingSetCookie.length > 0) {
      res.setHeader('Set-Cookie', existingSetCookie.map(cookie => 
        cookie.includes('accessToken') ? `${cookie}; Partitioned` : cookie
      ));
    }
  }

  res.cookie('refreshToken', tokens.refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  
  // Manually add Partitioned header for refresh token
  if (isProduction) {
    const existingSetCookie = res.getHeader('Set-Cookie') as string[];
    if (existingSetCookie && existingSetCookie.length > 0) {
      res.setHeader('Set-Cookie', existingSetCookie.map(cookie => 
        cookie.includes('refreshToken') ? `${cookie}; Partitioned` : cookie
      ));
    }
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
