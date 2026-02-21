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

// Gemini client — try multiple models for compatibility
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
const genAI = env.GEMINI_API_KEY ? new GoogleGenerativeAI(env.GEMINI_API_KEY) : null;
let GEMINI_MODEL = GEMINI_MODELS[0];
let model = genAI?.getGenerativeModel({ model: GEMINI_MODEL });

// Test and select best available model on startup
if (genAI) {
  (async () => {
    for (const m of GEMINI_MODELS) {
      try {
        const testModel = genAI.getGenerativeModel({ model: m });
        await testModel.generateContent('test');
        GEMINI_MODEL = m;
        model = testModel;
        log.info(`AI model selected: ${m}`);
        break;
      } catch (e: any) {
        log.warn(`AI model ${m} unavailable: ${e.message?.substring(0, 80)}`);
      }
    }
  })();
}

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
    data: { available: !!model, model: model ? GEMINI_MODEL : null },
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
    const errMsg = (error as any)?.message || String(error);
    log.error('AI chat error', { message: errMsg, stack: (error as any)?.stack });

    let userMessage = 'Erreur du service IA';
    if (errMsg.includes('404')) userMessage = 'Modèle IA indisponible. Contactez le support.';
    else if (errMsg.includes('API_KEY')) userMessage = 'Clé API IA invalide.';
    else if (errMsg.includes('quota') || errMsg.includes('429')) userMessage = 'Limite IA atteinte. Réessayez dans 1 minute.';

    res.status(500).json({ success: false, message: userMessage });
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
// Utilise Gemini AI (multimodal) — léger, pas de crash
// ============================================

import multer from 'multer';
import fs from 'fs';
import path from 'path';

const blUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const BL_EXTRACTION_PROMPT = `Tu es un expert en transit maritime et dédouanement en Guinée Conakry. Analyse ce document (Bill of Lading / Connaissement / BL) et extrais TOUTES les informations possibles.

RETOURNE UNIQUEMENT un objet JSON valide, sans markdown, sans texte avant ou après.

STRUCTURE JSON ATTENDUE (remplis TOUS les champs — si introuvable, utilise "" pour texte et 0 pour nombres) :
{
  "blNumber": "numéro complet du BL/connaissement (ex: MEDU09243710, MAEU123456789)",
  "clientName": "nom complet du CONSIGNEE/DESTINATAIRE (pas le shipper)",
  "clientNif": "NIF ou numéro fiscal du destinataire si visible",
  "clientPhone": "téléphone du destinataire si visible",
  "clientAddress": "adresse complète du destinataire",
  "description": "description COMPLÈTE de la marchandise avec détails (ex: RIZ BRISE 5% EN SACS DE 25KG)",
  "hsCode": "code SH/HS (ex: 1006.30, 8703.23) — cherche dans les champs HS Code, Commodity Code, Tariff",
  "packaging": "type d'emballage : Sac, Carton, Palette, Fût, Vrac, Conteneur, Caisse, Ballot, Rouleau",
  "packageCount": 0,
  "grossWeight": 0,
  "netWeight": 0,
  "cifValue": 0,
  "cifCurrency": "USD",
  "vesselName": "nom complet du navire/vessel (ex: MSC BANU III, MAERSK SELETAR)",
  "voyageNumber": "numéro de voyage (ex: XA545A, 234W)",
  "portOfLoading": "port de chargement en MAJUSCULES (ex: ANTWERP, SHANGHAI, ISTANBUL)",
  "portOfDischarge": "port de déchargement — utilise CONAKRY si Conakry/Guinée détecté, sinon KAMSAR",
  "eta": "date d'arrivée estimée au format YYYY-MM-DD si visible (ETA, Arrival Date)",
  "supplierName": "nom complet du SHIPPER/EXPÉDITEUR (première partie du BL)",
  "supplierCountry": "pays du shipper en MAJUSCULES (ex: NETHERLANDS, CHINA, TURKEY, INDIA)",
  "customsRegime": "IM4 par défaut (mise à consommation). IM5 si temporaire, IM7 si entrepôt, TR si transit",
  "containers": [
    {
      "number": "numéro conteneur ISO complet (4 lettres + 7 chiffres, ex: SEGU9759487)",
      "type": "DRY_20 | DRY_40 | DRY_40HC | REEFER_20 | REEFER_40 | REEFER_40HR",
      "sealNumber": "numéro de scellé/plomb/seal",
      "grossWeight": 0,
      "packageCount": 0
    }
  ]
}

RÈGLES CRITIQUES :
1. CONSIGNEE = client/destinataire. SHIPPER = fournisseur/expéditeur. Ne les confonds JAMAIS.
2. grossWeight et packageCount au niveau racine = TOTAUX de tout le BL.
3. grossWeight et packageCount dans chaque conteneur = valeurs PAR conteneur.
4. Si le poids est en tonnes (MT/T), multiplie par 1000 pour convertir en kg.
5. Cherche la valeur CIF/FOB dans les champs "Declared Value", "Freight", "Total Value".
6. Type conteneur : 20' → DRY_20, 40' → DRY_40, 40'HC/HQ → DRY_40HC, RF/Reefer 20' → REEFER_20, RF/Reefer 40' → REEFER_40. Si non précisé → DRY_40HC.
7. Pour le pays du shipper : déduis-le de l'adresse du shipper ou du port de chargement.
8. Si packaging non explicite : déduis du contexte (riz/ciment → Sac, pièces auto → Carton, liquides → Fût).
9. Extrais CHAQUE conteneur listé, même s'il y en a beaucoup.
10. Le code HS peut apparaître sous : HS Code, Commodity Code, Harmonized System, Tariff Number.

Extrais le MAXIMUM d'informations. Mieux vaut deviner intelligemment que laisser vide.`;

