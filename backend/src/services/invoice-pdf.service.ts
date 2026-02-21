// src/services/invoice-pdf.service.ts
// Generates professional invoices matching the EMERGENCE TRANSIT GUINEE template
// Uses pdf-lib for precise positioning (AcroForm-style "tampon" approach)

import { PDFDocument, PDFPage, rgb, StandardFonts, PDFFont } from 'pdf-lib';

// ==========================================
// Types
// ==========================================

export interface InvoiceData {
  // Company
  companyName: string;
  companySlogan?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyRccm?: string;
  companyAgrementNumber?: string;
  companyBankName?: string;
  companyBankAccount?: string;

  // Invoice
  invoiceNumber: string;
  invoiceDate: string; // "05/02/2026"
  dossierNumber: string;

  // Shipment
  blNumber: string;
  reference: string;
  containers: string; // "RTJU2018824" or "CGMU5364179 / CAIU5534280"
  containerDescription: string; // "1TC40' (CUISSES DE POULET)" or "2TC40' (PILON DE POULET)"

  // Client
  clientName: string;
  clientPhone: string;

  // Expense lines (grouped)
  lines: InvoiceLineData[];

  // Totals
  totalDebours: number;
  prestation: number; // typically 1,500,000
  totalFacture: number;

  // Payment
  montantPayeClient: number;
  resteAPayer: number;
}

export interface InvoiceLineData {
  designation: string;
  quantite: number;
  prixUnitaire: number;
  montant: number;
}

// ==========================================
// Number to French words converter
// ==========================================

function numberToFrenchWords(n: number): string {
  if (n === 0) return 'zéro';

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

  function convertHundreds(num: number): string {
    let result = '';
    if (num >= 100) {
      if (num >= 200) {
        result += units[Math.floor(num / 100)] + ' cents ';
      } else {
        result += 'cent ';
      }
      num %= 100;
      // Special: if remainder is 0 and hundreds > 1, keep "cents"
      if (num === 0) return result.trim();
      // Remove trailing 's' from cents when followed by something
      result = result.replace('cents ', 'cent ');
    }
    if (num < 20) {
      result += units[num];
    } else {
      const t = Math.floor(num / 10);
      const u = num % 10;
      if (t === 7 || t === 9) {
        // 70-79: soixante-dix..., 90-99: quatre-vingt-dix...
        const sub = (t === 7 ? 10 : 10) + u;
        if (sub < 20) {
          result += tens[t] + (t === 7 && u === 1 ? ' et ' : '-') + units[sub];
        } else {
          result += tens[t] + '-' + units[sub];
        }
      } else if (t === 8) {
        if (u === 0) {
          result += 'quatre-vingts';
        } else {
          result += 'quatre-vingt-' + units[u];
        }
      } else {
        result += tens[t];
        if (u === 1 && t !== 8) {
          result += ' et un';
        } else if (u > 0) {
          result += '-' + units[u];
        }
      }
    }
    return result.trim();
  }

  const rounded = Math.round(n);
  if (rounded >= 1_000_000_000) return formatLargeNumber(rounded);

  let result = '';
  const millions = Math.floor(rounded / 1_000_000);
  const thousands = Math.floor((rounded % 1_000_000) / 1_000);
  const remainder = rounded % 1_000;

  if (millions > 0) {
    if (millions === 1) {
      result += 'un million ';
    } else {
      result += convertHundreds(millions) + ' millions ';
    }
  }

  if (thousands > 0) {
    if (thousands === 1) {
      result += 'mille ';
    } else {
      result += convertHundreds(thousands) + ' mille ';
    }
  }

  if (remainder > 0) {
    result += convertHundreds(remainder);
  }

  return result.trim().replace(/\s+/g, ' ');
}

function formatLargeNumber(n: number): string {
  const billions = Math.floor(n / 1_000_000_000);
  const rest = n % 1_000_000_000;
  let s = numberToFrenchWords(billions) + ' milliard' + (billions > 1 ? 's' : '');
  if (rest > 0) s += ' ' + numberToFrenchWords(rest);
  return s;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ==========================================
// PDF Constants — Layout matching the real invoices
// ==========================================

const PAGE_W = 595.28; // A4 width in points
const PAGE_H = 841.89; // A4 height in points
const MARGIN = 40;
const RIGHT = PAGE_W - MARGIN;

// Colors matching the blue theme from the real invoices
const BLUE = rgb(0.12, 0.26, 0.52);      // Dark blue for header/borders
const LIGHT_BLUE = rgb(0.85, 0.91, 0.97); // Light blue for table headers
const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.4, 0.4, 0.4);
const WHITE = rgb(1, 1, 1);
const RED = rgb(0.8, 0.1, 0.1);

