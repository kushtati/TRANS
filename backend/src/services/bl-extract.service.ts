// src/services/bl-extract.service.ts
// ============================================
// BL DATA EXTRACTION — 100% GRATUIT
// Utilise pdf-parse (texte PDF) + tesseract.js (OCR images)
// + regex intelligents pour parser les champs d'un BL maritime
//
// npm install pdf-parse tesseract.js
// ============================================

import fs from 'fs';
import path from 'path';
import { log } from '../config/logger.js';

// Dynamic imports (ESM compatibility)
let pdfParse: any = null;
let Tesseract: any = null;

async function loadPdfParse() {
  if (!pdfParse) {
    const mod = await import('pdf-parse');
    pdfParse = mod.default || mod;
  }
  return pdfParse;
}

async function loadTesseract() {
  if (!Tesseract) {
    const mod = await import('tesseract.js');
    Tesseract = mod.default || mod;
  }
  return Tesseract;
}

// ============================================
// PUBLIC INTERFACE
// ============================================

export interface ExtractedBLData {
  blNumber: string;
  clientName: string;
  clientAddress: string;
  description: string;
  hsCode: string;
  packaging: string;
  packageCount: number;
  grossWeight: number;
  netWeight: number;
  cifValue: number;
  cifCurrency: string;
  vesselName: string;
  voyageNumber: string;
  portOfLoading: string;
  portOfDischarge: string;
  supplierName: string;
  supplierCountry: string;
  containers: {
    number: string;
    type: string;
    sealNumber: string;
    grossWeight: number;
    packageCount: number;
  }[];
}

/**
 * Extract BL data from a file (PDF or image).
 * Strategy:
 * 1. PDF → pdf-parse to get text
 * 2. Image (JPG/PNG) → tesseract.js OCR
 * 3. If PDF has no text (scanned) → tesseract.js OCR fallback
 * 4. Parse extracted text with BL-specific regex patterns
 */
export async function extractBLData(
  filePath: string,
  mimeType: string
): Promise<{ data: ExtractedBLData; rawText: string; method: string }> {

  let rawText = '';
  let method = '';

  try {
    if (mimeType === 'application/pdf') {
      // Try native PDF text extraction first
      rawText = await extractTextFromPDF(filePath);
      method = 'pdf-parse';

      // If PDF has very little text, it's probably scanned → OCR fallback
      if (rawText.replace(/\s/g, '').length < 50) {
        log.info('PDF has minimal text, falling back to OCR');
        rawText = await extractTextFromImage(filePath);
        method = 'tesseract-ocr';
      }
    } else {
      // Image file → OCR directly
      rawText = await extractTextFromImage(filePath);
      method = 'tesseract-ocr';
    }

    log.info(`BL text extracted via ${method}`, {
      textLength: rawText.length,
      preview: rawText.substring(0, 200),
    });

    // Parse the raw text into structured BL data
    const data = parseBLText(rawText);

    return { data, rawText, method };
  } catch (error) {
    log.error('BL extraction failed', error);
    // Return empty structure so user can fill manually
    return {
      data: emptyBLData(),
      rawText,
      method: 'failed',
    };
  }
}

// ============================================
// TEXT EXTRACTION METHODS
// ============================================

async function extractTextFromPDF(filePath: string): Promise<string> {
  const parse = await loadPdfParse();
  const buffer = fs.readFileSync(filePath);
  const result = await parse(buffer);
  return result.text || '';
}

async function extractTextFromImage(filePath: string): Promise<string> {
  const tesseract = await loadTesseract();

  const worker = await tesseract.createWorker('eng+fra');
  try {
    const { data } = await worker.recognize(filePath);
    return data.text || '';
  } finally {
    await worker.terminate();
  }
}

// ============================================
// BL TEXT PARSER — REGEX PATTERNS
// These patterns match common Bill of Lading formats
// from major shipping lines (MSC, Maersk, CMA CGM, etc.)
// ============================================

