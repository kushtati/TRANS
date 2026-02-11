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
// Uses Gemini Vision to read and parse the document
// ============================================

import multer from 'multer';
import fs from 'fs';
import path from 'path';

const blUpload = multer({
  dest: path.resolve(process.cwd(), 'uploads/temp'),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const BL_EXTRACT_PROMPT = `Tu es un expert en transit maritime. Analyse ce connaissement (Bill of Lading) et extrais TOUTES les informations suivantes en JSON strict.

Retourne UNIQUEMENT un objet JSON valide, sans texte avant ni après, avec ces champs (laisse vide "" si non trouvé) :

{
  "blNumber": "numéro du BL/connaissement",
  "clientName": "nom du destinataire/consignee/notify party",
  "clientAddress": "adresse du destinataire",
  "description": "description complète de la marchandise",
  "hsCode": "code SH/HS code si présent",
  "packaging": "type d'emballage (sacs, cartons, palettes...)",
  "packageCount": 0,
  "grossWeight": 0,
  "netWeight": 0,
  "cifValue": 0,
  "cifCurrency": "USD",
  "vesselName": "nom du navire",
  "voyageNumber": "numéro de voyage",
  "portOfLoading": "port de chargement",
  "portOfDischarge": "port de déchargement",
  "supplierName": "nom de l'expéditeur/shipper",
  "supplierCountry": "pays de l'expéditeur",
  "containers": [
    {
      "number": "numéro conteneur",
      "type": "20DRY ou 40DRY ou 40HC ou 20REEFER ou 40REEFER",
      "sealNumber": "numéro de scellé",
      "grossWeight": 0,
      "packageCount": 0
    }
  ]
}

Règles importantes :
- Pour packageCount et grossWeight, extrais les NOMBRES uniquement
- Pour les conteneurs, identifie le type : 20' = DRY_20, 40' = DRY_40, 40'HC = DRY_40HC, etc.
- Le port de déchargement en Guinée est généralement CONAKRY
- Extrais TOUS les conteneurs listés
- Si plusieurs marchandises, combine-les dans description
- Ne retourne QUE le JSON, rien d'autre`;

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

      if (!model) {
        // No AI available — return empty structure so user fills manually
        cleanupTempFile(req.file.path);
        return res.json({
          success: true,
          data: {
            extracted: null,
            message: 'Service IA non disponible. Veuillez remplir les champs manuellement.',
          },
        });
      }

      // Read file as base64
      const fileBuffer = fs.readFileSync(req.file.path);
      const base64Data = fileBuffer.toString('base64');
      const mimeType = req.file.mimetype;

      log.info('BL extraction started', {
        userId: req.user!.id,
        filename: req.file.originalname,
        size: req.file.size,
        mimeType,
      });

      // Send to Gemini Vision
      const result = await model.generateContent([
        { text: BL_EXTRACT_PROMPT },
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
      ]);

      const responseText = result.response.text();

      // Parse JSON from response (strip markdown code fences if present)
      let extracted;
      try {
        const jsonStr = responseText
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        extracted = JSON.parse(jsonStr);
      } catch {
        log.warn('BL extraction - failed to parse JSON', { responseText: responseText.substring(0, 500) });
        cleanupTempFile(req.file.path);
        return res.json({
          success: true,
          data: {
            extracted: null,
            rawText: responseText.substring(0, 1000),
            message: 'Extraction partielle. Certains champs peuvent nécessiter une saisie manuelle.',
          },
        });
      }

      // Normalize container types
      if (extracted.containers && Array.isArray(extracted.containers)) {
        extracted.containers = extracted.containers.map((c: any) => ({
          ...c,
          type: normalizeContainerType(c.type || ''),
          grossWeight: typeof c.grossWeight === 'number' ? c.grossWeight : parseFloat(c.grossWeight) || 0,
          packageCount: typeof c.packageCount === 'number' ? c.packageCount : parseInt(c.packageCount) || 0,
        }));
      }

      // Normalize numeric fields
      extracted.packageCount = parseInt(extracted.packageCount) || 0;
      extracted.grossWeight = parseFloat(extracted.grossWeight) || 0;
      extracted.netWeight = parseFloat(extracted.netWeight) || 0;
      extracted.cifValue = parseFloat(extracted.cifValue) || 0;

      // Save the uploaded BL file permanently
      const ext = path.extname(req.file.originalname) || '.pdf';
      const permanentName = `bl-${Date.now()}${ext}`;
      const permanentPath = path.resolve(process.cwd(), 'uploads', permanentName);
      fs.renameSync(req.file.path, permanentPath);

      const fileUrl = `/api/upload/files/${permanentName}`;

      log.info('BL extraction completed', {
        userId: req.user!.id,
        fieldsExtracted: Object.keys(extracted).filter(k => extracted[k] && extracted[k] !== '' && extracted[k] !== 0).length,
        containersFound: extracted.containers?.length || 0,
      });

      // Audit
      await prisma.auditLog.create({
        data: {
          action: 'BL_EXTRACTED',
          entity: 'AI',
          entityId: req.file.originalname,
          details: { fieldsExtracted: Object.keys(extracted).length },
          userId: req.user!.id,
        },
      });

      res.json({
        success: true,
        data: {
          extracted,
          fileUrl,
          fileName: req.file.originalname,
          message: 'Données extraites du BL avec succès.',
        },
      });
    } catch (error) {
      if (req.file) cleanupTempFile(req.file.path);
      log.error('BL extraction error', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'extraction du BL',
      });
    }
  });
});

function cleanupTempFile(filePath: string) {
  try { fs.unlinkSync(filePath); } catch {}
}

function normalizeContainerType(raw: string): string {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.includes('40') && s.includes('HC')) return 'DRY_40HC';
  if (s.includes('40') && s.includes('REEFER')) return 'REEFER_40';
  if (s.includes('40') && s.includes('HR')) return 'REEFER_40HR';
  if (s.includes('20') && s.includes('REEFER')) return 'REEFER_20';
  if (s.includes('40')) return 'DRY_40';
  if (s.includes('20')) return 'DRY_20';
  return 'DRY_40HC';
}

export default router;
