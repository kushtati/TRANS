// src/middleware/auth.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Role } from '@prisma/client';

interface JwtPayload {
  userId: string;
  role: Role;
  companyId: string;
  iat: number;
  exp: number;
}

/**
 * Authentication middleware.
 * Reads the access token from the httpOnly cookie,
 * verifies it, and populates req.user.
 */
export const auth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentification requise',
        code: 'NO_TOKEN',
      });
      return;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    req.user = {
      id: decoded.userId,
      role: decoded.role,
      companyId: decoded.companyId,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expiré',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Token invalide',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Erreur d\'authentification',
    });
  }
};

/**
 * Role-based access control middleware.
 * Must be used AFTER the `auth` middleware.
 * 
 * Usage: router.get('/admin-only', auth, requireRole('DIRECTOR'), handler);
 */
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentification requise',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Accès non autorisé pour votre rôle',
        code: 'FORBIDDEN',
      });
      return;
    }

    next();
  };
};

/**
 * Optional auth middleware.
 * Populates req.user if a valid token is present, but does not reject if missing.
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const token = req.cookies?.accessToken;
    if (token) {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      req.user = {
        id: decoded.userId,
        role: decoded.role,
        companyId: decoded.companyId,
      };
    }
  } catch {
    // Token invalid or expired — continue without user
  }
  next();
};