// Formatting
const fmtN = (n: number): string => Math.round(n).toLocaleString('fr-FR');

// ==========================================
// Main PDF Generator
// ==========================================

export async function generateInvoicePDF(data: InvoiceData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  // Embed fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let y = PAGE_H - MARGIN;

  // ===== HEADER BAND =====
  // Blue banner at top
  page.drawRectangle({
    x: MARGIN, y: y - 65,
    width: RIGHT - MARGIN, height: 70,
    color: BLUE,
  });

  // Company name in white
  page.drawText(data.companyName.toUpperCase(), {
    x: MARGIN + 15, y: y - 25,
    size: 18, font: fontBold, color: WHITE,
  });

  // Slogan
  page.drawText(data.companySlogan || 'Disponibilité - Efficacité - Transparence', {
    x: MARGIN + 15, y: y - 45,
    size: 8, font: fontItalic, color: rgb(0.8, 0.85, 0.95),
  });

  // "TRANSIT GUINEE" subtitle
  page.drawText('TRANSIT GUINÉE', {
    x: MARGIN + 15, y: y - 60,
    size: 10, font: fontBold, color: rgb(0.7, 0.78, 0.9),
  });

  y -= 85;

  // ===== DATE & INVOICE NUMBER =====
  // Date aligned right
  const dateText = `Conakry, le ${data.invoiceDate}`;
  const dateW = fontRegular.widthOfTextAtSize(dateText, 10);
  page.drawText(dateText, {
    x: RIGHT - dateW, y,
    size: 10, font: fontRegular, color: BLACK,
  });

  y -= 20;

  // ===== DOSSIER INFO (left) + FACTURE NO (right) =====
  const infoStartY = y;

  // Left column — BL, REF, Conteneur
  page.drawText(`N° BL : ${data.blNumber}`, { x: MARGIN, y, size: 9, font: fontRegular, color: BLACK });
  const factureLabel = `FACTURE N° ${data.invoiceNumber}`;
  const facW = fontBold.widthOfTextAtSize(factureLabel, 14);
  page.drawText(factureLabel, { x: RIGHT - facW, y: y + 2, size: 14, font: fontBold, color: BLUE });

  y -= 16;
  page.drawText(`REF : ${data.reference}`, { x: MARGIN, y, size: 9, font: fontRegular, color: BLACK });

  y -= 16;
  page.drawText(`N° CONTENEUR : ${data.containers}`, { x: MARGIN, y, size: 9, font: fontRegular, color: BLACK });

  // Client info (right side)
  page.drawText('Client :', { x: RIGHT - 180, y: infoStartY - 16, size: 9, font: fontBold, color: BLACK });
  page.drawText(data.clientName, { x: RIGHT - 180, y: infoStartY - 30, size: 10, font: fontBold, color: BLUE });
  page.drawText(`TEL: ${data.clientPhone}`, { x: RIGHT - 180, y: infoStartY - 44, size: 9, font: fontRegular, color: GRAY });

  y -= 18;
  // "Concerne le dédouanement de"
  page.drawText(`Concerne le dédouanement de`, { x: MARGIN, y, size: 9, font: fontItalic, color: GRAY });
  y -= 14;
  page.drawText(data.containerDescription, { x: MARGIN, y, size: 9, font: fontBold, color: BLACK });

  y -= 16;
  page.drawText(`N° DOSSIER : ${data.dossierNumber}`, { x: MARGIN, y, size: 9, font: fontBold, color: BLUE });

  y -= 25;

  // ===== TABLE HEADER =====
  const tableX = MARGIN;
  const colDesignation = tableX;
  const colQty = tableX + 250;
  const colPU = tableX + 310;
  const colMontant = tableX + 400;
  const tableRight = RIGHT;
  const rowH = 20;

  // Header row background
  page.drawRectangle({
    x: tableX, y: y - rowH + 2,
    width: tableRight - tableX, height: rowH,
    color: BLUE,
  });

  // Header text
  const headers = [
    { text: 'DÉSIGNATION', x: colDesignation + 5 },
    { text: 'QTÉ', x: colQty + 5 },
    { text: 'P.U.', x: colPU + 5 },
    { text: 'MONTANT GNF', x: colMontant + 5 },
  ];
  for (const h of headers) {
    page.drawText(h.text, { x: h.x, y: y - rowH + 7, size: 8, font: fontBold, color: WHITE });
  }

  // "DEBOURS" sub-header
  y -= rowH;
  page.drawRectangle({
    x: tableX, y: y - rowH + 2,
    width: tableRight - tableX, height: rowH,
    color: LIGHT_BLUE,
  });
  page.drawText('DÉBOURS', { x: colDesignation + 5, y: y - rowH + 7, size: 8, font: fontBold, color: BLUE });
  y -= rowH;

  // ===== TABLE ROWS =====
  let rowIndex = 0;
  for (const line of data.lines) {
    // Alternating row background
    if (rowIndex % 2 === 0) {
      page.drawRectangle({
        x: tableX, y: y - rowH + 2,
        width: tableRight - tableX, height: rowH,
        color: rgb(0.97, 0.97, 0.99),
      });
    }

    // Vertical lines
    page.drawLine({ start: { x: colQty, y: y + 2 }, end: { x: colQty, y: y - rowH + 2 }, thickness: 0.3, color: rgb(0.8, 0.8, 0.8) });
    page.drawLine({ start: { x: colPU, y: y + 2 }, end: { x: colPU, y: y - rowH + 2 }, thickness: 0.3, color: rgb(0.8, 0.8, 0.8) });
    page.drawLine({ start: { x: colMontant, y: y + 2 }, end: { x: colMontant, y: y - rowH + 2 }, thickness: 0.3, color: rgb(0.8, 0.8, 0.8) });

    // Text
    page.drawText(line.designation, { x: colDesignation + 5, y: y - rowH + 7, size: 8, font: fontRegular, color: BLACK });
    page.drawText(String(line.quantite), { x: colQty + 10, y: y - rowH + 7, size: 8, font: fontRegular, color: BLACK });

    const puText = fmtN(line.prixUnitaire);
    const puW = fontRegular.widthOfTextAtSize(puText, 8);
    page.drawText(puText, { x: colMontant - 5 - puW, y: y - rowH + 7, size: 8, font: fontRegular, color: BLACK });

    const montantText = fmtN(line.montant);
    const montantW = fontBold.widthOfTextAtSize(montantText, 8);
    page.drawText(montantText, { x: tableRight - 8 - montantW, y: y - rowH + 7, size: 8, font: fontBold, color: BLACK });

    y -= rowH;
    rowIndex++;
  }

  // Table outer border
  const tableTopY = y + (rowIndex + 2) * rowH;
  page.drawRectangle({
    x: tableX, y: y + 2,
    width: tableRight - tableX, height: tableTopY - y - 2,
    borderColor: BLUE, borderWidth: 1,
  });

  // ===== TOTAL DEBOURS =====
  y -= 5;
  page.drawRectangle({
    x: colMontant - 85, y: y - 18,
    width: tableRight - colMontant + 85, height: 20,
    color: BLUE,
  });
  page.drawText('TOTAL DÉBOURS', { x: colMontant - 80, y: y - 13, size: 9, font: fontBold, color: WHITE });
  const tdText = fmtN(data.totalDebours);
  const tdW = fontBold.widthOfTextAtSize(tdText, 10);
  page.drawText(tdText, { x: tableRight - 8 - tdW, y: y - 13, size: 10, font: fontBold, color: WHITE });

  y -= 30;

  // ===== PRESTATION =====
  page.drawRectangle({
    x: tableX, y: y - rowH + 2,
    width: tableRight - tableX, height: rowH,
    color: LIGHT_BLUE,
  });
  page.drawText('PRESTATION / HONORAIRES', { x: colDesignation + 5, y: y - rowH + 7, size: 8, font: fontBold, color: BLUE });
  page.drawText('1', { x: colQty + 10, y: y - rowH + 7, size: 8, font: fontRegular, color: BLACK });
  const prestText = fmtN(data.prestation);
  const prestW = fontBold.widthOfTextAtSize(prestText, 8);
  page.drawText(prestText, { x: tableRight - 8 - prestW, y: y - rowH + 7, size: 8, font: fontBold, color: BLACK });
  y -= rowH;

  // ===== TOTAL FACTURE =====
  y -= 5;
  page.drawRectangle({
    x: colMontant - 85, y: y - 22,
    width: tableRight - colMontant + 85, height: 24,
    color: BLUE,
  });
  page.drawText('TOTAL FACTURE GNF', { x: colMontant - 80, y: y - 16, size: 10, font: fontBold, color: WHITE });
  const tfText = fmtN(data.totalFacture);
  const tfW = fontBold.widthOfTextAtSize(tfText, 11);
  page.drawText(tfText, { x: tableRight - 8 - tfW, y: y - 16, size: 11, font: fontBold, color: WHITE });

  y -= 35;

  // ===== ARRÊTÉ EN LETTRES =====
  const montantLettres = capitalize(numberToFrenchWords(data.totalFacture)) + ' Francs Guinéens.';
  page.drawText('Arrêté la présente facture à la somme de :', {
    x: MARGIN, y, size: 9, font: fontBold, color: BLACK,
  });
  y -= 14;

  // Word-wrap the amount in letters
  const maxW = RIGHT - MARGIN;
  const words = montantLettres.split(' ');
  let currentLine = '';
  for (const w of words) {
    const test = currentLine ? currentLine + ' ' + w : w;
    if (fontItalic.widthOfTextAtSize(test, 9) > maxW) {
      page.drawText(currentLine, { x: MARGIN, y, size: 9, font: fontItalic, color: BLUE });
      y -= 13;
      currentLine = w;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) {
    page.drawText(currentLine, { x: MARGIN, y, size: 9, font: fontItalic, color: BLUE });
    y -= 13;
  }

  y -= 10;

  // ===== PAIEMENT =====
  // Blue rounded box for payment info
  page.drawRectangle({
    x: MARGIN, y: y - 50,
    width: (RIGHT - MARGIN) * 0.6, height: 55,
    borderColor: BLUE, borderWidth: 1,
    color: rgb(0.95, 0.97, 1),
  });

  page.drawText('MONTANT PAYÉ PAR LE CLIENT :', {
    x: MARGIN + 10, y: y - 15, size: 9, font: fontBold, color: BLACK,
  });
  page.drawText(`${fmtN(data.montantPayeClient)} GNF`, {
    x: MARGIN + 10, y: y - 30, size: 11, font: fontBold, color: BLUE,
  });

  // RESTE A PAYER
  const resteColor = data.resteAPayer > 0 ? RED : rgb(0.1, 0.6, 0.1);
  page.drawText('RESTE À PAYER :', {
    x: MARGIN + 10, y: y - 45, size: 9, font: fontBold, color: BLACK,
  });
  page.drawText(`${fmtN(data.resteAPayer)} GNF`, {
    x: MARGIN + 130, y: y - 45, size: 11, font: fontBold, color: resteColor,
  });

  // LE DIRECTEUR (right side)
  page.drawText('LE DIRECTEUR :', {
    x: RIGHT - 120, y: y - 15, size: 9, font: fontBold, color: BLACK,
  });
  // Signature line
  page.drawLine({
    start: { x: RIGHT - 130, y: y - 48 },
    end: { x: RIGHT, y: y - 48 },
    thickness: 0.5, color: GRAY,
  });

  y -= 70;

  // ===== FOOTER =====
  const footerY = 60;

  // Footer separator
  page.drawLine({
    start: { x: MARGIN, y: footerY + 30 },
    end: { x: RIGHT, y: footerY + 30 },
    thickness: 1, color: BLUE,
  });

  const footerLines = [
    `📍 Siège social : ${data.companyAddress || 'Almamya, Conakry'}`,
    `📧 ${data.companyEmail || 'emergencetransitguinee11@gmail.com'}`,
    `📞 ${data.companyPhone || '+224 628 359 711 / 625 456 146 / 669 370 021'}`,
    `${data.companyAgrementNumber ? 'Agrément ' + data.companyAgrementNumber + ' | ' : ''}${data.companyRccm ? 'RCCM ' + data.companyRccm : ''}`,
    `Conditions de paiement : 100% après acceptation de la facture, par chèque ou par virement bancaire`,
    `au nom ${data.companyName.toUpperCase()} à la banque ${data.companyBankName || 'CORIS ou AFRILAND'}.${data.companyBankAccount ? ' ' + data.companyBankAccount : ''}`,
  ];

  let fy = footerY + 22;
  for (const fl of footerLines) {
    // Replace emojis with simple text for PDF compatibility
    const cleanLine = fl.replace(/📍/g, '•').replace(/📧/g, '•').replace(/📞/g, '•');
    page.drawText(cleanLine, { x: MARGIN, y: fy, size: 6.5, font: fontRegular, color: GRAY, maxWidth: RIGHT - MARGIN });
    fy -= 9;
  }

  return pdfDoc.save();
}

// ==========================================
// Build InvoiceData from Shipment + Expenses
// ==========================================

interface ShipmentForInvoice {
  id: string;
  trackingNumber: string;
  blNumber?: string | null;
  internalRef?: string | null;
  clientName: string;
  clientPhone?: string | null;
  description: string;
  containers: Array<{ number: string; type: string }>;
  expenses: Array<{
    type: string;
    category: string;
    description: string;
    amount: number;
    paid: boolean;
  }>;
}

interface CompanyForInvoice {
  name: string;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
  rccm?: string | null;
  agrementNumber?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
}

// Group categories into invoice line groupings
const INVOICE_LINE_GROUPS: Record<string, string[]> = {
  'Droits et Taxes': ['DD', 'TVA', 'RTL', 'PC', 'CA', 'BFU', 'DDI_FEE'],
  'BOLORE': ['ACCONAGE', 'BRANCHEMENT', 'SURESTARIES', 'MANUTENTION', 'PASSAGE_TERRE', 'RELEVAGE', 'SECURITE_TERMINAL'],
  'FRAIS CIRCUIT': ['SCANNER'],
  'ARMATEUR': ['DO_FEE', 'SEAWAY_BILL', 'MANIFEST_FEE', 'CONTAINER_DAMAGE', 'SECURITE_MSC', 'SURCHARGE', 'PAC', 'ADP_FEE'],
  'TRANSPORTS': ['TRANSPORT', 'TRANSPORT_ADD'],
  'FRAIS DE DECLARATION': ['HONORAIRES', 'COMMISSION'],
  'FRAIS ORANGE MONEY': ['AUTRE'],
};

export function buildInvoiceData(
  shipment: ShipmentForInvoice,
  company: CompanyForInvoice,
  invoiceNumber: string,
  montantPayeClient: number,
): InvoiceData {
  const disbursements = shipment.expenses.filter(e => e.type === 'DISBURSEMENT');
  const provisions = shipment.expenses.filter(e => e.type === 'PROVISION');

  // Group expenses into invoice lines
  const lines: InvoiceLineData[] = [];
  for (const [groupName, categories] of Object.entries(INVOICE_LINE_GROUPS)) {
    const groupExpenses = disbursements.filter(e => categories.includes(e.category));
    if (groupExpenses.length > 0) {
      const total = groupExpenses.reduce((s, e) => s + e.amount, 0);
      lines.push({
        designation: groupName,
        quantite: 1,
        prixUnitaire: total,
        montant: total,
      });
    }
  }

  // Catch any uncategorized disbursements
  const allGroupedCategories = Object.values(INVOICE_LINE_GROUPS).flat();
  const uncategorized = disbursements.filter(e => !allGroupedCategories.includes(e.category));
  for (const e of uncategorized) {
    lines.push({
      designation: e.description,
      quantite: 1,
      prixUnitaire: e.amount,
      montant: e.amount,
    });
  }

  const totalDebours = disbursements.reduce((s, e) => s + e.amount, 0);
  // Prestation = Honoraires group total, or default 1,500,000
  const honorairesExpenses = disbursements.filter(e => ['HONORAIRES', 'COMMISSION'].includes(e.category));
  const prestation = honorairesExpenses.length > 0 ? honorairesExpenses.reduce((s, e) => s + e.amount, 0) : 1_500_000;

  // Remove FRAIS DE DECLARATION from lines since we show it as PRESTATION separately
  const filteredLines = lines.filter(l => l.designation !== 'FRAIS DE DECLARATION');
  const totalDeboursWithoutHonoraires = totalDebours - prestation;

  const totalFacture = totalDeboursWithoutHonoraires + prestation;
  const resteAPayer = totalFacture - montantPayeClient;

  // Build container description
  const containerNums = shipment.containers.map(c => c.number).join(' / ');
  const nbContainers = shipment.containers.length || 1;
  const containerType = shipment.containers[0]?.type?.includes('40') ? "40'" : "20'";
  const containerDesc = `${nbContainers}TC${containerType} (${shipment.description.toUpperCase()})`;

  return {
    companyName: company.name,
    companySlogan: 'Disponibilité - Efficacité - Transparence',
    companyAddress: company.address || 'Almamya, Conakry',
    companyEmail: company.email || undefined,
    companyPhone: company.phone || undefined,
    companyRccm: company.rccm || undefined,
    companyAgrementNumber: company.agrementNumber || undefined,
    companyBankName: company.bankName || undefined,
    companyBankAccount: company.bankAccount || undefined,

    invoiceNumber,
    invoiceDate: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    dossierNumber: shipment.trackingNumber.replace(/[^\d]/g, '') || shipment.trackingNumber,

    blNumber: shipment.blNumber || '-',
    reference: shipment.internalRef || shipment.trackingNumber,
    containers: containerNums || '-',
    containerDescription: containerDesc,

    clientName: shipment.clientName,
    clientPhone: shipment.clientPhone || '-',

    lines: filteredLines,
    totalDebours: totalDeboursWithoutHonoraires,
    prestation,
    totalFacture,
    montantPayeClient,
    resteAPayer,
  };
}
