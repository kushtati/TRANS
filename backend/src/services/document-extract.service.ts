// src/services/document-extract.service.ts
// Auto-extract shipment fields from uploaded documents using Gemini AI

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import { log } from '../config/logger.js';
import { prisma } from '../config/prisma.js';

// =============================================
// Gemini client (shared)
// =============================================

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
const genAI = env.GEMINI_API_KEY ? new GoogleGenerativeAI(env.GEMINI_API_KEY) : null;
let geminiModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

// Initialize model on first call
async function getModel() {
  if (geminiModel) return geminiModel;
  if (!genAI) return null;

  for (const m of GEMINI_MODELS) {
    try {
      const testModel = genAI.getGenerativeModel({ model: m });
      await testModel.generateContent('test');
      geminiModel = testModel;
      log.info(`Document extract: AI model selected → ${m}`);
      return geminiModel;
    } catch {
      // try next model
    }
  }
  return null;
}

// =============================================
// Extraction prompts per document type
// =============================================

const EXTRACTION_PROMPTS: Record<string, string> = {
  BL: `Tu es un expert en transit maritime. Analyse ce connaissement (Bill of Lading / BL) et extrais les informations.

RETOURNE UNIQUEMENT un objet JSON valide, sans markdown, sans texte.
{
  "blNumber": "numéro BL complet",
  "vesselName": "nom du navire",
  "voyageNumber": "numéro de voyage",
  "portOfLoading": "port de chargement en MAJUSCULES",
  "portOfDischarge": "port de déchargement (CONAKRY si Guinée)",
  "eta": "date ETA au format YYYY-MM-DD si visible",
  "supplierName": "nom du SHIPPER / expéditeur",
  "supplierCountry": "pays du shipper en MAJUSCULES",
  "clientName": "nom du CONSIGNEE / destinataire",
  "clientNif": "NIF du destinataire si visible",
  "description": "description de la marchandise",
  "hsCode": "code SH si visible",
  "packaging": "type emballage (Sac, Carton, Palette, Fût, Vrac, etc.)",
  "packageCount": 0,
  "grossWeight": 0,
  "netWeight": 0
}
RÈGLES: CONSIGNEE = client (destinataire en Guinée). SHIPPER = fournisseur. Si poids en tonnes, multiplie par 1000 pour kg.`,

  INVOICE: `Tu es un expert en transit et commerce international. Analyse cette facture commerciale et extrais les informations.

RETOURNE UNIQUEMENT un objet JSON valide, sans markdown, sans texte.
{
  "cifValue": 0,
  "fobValue": 0,
  "freightValue": 0,
  "insuranceValue": 0,
  "cifCurrency": "USD",
  "supplierName": "nom du vendeur / expéditeur",
  "supplierCountry": "pays du vendeur en MAJUSCULES",
  "description": "description des marchandises",
  "hsCode": "code SH si visible",
  "grossWeight": 0,
  "netWeight": 0,
  "packageCount": 0
}
RÈGLES: CIF = FOB + Freight + Insurance. Devise USD par défaut. Montants en nombres, pas de séparateurs.`,

  PACKING_LIST: `Tu es un expert en transit. Analyse cette liste de colisage (packing list) et extrais les informations.

RETOURNE UNIQUEMENT un objet JSON valide, sans markdown, sans texte.
{
  "grossWeight": 0,
  "netWeight": 0,
  "packageCount": 0,
  "packaging": "type d'emballage (Sac, Carton, Palette, Fût, etc.)",
  "description": "description des marchandises"
}
RÈGLES: Si poids en tonnes, multiplie par 1000 pour kg.`,

  DDI: `Tu es un expert en douane guinéenne. Analyse ce DDI (Demande de Déclaration d'Importation) et extrais les informations.

RETOURNE UNIQUEMENT un objet JSON valide, sans markdown, sans texte.
{
  "ddiNumber": "numéro DDI",
  "clientNif": "NIF du déclarant/importateur",
  "cifValue": 0,
  "fobValue": 0,
  "cifCurrency": "USD",
  "description": "description marchandise",
  "supplierCountry": "pays de provenance en MAJUSCULES",
  "hsCode": "code SH si visible"
}`,

  DECLARATION: `Tu es un expert en douane guinéenne. Analyse cette déclaration en douane et extrais les informations.

RETOURNE UNIQUEMENT un objet JSON valide, sans markdown, sans texte.
{
  "declarationNumber": "numéro de déclaration",
  "customsRegime": "IM4 ou IM5 ou IM7 ou TR",
  "customsOffice": "code bureau douane (ex: GNB02)",
  "customsOfficeName": "nom du bureau (ex: BUREAU CONAKRY PORT)",
  "declarantCode": "code du déclarant",
  "declarantName": "nom du déclarant",
  "hsCode": "code SH",
  "cifValue": 0,
  "exchangeRate": 0,
  "cifValueGnf": 0,
  "cifCurrency": "USD",
  "description": "désignation de la marchandise"
}`,

  LIQUIDATION: `Tu es un expert en douane guinéenne. Analyse cette liquidation douanière et extrais les montants.

RETOURNE UNIQUEMENT un objet JSON valide, sans markdown, sans texte.
{
  "liquidationNumber": "numéro de liquidation",
  "dutyDD": 0,
  "dutyRTL": 0,
  "dutyTVA": 0,
  "dutyPC": 0,
  "dutyCA": 0,
  "dutyBFU": 0,
  "totalDuties": 0,
  "cifValueGnf": 0
}
RÈGLES: DD = Droit de Douane. RTL = Redevance de Traitement de la Liquidation. TVA = Taxe sur Valeur Ajoutée. PC = Prélèvement Communautaire. CA = Contribution Additionnelle. BFU = Bureau Frais Unique. Tous les montants en GNF.`,

  QUITTANCE: `Tu es un expert en douane guinéenne. Analyse cette quittance et extrais les informations.

RETOURNE UNIQUEMENT un objet JSON valide, sans markdown, sans texte.
{
  "quittanceNumber": "numéro de quittance",
  "totalDuties": 0
}`,

  BAE: `Tu es un expert en douane guinéenne. Analyse ce BAE (Bon à Enlever) et extrais les informations.

RETOURNE UNIQUEMENT un objet JSON valide, sans markdown, sans texte.
{
  "baeNumber": "numéro de BAE",
  "declarationNumber": "numéro de déclaration si visible"
}`,

  DO: `Tu es un expert en transit maritime. Analyse ce Delivery Order (DO) et extrais les informations.

RETOURNE UNIQUEMENT un objet JSON valide, sans markdown, sans texte.
{
  "doNumber": "numéro du DO",
  "blNumber": "numéro BL si visible",
  "vesselName": "nom du navire si visible"
}`,

  EXIT_NOTE: `Tu es un expert en transit. Analyse ce bon de sortie et extrais les informations.

RETOURNE UNIQUEMENT un objet JSON valide, sans markdown, sans texte.
{
  "bsNumber": "numéro du bon de sortie"
}`,

  CUSTOMS_INVOICE: `Tu es un expert en douane guinéenne. Analyse cette facture douane et extrais les montants.

RETOURNE UNIQUEMENT un objet JSON valide, sans markdown, sans texte.
{
  "totalDuties": 0,
  "dutyDD": 0,
  "dutyRTL": 0,
  "dutyTVA": 0,
  "dutyPC": 0,
  "dutyCA": 0,
  "dutyBFU": 0
}`,
};

