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

const BL_EXTRACTION_PROMPT = `Tu es un expert en transit maritime et dédouanement en Guinée Conakry. Analyse ce document (Bill of Lading / Connaissement / BL / Facture / Packing List / DDI) et extrais TOUTES les informations possibles.

RETOURNE UNIQUEMENT un objet JSON valide, sans markdown, sans texte avant ou après.

STRUCTURE JSON ATTENDUE (remplis TOUS les champs — si introuvable, utilise "" pour texte et 0 pour nombres) :
{
  "blNumber": "numéro complet du BL/connaissement (ex: IVL0187218, MEDU09243710, MAEU123456789)",
  "clientName": "nom complet du CONSIGNEE/DESTINATAIRE (pas le shipper, pas le notify party)",
  "clientNif": "NIF ou numéro fiscal du destinataire si visible (ex: 9599149617M)",
  "clientPhone": "téléphone du destinataire si visible",
  "clientAddress": "adresse complète du destinataire (ex: KALOUM-ALMAMYA, CONAKRY)",
  "description": "description COMPLÈTE et DÉTAILLÉE de la marchandise (ex: PILONS DE POULET CONGELES, RIZ BRISE 5% EN SACS DE 25KG)",
  "hsCode": "code SH/HS (ex: 02071400, 1006.30, 8703.23) — cherche dans HS Code, Commodity Code, Tariff, Nomenclature tarifaire",
  "packaging": "type d'emballage : Sac, Carton, Palette, Fût, Vrac, Conteneur, Caisse, Ballot, Rouleau",
  "packageCount": 0,
  "grossWeight": 0,
  "netWeight": 0,
  "cifValue": 0,
  "fobValue": 0,
  "freightValue": 0,
  "insuranceValue": 0,
  "cifCurrency": "USD",
  "vesselName": "nom complet du navire/vessel (ex: CMA CGM AMBITION, MSC BANU III)",
  "voyageNumber": "numéro de voyage (ex: 0MRJRW1MA, XA545A)",
  "portOfLoading": "port de chargement en MAJUSCULES (ex: MONTREAL, QC, ANTWERP, SHANGHAI)",
  "portOfDischarge": "port de déchargement — CONAKRY si Conakry/Guinée détecté, sinon KAMSAR",
  "eta": "date d'arrivée estimée au format YYYY-MM-DD si visible (ETA, Arrival Date, Date navire)",
  "supplierName": "nom complet du SHIPPER/EXPÉDITEUR (en haut du BL, ou vendeur sur la facture)",
  "supplierCountry": "pays du shipper en MAJUSCULES déduit de l'adresse ou du port (ex: CANADA, NETHERLANDS, CHINA, TURKEY, BRAZIL, INDIA, USA)",
  "customsRegime": "IM4 par défaut (mise à consommation). IM5 si temporaire, IM7 si entrepôt, TR si transit",
  "containers": [
    {
      "number": "numéro conteneur ISO (4 lettres + 7 chiffres, ex: CAIU5534280, CGMU5621560)",
      "type": "DRY_20 | DRY_40 | DRY_40HC | REEFER_20 | REEFER_40 | REEFER_40HR",
      "sealNumber": "numéro de scellé/plomb/seal",
      "grossWeight": 0,
      "packageCount": 0
    }
  ]
}

RÈGLES CRITIQUES :
1. CONSIGNEE = client/destinataire final en Guinée. SHIPPER = fournisseur/expéditeur à l'étranger. Ne les confonds JAMAIS.
2. grossWeight et packageCount au niveau racine = TOTAUX de tout le BL (somme de tous les conteneurs).
3. grossWeight et packageCount dans chaque conteneur = valeurs PAR conteneur (cargo weight, sans la tare du conteneur).
4. Si le poids est en tonnes (MT/T), multiplie par 1000 pour convertir en kg.
5. Valeur commerciale : CIF = FOB + Freight + Insurance. Cherche "Declared Value", "CIF Value", "Invoice Total", "Total Amount".
6. Type conteneur : 20' → DRY_20, 40' → DRY_40, 40'HC/HQ → DRY_40HC, RF/Reefer 20' → REEFER_20, RF/Reefer 40'/40'RH/45R1 → REEFER_40, 40'HR → REEFER_40HR. Si non précisé et produit congelé → REEFER_40.
7. Pour le pays du shipper : déduis de l'adresse (Netherlands → NETHERLANDS, Canada → CANADA, etc.) ou du port de chargement (Montreal → CANADA, Antwerp → BELGIUM).
8. Si packaging non explicite : déduis (poulet/viande → Carton, riz/ciment → Sac, pièces auto → Carton, liquides → Fût, bobines → Rouleau).
9. Extrais CHAQUE conteneur listé, même s'il y en a beaucoup. Un BL peut avoir 1 à 50+ conteneurs.
10. Le code HS peut apparaître sous : HS Code, Commodity Code, Harmonized System, Tariff Number, Position tarifaire, Nomenclature.
11. Si le document est une FACTURE (Invoice), extrais CIF/FOB value, supplierName, description, quantity.
12. Si le document est un PACKING LIST, extrais les poids net/brut, conteneurs, colis.
13. Si le document est une DDI, extrais le numéro DDI, NIF client, valeur FOB/CAF, pays provenance/origine.

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

// ============================================
// POST /api/ai/scan-to-overlay
// Upload a document → Gemini AI → return data mapped to template overlay field keys
// (used by the Template Designer to auto-fill field values)
// ============================================

const OVERLAY_EXTRACTION_PROMPT = `Tu es un expert en transit maritime et facturation en Guinée Conakry.
Analyse ce document (facture de transit, facture proforma, note de débours, décompte) et extrais TOUTES les informations pour remplir une facture de transit.