router.post('/extract-bl', blUpload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!model) {
      return res.status(503).json({
        success: false,
        message: 'Service IA non configuré. Ajoutez GEMINI_API_KEY dans les variables d\'environnement.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni',
      });
    }

    const mimeType = req.file.mimetype;
    const originalName = req.file.originalname;
    const fileSize = req.file.size;

    // Save file to uploads folder for later attachment to shipment
    const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    const ext = path.extname(originalName);
    const safeName = originalName
      .replace(ext, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);
    const filename = `${Date.now()}-${safeName}${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), req.file.buffer);
    const fileUrl = `/api/upload/files/${filename}`;

    // Convert to base64 then free the buffer immediately
    const base64Data = req.file.buffer.toString('base64');
    (req as any).file = null; // Free multer buffer from memory

    log.info('BL extraction started', {
      userId: req.user!.id,
      filename: originalName,
      size: fileSize,
      mimeType,
    });

    // Send to Gemini with 30s timeout to prevent Railway killing the process
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 30000);

    let result;
    try {
      result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: BL_EXTRACTION_PROMPT },
          ],
        }],
      });
    } finally {
      clearTimeout(timeout);
    }

    const response = result.response;

    // Check if response was blocked
    if (!response.candidates || response.candidates.length === 0) {
      log.warn('BL extraction: Gemini returned no candidates', {
        userId: req.user!.id,
        blockReason: (response as any).promptFeedback?.blockReason,
      });
      return res.json({
        success: true,
        data: {
          extracted: null,
          fileUrl,
          message: 'L\'IA n\'a pas pu analyser ce document. Remplissez les champs manuellement.',
        },
      });
    }

    const responseText = response.text();

    // Parse JSON from response (Gemini may wrap in markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    let extracted = null;

    if (jsonMatch) {
      try {
        extracted = JSON.parse(jsonMatch[0]);
      } catch {
        log.warn('Failed to parse Gemini JSON response', { response: responseText.substring(0, 500) });
      }
    }

    if (extracted) {
      const filledCount = Object.entries(extracted).filter(([k, v]) => {
        if (k === 'containers') return Array.isArray(v) && (v as any[]).length > 0;
        if (typeof v === 'string') return v.trim() !== '';
        if (typeof v === 'number') return v > 0;
        return false;
      }).length;

      log.info('BL extraction success', {
        userId: req.user!.id,
        fieldsExtracted: filledCount,
        containers: extracted.containers?.length || 0,
      });

      res.json({
        success: true,
        data: {
          extracted,
          fileUrl,
          message: `${filledCount} champs extraits avec succès par l'IA`,
        },
      });
    } else {
      log.warn('BL extraction: no data extracted', { userId: req.user!.id });

      res.json({
        success: true,
        data: {
          extracted: null,
          fileUrl,
          message: 'L\'IA n\'a pas pu extraire les données. Remplissez les champs manuellement.',
        },
      });
    }
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    log.error('BL extraction error', { message: errMsg, stack: error?.stack });

    let userMessage = 'Erreur lors de l\'extraction. Réessayez ou remplissez manuellement.';
    if (errMsg.includes('API_KEY')) {
      userMessage = 'Clé API Gemini invalide. Vérifiez GEMINI_API_KEY.';
    } else if (errMsg.includes('quota') || errMsg.includes('429')) {
      userMessage = 'Limite de requêtes IA atteinte. Réessayez dans quelques minutes.';
    } else if (errMsg.includes('size') || errMsg.includes('too large')) {
      userMessage = 'Fichier trop volumineux (max 5 Mo). Essayez un fichier plus petit.';
    } else if (errMsg.includes('abort') || errMsg.includes('timeout')) {
      userMessage = 'L\'analyse a pris trop de temps. Réessayez avec un fichier plus petit.';
    }

    res.status(500).json({
      success: false,
      message: userMessage,
    });
  }
});

export default router;
