// src/routes/ocr.ts
// Routes for document OCR via Datalab (Chandra) API

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { auth } from '../middleware/auth.js';
import { log } from '../config/logger.js';
import {
  submitDocument,
  submitDocumentUrl,
  checkResult,
  extractDocument,
  mapBlToShipmentFields,
  mapInvoiceToFields,
  buildInvoiceFromOcr,
  DocumentType,
} from '../services/ocr.service.js';
import { generateInvoicePDF, InvoiceData } from '../services/invoice-pdf.service.js';
import { prisma } from '../config/prisma.js';

const router = Router();
router.use(auth);

// ==========================================
// Multer for temporary OCR uploads
// ==========================================

const TEMP_DIR = path.resolve(process.cwd(), 'uploads', 'ocr-temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const ocrStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TEMP_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = file.originalname
      .replace(ext, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);
    cb(null, `${Date.now()}-${safeName}${ext}`);
  },
});

const ocrUpload = multer({
  storage: ocrStorage,
  limits: { fileSize: 15 * 1024 * 1024, files: 1 }, // 15MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
      'image/tiff', 'image/gif',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type non supporté. Acceptés : PDF, JPEG, PNG, WebP, TIFF, GIF.'));
    }
  },
});

// ==========================================
// POST /api/ocr/extract
// Submit a document for OCR + structured extraction
// Returns immediately with requestId (async processing)
// ==========================================

router.post('/extract', (req: Request, res: Response) => {
  ocrUpload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err instanceof multer.MulterError
          ? `Erreur upload : ${err.message}`
          : err.message,
      });
    }

    try {
      const documentType = (req.body.documentType || 'general') as DocumentType;
      const mode = (req.body.mode || 'balanced') as 'fast' | 'balanced' | 'accurate';

      // File upload or URL
      if (req.file) {
        const result = await submitDocument(req.file.path, { documentType, mode });

        log.audit('OCR document submitted', {
          userId: req.user!.id,
          requestId: result.requestId,
          documentType,
          fileName: req.file.originalname,
        });

        // Clean up temp file after submission (Datalab has the data)
        fs.unlink(req.file.path, () => {});

        return res.json({
          success: true,
          requestId: result.requestId,
          checkUrl: result.checkUrl,
          message: 'Document soumis pour traitement OCR',
        });
      }

      // Alternative: URL-based submission
      const fileUrl = req.body.fileUrl;
      if (fileUrl) {
        const result = await submitDocumentUrl(fileUrl, { documentType, mode });

        log.audit('OCR URL submitted', {
          userId: req.user!.id,
          requestId: result.requestId,
          documentType,
          fileUrl,
        });

        return res.json({
          success: true,
          requestId: result.requestId,
          checkUrl: result.checkUrl,
          message: 'Document soumis pour traitement OCR',
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Fichier ou URL requis',
      });
    } catch (error: any) {
      log.error('OCR extract error', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la soumission OCR',
      });
    }
  });
});

// ==========================================
// GET /api/ocr/status/:requestId
// Poll for OCR results
// ==========================================

router.get('/status/:requestId', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const result = await checkResult(requestId);

    // If complete with structured extraction, also map to app fields
    if (result.status === 'complete' && result.extractedData) {
      const documentType = (req.query.documentType as DocumentType) || 'general';

      let mappedFields;
      if (documentType === 'bl') {
        mappedFields = mapBlToShipmentFields(result.extractedData);
      } else if (documentType === 'invoice') {
        mappedFields = mapInvoiceToFields(result.extractedData);
      }

      return res.json({
        ...result,
        success: true,
        mappedFields,
      });
    }

    res.json({ ...result, success: true });
  } catch (error: any) {
    log.error('OCR status check error', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la vérification du statut',
    });
  }
});

// ==========================================
// POST /api/ocr/extract-sync
// Submit + wait for result (blocking, for smaller docs)
// ==========================================

router.post('/extract-sync', (req: Request, res: Response) => {
  ocrUpload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err instanceof multer.MulterError
          ? `Erreur upload : ${err.message}`
          : err.message,
      });
    }

    try {
      const documentType = (req.body.documentType || 'general') as DocumentType;
      const mode = (req.body.mode || 'balanced') as 'fast' | 'balanced' | 'accurate';

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Fichier requis' });
      }

      // Extract with polling (blocks until complete or timeout)
      const result = await extractDocument(req.file.path, { documentType, mode });

      // Clean up temp file
      fs.unlink(req.file.path, () => {});

      // Map extracted data
      let mappedFields;
      if (result.extractedData) {
        if (documentType === 'bl') {
          mappedFields = mapBlToShipmentFields(result.extractedData);
        } else if (documentType === 'invoice') {
          mappedFields = mapInvoiceToFields(result.extractedData);
        }
      }

      log.audit('OCR sync extraction complete', {
        userId: req.user!.id,
        documentType,
        fileName: req.file.originalname,
        success: result.success,
        pageCount: result.pageCount,
      });

      res.json({
        ...result,
        mappedFields,
      });
    } catch (error: any) {
      // Clean up temp file on error
      if (req.file) fs.unlink(req.file.path, () => {});

      log.error('OCR sync extract error', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de l\'extraction OCR',
      });
    }
  });
});