RETOURNE UNIQUEMENT un objet JSON valide, sans markdown, sans texte avant ou après.

STRUCTURE JSON ATTENDUE (remplis TOUS les champs — si introuvable, utilise "" pour texte et 0 pour nombres) :
{
  "invoice_number": "numéro de facture",
  "invoice_date": "date au format JJ/MM/AAAA",
  "dossier_number": "numéro de dossier",
  "client_name": "nom du client / destinataire / consignee",
  "client_phone": "téléphone client",
  "client_address": "adresse client",
  "client_nif": "NIF du client",
  "bl_number": "numéro de BL / connaissement",
  "reference": "référence dossier",
  "containers": "numéros conteneurs séparés par /",
  "container_count": 0,
  "container_description": "ex: 2TC40' (RIZ EN SACS)",
  "description": "description de la marchandise",
  "vessel_name": "nom du navire",
  "line_droits_taxes": 0,
  "line_bolore": 0,
  "line_frais_circuit": 0,
  "line_armateur": 0,
  "line_transports": 0,
  "line_frais_declaration": 0,
  "line_frais_orange": 0,
  "total_debours": 0,
  "prestation": 0,
  "total_facture": 0,
  "montant_paye": 0,
  "reste_a_payer": 0
}

RÈGLES :
1. Les montants sont en GNF (Francs Guinéens). Pas de décimales, pas d'espaces dans les nombres JSON.
2. line_droits_taxes = Droits et Taxes / Douane / DDI.
3. line_bolore = Bolloré / Acconage / Terminal / Manutention / BSCA.
4. line_frais_circuit = Frais de Circuit.
5. line_armateur = Armateur / DO Fee / Seaway Bill / Manifest / BL Fee.
6. line_transports = Transport / Camionnage / Livraison.
7. line_frais_declaration = Frais de Déclaration / Honoraires déclarant.
8. line_frais_orange = Orange Money / Frais mobile money.
9. total_debours = somme de toutes les lignes de débours.
10. prestation = honoraires / commission / prestation de service du transitaire.
11. total_facture = total_debours + prestation.
12. container_count = nombre de conteneurs (déduire si nécessaire).
13. Si "Frais Circuit" n'est pas visible, calcule: 2 000 000 × container_count.
14. Si "Frais Déclaration" n'est pas visible, calcule: 300 000 × container_count.
15. Si "Frais Orange" n'est pas visible, calcule: 200 000 × container_count.

