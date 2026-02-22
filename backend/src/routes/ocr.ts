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
  DocumentType,
} from '../services/ocr.service.js';

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

export default router;