// ==========================================
// POST /api/ocr/scan-to-invoice
// Upload a document → OCR → generate EMERGENCE-style invoice PDF
// ==========================================

router.post('/scan-to-invoice', (req: Request, res: Response) => {
  ocrUpload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err instanceof multer.MulterError
          ? `Erreur upload : ${err.message}`
          : err.message,
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Fichier requis' });
      }

      // Get company info
      const company = await prisma.company.findUnique({
        where: { id: req.user!.companyId },
      });

      if (!company) {
        fs.unlink(req.file.path, () => {});
        return res.status(404).json({ success: false, message: 'Entreprise non trouvee' });
      }

      const mode = (req.body.mode || 'balanced') as 'fast' | 'balanced' | 'accurate';

      // Step 1: OCR extract with transit invoice schema
      log.info('OCR scan-to-invoice: extracting document', { fileName: req.file.originalname });
      const ocrResult = await extractDocument(req.file.path, {
        documentType: 'transit_invoice',
        mode,
      });

      // Clean up temp file
      fs.unlink(req.file.path, () => {});

      if (!ocrResult.success || ocrResult.status === 'failed') {
        return res.status(422).json({
          success: false,
          message: ocrResult.error || 'Echec de l\'extraction OCR',
          markdown: ocrResult.markdown, // Still return raw text for debugging
        });
      }

      // Step 2: Build invoice data from extracted data + company
      const extractedData = ocrResult.extractedData || {};

      // If no structured data, try to parse key info from markdown
      const invoiceData = buildInvoiceFromOcr(extractedData, company) as InvoiceData;

      // Step 3: Generate EMERGENCE-style PDF
      const pdfBytes = await generateInvoicePDF(invoiceData);

      log.audit('OCR scan-to-invoice complete', {
        userId: req.user!.id,
        fileName: req.file.originalname,
        invoiceNumber: invoiceData.invoiceNumber,
        totalFacture: invoiceData.totalFacture,
      });

      // Return the PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=facture-${invoiceData.invoiceNumber}.pdf`);
      res.setHeader('Content-Length', pdfBytes.length.toString());
      res.end(Buffer.from(pdfBytes));
    } catch (error: any) {
      if (req.file) fs.unlink(req.file.path, () => {});
      log.error('OCR scan-to-invoice error', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la generation de facture',
      });
    }
  });
});

// ==========================================
// POST /api/ocr/scan-to-invoice-data
// Same as above but returns JSON data instead of PDF
// (for preview / editing before PDF generation)
// ==========================================

router.post('/scan-to-invoice-data', (req: Request, res: Response) => {
  ocrUpload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err instanceof multer.MulterError
          ? `Erreur upload : ${err.message}`
          : err.message,
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Fichier requis' });
      }

      const company = await prisma.company.findUnique({
        where: { id: req.user!.companyId },
      });

      if (!company) {
        fs.unlink(req.file.path, () => {});
        return res.status(404).json({ success: false, message: 'Entreprise non trouvee' });
      }

      const mode = (req.body.mode || 'balanced') as 'fast' | 'balanced' | 'accurate';

      const ocrResult = await extractDocument(req.file.path, {
        documentType: 'transit_invoice',
        mode,
      });

      fs.unlink(req.file.path, () => {});

      if (!ocrResult.success || ocrResult.status === 'failed') {
        return res.status(422).json({
          success: false,
          message: ocrResult.error || 'Echec de l\'extraction OCR',
          markdown: ocrResult.markdown,
        });
      }

      const extractedData = ocrResult.extractedData || {};
      const invoiceData = buildInvoiceFromOcr(extractedData, company);

      log.audit('OCR scan-to-invoice-data complete', {
        userId: req.user!.id,
        fileName: req.file.originalname,
      });

      res.json({
        success: true,
        ocrRaw: ocrResult.extractedData,
        invoiceData,
        markdown: ocrResult.markdown,
        pageCount: ocrResult.pageCount,
      });
    } catch (error: any) {
      if (req.file) fs.unlink(req.file.path, () => {});
      log.error('OCR scan-to-invoice-data error', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de l\'extraction',
      });
    }
  });
});

// ==========================================
// POST /api/ocr/scan-to-overlay
// Upload a document → OCR → return data mapped to template overlay field keys
// (used by the Template Designer to auto-fill field values)
// ==========================================