// Fields that can be extracted for each document type → Prisma field mapping
const EXTRACTABLE_FIELDS: Record<string, string[]> = {
  BL: ['blNumber', 'vesselName', 'voyageNumber', 'portOfLoading', 'portOfDischarge', 'eta', 'supplierName', 'supplierCountry', 'clientName', 'clientNif', 'description', 'hsCode', 'packaging', 'packageCount', 'grossWeight', 'netWeight'],
  INVOICE: ['cifValue', 'fobValue', 'freightValue', 'insuranceValue', 'cifCurrency', 'supplierName', 'supplierCountry', 'description', 'hsCode', 'grossWeight', 'netWeight', 'packageCount'],
  PACKING_LIST: ['grossWeight', 'netWeight', 'packageCount', 'packaging', 'description'],
  DDI: ['ddiNumber', 'clientNif', 'cifValue', 'fobValue', 'cifCurrency', 'description', 'supplierCountry', 'hsCode'],
  DECLARATION: ['declarationNumber', 'customsRegime', 'customsOffice', 'customsOfficeName', 'declarantCode', 'declarantName', 'hsCode', 'cifValue', 'exchangeRate', 'cifValueGnf', 'cifCurrency', 'description'],
  LIQUIDATION: ['liquidationNumber', 'dutyDD', 'dutyRTL', 'dutyTVA', 'dutyPC', 'dutyCA', 'dutyBFU', 'totalDuties', 'cifValueGnf'],
  QUITTANCE: ['quittanceNumber', 'totalDuties'],
  BAE: ['baeNumber', 'declarationNumber'],
  DO: ['doNumber', 'blNumber', 'vesselName'],
  EXIT_NOTE: ['bsNumber'],
  CUSTOMS_INVOICE: ['totalDuties', 'dutyDD', 'dutyRTL', 'dutyTVA', 'dutyPC', 'dutyCA', 'dutyBFU'],
};