function parseBLText(text: string): ExtractedBLData {
  const result = emptyBLData();
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const fullText = text.toUpperCase();

  // ---- BL NUMBER ----
  // Formats: MEDU1234567, MAEU1234567, CMAU1234567, HLCU1234567, etc.
  const blPatterns = [
    /B[\/\.]?L[\s.:]*(?:NO|NUMBER|N°|#)?[\s.:]*([A-Z]{4}\d{7,10})/i,
    /BILL\s*OF\s*LADING[\s.:]*(?:NO|NUMBER|N°)?[\s.:]*([A-Z0-9]{8,15})/i,
    /(?:MEDU|MAEU|CMAU|HLCU|MSCU|COSU|EGLV|OOLU|MSKU|SEGU|ZIMU)\d{7,10}/i,
    /(?:BL|B\/L|BOL)\s*[:#]?\s*([A-Z0-9]{6,15})/i,
  ];
  for (const pat of blPatterns) {
    const m = text.match(pat);
    if (m) { result.blNumber = (m[1] || m[0]).trim(); break; }
  }

  // ---- VESSEL / SHIP NAME ----
  const vesselPatterns = [
    /(?:VESSEL|SHIP|NAVIRE|OCEAN\s*VESSEL|M\/V|MV)\s*[:\s]*([A-Z][A-Z\s\-\.]{2,30})/i,
    /(?:PRE.CARRIAGE|VESSEL)\s*[:\s]*([A-Z][A-Z\s]{3,25}?)(?:\s*V\.?\s*\d|$)/i,
  ];
  for (const pat of vesselPatterns) {
    const m = text.match(pat);
    if (m) { result.vesselName = cleanField(m[1]); break; }
  }

  // ---- VOYAGE NUMBER ----
  const voyagePatterns = [
    /(?:VOYAGE|VOY|V)\s*[.:\s]*(?:NO|N°|#)?\s*([A-Z0-9]{2,10})/i,
    /(?:VOYAGE\s*(?:NO|N°)?)\s*[:\s]*([A-Z]?\d{2,6}[A-Z]?)/i,
  ];
  for (const pat of voyagePatterns) {
    const m = text.match(pat);
    if (m) { result.voyageNumber = m[1].trim(); break; }
  }

  // ---- PORT OF LOADING ----
  const polPatterns = [
    /(?:PORT\s*OF\s*LOADING|POL|LIEU\s*DE\s*CHARGEMENT)\s*[:\s]*([A-Z][A-Z\s,]{2,30})/i,
    /(?:LOADED\s*ON\s*BOARD|SHIPPED\s*ON\s*BOARD)\s*[:\s]*AT\s*([A-Z][A-Z\s]{2,20})/i,
  ];
  for (const pat of polPatterns) {
    const m = text.match(pat);
    if (m) { result.portOfLoading = cleanField(m[1]); break; }
  }

  // ---- PORT OF DISCHARGE ----
  const podPatterns = [
    /(?:PORT\s*OF\s*DISCHARGE|POD|LIEU\s*DE\s*DÉCHARGEMENT|PORT\s*OF\s*DESTINATION)\s*[:\s]*([A-Z][A-Z\s,]{2,30})/i,
    /(?:DISCHARGE|DESTINATION)\s*[:\s]*([A-Z][A-Z\s]{2,20})/i,
  ];
  for (const pat of podPatterns) {
    const m = text.match(pat);
    if (m) {
      result.portOfDischarge = cleanField(m[1]);
      // Normalize Conakry variants
      if (/CONAK/i.test(result.portOfDischarge)) result.portOfDischarge = 'CONAKRY';
      break;
    }
  }

  // ---- CONSIGNEE (CLIENT) ----
  const consigneePatterns = [
    /(?:CONSIGNEE|DESTINATAIRE|NOTIFY\s*PARTY)\s*[:\s]*([\s\S]{5,120}?)(?=\n\s*(?:NOTIFY|PORT|VESSEL|GOODS|DESCRIPTION|CONTAINER|MARKS))/i,
  ];
  for (const pat of consigneePatterns) {
    const m = text.match(pat);
    if (m) {
      const consigneeBlock = m[1].trim().split('\n');
      result.clientName = cleanField(consigneeBlock[0]);
      if (consigneeBlock.length > 1) {
        result.clientAddress = consigneeBlock.slice(1).map(l => l.trim()).filter(Boolean).join(', ');
      }
      break;
    }
  }

  // ---- SHIPPER (SUPPLIER) ----
  const shipperPatterns = [
    /(?:SHIPPER|EXPÉDITEUR|CHARGEUR)\s*[:\s]*([\s\S]{5,120}?)(?=\n\s*(?:CONSIGNEE|DESTINATAIRE|NOTIFY))/i,
  ];
  for (const pat of shipperPatterns) {
    const m = text.match(pat);
    if (m) {
      const shipperBlock = m[1].trim().split('\n');
      result.supplierName = cleanField(shipperBlock[0]);
      // Try to extract country from address
      const countryMatch = m[1].match(/\b(CHINA|INDIA|TURKEY|NETHERLANDS|BELGIUM|FRANCE|USA|BRAZIL|THAILAND|VIETNAM|INDONESIA|PAKISTAN|UAE|SPAIN|ITALY|GERMANY|UK|JAPAN|KOREA|MOROCCO|SENEGAL|COTE\s*D.?IVOIRE|SOUTH\s*AFRICA)\b/i);
      if (countryMatch) result.supplierCountry = countryMatch[1].toUpperCase();
      break;
    }
  }

  // ---- DESCRIPTION OF GOODS ----
  const descPatterns = [
    /(?:DESCRIPTION\s*OF\s*(?:GOODS|PACKAGES|CARGO)|NATURE\s*(?:OF|DES)\s*(?:GOODS|MARCHANDISES))\s*[:\s]*([\s\S]{10,300}?)(?=\n\s*(?:GROSS|WEIGHT|FREIGHT|CONTAINER|TOTAL|SHIPPED))/i,
    /(?:SAID\s*TO\s*CONTAIN|STC)\s*[:\s]*([\s\S]{5,200}?)(?=\n)/i,
  ];
  for (const pat of descPatterns) {
    const m = text.match(pat);
    if (m) {
      result.description = cleanDescription(m[1]);
      break;
    }
  }

  // ---- HS CODE ----
  const hsPatterns = [
    /(?:HS\s*(?:CODE)?|CODE\s*SH|HARMONIZED|TARIFF)\s*[:\s]*(\d{4}[\.\s]?\d{2}[\.\s]?\d{0,4})/i,
    /\b(\d{4}\.\d{2}\.\d{2})\b/,
    /\b(\d{4}\.\d{2})\b/,
  ];
  for (const pat of hsPatterns) {
    const m = text.match(pat);
    if (m) { result.hsCode = m[1].trim(); break; }
  }

  // ---- GROSS WEIGHT ----
  const weightPatterns = [
    /(?:GROSS\s*WEIGHT|POIDS\s*BRUT|G\.?W\.?)\s*[:\s]*([0-9,.\s]+)\s*(?:KG|KGS|MT|TONS)/i,
    /([0-9,.\s]+)\s*(?:KG|KGS)\s*(?:GROSS|BRUT)/i,
    /WEIGHT\s*[:\s]*([0-9,.\s]+)\s*(?:KG|KGS)/i,
  ];
  for (const pat of weightPatterns) {
    const m = text.match(pat);
    if (m) { result.grossWeight = parseNumeric(m[1]); break; }
  }

  // ---- NET WEIGHT ----
  const netWeightPatterns = [
    /(?:NET\s*WEIGHT|POIDS\s*NET|N\.?W\.?)\s*[:\s]*([0-9,.\s]+)\s*(?:KG|KGS|MT)/i,
  ];
  for (const pat of netWeightPatterns) {
    const m = text.match(pat);
    if (m) { result.netWeight = parseNumeric(m[1]); break; }
  }

  // ---- PACKAGE COUNT ----
  const packagePatterns = [
    /(?:NO\.?\s*OF\s*(?:PACKAGES|PKGS|COLIS)|NOMBRE\s*(?:DE\s*)?COLIS|PACKAGES?)\s*[:\s]*(\d+)/i,
    /(\d+)\s*(?:BAGS|SACS|CARTONS|CTNS|PACKAGES|PKGS|PALLETS|BALES|DRUMS|ROLLS)\b/i,
    /TOTAL\s*[:\s]*(\d+)\s*(?:BAGS|SACS|CTNS|PACKAGES|PKGS)/i,
  ];
  for (const pat of packagePatterns) {
    const m = text.match(pat);
    if (m) { result.packageCount = parseInt(m[1]) || 0; break; }
  }

  // ---- PACKAGING TYPE ----
  const packTypePatterns = [
    /\d+\s*(BAGS?|SACS?|CARTONS?|CTNS?|PALLETS?|BALES?|DRUMS?|ROLLS?|PIECES?|BUNDLES?)\b/i,
  ];
  for (const pat of packTypePatterns) {
    const m = text.match(pat);
    if (m) {
      const packMap: Record<string, string> = {
        BAG: 'Sac', BAGS: 'Sac', SAC: 'Sac', SACS: 'Sac',
        CARTON: 'Carton', CARTONS: 'Carton', CTN: 'Carton', CTNS: 'Carton',
        PALLET: 'Palette', PALLETS: 'Palette',
        BALE: 'Balle', BALES: 'Balle',
        DRUM: 'Fût', DRUMS: 'Fût',
        ROLL: 'Rouleau', ROLLS: 'Rouleau',
        PIECE: 'Pièce', PIECES: 'Pièce',
        BUNDLE: 'Lot', BUNDLES: 'Lot',
      };
      result.packaging = packMap[m[1].toUpperCase()] || m[1];
      break;
    }
  }

  // ---- CONTAINERS ----
  // Container number format: 4 letters + 7 digits (ISO 6346)
  const containerRegex = /\b([A-Z]{4}\d{7})\b/g;
  const sealRegex = /(?:SEAL|SCELLE|PLOMB)\s*[:#]?\s*([A-Z0-9]{4,15})/gi;
  const containerTypeRegex = /\b(20\s*(?:GP|DV|STD|DRY|HC|RF|RE)|40\s*(?:GP|DV|STD|DRY|HC|HR|RF|RE|HQ|HIGH\s*CUBE))\b/gi;

  const containerNumbers: string[] = [];
  let cMatch;
  while ((cMatch = containerRegex.exec(text)) !== null) {
    const num = cMatch[1];
    // Filter out BL numbers and other non-container codes
    if (!containerNumbers.includes(num) && !num.startsWith(result.blNumber.substring(0, 4))) {
      containerNumbers.push(num);
    }
  }

  const sealNumbers: string[] = [];
  while ((cMatch = sealRegex.exec(text)) !== null) {
    sealNumbers.push(cMatch[1]);
  }

  const containerTypes: string[] = [];
  while ((cMatch = containerTypeRegex.exec(text)) !== null) {
    containerTypes.push(normalizeContainerType(cMatch[1]));
  }

  // Build container list
  result.containers = containerNumbers.map((num, i) => ({
    number: num,
    type: containerTypes[i] || (containerTypes[0] || 'DRY_40HC'),
    sealNumber: sealNumbers[i] || '',
    grossWeight: 0, // Hard to extract per-container from raw text
    packageCount: 0,
  }));

  // ---- CIF VALUE (rare on BL but sometimes present) ----
  const valuePatterns = [
    /(?:DECLARED\s*VALUE|VALEUR|VALUE\s*OF\s*GOODS)\s*[:\s]*([A-Z]{3})?\s*([0-9,.]+)/i,
    /(?:USD|EUR|GBP)\s*([0-9,.]+)/i,
  ];
  for (const pat of valuePatterns) {
    const m = text.match(pat);
    if (m) {
      result.cifValue = parseNumeric(m[2] || m[1]);
      if (m[1] && /^[A-Z]{3}$/.test(m[1])) result.cifCurrency = m[1];
      break;
    }
  }

  return result;
}

// ============================================
// UTILITIES
// ============================================

function cleanField(s: string): string {
  return s
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[:\s-]+/, '')
    .replace(/[:\s-]+$/, '')
    .trim();
}

function cleanDescription(s: string): string {
  return s
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[:\s-]+/, '')
    .trim()
    .substring(0, 300);
}

function parseNumeric(s: string): number {
  // Handle formats: 25,000.50  or  25.000,50  or  25000
  const cleaned = s.replace(/\s/g, '');

  // Detect European format (period as thousand sep, comma as decimal)
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }

  // Standard format
  return parseFloat(cleaned.replace(/,/g, '')) || 0;
}

function normalizeContainerType(raw: string): string {
  const s = raw.toUpperCase().replace(/\s+/g, '');
  if (/40.*(?:HC|HQ|HIGH)/.test(s)) return 'DRY_40HC';
  if (/40.*(?:RF|RE|REEFER)/.test(s)) return 'REEFER_40';
  if (/40.*(?:HR)/.test(s)) return 'REEFER_40HR';
  if (/20.*(?:RF|RE|REEFER)/.test(s)) return 'REEFER_20';
  if (/40/.test(s)) return 'DRY_40';
  if (/20/.test(s)) return 'DRY_20';
  return 'DRY_40HC';
}

function emptyBLData(): ExtractedBLData {
  return {
    blNumber: '', clientName: '', clientAddress: '', description: '',
    hsCode: '', packaging: '', packageCount: 0, grossWeight: 0, netWeight: 0,
    cifValue: 0, cifCurrency: 'USD', vesselName: '', voyageNumber: '',
    portOfLoading: '', portOfDischarge: '', supplierName: '', supplierCountry: '',
    containers: [],
  };
}
