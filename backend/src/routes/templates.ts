// src/routes/templates.ts
// ============================================
// ROUTES TEMPLATES DE FACTURE (PDF Overlay / Designer)
//
// GET    /api/templates              → Liste des templates de l'entreprise
// POST   /api/templates              → Upload + créer un template
// GET    /api/templates/:id          → Détail d'un template (avec champs)
// PUT    /api/templates/:id          → Modifier nom / default
// DELETE /api/templates/:id          → Supprimer un template
// PUT    /api/templates/:id/fields   → Sauvegarder les champs (bulk upsert)
// GET    /api/templates/field-keys   → Liste des clés de champs disponibles
// POST   /api/templates/:id/preview  → Générer un PDF preview avec données test
// POST   /api/templates/:id/generate → Générer un PDF final avec données réelles
// ============================================

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { log } from '../config/logger.js';
import { auth, requireRole } from '../middleware/auth.js';
import {
  generateFromTemplate,
  getTemplateMetadata,
  AVAILABLE_FIELD_KEYS,
  FieldMapping,
  OverlayData,
} from '../services/pdf-overlay.service.js';

const router = Router();
router.use(auth);

// ==========================================
// Multer — template PDF uploads
// ==========================================

const TEMPLATE_DIR = path.resolve(process.cwd(), 'uploads', 'templates');
if (!fs.existsSync(TEMPLATE_DIR)) {
  fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
}

const templateStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TEMPLATE_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = file.originalname
      .replace(ext, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);
    cb(null, `${Date.now()}-${safeName}${ext}`);
  },
});

const templateUpload = multer({
  storage: templateStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont acceptés'));
    }
  },
});

// ==========================================
// GET /api/templates/field-keys
// Available field keys for the designer
// ==========================================

router.get('/field-keys', (_req: Request, res: Response) => {
  res.json({ success: true, data: AVAILABLE_FIELD_KEYS });
});

// ==========================================
// GET /api/templates/:id/pdf
// Serve the template PDF file (avoids static file issues on ephemeral FS)
// ==========================================