// String fields (vs numeric) — to know which are texts vs numbers
const NUMBER_FIELDS = new Set([
  'packageCount', 'grossWeight', 'netWeight',
  'cifValue', 'fobValue', 'freightValue', 'insuranceValue',
  'exchangeRate', 'cifValueGnf',
  'dutyDD', 'dutyRTL', 'dutyTVA', 'dutyPC', 'dutyCA', 'dutyBFU', 'totalDuties',
]);

// Human-readable labels for the frontend notification
const FIELD_LABELS: Record<string, string> = {
  blNumber: 'N° BL',
  vesselName: 'Navire',
  voyageNumber: 'Voyage',
  portOfLoading: 'Port chargement',
  portOfDischarge: 'Port déchargement',
  eta: 'ETA',
  supplierName: 'Fournisseur',
  supplierCountry: 'Pays fournisseur',
  clientName: 'Client',
  clientNif: 'NIF',
  description: 'Description',
  hsCode: 'Code SH',
  packaging: 'Emballage',
  packageCount: 'Nombre colis',
  grossWeight: 'Poids brut',
  netWeight: 'Poids net',
  cifValue: 'Valeur CIF',
  fobValue: 'Valeur FOB',
  freightValue: 'Fret',
  insuranceValue: 'Assurance',
  cifCurrency: 'Devise',
  exchangeRate: 'Taux de change',
  cifValueGnf: 'Valeur CIF GNF',
  ddiNumber: 'N° DDI',
  declarationNumber: 'N° Déclaration',
  liquidationNumber: 'N° Liquidation',
  quittanceNumber: 'N° Quittance',
  baeNumber: 'N° BAE',
  doNumber: 'N° DO',
  bsNumber: 'N° BS',
  customsRegime: 'Régime',
  customsOffice: 'Bureau douane',
  customsOfficeName: 'Nom bureau',
  declarantCode: 'Code déclarant',
  declarantName: 'Déclarant',
  dutyDD: 'DD',
  dutyRTL: 'RTL',
  dutyTVA: 'TVA',
  dutyPC: 'PC',
  dutyCA: 'CA',
  dutyBFU: 'BFU',
  totalDuties: 'Total droits',
};

// =============================================
// Main extraction function
// =============================================

interface ExtractionResult {
  /** Fields that were auto-filled on the shipment */
  updatedFields: string[];
  /** Human-readable labels of updated fields */
  updatedLabels: string[];
  /** Raw extracted data (for debugging/display) */
  extractedData: Record<string, any>;
  /** Message for the user */
  message: string;
}

/**
 * Extract data from an uploaded document and auto-update the shipment.
 * Only fills fields that are currently empty/null/0 on the shipment — never overwrites.
 *
 * @param shipmentId - ID of the shipment to update
 * @param documentType - Type of document (BL, INVOICE, DDI, etc.)
 * @param documentUrl - URL of the uploaded file (e.g. /api/upload/files/xxx.pdf)
 * @returns Extraction result or null if extraction not possible/failed
 */
