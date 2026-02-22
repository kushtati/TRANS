// src/services/ocr.service.ts
// Integration with Datalab API (Chandra OCR) for document extraction
// Docs: https://documentation.datalab.to/docs/welcome/api

import { env } from '../config/env.js';
import { log } from '../config/logger.js';
import { FIXED_LINES_PER_CONTAINER, FIXED_PRESTATION } from './invoice-pdf.service.js';
import fs from 'fs';
import path from 'path';

const DATALAB_BASE = 'https://www.datalab.to/api/v1';
const POLL_INTERVAL = 2000; // 2 seconds between polls
const MAX_POLL_TIME = 120_000; // 2 minutes max wait

// ==========================================
// Extraction Schemas for structured data
// ==========================================

/** Schema for Bill of Lading (BL) extraction */
export const BL_SCHEMA = {
  bl_number: { type: 'string', description: 'Bill of Lading number (B/L No)' },
  shipper_name: { type: 'string', description: 'Name of the shipper / exporter' },
  shipper_address: { type: 'string', description: 'Address of the shipper' },
  consignee_name: { type: 'string', description: 'Name of the consignee / importer' },
  consignee_address: { type: 'string', description: 'Address of the consignee' },
  notify_party: { type: 'string', description: 'Notify party name and address' },
  vessel_name: { type: 'string', description: 'Name of the vessel / ship' },
  voyage_number: { type: 'string', description: 'Voyage number' },
  port_of_loading: { type: 'string', description: 'Port of loading' },
  port_of_discharge: { type: 'string', description: 'Port of discharge / destination port' },
  containers: {
    type: 'array',
    description: 'List of containers on this BL',
    items: {
      type: 'object',
      properties: {
        number: { type: 'string', description: 'Container number (e.g., MSCU1234567)' },
        type: { type: 'string', description: 'Container type (20GP, 40HC, etc.)' },
        seal_number: { type: 'string', description: 'Seal number' },
      },
    },
  },
  description_of_goods: { type: 'string', description: 'Description of goods / merchandise' },
  gross_weight_kg: { type: 'number', description: 'Gross weight in kilograms' },
  number_of_packages: { type: 'number', description: 'Total number of packages' },
  package_type: { type: 'string', description: 'Type of packaging (palettes, cartons, bags, etc.)' },
  freight_amount: { type: 'string', description: 'Freight charges amount and currency' },
  freight_terms: { type: 'string', description: 'Freight terms: PREPAID or COLLECT' },
  place_of_issue: { type: 'string', description: 'Place where BL was issued' },
  date_of_issue: { type: 'string', description: 'Date of issue of the BL' },
  shipping_line: { type: 'string', description: 'Shipping line / carrier name (CMA CGM, MSC, MAERSK, etc.)' },
};

/** Schema for supplier invoice extraction */
export const INVOICE_SCHEMA = {
  invoice_number: { type: 'string', description: 'Invoice number / reference' },
  invoice_date: { type: 'string', description: 'Invoice date' },
  supplier_name: { type: 'string', description: 'Supplier / vendor company name' },
  supplier_address: { type: 'string', description: 'Supplier address' },
  supplier_country: { type: 'string', description: 'Supplier country' },
  buyer_name: { type: 'string', description: 'Buyer / importer name' },
  buyer_address: { type: 'string', description: 'Buyer address' },
  currency: { type: 'string', description: 'Currency code (USD, EUR, GNF, CNY, etc.)' },
  total_amount: { type: 'number', description: 'Total invoice amount' },
  fob_value: { type: 'number', description: 'FOB value if mentioned' },
  freight_value: { type: 'number', description: 'Freight / shipping cost if mentioned' },
  insurance_value: { type: 'number', description: 'Insurance cost if mentioned' },
  cif_value: { type: 'number', description: 'CIF value (Cost + Insurance + Freight) if mentioned' },
  incoterm: { type: 'string', description: 'Incoterm (FOB, CIF, CFR, EXW, etc.)' },
  payment_terms: { type: 'string', description: 'Payment terms' },
  line_items: {
    type: 'array',
    description: 'Line items of the invoice',
    items: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Item description' },
        quantity: { type: 'number', description: 'Quantity' },
        unit_price: { type: 'number', description: 'Unit price' },
        total: { type: 'number', description: 'Line total' },
        hs_code: { type: 'string', description: 'HS code if present' },
      },
    },
  },
};