router.get('/:id/pdf', async (req: Request, res: Response) => {
  try {
    const template = await prisma.invoiceTemplate.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template non trouvé' });
    }

    const filePath = path.resolve(process.cwd(), template.fileUrl.replace(/^\//, ''));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Fichier template introuvable sur le serveur' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(filePath).pipe(res);
  } catch (error: any) {
    log.error('Serve template PDF error', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// GET /api/templates
// List templates for the user's company
// ==========================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const templates = await prisma.invoiceTemplate.findMany({
      where: { companyId: req.user!.companyId },
      include: { _count: { select: { fields: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: templates });
  } catch (error: any) {
    log.error('List templates error', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// POST /api/templates
// Upload a PDF and create a new template
// ==========================================

router.post('/', (req: Request, res: Response) => {
  templateUpload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err instanceof multer.MulterError
          ? `Erreur upload: ${err.message}`
          : err.message,
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Fichier PDF requis' });
      }

      const name = req.body.name?.trim() || req.file.originalname.replace(/\.pdf$/i, '');

      // Get PDF metadata (page dimensions)
      const metadata = await getTemplateMetadata(req.file.path);

      // Build relative URL for the stored file
      const fileUrl = `/uploads/templates/${req.file.filename}`;

      const template = await prisma.invoiceTemplate.create({
        data: {
          name,
          fileUrl,
          canvasWidth: metadata.width,
          canvasHeight: metadata.height,
          companyId: req.user!.companyId,
        },
      });

      log.audit('Template created', {
        userId: req.user!.id,
        templateId: template.id,
        name: template.name,
        pageSize: `${metadata.width}x${metadata.height}`,
      });

      res.status(201).json({ success: true, data: template });
    } catch (error: any) {
      log.error('Create template error', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
});

// ==========================================
// GET /api/templates/:id
// Get template details + fields
// ==========================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const template = await prisma.invoiceTemplate.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
      include: { fields: true },
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template non trouvé' });
    }

    res.json({ success: true, data: template });
  } catch (error: any) {
    log.error('Get template error', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// PUT /api/templates/:id
// Update template name / isDefault
// ==========================================

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const template = await prisma.invoiceTemplate.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template non trouvé' });
    }

    const { name, isDefault } = req.body;

    // If setting as default, unset others
    if (isDefault) {
      await prisma.invoiceTemplate.updateMany({
        where: { companyId: req.user!.companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.invoiceTemplate.update({
      where: { id: template.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    log.error('Update template error', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// DELETE /api/templates/:id
// ==========================================

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const template = await prisma.invoiceTemplate.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template non trouvé' });
    }

    // Delete the physical file
    const filePath = path.resolve(process.cwd(), template.fileUrl.replace(/^\//, ''));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.invoiceTemplate.delete({ where: { id: template.id } });

    log.audit('Template deleted', { userId: req.user!.id, templateId: template.id });
    res.json({ success: true, message: 'Template supprimé' });
  } catch (error: any) {
    log.error('Delete template error', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// PUT /api/templates/:id/fields
// Bulk save fields (replaces all existing fields)
// ==========================================

const fieldSchema = z.object({
  fieldKey: z.string().min(1),
  label: z.string().min(1),
  posX: z.number(),
  posY: z.number(),
  fontSize: z.number().int().min(4).max(72).default(10),
  fontFamily: z.enum(['Helvetica', 'Courier', 'TimesRoman']).default('Helvetica'),
  fontWeight: z.enum(['normal', 'bold']).default('normal'),
  textAlign: z.enum(['left', 'center', 'right']).default('left'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
  maxWidth: z.number().nullable().optional(),
});

const bulkFieldsSchema = z.object({
  fields: z.array(fieldSchema),
});

router.put('/:id/fields', async (req: Request, res: Response) => {
  try {
    const template = await prisma.invoiceTemplate.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template non trouvé' });
    }

    const { fields } = bulkFieldsSchema.parse(req.body);

    // Transaction: delete old fields + create new ones
    await prisma.$transaction([
      prisma.templateField.deleteMany({ where: { templateId: template.id } }),
      ...fields.map((f) =>
        prisma.templateField.create({
          data: {
            templateId: template.id,
            fieldKey: f.fieldKey,
            label: f.label,
            posX: f.posX,
            posY: f.posY,
            fontSize: f.fontSize,
            fontFamily: f.fontFamily,
            fontWeight: f.fontWeight,
            textAlign: f.textAlign,
            color: f.color,
            maxWidth: f.maxWidth ?? null,
          },
        }),
      ),
    ]);

    const savedFields = await prisma.templateField.findMany({
      where: { templateId: template.id },
    });

    log.audit('Template fields saved', {
      userId: req.user!.id,
      templateId: template.id,
      fieldCount: fields.length,
    });

    res.json({ success: true, data: savedFields });
  } catch (error: any) {
    log.error('Save template fields error', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: error.errors });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// POST /api/templates/:id/preview
// Generate a test PDF with sample data
// ==========================================

router.post('/:id/preview', async (req: Request, res: Response) => {
  try {
    const template = await prisma.invoiceTemplate.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
      include: { fields: true },
    });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template non trouvé' });
    }

    const company = await prisma.company.findUnique({ where: { id: req.user!.companyId } });

    // Sample data for preview
    const sampleData: OverlayData = {
      invoice_number: 'FAC-2026-PREVIEW',
      invoice_date: new Date().toLocaleDateString('fr-FR'),
      dossier_number: 'DOS-001',
      client_name: 'Client Test',
      client_phone: '+224 600 000 000',
      client_address: 'Conakry, Guinée',
      client_nif: 'NIF-12345',
      bl_number: 'MSCUXXXXXXX',
      reference: 'REF-001',
      containers: 'MSCU1234567',
      container_description: "1TC40' (MARCHANDISES TEST)",
      description: 'Marchandises test',
      vessel_name: 'MSC OSCAR',
      total_debours: '25 000 000',
      prestation: '1 500 000',
      total_facture: '26 500 000',
      montant_paye: '20 000 000',
      reste_a_payer: '6 500 000',
      total_lettres: 'Vingt-six millions cinq cent mille Francs Guinéens',
      line_droits_taxes: '15 000 000',
      line_bolore: '5 000 000',
      line_frais_circuit: '2 000 000',
      line_armateur: '1 500 000',
      line_transports: '1 000 000',
      line_frais_declaration: '300 000',
      line_frais_orange: '200 000',
      company_name: company?.name || 'EMERGENCE TRANSIT GUINEE',
      company_phone: company?.phone || '+224 628 359 711',
      company_address: company?.address || 'Almamya, Conakry',
      company_email: company?.email || '',
      company_rccm: company?.rccm || '',
      company_bank: company?.bankName || '',
      // Allow custom data from request body
      ...req.body.data,
    };

    // Resolve template file
    const filePath = path.resolve(process.cwd(), template.fileUrl.replace(/^\//, ''));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Fichier template introuvable' });
    }

    // Map fields to FieldMapping
    const fieldMappings: FieldMapping[] = template.fields.map((f) => ({
      fieldKey: f.fieldKey,
      posX: f.posX,
      posY: f.posY,
      fontSize: f.fontSize,
      fontFamily: f.fontFamily,
      fontWeight: f.fontWeight,
      textAlign: f.textAlign,
      color: f.color,
      maxWidth: f.maxWidth,
    }));

    const pdfBytes = await generateFromTemplate(filePath, fieldMappings, sampleData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=preview-${template.name}.pdf`);
    res.setHeader('Content-Length', pdfBytes.length.toString());
    res.end(Buffer.from(pdfBytes));
  } catch (error: any) {
    log.error('Template preview error', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// POST /api/templates/:id/generate
// Generate a real invoice PDF from template + shipment data
// ==========================================

router.post('/:id/generate', async (req: Request, res: Response) => {
  try {
    const { shipmentId } = req.body;
    if (!shipmentId) {
      return res.status(400).json({ success: false, message: 'shipmentId requis' });
    }

    const template = await prisma.invoiceTemplate.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
      include: { fields: true },
    });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template non trouvé' });
    }

    // Load shipment with expenses
    const shipment = await prisma.shipment.findFirst({
      where: { id: shipmentId, companyId: req.user!.companyId },
      include: {
        expenses: true,
        containers: true,
        company: true,
      },
    });
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Dossier non trouvé' });
    }

    const company = shipment.company;

    // Format number helper
    const fmtN = (n: number): string =>
      Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

    // Build data from shipment
    const disbursements = shipment.expenses.filter((e) => e.type === 'DISBURSEMENT');
    const totalDebours = disbursements.reduce((s, e) => s + e.amount, 0);
    const prestation = 1_500_000;
    const totalFacture = totalDebours + prestation;
    const totalPaid = shipment.expenses.filter((e) => e.paid).reduce((s, e) => s + e.amount, 0);
    const resteAPayer = totalFacture - totalPaid;

    // Group expenses
    const groupAmount = (cats: string[]) =>
      disbursements.filter((e) => cats.includes(e.category)).reduce((s, e) => s + e.amount, 0);

    const containerNums = shipment.containers.map((c) => c.number).join(' / ') || '-';
    const nbContainers = shipment.containers.length || 1;
    const containerType = shipment.containers[0]?.type?.includes('40') ? "40'" : "20'";

    const data: OverlayData = {
      invoice_number: `FAC-${Date.now().toString().slice(-6)}`,
      invoice_date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      dossier_number: shipment.trackingNumber,
      client_name: shipment.clientName,
      client_phone: shipment.clientPhone || '-',
      client_address: shipment.clientAddress || '-',
      client_nif: shipment.clientNif || '-',
      bl_number: shipment.blNumber || '-',
      reference: shipment.internalRef || shipment.trackingNumber,
      containers: containerNums,
      container_description: `${nbContainers}TC${containerType} (${shipment.description.toUpperCase()})`,
      description: shipment.description,
      vessel_name: shipment.vesselName || '-',
      total_debours: fmtN(totalDebours),
      prestation: fmtN(prestation),
      total_facture: fmtN(totalFacture),
      montant_paye: fmtN(totalPaid),
      reste_a_payer: fmtN(resteAPayer),
      total_lettres: '', // Could add French words conversion
      line_droits_taxes: fmtN(groupAmount(['DD', 'TVA', 'RTL', 'PC', 'CA', 'BFU', 'DDI_FEE'])),
      line_bolore: fmtN(groupAmount(['ACCONAGE', 'BRANCHEMENT', 'SURESTARIES', 'MANUTENTION', 'PASSAGE_TERRE', 'RELEVAGE', 'SECURITE_TERMINAL'])),
      line_frais_circuit: fmtN(2_000_000 * nbContainers),
      line_armateur: fmtN(groupAmount(['DO_FEE', 'SEAWAY_BILL', 'MANIFEST_FEE', 'CONTAINER_DAMAGE', 'SECURITE_MSC', 'SURCHARGE', 'PAC', 'ADP_FEE'])),
      line_transports: fmtN(groupAmount(['TRANSPORT', 'TRANSPORT_ADD'])),
      line_frais_declaration: fmtN(300_000 * nbContainers),
      line_frais_orange: fmtN(200_000 * nbContainers),
      company_name: company.name,
      company_phone: company.phone || '',
      company_address: company.address || '',
      company_email: company.email || '',
      company_rccm: company.rccm || '',
      company_bank: company.bankName || '',
      // Allow overrides from request
      ...req.body.overrides,
    };

    const filePath = path.resolve(process.cwd(), template.fileUrl.replace(/^\//, ''));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Fichier template introuvable' });
    }

    const fieldMappings: FieldMapping[] = template.fields.map((f) => ({
      fieldKey: f.fieldKey,
      posX: f.posX,
      posY: f.posY,
      fontSize: f.fontSize,
      fontFamily: f.fontFamily,
      fontWeight: f.fontWeight,
      textAlign: f.textAlign,
      color: f.color,
      maxWidth: f.maxWidth,
    }));

    const pdfBytes = await generateFromTemplate(filePath, fieldMappings, data);

    log.audit('Invoice generated from template', {
      userId: req.user!.id,
      templateId: template.id,
      shipmentId,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=facture-${data.invoice_number}.pdf`);
    res.setHeader('Content-Length', pdfBytes.length.toString());
    res.end(Buffer.from(pdfBytes));
  } catch (error: any) {
    log.error('Template generate error', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