export async function extractAndUpdateShipment(
  shipmentId: string,
  documentType: string,
  documentUrl: string,
): Promise<ExtractionResult | null> {
  // Only extract from document types we have prompts for
  const prompt = EXTRACTION_PROMPTS[documentType];
  if (!prompt) {
    log.info(`Document extract: no prompt for type ${documentType}, skipping`);
    return null;
  }

  // Only extract from locally uploaded files
  if (!documentUrl.startsWith('/api/upload/files/')) {
    log.info('Document extract: not a local file, skipping');
    return null;
  }

  const model = await getModel();
  if (!model) {
    log.warn('Document extract: Gemini AI not available');
    return null;
  }

  try {
    // 1. Read the file from disk
    const filename = documentUrl.replace('/api/upload/files/', '');
    const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
    const filePath = path.join(UPLOAD_DIR, filename);

    if (!fs.existsSync(filePath)) {
      log.warn(`Document extract: file not found → ${filePath}`);
      return null;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    // Determine MIME type from extension
    const ext = path.extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    const mimeType = mimeMap[ext] || 'application/pdf';

    log.info(`Document extract: starting for ${documentType}`, { shipmentId, filename });

    // 2. Send to Gemini with 25s timeout
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 25000);

    let result;
    try {
      result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: prompt },
          ],
        }],
      });
    } finally {
      clearTimeout(timeout);
    }

    const response = result.response;
    if (!response.candidates || response.candidates.length === 0) {
      log.warn('Document extract: Gemini returned no candidates');
      return null;
    }

    const responseText = response.text();

    // 3. Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log.warn('Document extract: no JSON in response', { response: responseText.substring(0, 300) });
      return null;
    }

    let extractedData: Record<string, any>;
    try {
      extractedData = JSON.parse(jsonMatch[0]);
    } catch {
      log.warn('Document extract: invalid JSON', { response: responseText.substring(0, 500) });
      return null;
    }

    // 4. Get current shipment to compare (only update empty fields)
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) return null;

    // 5. Build update data — only fill empty/null/0 fields
    const allowedFields = EXTRACTABLE_FIELDS[documentType] || [];
    const updateData: Record<string, any> = {};
    const updatedFields: string[] = [];

    for (const field of allowedFields) {
      const extractedValue = extractedData[field];
      const currentValue = (shipment as any)[field];

      // Skip if AI returned empty/null/0
      if (extractedValue === null || extractedValue === undefined) continue;
      if (typeof extractedValue === 'string' && extractedValue.trim() === '') continue;
      if (typeof extractedValue === 'number' && extractedValue === 0) continue;

      // Only fill if current field is empty/null/0
      const isCurrentEmpty =
        currentValue === null ||
        currentValue === undefined ||
        (typeof currentValue === 'string' && currentValue.trim() === '') ||
        (typeof currentValue === 'number' && currentValue === 0);

      if (!isCurrentEmpty) continue;

      // Validate and coerce type
      if (NUMBER_FIELDS.has(field)) {
        const numVal = typeof extractedValue === 'number' ? extractedValue : parseFloat(String(extractedValue));
        if (!isNaN(numVal) && numVal > 0) {
          updateData[field] = numVal;
          updatedFields.push(field);
        }
      } else if (field === 'eta') {
        // Parse date
        const dateVal = new Date(extractedValue);
        if (!isNaN(dateVal.getTime())) {
          updateData[field] = dateVal;
          updatedFields.push(field);
        }
      } else if (field === 'customsRegime') {
        // Enum validation
        const validRegimes = ['IM4', 'IM5', 'IM7', 'TR'];
        if (validRegimes.includes(extractedValue)) {
          updateData[field] = extractedValue;
          updatedFields.push(field);
        }
      } else {
        // String field
        const strVal = String(extractedValue).trim();
        if (strVal.length > 0) {
          updateData[field] = strVal;
          updatedFields.push(field);
        }
      }
    }

    // 6. Recalculate CIF GNF if we got new values
    const newCifValue = updateData.cifValue ?? (shipment.cifValue || 0);
    const newExchangeRate = updateData.exchangeRate ?? (shipment.exchangeRate || 0);
    if (newCifValue > 0 && newExchangeRate > 0 && !shipment.cifValueGnf) {
      updateData.cifValueGnf = Math.round(newCifValue * newExchangeRate);
      if (!updatedFields.includes('cifValueGnf')) updatedFields.push('cifValueGnf');
    }

    // 7. Apply update if we have fields to update
    if (updatedFields.length > 0) {
      await prisma.shipment.update({
        where: { id: shipmentId },
        data: updateData as Prisma.ShipmentUpdateInput,
      });

      log.info(`Document extract: updated ${updatedFields.length} fields`, {
        shipmentId,
        documentType,
        fields: updatedFields,
      });
    } else {
      log.info('Document extract: no new fields to update (all already filled)', {
        shipmentId,
        documentType,
      });
    }

    const updatedLabels = updatedFields.map(f => FIELD_LABELS[f] || f);

    return {
      updatedFields,
      updatedLabels,
      extractedData,
      message: updatedFields.length > 0
        ? `${updatedFields.length} champ(s) extraits et mis à jour : ${updatedLabels.join(', ')}`
        : 'Document analysé — tous les champs étaient déjà remplis',
    };
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    log.error('Document extract failed', { shipmentId, documentType, error: errMsg });

    // Don't propagate — extraction failure shouldn't block document add
    return null;
  }
}