Extrais le MAXIMUM. Mieux vaut deviner intelligemment que laisser vide.`;

router.post('/scan-to-overlay', blUpload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!model) {
      return res.status(503).json({
        success: false,
        message: 'Service IA non configuré. Ajoutez GEMINI_API_KEY.',
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Fichier requis' });
    }

    // Get company info
    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId },
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Entreprise non trouvée' });
    }

    const mimeType = req.file.mimetype;
    const base64Data = req.file.buffer.toString('base64');
    (req as any).file = null; // Free buffer

    log.info('AI scan-to-overlay started', {
      userId: req.user!.id,
      mimeType,
      size: req.file ? 0 : base64Data.length,
    });

    // Send to Gemini with timeout
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 45000);

    let result;
    try {
      result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: OVERLAY_EXTRACTION_PROMPT },
          ],
        }],
      });
    } finally {
      clearTimeout(timeout);
    }

    const response = result.response;
    if (!response.candidates || response.candidates.length === 0) {
      return res.status(422).json({
        success: false,
        message: 'L\'IA n\'a pas pu analyser ce document.',
      });
    }

    const responseText = response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.status(422).json({
        success: false,
        message: 'L\'IA n\'a pas retourné de données structurées.',
        raw: responseText.substring(0, 500),
      });
    }

    let extracted: Record<string, any>;
    try {
      extracted = JSON.parse(jsonMatch[0]);
    } catch {
      return res.status(422).json({
        success: false,
        message: 'Erreur de parsing JSON de l\'IA.',
        raw: jsonMatch[0].substring(0, 500),
      });
    }

    // Format number helper
    const fmtN = (n: any): string => {
      const num = Number(n) || 0;
      return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };

    // Compute fixed lines if not extracted
    const nbContainers = Number(extracted.container_count) || 1;

    // Build overlay data with all field keys
    const overlayData: Record<string, string> = {
      // Facture
      invoice_number: String(extracted.invoice_number || ''),
      invoice_date: String(extracted.invoice_date || ''),
      dossier_number: String(extracted.dossier_number || extracted.reference || ''),

      // Client
      client_name: String(extracted.client_name || ''),
      client_phone: String(extracted.client_phone || ''),
      client_address: String(extracted.client_address || ''),
      client_nif: String(extracted.client_nif || ''),

      // Dossier
      bl_number: String(extracted.bl_number || ''),
      reference: String(extracted.reference || extracted.dossier_number || ''),
      containers: String(extracted.containers || ''),
      container_description: String(extracted.container_description || ''),
      description: String(extracted.description || ''),
      vessel_name: String(extracted.vessel_name || ''),

      // Montants
      total_debours: fmtN(extracted.total_debours),
      prestation: fmtN(extracted.prestation),
      total_facture: fmtN(extracted.total_facture),
      montant_paye: fmtN(extracted.montant_paye),
      reste_a_payer: fmtN(extracted.reste_a_payer),
      total_lettres: '',

      // Lignes
      line_droits_taxes: fmtN(extracted.line_droits_taxes),
      line_bolore: fmtN(extracted.line_bolore),
      line_frais_circuit: fmtN(extracted.line_frais_circuit || 2_000_000 * nbContainers),
      line_armateur: fmtN(extracted.line_armateur),
      line_transports: fmtN(extracted.line_transports),
      line_frais_declaration: fmtN(extracted.line_frais_declaration || 300_000 * nbContainers),
      line_frais_orange: fmtN(extracted.line_frais_orange || 200_000 * nbContainers),

      // Entreprise (from DB, not OCR)
      company_name: company.name || '',
      company_phone: company.phone || '',
      company_address: company.address || '',
      company_email: company.email || '',
      company_rccm: company.rccm || '',
      company_bank: company.bankName || '',
    };

    const filledCount = Object.keys(overlayData).filter(k => overlayData[k] && overlayData[k] !== '0').length;

    log.audit('AI scan-to-overlay complete', {
      userId: req.user!.id,
      fieldsExtracted: filledCount,
    });

    res.json({
      success: true,
      data: overlayData,
    });
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    log.error('AI scan-to-overlay error', { message: errMsg, stack: error?.stack });

    let userMessage = 'Erreur lors de l\'extraction IA.';
    if (errMsg.includes('API_KEY')) userMessage = 'Clé API Gemini invalide.';
    else if (errMsg.includes('quota') || errMsg.includes('429')) userMessage = 'Limite IA atteinte. Réessayez dans 1 min.';
    else if (errMsg.includes('abort') || errMsg.includes('timeout')) userMessage = 'L\'analyse a pris trop de temps.';

    res.status(500).json({ success: false, message: userMessage });
  }
});

// ============================================
// POST /api/ai/auto-position-fields
// Upload template PDF → Gemini analyzes layout → returns exact field positions
// ============================================

const AUTO_POSITION_PROMPT = `Tu es un expert en mise en page PDF et en transit maritime en Guinée Conakry.
On te donne un PDF de facture de transit vierge (template). Tu dois analyser le layout et déterminer les coordonnées EXACTES en points PDF où chaque champ dynamique doit être placé pour que le texte s'aligne parfaitement avec le design existant.