router.post('/scan-to-overlay', (req: Request, res: Response) => {
  ocrUpload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err instanceof multer.MulterError
          ? `Erreur upload : ${err.message}`
          : err.message,
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Fichier requis' });
      }

      const company = await prisma.company.findUnique({
        where: { id: req.user!.companyId },
      });

      if (!company) {
        fs.unlink(req.file.path, () => {});
        return res.status(404).json({ success: false, message: 'Entreprise non trouvée' });
      }

      const mode = (req.body.mode || 'balanced') as 'fast' | 'balanced' | 'accurate';

      // Step 1: OCR extract
      log.info('OCR scan-to-overlay: extracting document', { fileName: req.file.originalname });
      const ocrResult = await extractDocument(req.file.path, {
        documentType: 'transit_invoice',
        mode,
      });

      fs.unlink(req.file.path, () => {});

      if (!ocrResult.success || ocrResult.status === 'failed') {
        return res.status(422).json({
          success: false,
          message: ocrResult.error || 'Échec de l\'extraction OCR',
          markdown: ocrResult.markdown,
        });
      }

      // Step 2: Build invoice data from OCR
      const extractedData = ocrResult.extractedData || {};
      const invoiceData = buildInvoiceFromOcr(extractedData, company);

      // Format number helper
      const fmtN = (n: number): string =>
        Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

      // Step 3: Map to overlay field keys (same keys as AVAILABLE_FIELD_KEYS)
      const nbContainers = Number(extractedData.container_count) || 1;
      const overlayData: Record<string, string> = {
        // Facture
        invoice_number: invoiceData.invoiceNumber || '',
        invoice_date: invoiceData.invoiceDate || '',
        dossier_number: invoiceData.dossierNumber || '',

        // Client
        client_name: invoiceData.clientName || '',
        client_phone: invoiceData.clientPhone || '',
        client_address: String(extractedData.client_address || ''),
        client_nif: String(extractedData.client_nif || ''),

        // Dossier
        bl_number: invoiceData.blNumber || '',
        reference: invoiceData.reference || '',
        containers: invoiceData.containers || '',
        container_description: invoiceData.containerDescription || '',
        description: String(extractedData.goods_description || ''),
        vessel_name: String(extractedData.vessel_name || ''),

        // Montants
        total_debours: fmtN(invoiceData.totalDebours || 0),
        prestation: fmtN(invoiceData.prestation || 0),
        total_facture: fmtN(invoiceData.totalFacture || 0),
        montant_paye: fmtN(invoiceData.montantPayeClient || 0),
        reste_a_payer: fmtN(invoiceData.resteAPayer || 0),
        total_lettres: '', // Could add French words conversion

        // Lignes de débours
        line_droits_taxes: fmtN(
          (invoiceData.lines || [])
            .filter((l: any) => /droit|tax|douane/i.test(l.designation))
            .reduce((s: number, l: any) => s + (l.montant || 0), 0)
        ),
        line_bolore: fmtN(
          (invoiceData.lines || [])
            .filter((l: any) => /bolor|acconage|terminal|manutention/i.test(l.designation))
            .reduce((s: number, l: any) => s + (l.montant || 0), 0)
        ),
        line_frais_circuit: fmtN(2_000_000 * nbContainers),
        line_armateur: fmtN(
          (invoiceData.lines || [])
            .filter((l: any) => /armateur|do.?fee|seaway|manifest/i.test(l.designation))
            .reduce((s: number, l: any) => s + (l.montant || 0), 0)
        ),
        line_transports: fmtN(
          (invoiceData.lines || [])
            .filter((l: any) => /transport/i.test(l.designation))
            .reduce((s: number, l: any) => s + (l.montant || 0), 0)
        ),
        line_frais_declaration: fmtN(300_000 * nbContainers),
        line_frais_orange: fmtN(200_000 * nbContainers),

        // Entreprise
        company_name: company.name || '',
        company_phone: company.phone || '',
        company_address: company.address || '',
        company_email: company.email || '',
        company_rccm: company.rccm || '',
        company_bank: company.bankName || '',
      };

      log.audit('OCR scan-to-overlay complete', {
        userId: req.user!.id,
        fileName: req.file.originalname,
        fieldsExtracted: Object.keys(overlayData).filter(k => overlayData[k] && overlayData[k] !== '0').length,
      });

      res.json({
        success: true,
        data: overlayData,
        ocrRaw: ocrResult.extractedData,
        markdown: ocrResult.markdown,
      });
    } catch (error: any) {
      if (req.file) fs.unlink(req.file.path, () => {});
      log.error('OCR scan-to-overlay error', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de l\'extraction OCR',
      });
    }
  });
});

export default router;
