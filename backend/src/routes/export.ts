// src/routes/export.ts

import { Router, Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { prisma } from '../config/prisma.js';
import { auth } from '../middleware/auth.js';
import { log } from '../config/logger.js';

const router = Router();
router.use(auth);

// GNF formatting helper
const fmtGNF = (n: number): string => `${Math.round(n).toLocaleString('fr-FR')} GNF`;

const CATEGORY_LABELS: Record<string, string> = {
  DD: 'Droit de Douane', TVA: 'TVA', RTL: 'RTL', PC: 'Prélèvement Communautaire',
  CA: 'Contribution Africaine', BFU: 'BFU', DDI_FEE: 'Frais DDI',
  ACCONAGE: 'Acconage', BRANCHEMENT: 'Branchement', SURESTARIES: 'Surestaries',
  MANUTENTION: 'Manutention', PASSAGE_TERRE: 'Passage à terre', RELEVAGE: 'Relevage',
  SECURITE_TERMINAL: 'Sécurité terminal', DO_FEE: 'Frais DO',
  TRANSPORT: 'Transport', HONORAIRES: 'Honoraires', COMMISSION: 'Commission',
  ASSURANCE: 'Assurance', MAGASINAGE: 'Magasinage', SCANNER: 'Scanner',
  ESCORTE: 'Escorte', AUTRE: 'Autre',
};

// ============================================
// GET /api/export/shipment/:id/pdf
// ============================================

router.get('/shipment/:id/pdf', async (req: Request, res: Response) => {
  try {
    const shipment = await prisma.shipment.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
      include: {
        containers: true,
        documents: true,
        expenses: { orderBy: { createdAt: 'asc' } },
        createdBy: { select: { name: true } },
      },
    });

    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Dossier non trouvé' });
    }

    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId },
    });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=dossier-${shipment.trackingNumber}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text(company?.name || 'E-Trans', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Transit Maritime & Dédouanement', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica-Bold').text(`FICHE DOSSIER — ${shipment.trackingNumber}`, { align: 'center' });
    doc.moveDown();

    // Line
    doc.strokeColor('#333').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // Client info
    doc.fontSize(11).font('Helvetica-Bold').text('CLIENT');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Nom : ${shipment.clientName}`);
    if (shipment.clientNif) doc.text(`NIF : ${shipment.clientNif}`);
    if (shipment.clientPhone) doc.text(`Tél : ${shipment.clientPhone}`);
    doc.moveDown();

    // Marchandise
    doc.font('Helvetica-Bold').text('MARCHANDISE');
    doc.font('Helvetica');
    doc.text(`Description : ${shipment.description}`);
    if (shipment.hsCode) doc.text(`Code SH : ${shipment.hsCode}`);
    if (shipment.grossWeight) doc.text(`Poids brut : ${shipment.grossWeight} kg`);
    if (shipment.cifValueGnf) doc.text(`Valeur CIF : ${fmtGNF(shipment.cifValueGnf)}`);
    doc.moveDown();

    // Transport
    if (shipment.vesselName || shipment.blNumber) {
      doc.font('Helvetica-Bold').text('TRANSPORT');
      doc.font('Helvetica');
      if (shipment.blNumber) doc.text(`N° BL : ${shipment.blNumber}`);
      if (shipment.vesselName) doc.text(`Navire : ${shipment.vesselName}`);
      if (shipment.voyageNumber) doc.text(`Voyage : ${shipment.voyageNumber}`);
      if (shipment.portOfLoading) doc.text(`Port chargement : ${shipment.portOfLoading}`);
      if (shipment.portOfDischarge) doc.text(`Port déchargement : ${shipment.portOfDischarge}`);
      doc.moveDown();
    }

    // Containers
    if (shipment.containers.length > 0) {
      doc.font('Helvetica-Bold').text(`CONTENEURS (${shipment.containers.length})`);
      doc.font('Helvetica');
      shipment.containers.forEach(c => {
        doc.text(`  • ${c.number} — ${c.type}${c.sealNumber ? ` (Scellé: ${c.sealNumber})` : ''}`);
      });
      doc.moveDown();
    }

    // Douane
    if (shipment.customsRegime || shipment.totalDuties) {
      doc.font('Helvetica-Bold').text('DOUANE');
      doc.font('Helvetica');
      if (shipment.customsRegime) doc.text(`Régime : ${shipment.customsRegime}`);
      if (shipment.circuit) doc.text(`Circuit : ${shipment.circuit}`);
      if (shipment.declarationNumber) doc.text(`N° Déclaration : ${shipment.declarationNumber}`);
      if (shipment.dutyDD) doc.text(`DD : ${fmtGNF(shipment.dutyDD)}`);
      if (shipment.dutyRTL) doc.text(`RTL : ${fmtGNF(shipment.dutyRTL)}`);
      if (shipment.dutyTVA) doc.text(`TVA : ${fmtGNF(shipment.dutyTVA)}`);
      if (shipment.totalDuties) doc.text(`TOTAL DROITS : ${fmtGNF(shipment.totalDuties)}`);
      doc.moveDown();
    }

    // Finance summary
    if (shipment.expenses.length > 0) {
      // Check if we need a new page
      if (doc.y > 600) doc.addPage();

      doc.font('Helvetica-Bold').fontSize(11).text('ÉTAT FINANCIER');
      doc.fontSize(10).font('Helvetica');

      const provisions = shipment.expenses.filter(e => e.type === 'PROVISION');
      const disbursements = shipment.expenses.filter(e => e.type === 'DISBURSEMENT');
      const totalProv = provisions.reduce((s, e) => s + e.amount, 0);
      const totalDisb = disbursements.reduce((s, e) => s + e.amount, 0);

      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').text('Provisions :');
      doc.font('Helvetica');
      provisions.forEach(e => {
        doc.text(`  ${CATEGORY_LABELS[e.category] || e.category} — ${e.description} : ${fmtGNF(e.amount)}`);
      });
      doc.text(`  TOTAL PROVISIONS : ${fmtGNF(totalProv)}`);

      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').text('Débours :');
      doc.font('Helvetica');
      disbursements.forEach(e => {
        const paidLabel = e.paid ? ' ✓' : ' (non payé)';
        doc.text(`  ${CATEGORY_LABELS[e.category] || e.category} — ${e.description} : ${fmtGNF(e.amount)}${paidLabel}`);
      });
      doc.text(`  TOTAL DÉBOURS : ${fmtGNF(totalDisb)}`);

      doc.moveDown(0.3);
      doc.font('Helvetica-Bold');
      const balance = totalProv - totalDisb;
      doc.text(`SOLDE : ${fmtGNF(balance)}`, { align: 'right' });
      doc.font('Helvetica');
      doc.moveDown();
    }

    // Footer
    doc.moveDown(2);
    doc.strokeColor('#ccc').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(8).fillColor('#999');
    doc.text(
      `Généré le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} — E-Trans v2.2`,
      { align: 'center' }
    );
    doc.text(`Par : ${shipment.createdBy?.name || 'Système'}`, { align: 'center' });

    doc.end();

    log.audit('PDF exported', { userId: req.user!.id, shipmentId: shipment.id });
  } catch (error) {
    log.error('PDF export error', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la génération du PDF' });
  }
});

// ============================================
// GET /api/export/finance/summary/pdf
// ============================================

router.get('/finance/summary/pdf', async (req: Request, res: Response) => {
  try {
    const expenses = await prisma.expense.findMany({
      where: { shipment: { companyId: req.user!.companyId } },
      include: {
        shipment: { select: { trackingNumber: true, clientName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId },
    });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=releve-financier-${new Date().toISOString().split('T')[0]}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text(company?.name || 'E-Trans', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Relevé Financier', { align: 'center' });
    doc.moveDown();
    doc.strokeColor('#333').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // Summary
    const totalProv = expenses.filter(e => e.type === 'PROVISION').reduce((s, e) => s + e.amount, 0);
    const totalDisb = expenses.filter(e => e.type === 'DISBURSEMENT').reduce((s, e) => s + e.amount, 0);
    const unpaid = expenses.filter(e => e.type === 'DISBURSEMENT' && !e.paid).reduce((s, e) => s + e.amount, 0);

    doc.fontSize(11).font('Helvetica-Bold').text('RÉSUMÉ');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total provisions : ${fmtGNF(totalProv)}`);
    doc.text(`Total débours : ${fmtGNF(totalDisb)}`);
    doc.text(`Solde : ${fmtGNF(totalProv - totalDisb)}`);
    doc.text(`Débours non payés : ${fmtGNF(unpaid)}`);
    doc.moveDown();

    // Table
    doc.font('Helvetica-Bold').text('DÉTAIL DES TRANSACTIONS');
    doc.moveDown(0.3);

    // Table header
    const startX = 50;
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Date', startX, doc.y, { width: 60, continued: false });
    const headerY = doc.y - 10;
    doc.text('Dossier', startX + 65, headerY, { width: 70 });
    doc.text('Type', startX + 140, headerY, { width: 50 });
    doc.text('Description', startX + 195, headerY, { width: 170 });
    doc.text('Montant', startX + 370, headerY, { width: 80, align: 'right' });
    doc.text('Payé', startX + 455, headerY, { width: 40, align: 'center' });
    doc.moveDown(0.5);

    doc.strokeColor('#ddd').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica').fontSize(7);
    for (const exp of expenses.slice(0, 100)) {
      if (doc.y > 740) {
        doc.addPage();
        doc.fontSize(7);
      }

      const date = new Date(exp.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
      const rowY = doc.y;
      doc.text(date, startX, rowY, { width: 60 });
      doc.text(exp.shipment.trackingNumber, startX + 65, rowY, { width: 70 });
      doc.text(exp.type === 'PROVISION' ? 'Prov.' : 'Déb.', startX + 140, rowY, { width: 50 });
      doc.text(exp.description.substring(0, 40), startX + 195, rowY, { width: 170 });
      doc.text(fmtGNF(exp.amount), startX + 370, rowY, { width: 80, align: 'right' });
      doc.text(exp.paid ? '✓' : '—', startX + 455, rowY, { width: 40, align: 'center' });
      doc.moveDown(0.5);
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#999');
    doc.text(
      `Généré le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} — E-Trans v2.2`,
      { align: 'center' }
    );

    doc.end();
  } catch (error) {
    log.error('Finance PDF export error', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la génération du PDF' });
  }
});

export default router;
