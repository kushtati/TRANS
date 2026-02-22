// src/services/pdf-overlay.service.ts
// PDF Overlay engine — loads a user's PDF template and stamps dynamic text
// on top at the exact (x, y) coordinates defined in TemplateField records.

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { log } from '../config/logger.js';

// ==========================================
// Types
// ==========================================

export interface FieldMapping {
  fieldKey: string;
  posX: number;      // PDF points from LEFT
  posY: number;      // PDF points from BOTTOM (pdf-lib origin)
  fontSize: number;
  fontFamily: string; // Helvetica | Courier | TimesRoman
  fontWeight: string; // normal | bold
  textAlign: string;  // left | center | right
  color: string;      // hex "#1E4387"
  maxWidth?: number | null;
}

export interface OverlayData {
  [fieldKey: string]: string; // e.g. { client_name: "Jean Dupont", total_ttc: "1 500 000 GNF" }
}

// Standard available field keys with French labels
export const AVAILABLE_FIELD_KEYS: { key: string; label: string; category: string }[] = [
  // Facture
  { key: 'invoice_number', label: 'N° Facture', category: 'Facture' },
  { key: 'invoice_date', label: 'Date facture', category: 'Facture' },
  { key: 'dossier_number', label: 'N° Dossier', category: 'Facture' },

  // Client
  { key: 'client_name', label: 'Nom client', category: 'Client' },
  { key: 'client_phone', label: 'Téléphone client', category: 'Client' },
  { key: 'client_address', label: 'Adresse client', category: 'Client' },
  { key: 'client_nif', label: 'NIF client', category: 'Client' },

  // Dossier
  { key: 'bl_number', label: 'N° BL', category: 'Dossier' },
  { key: 'reference', label: 'Référence', category: 'Dossier' },
  { key: 'containers', label: 'Conteneurs', category: 'Dossier' },
  { key: 'container_description', label: 'Description conteneurs', category: 'Dossier' },
  { key: 'description', label: 'Marchandise', category: 'Dossier' },
  { key: 'vessel_name', label: 'Navire', category: 'Dossier' },

  // Montants
  { key: 'total_debours', label: 'Total Débours', category: 'Montants' },
  { key: 'prestation', label: 'Prestation', category: 'Montants' },
  { key: 'total_facture', label: 'Total Facture', category: 'Montants' },
  { key: 'montant_paye', label: 'Montant payé', category: 'Montants' },
  { key: 'reste_a_payer', label: 'Reste à payer', category: 'Montants' },
  { key: 'total_lettres', label: 'Total en lettres', category: 'Montants' },

  // Lignes de débours (dynamiques)
  { key: 'line_droits_taxes', label: 'Droits et Taxes', category: 'Lignes' },
  { key: 'line_bolore', label: 'BOLORE', category: 'Lignes' },
  { key: 'line_frais_circuit', label: 'Frais Circuit', category: 'Lignes' },
  { key: 'line_armateur', label: 'Armateur', category: 'Lignes' },
  { key: 'line_transports', label: 'Transports', category: 'Lignes' },
  { key: 'line_frais_declaration', label: 'Frais Déclaration', category: 'Lignes' },
  { key: 'line_frais_orange', label: 'Frais Orange Money', category: 'Lignes' },

  // Entreprise
  { key: 'company_name', label: 'Nom entreprise', category: 'Entreprise' },
  { key: 'company_phone', label: 'Tél entreprise', category: 'Entreprise' },
  { key: 'company_address', label: 'Adresse entreprise', category: 'Entreprise' },
  { key: 'company_email', label: 'Email entreprise', category: 'Entreprise' },
  { key: 'company_rccm', label: 'RCCM', category: 'Entreprise' },
  { key: 'company_bank', label: 'Banque', category: 'Entreprise' },
];

// ==========================================
// Font resolver
// ==========================================