SYSTÈME DE COORDONNÉES PDF :
- Origine (0, 0) = coin BAS-GAUCHE de la page
- X augmente vers la DROITE
- Y augmente vers le HAUT
- Page A4 = 595.28 × 841.89 points
- 1 point PDF = 1/72 pouce

CHAMPS À POSITIONNER (fieldKey → description) :
- invoice_number : Numéro de facture (ex: "217") — généralement en gras, grande police, centre-droit
- invoice_date : Date (ex: "05/02/2026") — en haut à droite, après "Conakry, le"
- dossier_number : N° Dossier — en-tête gauche
- client_name : Nom du client — à droite, sous le numéro de facture
- client_phone : Téléphone client — à droite, sous le nom du client
- bl_number : N° BL — en-tête gauche
- reference : Référence — en-tête gauche
- containers : N° conteneurs — en-tête gauche
- container_description : Description conteneurs (ex: "2TC40' (PILON)") — en-tête gauche
- description : Marchandise — en-tête gauche, après "dédouanement de"
- vessel_name : Nom navire — en-tête gauche si visible
- line_droits_taxes : Montant droits et taxes — colonne MONTANT GNF, ligne correspondante
- line_bolore : Montant Bolloré — colonne MONTANT GNF
- line_frais_circuit : Montant frais circuit — colonne MONTANT GNF
- line_armateur : Montant armateur/CMA — colonne MONTANT GNF
- line_transports : Montant transports — colonne MONTANT GNF
- line_frais_declaration : Montant frais déclaration — colonne MONTANT GNF
- line_frais_orange : Montant frais Orange Money — colonne MONTANT GNF
- total_debours : Total débours — en gras, colonne MONTANT
- prestation : Prestation — colonne MONTANT
- total_facture : Total facture — en gras, colonne MONTANT
- total_lettres : Montant en toutes lettres — centré, sous le tableau
- montant_paye : Montant payé par le client — en gras, sous le total en lettres
- reste_a_payer : Reste à payer — en gras, sous le montant payé

RETOURNE UNIQUEMENT un tableau JSON valide, sans markdown, sans texte avant ou après.
Chaque élément du tableau :
{
  "fieldKey": "invoice_number",
  "label": "N° Facture",
  "posX": 350,
  "posY": 720,
  "fontSize": 14,
  "fontFamily": "Helvetica",
  "fontWeight": "bold",
  "textAlign": "left",
  "color": "#000000",
  "maxWidth": null
}

RÈGLES CRITIQUES :
1. Mesure les positions EN POINTS PDF depuis le coin BAS-GAUCHE.
2. fontSize doit correspondre à la taille visible dans le document (6-32 pts).
3. fontWeight: "bold" pour les titres, totaux, labels. "normal" pour les valeurs courantes.
4. textAlign: "right" pour les montants numériques dans la colonne MONTANT GNF. "left" pour les textes.
5. color: "#000000" noir par défaut. Si un champ utilise du bleu, utilise la couleur exacte hex.
6. maxWidth: donner une largeur en points pour les champs qui peuvent déborder (ex: total_lettres → 450, container_description → 250).
7. Les montants (line_*) doivent tous avoir le MÊME posX et être alignés à droite dans la colonne "MONTANT GNF".
8. Sois TRÈS PRÉCIS sur les positions Y — chaque ligne du tableau a un espacement régulier.
9. Pour les champs de l'en-tête : place-les exactement là où les VALEURS apparaissent (pas les labels).
10. N'inclus que les champs dynamiques. Les labels fixes (DESIGNATION, QUANTITE, etc.) font partie du PDF template.
11. fontFamily: "Helvetica" sauf si tu détectes une autre police.
12. N'invente PAS de champs qui ne sont pas dans la liste ci-dessus.

