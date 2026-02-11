// server/routes/ai.ts

import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { env } from '../config/env.js';
import { log } from '../config/logger.js';
import { prisma } from '../config/prisma.js';
import { auth } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const router = Router();
router.use(auth);

// Rate limiting for AI
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: 'Limite IA atteinte. Réessayez dans 1 minute.' },
});
router.use(aiLimiter);

// Gemini client
const genAI = env.GEMINI_API_KEY ? new GoogleGenerativeAI(env.GEMINI_API_KEY) : null;
const model = genAI?.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Schemas
const chatSchema = z.object({
  message: z.string().min(1).max(2000),
});

const calculateSchema = z.object({
  hsCode: z.string().min(4),
  value: z.number().positive(),
  currency: z.string().optional(),
});

// System prompt
const CUSTOMS_PROMPT = `Tu es un expert en douane et transit pour la Guinée Conakry.
Tu aides les transitaires avec:
- Les régulations douanières guinéennes
- Les codes SH et classifications
- Les calculs de droits et taxes (DD 35%, TVA 18%, RTL 2%, PC 0.5%, CA 0.25%, BFU)
- Les procédures de dédouanement
- Les documents requis (BL, DDI, BAE, etc.)

Réponds de manière concise en français. Utilise des montants en GNF.`;

// ============================================
// GET /api/ai/status
// ============================================

router.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: { available: !!model, model: model ? 'gemini-1.5-flash' : null },
  });
});

// ============================================
// POST /api/ai/chat
// ============================================

router.post('/chat', async (req: Request, res: Response) => {
  try {
    if (!model) {
      return res.status(503).json({
        success: false,
        message: 'Service IA non configuré',
      });
    }

    const { message } = chatSchema.parse(req.body);

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: 'Qui es-tu ?' }] },
        { role: 'model', parts: [{ text: CUSTOMS_PROMPT }] },
      ],
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    log.info('AI chat', { userId: req.user!.id, messageLength: message.length });

    res.json({ success: true, data: { response } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Message invalide',
      });
    }
    log.error('AI chat error', error);
    res.status(500).json({ success: false, message: 'Erreur du service IA' });
  }
});

// ============================================
// POST /api/ai/calculate-customs
// ============================================

router.post('/calculate-customs', async (req: Request, res: Response) => {
  try {
    const { hsCode, value, currency = 'USD' } = calculateSchema.parse(req.body);

    // Exchange rate (simplified - should use real API)
    const rates: Record<string, number> = {
      USD: 8646,
      EUR: 9400,
      GNF: 1,
    };

    const rate = rates[currency] || rates.USD;
    const valueGnf = value * rate;

    // Guinea customs rates
    const ddRate = 0.35;    // Droit de Douane
    const rtlRate = 0.02;   // RTL
    const pcRate = 0.005;   // PC
    const caRate = 0.0025;  // CA
    const tvaRate = 0.18;   // TVA

    // Calculate duties
    const dd = Math.round(valueGnf * ddRate);
    const rtl = Math.round(valueGnf * rtlRate);
    const pc = Math.round(valueGnf * pcRate);
    const ca = Math.round(valueGnf * caRate);
    
    // TVA base includes DD
    const tvaBase = valueGnf + dd;
    const tva = Math.round(tvaBase * tvaRate);
    
    // BFU (fixed based on value)
    const bfu = valueGnf > 100000000 ? 500000 : valueGnf > 50000000 ? 350000 : 200000;

    const totalDuties = dd + rtl + pc + ca + tva + bfu;

    res.json({
      success: true,
      data: {
        hsCode,
        cifValue: value,
        cifCurrency: currency,
        exchangeRate: rate,
        cifValueGnf: valueGnf,
        duties: {
          dd: { rate: ddRate * 100, amount: dd },
          rtl: { rate: rtlRate * 100, amount: rtl },
          pc: { rate: pcRate * 100, amount: pc },
          ca: { rate: caRate * 100, amount: ca },
          tva: { rate: tvaRate * 100, base: tvaBase, amount: tva },
          bfu: { amount: bfu },
        },
        totalDuties,
        disclaimer: 'Ces calculs sont indicatifs. Les taux réels peuvent varier selon le code SH et les réglementations en vigueur.',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
      });
    }
    log.error('Calculate customs error', error);
    res.status(500).json({ success: false, message: 'Erreur de calcul' });
  }
});

// ============================================
// POST /api/ai/extract-bl
// Extract shipment data from a Bill of Lading (PDF/image)
// 100% GRATUIT — pdf-parse + tesseract.js + regex
// Aucune API payante requise
// ============================================

import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { extractBLData } from '../services/bl-extract.service.js';

const blUpload = multer({
  dest: path.resolve(process.cwd(), 'uploads/temp'),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.post('/extract-bl', (req: Request, res: Response) => {
  blUpload.single('file')(req, res, async (uploadErr) => {
    try {
      if (uploadErr) {
        return res.status(400).json({
          success: false,
          message: `Erreur upload : ${uploadErr.message}`,
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Fichier BL requis',
        });
      }

      log.info('BL extraction started', {
        userId: req.user!.id,
        filename: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });

      // Extract using free libraries (pdf-parse + tesseract.js)
      const { data: extracted, rawText, method } = await extractBLData(
        req.file.path,
        req.file.mimetype
      );

      // Count how many fields were actually extracted
      const filledCount = Object.entries(extracted)
        .filter(([k, v]) => {
          if (k === 'containers') return (v as any[]).length > 0;
          if (typeof v === 'number') return v > 0;
          return v && v !== '';
        }).length;

      // Save the uploaded BL file permanently
      const ext = path.extname(req.file.originalname) || '.pdf';
      const permanentName = `bl-${Date.now()}${ext}`;
      const permanentPath = path.resolve(process.cwd(), 'uploads', permanentName);
      fs.renameSync(req.file.path, permanentPath);

      const fileUrl = `/api/upload/files/${permanentName}`;

      log.info('BL extraction completed', {
        userId: req.user!.id,
        method,
        fieldsExtracted: filledCount,
        containersFound: extracted.containers?.length || 0,
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'BL_EXTRACTED',
          entity: 'Document',
          entityId: req.file.originalname,
          details: { method, fieldsExtracted: filledCount, textLength: rawText.length },
          userId: req.user!.id,
        },
      });

      // Build response message
      let message = '';
      if (filledCount >= 8) {
        message = `✅ ${filledCount} champs extraits avec succès (${method})`;
      } else if (filledCount >= 3) {
        message = `⚠️ ${filledCount} champs extraits. Complétez les champs manquants manuellement.`;
      } else if (filledCount > 0) {
        message = `Extraction partielle (${filledCount} champs). Le document est peut-être difficile à lire.`;
      } else {
        message = 'Extraction non concluante. Veuillez remplir les champs manuellement.';
      }

      res.json({
        success: true,
        data: {
          extracted: filledCount > 0 ? extracted : null,
          fileUrl,
          fileName: req.file.originalname,
          method,
          message,
        },
      });
    } catch (error) {
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      log.error('BL extraction error', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'extraction du BL',
      });
    }
  });
});

export default router;