async function embedFont(
  pdfDoc: PDFDocument,
  fontFamily: string,
  fontWeight: string,
): Promise<PDFFont> {
  const key = `${fontFamily}_${fontWeight}`;
  const fontMap: Record<string, typeof StandardFonts[keyof typeof StandardFonts]> = {
    'Helvetica_normal': StandardFonts.Helvetica,
    'Helvetica_bold': StandardFonts.HelveticaBold,
    'Courier_normal': StandardFonts.Courier,
    'Courier_bold': StandardFonts.CourierBold,
    'TimesRoman_normal': StandardFonts.TimesRoman,
    'TimesRoman_bold': StandardFonts.TimesRomanBold,
  };
  const stdFont = fontMap[key] || StandardFonts.Helvetica;
  return pdfDoc.embedFont(stdFont);
}

// ==========================================
// Color parser
// ==========================================

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
}

// ==========================================
// Main Overlay Generator
// ==========================================

/**
 * Loads a PDF template and stamps text data on top at (x, y) positions.
 *
 * @param templateSource - Either a file path (string) or a Uint8Array / Buffer
 * @param fields - Array of field mappings (positions, fonts, etc.)
 * @param data - Key-value object of field values
 * @returns PDF bytes ready to send / save
 */
export async function generateFromTemplate(
  templateSource: string | Uint8Array | Buffer,
  fields: FieldMapping[],
  data: OverlayData,
): Promise<Uint8Array> {
  // Load the template PDF
  let templateBytes: Uint8Array;
  if (typeof templateSource === 'string') {
    // It's a file path or URL
    if (templateSource.startsWith('http://') || templateSource.startsWith('https://')) {
      const res = await fetch(templateSource);
      if (!res.ok) throw new Error(`Impossible de télécharger le template: ${res.status}`);
      templateBytes = new Uint8Array(await res.arrayBuffer());
    } else {
      templateBytes = fs.readFileSync(templateSource);
    }
  } else {
    templateBytes = templateSource as Uint8Array;
  }

  // Load into pdf-lib
  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  if (pages.length === 0) throw new Error('Le template PDF est vide');

  const page = pages[0]; // We overlay on page 1

  // Font cache to avoid re-embedding
  const fontCache: Record<string, PDFFont> = {};

  for (const field of fields) {
    const value = data[field.fieldKey];
    if (value === undefined || value === null || value === '') continue;

    // Get or cache font
    const fontKey = `${field.fontFamily}_${field.fontWeight}`;
    if (!fontCache[fontKey]) {
      fontCache[fontKey] = await embedFont(pdfDoc, field.fontFamily, field.fontWeight);
    }
    const font = fontCache[fontKey];
    const color = hexToRgb(field.color);

    // Handle text alignment
    let drawX = field.posX;
    if (field.textAlign === 'center' && field.maxWidth) {
      const textWidth = font.widthOfTextAtSize(value, field.fontSize);
      drawX = field.posX + (field.maxWidth - textWidth) / 2;
    } else if (field.textAlign === 'right' && field.maxWidth) {
      const textWidth = font.widthOfTextAtSize(value, field.fontSize);
      drawX = field.posX + field.maxWidth - textWidth;
    }

    // Draw text
    page.drawText(value, {
      x: drawX,
      y: field.posY,
      size: field.fontSize,
      font,
      color,
      maxWidth: field.maxWidth || undefined,
    });
  }

  return pdfDoc.save();
}

/**
 * Convert the first page of a PDF to a PNG data URL (for the designer preview).
 * Uses pdf-lib to get page dimensions — actual rasterization happens client-side with PDF.js.
 * This returns metadata needed by the frontend.
 */
export async function getTemplateMetadata(
  templateSource: string | Uint8Array | Buffer,
): Promise<{ width: number; height: number; pageCount: number }> {
  let templateBytes: Uint8Array;
  if (typeof templateSource === 'string') {
    if (templateSource.startsWith('http')) {
      const res = await fetch(templateSource);
      templateBytes = new Uint8Array(await res.arrayBuffer());
    } else {
      templateBytes = fs.readFileSync(templateSource);
    }
  } else {
    templateBytes = templateSource as Uint8Array;
  }

  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const page = pdfDoc.getPage(0);

  return {
    width: page.getWidth(),
    height: page.getHeight(),
    pageCount: pdfDoc.getPageCount(),
  };
}
