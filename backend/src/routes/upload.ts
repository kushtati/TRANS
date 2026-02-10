// src/routes/upload.ts

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { auth } from '../middleware/auth.js';
import { log } from '../config/logger.js';

const router = Router();
router.use(auth);

// Ensure upload directory exists
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = file.originalname
      .replace(ext, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);
    const uniqueName = `${Date.now()}-${safeName}${ext}`;
    cb(null, uniqueName);
  },
});

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Acceptés : PDF, images, Word, Excel.'));
    }
  },
});

// ============================================
// POST /api/upload
// ============================================

router.post('/', (req: Request, res: Response) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Fichier trop volumineux (max 10 Mo)',
        });
      }
      return res.status(400).json({
        success: false,
        message: `Erreur upload : ${err.message}`,
      });
    }

    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Erreur lors du téléchargement',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni',
      });
    }

    const fileUrl = `/api/upload/files/${req.file.filename}`;

    log.audit('File uploaded', {
      userId: req.user!.id,
      filename: req.file.filename,
      size: req.file.size,
      type: req.file.mimetype,
    });

    res.json({
      success: true,
      data: {
        url: fileUrl,
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  });
});

// ============================================
// GET /api/upload/files/:filename (serve files)
// ============================================

router.get('/files/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename.replace(/[^a-zA-Z0-9._-]/g, '');
  const filePath = path.join(UPLOAD_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Fichier non trouvé' });
  }

  res.sendFile(filePath);
});

export default router;