/** Schema for transit invoice extraction (to regenerate as EMERGENCE-style invoice) */
export const TRANSIT_INVOICE_SCHEMA = {
  invoice_number: { type: 'string', description: 'Invoice or reference number' },
  invoice_date: { type: 'string', description: 'Invoice date (dd/mm/yyyy format)' },
  client_name: { type: 'string', description: 'Client / customer / consignee name' },
  client_phone: { type: 'string', description: 'Client phone number' },
  bl_number: { type: 'string', description: 'Bill of Lading number' },
  reference: { type: 'string', description: 'Reference or dossier number' },
  containers: { type: 'string', description: 'Container numbers separated by / if multiple' },
  container_count: { type: 'number', description: 'Number of containers' },
  container_type: { type: 'string', description: 'Container type (20GP, 40HC, etc.)' },
  goods_description: { type: 'string', description: 'Description of goods / merchandise' },
  expense_lines: {
    type: 'array',
    description: 'All expense/cost lines found in the document',
    items: {
      type: 'object',
      properties: {
        designation: { type: 'string', description: 'Name/label of the expense line (e.g., Droits et Taxes, BOLORE, FRAIS CIRCUIT, ARMATEUR, TRANSPORTS, etc.)' },
        amount: { type: 'number', description: 'Amount in GNF (Guinean Francs)' },
      },
    },
  },
  total_debours: { type: 'number', description: 'Total disbursements / debours in GNF' },
  prestation: { type: 'number', description: 'Service fee / prestation / honoraires in GNF' },
  total_facture: { type: 'number', description: 'Total invoice amount in GNF' },
  montant_paye: { type: 'number', description: 'Amount paid by client in GNF' },
  reste_a_payer: { type: 'number', description: 'Remaining amount to pay in GNF' },
};

// ==========================================
// Types
// ==========================================

export interface OcrSubmitResult {
  success: boolean;
  requestId: string;
  checkUrl: string;
  error?: string;
}

export interface OcrResult {
  status: 'processing' | 'complete' | 'failed';
  success: boolean;
  markdown?: string;
  html?: string;
  json?: Record<string, unknown>;
  extractedData?: Record<string, unknown>;
  images?: Record<string, string>; // filename -> base64
  metadata?: Record<string, unknown>;
  pageCount?: number;
  error?: string;
}

export type DocumentType = 'bl' | 'invoice' | 'transit_invoice' | 'general';

// ==========================================
// Core API Functions
// ==========================================

/**
 * Submit a document to Datalab for OCR processing
 */
export async function submitDocument(
  filePath: string,
  options: {
    documentType?: DocumentType;
    outputFormat?: string;
    mode?: 'fast' | 'balanced' | 'accurate';
    pageRange?: string;
  } = {},
): Promise<OcrSubmitResult> {
  const apiKey = env.DATALAB_API_KEY;
  if (!apiKey) {
    throw new Error('DATALAB_API_KEY non configurée. Ajoutez-la dans les variables d\'environnement.');
  }

  const { documentType = 'general', outputFormat = 'markdown', mode = 'balanced' } = options;

  // Build form data
  const formData = new FormData();

  // Read file and create Blob
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const mimeType = getMimeType(fileName);
  const blob = new Blob([fileBuffer], { type: mimeType });
  formData.append('file', blob, fileName);

  // Options
  formData.append('mode', mode);
  formData.append('output_format', outputFormat);

  if (options.pageRange) {
    formData.append('page_range', options.pageRange);
  }

  // Structured extraction schema based on document type
  if (documentType === 'bl') {
    formData.append('page_schema', JSON.stringify(BL_SCHEMA));
  } else if (documentType === 'transit_invoice') {
    formData.append('page_schema', JSON.stringify(TRANSIT_INVOICE_SCHEMA));
  } else if (documentType === 'invoice') {
    formData.append('page_schema', JSON.stringify(INVOICE_SCHEMA));
  }

  try {
    const response = await fetch(`${DATALAB_BASE}/marker`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      log.error('Datalab submit error', { status: response.status, body: errText });
      throw new Error(`Datalab API error: ${response.status} - ${errText}`);
    }

    const data = await response.json() as {
      success: boolean;
      request_id: string;
      request_check_url: string;
      error?: string;
    };

    if (!data.success) {
      throw new Error(data.error || 'Datalab submission failed');
    }

    log.info('Document submitted to Datalab', { requestId: data.request_id, type: documentType });

    return {
      success: true,
      requestId: data.request_id,
      checkUrl: data.request_check_url,
    };
  } catch (error: any) {
    log.error('OCR submit error', error);
    throw error;
  }
}

/**
 * Submit a document via URL (no file upload needed)
 */