Analyse le PDF attentivement et retourne le JSON.`;

router.post('/auto-position-fields', blUpload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!model) {
      return res.status(503).json({
        success: false,
        message: 'Service IA non configuré. Ajoutez GEMINI_API_KEY.',
      });
    }

    // Accept either an uploaded file or a templateId to fetch from DB
    let base64Data: string;
    let mimeType = 'application/pdf';

    if (req.file) {
      base64Data = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype;
      (req as any).file = null;
    } else if (req.body.templateId) {
      // Fetch template PDF from disk
      const template = await prisma.invoiceTemplate.findFirst({
        where: { id: req.body.templateId, companyId: req.user!.companyId },
      });
      if (!template) {
        return res.status(404).json({ success: false, message: 'Template non trouvé' });
      }

      const TEMPLATE_DIR = path.resolve(process.cwd(), 'uploads', 'templates');
      const fileName = template.fileUrl.split('/').pop()!;
      const filePath = path.join(TEMPLATE_DIR, fileName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'Fichier PDF du template introuvable' });
      }

      base64Data = fs.readFileSync(filePath).toString('base64');
    } else {
      return res.status(400).json({ success: false, message: 'Fichier ou templateId requis' });
    }

    log.info('AI auto-position-fields started', { userId: req.user!.id });

    // Send to Gemini
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 60000);

    let result;
    try {
      result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: AUTO_POSITION_PROMPT },
          ],
        }],
      });
    } finally {
      clearTimeout(timeout);
    }

    const response = result.response;
    if (!response.candidates || response.candidates.length === 0) {
      return res.status(422).json({
        success: false,
        message: 'L\'IA n\'a pas pu analyser le template.',
      });
    }

    const responseText = response.text();

    // Parse JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.status(422).json({
        success: false,
        message: 'L\'IA n\'a pas retourné de positions structurées.',
        raw: responseText.substring(0, 1000),
      });
    }

    let fields: any[];
    try {
      fields = JSON.parse(jsonMatch[0]);
    } catch {
      return res.status(422).json({
        success: false,
        message: 'Erreur de parsing JSON.',
        raw: jsonMatch[0].substring(0, 1000),
      });
    }

    // Validate and sanitize each field
    const validFamilies = ['Helvetica', 'Courier', 'TimesRoman'];
    const validAligns = ['left', 'center', 'right'];
    const validWeights = ['normal', 'bold'];

    const sanitized = fields
      .filter((f: any) => f && f.fieldKey && typeof f.posX === 'number' && typeof f.posY === 'number')
      .map((f: any) => ({
        fieldKey: String(f.fieldKey),
        label: String(f.label || f.fieldKey),
        posX: Math.max(0, Math.min(600, Number(f.posX) || 0)),
        posY: Math.max(0, Math.min(850, Number(f.posY) || 0)),
        fontSize: Math.max(4, Math.min(72, Number(f.fontSize) || 10)),
        fontFamily: validFamilies.includes(f.fontFamily) ? f.fontFamily : 'Helvetica',
        fontWeight: validWeights.includes(f.fontWeight) ? f.fontWeight : 'normal',
        textAlign: validAligns.includes(f.textAlign) ? f.textAlign : 'left',
        color: /^#[0-9A-Fa-f]{6}$/.test(f.color) ? f.color : '#000000',
        maxWidth: typeof f.maxWidth === 'number' ? f.maxWidth : null,
      }));

    log.audit('AI auto-position-fields complete', {
      userId: req.user!.id,
      fieldsCount: sanitized.length,
    });

    res.json({
      success: true,
      data: sanitized,
    });
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    log.error('AI auto-position-fields error', { message: errMsg, stack: error?.stack });

    let userMessage = 'Erreur lors de l\'analyse IA du template.';
    if (errMsg.includes('API_KEY')) userMessage = 'Clé API Gemini invalide.';
    else if (errMsg.includes('quota') || errMsg.includes('429')) userMessage = 'Limite IA atteinte.';
    else if (errMsg.includes('abort') || errMsg.includes('timeout')) userMessage = 'L\'analyse a pris trop de temps.';

    res.status(500).json({ success: false, message: userMessage });
  }
});

export default router;