export async function submitDocumentUrl(
  fileUrl: string,
  options: {
    documentType?: DocumentType;
    outputFormat?: string;
    mode?: 'fast' | 'balanced' | 'accurate';
  } = {},
): Promise<OcrSubmitResult> {
  const apiKey = env.DATALAB_API_KEY;
  if (!apiKey) {
    throw new Error('DATALAB_API_KEY non configurée.');
  }

  const { documentType = 'general', outputFormat = 'markdown', mode = 'balanced' } = options;

  const formData = new FormData();
  formData.append('file_url', fileUrl);
  formData.append('mode', mode);
  formData.append('output_format', outputFormat);

  if (documentType === 'bl') {
    formData.append('page_schema', JSON.stringify(BL_SCHEMA));
  } else if (documentType === 'invoice') {
    formData.append('page_schema', JSON.stringify(INVOICE_SCHEMA));
  } else if (documentType === 'transit_invoice') {
    formData.append('page_schema', JSON.stringify(TRANSIT_INVOICE_SCHEMA));
  }

  const response = await fetch(`${DATALAB_BASE}/marker`, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Datalab API error: ${response.status} - ${errText}`);
  }

  const data = await response.json() as {
    success: boolean;
    request_id: string;
    request_check_url: string;
    error?: string;
  };

  if (!data.success) throw new Error(data.error || 'Submission failed');

  return { success: true, requestId: data.request_id, checkUrl: data.request_check_url };
}

/**
 * Check the status/result of an OCR request
 */
export async function checkResult(requestId: string): Promise<OcrResult> {
  const apiKey = env.DATALAB_API_KEY;
  if (!apiKey) throw new Error('DATALAB_API_KEY non configurée.');

  const response = await fetch(`${DATALAB_BASE}/marker/${requestId}`, {
    headers: { 'X-API-Key': apiKey },
  });

  if (!response.ok) {
    throw new Error(`Datalab status check error: ${response.status}`);
  }

  const data = await response.json() as Record<string, any>;

  if (data.status === 'processing') {
    return { status: 'processing', success: true };
  }

  if (data.status === 'complete') {
    return {
      status: 'complete',
      success: data.success ?? true,
      markdown: data.markdown,
      html: data.html,
      json: data.json,
      extractedData: data.extraction_schema_json
        ? (typeof data.extraction_schema_json === 'string'
          ? JSON.parse(data.extraction_schema_json)
          : data.extraction_schema_json)
        : undefined,
      images: data.images,
      metadata: data.metadata,
      pageCount: data.page_count,
    };
  }

  return {
    status: 'failed',
    success: false,
    error: data.error || 'Processing failed',
  };
}

/**
 * Submit a document and wait for the result (blocking with polling)
 */
export async function extractDocument(
  filePath: string,
  options: {
    documentType?: DocumentType;
    outputFormat?: string;
    mode?: 'fast' | 'balanced' | 'accurate';
    pageRange?: string;
  } = {},
): Promise<OcrResult> {
  const submission = await submitDocument(filePath, options);

  // Poll until complete
  const startTime = Date.now();
  while (Date.now() - startTime < MAX_POLL_TIME) {
    await sleep(POLL_INTERVAL);
    const result = await checkResult(submission.requestId);

    if (result.status === 'complete' || result.status === 'failed') {
      return result;
    }
  }

  return {
    status: 'failed',
    success: false,
    error: 'Timeout: le traitement a pris trop de temps (> 2 minutes)',
  };
}

// ==========================================
// BL-specific helper: map extracted data to shipment fields
// ==========================================

export function mapBlToShipmentFields(extractedData: Record<string, any>): Record<string, any> {
  return {
    blNumber: extractedData.bl_number || undefined,
    clientName: extractedData.consignee_name || undefined,
    clientAddress: extractedData.consignee_address || undefined,
    supplierName: extractedData.shipper_name || undefined,
    supplierAddress: extractedData.shipper_address || undefined,
    supplierCountry: extractedData.supplier_country || undefined,
    description: extractedData.description_of_goods || undefined,
    vesselName: extractedData.vessel_name || undefined,
    voyageNumber: extractedData.voyage_number || undefined,
    portOfLoading: extractedData.port_of_loading || undefined,
    portOfDischarge: extractedData.port_of_discharge || undefined,
    grossWeight: extractedData.gross_weight_kg || undefined,
    packageCount: extractedData.number_of_packages || undefined,
    packaging: extractedData.package_type || undefined,
    containers: extractedData.containers?.map((c: any) => ({
      number: c.number,
      type: c.type,
      sealNumber: c.seal_number,
    })) || [],
  };
}

/**
 * Map extracted invoice data to internal format
 */
export function mapInvoiceToFields(extractedData: Record<string, any>): Record<string, any> {
  return {
    invoiceNumber: extractedData.invoice_number || undefined,
    invoiceDate: extractedData.invoice_date || undefined,
    supplierName: extractedData.supplier_name || undefined,
    supplierAddress: extractedData.supplier_address || undefined,
    supplierCountry: extractedData.supplier_country || undefined,
    clientName: extractedData.buyer_name || undefined,
    clientAddress: extractedData.buyer_address || undefined,
    currency: extractedData.currency || undefined,
    totalAmount: extractedData.total_amount || undefined,
    fobValue: extractedData.fob_value || undefined,
    freightValue: extractedData.freight_value || undefined,
    insuranceValue: extractedData.insurance_value || undefined,
    cifValue: extractedData.cif_value || undefined,
    incoterm: extractedData.incoterm || undefined,
    paymentTerms: extractedData.payment_terms || undefined,
    lineItems: extractedData.line_items || [],
  };
}

// ==========================================
// Utilities
// ==========================================

/**
 * Build InvoiceData from OCR-extracted transit invoice data + company info
 */
export function buildInvoiceFromOcr(
  extractedData: Record<string, any>,
  company: {
    name: string;
    phone?: string | null;
    address?: string | null;
    email?: string | null;
    rccm?: string | null;
    agrementNumber?: string | null;
    bankName?: string | null;
    bankAccount?: string | null;
  },
): Record<string, any> {
  const nbContainers = Number(extractedData.container_count) || 1;

  // Fixed line names (lowercase for matching)
  const fixedNames = Object.keys(FIXED_LINES_PER_CONTAINER).map(n => n.toLowerCase());

  // Ensure expense_lines is always an array
  const rawLines = Array.isArray(extractedData.expense_lines)
    ? extractedData.expense_lines
    : [];

  // Variable expense lines from OCR (exclude lines that match fixed categories)
  const variableLines = rawLines
    .filter((line: any) => {
      if (!line || typeof line !== 'object') return false;
      const name = String(line.designation || '').toLowerCase();
      return !fixedNames.some(f => name.includes(f));
    })
    .map((line: any) => ({
      designation: String(line.designation || 'Frais'),
      quantite: 1,
      prixUnitaire: Number(line.amount) || 0,
      montant: Number(line.amount) || 0,
    }));

  // Fixed lines — montant fixe par conteneur
  const fixedLines = Object.entries(FIXED_LINES_PER_CONTAINER).map(([designation, unitAmount]) => ({
    designation,
    quantite: nbContainers,
    prixUnitaire: unitAmount,
    montant: unitAmount * nbContainers,
  }));

  const lines = [...variableLines, ...fixedLines];

  const totalDebours = lines.reduce((s: number, l: any) => s + (Number(l.montant) || 0), 0);
  const prestation = FIXED_PRESTATION;
  const totalFacture = totalDebours + prestation;
  const montantPaye = Number(extractedData.montant_paye) || 0;
  const resteAPayer = totalFacture - montantPaye;

  // Container description (ensure string types)
  const containerType = String(extractedData.container_type || "40'");
  const goodsDesc = String(extractedData.goods_description || 'MARCHANDISES');
  const containerDesc = `${nbContainers}TC${containerType.replace(/[^0-9']/g, '')}' (${goodsDesc.toUpperCase()})`;

  return {
    companyName: company.name,
    companySlogan: 'Disponibilite - Efficacite - Transparence',
    companyAddress: company.address || 'Almamya, Conakry',
    companyEmail: company.email || undefined,
    companyPhone: company.phone || undefined,
    companyRccm: company.rccm || undefined,
    companyAgrementNumber: company.agrementNumber || undefined,
    companyBankName: company.bankName || undefined,
    companyBankAccount: company.bankAccount || undefined,

    invoiceNumber: extractedData.invoice_number || `FAC-${Date.now().toString().slice(-6)}`,
    invoiceDate: extractedData.invoice_date || new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    dossierNumber: extractedData.reference || '-',

    blNumber: extractedData.bl_number || '-',
    reference: extractedData.reference || '-',
    containers: extractedData.containers || '-',
    containerDescription: containerDesc,

    clientName: extractedData.client_name || 'Client',
    clientPhone: extractedData.client_phone || '-',

    lines,
    totalDebours,
    prestation,
    totalFacture,
    montantPayeClient: montantPaye,
    resteAPayer,
  };
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const types: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.tiff': 'image/tiff',
    '.gif': 'image/gif',
  };
  return types[ext] || 'application/octet-stream';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
