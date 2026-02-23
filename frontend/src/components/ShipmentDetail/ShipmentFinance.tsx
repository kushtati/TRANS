// src/components/ShipmentDetail/ShipmentFinance.tsx

import React, { useState, useMemo, useRef } from 'react';
import { Plus, Wallet, CheckCircle2, Clock, Loader2, X, AlertCircle, AlertTriangle, Trash2, Zap, Download, CreditCard, ScanLine } from 'lucide-react';
import { api, ApiError, getAccessToken } from '../../lib/api';
import type { Shipment, ExpenseType, ExpenseCategory } from '../../types';

interface ShipmentFinanceProps {
  shipment: Shipment;
  onRefresh: () => void;
}

const categoryLabels: Record<ExpenseCategory, string> = {
  DD: 'Droit de Douane',
  TVA: 'TVA',
  RTL: 'RTL',
  PC: 'PC',
  CA: 'CA',
  BFU: 'BFU',
  DDI_FEE: 'Frais DDI',
  ACCONAGE: 'Acconage',
  BRANCHEMENT: 'Branchement',
  SURESTARIES: 'Surestaries',
  MANUTENTION: 'Manutention',
  PASSAGE_TERRE: 'Passage à terre',
  RELEVAGE: 'Relevage',
  SECURITE_TERMINAL: 'Sécurité terminal',
  DO_FEE: 'Frais DO',
  SEAWAY_BILL: 'Seaway Bill',
  MANIFEST_FEE: 'Frais manifeste',
  CONTAINER_DAMAGE: 'Dommage conteneur',
  SECURITE_MSC: 'Sécurité MSC',
  SURCHARGE: 'Surcharge',
  PAC: 'PAC',
  ADP_FEE: 'Frais ADP',
  TRANSPORT: 'Transport',
  TRANSPORT_ADD: 'Transport complémentaire',
  HONORAIRES: 'Honoraires',
  COMMISSION: 'Commission',
  ASSURANCE: 'Assurance',
  MAGASINAGE: 'Magasinage',
  SCANNER: 'Scanner',
  ESCORTE: 'Escorte',
  AUTRE: 'Autre',
};

const categoryGroups = {
  'Douane': ['DD', 'TVA', 'RTL', 'PC', 'CA', 'BFU', 'DDI_FEE'],
  'Terminal': ['ACCONAGE', 'BRANCHEMENT', 'SURESTARIES', 'MANUTENTION', 'PASSAGE_TERRE', 'RELEVAGE', 'SECURITE_TERMINAL'],
  'Armateur': ['DO_FEE', 'SEAWAY_BILL', 'MANIFEST_FEE', 'CONTAINER_DAMAGE', 'SECURITE_MSC', 'SURCHARGE', 'PAC', 'ADP_FEE'],
  'Transport': ['TRANSPORT', 'TRANSPORT_ADD'],
  'Honoraires': ['HONORAIRES', 'COMMISSION'],
  'Autres': ['ASSURANCE', 'MAGASINAGE', 'SCANNER', 'ESCORTE', 'AUTRE'],
};

export const ShipmentFinance: React.FC<ShipmentFinanceProps> = ({ shipment, onRefresh }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showPrefillModal, setShowPrefillModal] = useState(false);
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [prefillItems, setPrefillItems] = useState<Array<{ category: ExpenseCategory; description: string; amount: number; reference: string; selected: boolean }>>([]);
  const [isPayingAll, setIsPayingAll] = useState(false);
  const [showPayAllConfirm, setShowPayAllConfirm] = useState(false);
  const [statusAdvanceMsg, setStatusAdvanceMsg] = useState('');

  const [newExpense, setNewExpense] = useState({
    type: 'DISBURSEMENT' as ExpenseType,
    category: 'AUTRE' as ExpenseCategory,
    description: '',
    amount: '',
    reference: '',
  });

  // ==========================================
  // Pre-fill typical expenses based on dossier
  // ==========================================
  const generateTypicalExpenses = () => {
    const items: Array<{ category: ExpenseCategory; description: string; amount: number; reference: string; selected: boolean }> = [];
    const containers = shipment.containers || [];
    const nbContainers = containers.length || 1;

    // ===== 1. DOUANE: Use actual duty values if available =====
    if (shipment.dutyDD && shipment.dutyDD > 0) {
      items.push({ category: 'DD', description: 'Droit de Douane', amount: shipment.dutyDD, reference: shipment.quittanceNumber || '', selected: true });
    }
    if (shipment.dutyTVA && shipment.dutyTVA > 0) {
      items.push({ category: 'TVA', description: 'TVA', amount: shipment.dutyTVA, reference: shipment.quittanceNumber || '', selected: true });
    }
    if (shipment.dutyRTL && shipment.dutyRTL > 0) {
      items.push({ category: 'RTL', description: 'RTL', amount: shipment.dutyRTL, reference: shipment.quittanceNumber || '', selected: true });
    }
    if (shipment.dutyPC && shipment.dutyPC > 0) {
      items.push({ category: 'PC', description: 'Prélèvement Communautaire', amount: shipment.dutyPC, reference: shipment.quittanceNumber || '', selected: true });
    }
    if (shipment.dutyCA && shipment.dutyCA > 0) {
      items.push({ category: 'CA', description: 'Centime Additionnel', amount: shipment.dutyCA, reference: shipment.quittanceNumber || '', selected: true });
    }
    if (shipment.dutyBFU && shipment.dutyBFU > 0) {
      items.push({ category: 'BFU', description: 'Bordereau de Frais Unique', amount: shipment.dutyBFU, reference: shipment.quittanceNumber || '', selected: true });
    }

    // If no duties filled yet, add placeholder with totalDuties
    if (items.length === 0 && shipment.totalDuties && shipment.totalDuties > 0) {
      items.push({ category: 'DD', description: 'Droits et Taxes (total)', amount: shipment.totalDuties, reference: '', selected: true });
    }

    // DDI Fee
    if (shipment.ddiNumber) {
      items.push({ category: 'DDI_FEE', description: 'Frais DDI', amount: 0, reference: `DDI ${shipment.ddiNumber}`, selected: true });
    }

    // ===== 2. TERMINAL (Conakry Terminal / Bolloré) =====
    // Tarifs basés sur dossier réel — par conteneur
    containers.forEach((c, idx) => {
      const prefix = nbContainers > 1 ? `TC${idx + 1} ` : '';
      const is40 = c.type?.includes('40');
      const isReefer = c.type?.includes('REEFER');

      // Acconage: ~1.2M (20') / ~1.75M (40' reefer)
      const acconage = is40 ? (isReefer ? 1750000 : 1350000) : (isReefer ? 1200000 : 900000);
      items.push({ category: 'ACCONAGE', description: `${prefix}Acconage ${is40 ? "40'" : "20'"} ${isReefer ? 'Frigo' : 'Dry'}`, amount: acconage, reference: '', selected: true });

      // Branchement (reefer only) — ~347K/jour × jours estimés
      if (isReefer) {
        const dailyRate = is40 ? 347000 : 250000;
        const days = 6; // estimate
        items.push({ category: 'BRANCHEMENT', description: `${prefix}Branchement Frigo (${days}j)`, amount: dailyRate * days, reference: '', selected: true });
      }

      // Manutention vide: ~320K (40') / ~220K (20')
      items.push({ category: 'MANUTENTION', description: `${prefix}Manutention ${is40 ? "40'" : "20'"} Vide`, amount: is40 ? 320000 : 220000, reference: '', selected: true });

      // Passage à terre: ~615K (40') / ~420K (20')
      items.push({ category: 'PASSAGE_TERRE', description: `${prefix}Passage Terre Plein ${is40 ? "40'" : "20'"}`, amount: is40 ? 615000 : 420000, reference: '', selected: true });

      // Sécurité Terminal: ~175K (40') / ~130K (20')
      items.push({ category: 'SECURITE_TERMINAL', description: `${prefix}Redevance Sécurité ${is40 ? "40'" : "20'"}`, amount: is40 ? 175000 : 130000, reference: '', selected: true });

      // Relevage: ~447K (40') / ~310K (20')
      items.push({ category: 'RELEVAGE', description: `${prefix}Relevage ${is40 ? "40'" : "20'"} Plein`, amount: is40 ? 447000 : 310000, reference: '', selected: true });
    });

    // ===== 3. ARMATEUR (CMA CGM / MSC / ...) =====
    // Frais de dossier import: ~273K (fixe)
    items.push({ category: 'DO_FEE', description: 'Frais de dossier import', amount: 273000, reference: '', selected: true });

    // Gestion manifeste: ~482K × nb TC
    items.push({ category: 'MANIFEST_FEE', description: `Gestion manifeste (${nbContainers} TC)`, amount: 482000 * nbContainers, reference: '', selected: true });

    // Bon à enlever: ~897K × nb TC
    items.push({ category: 'DO_FEE', description: `Bon à enlever (${nbContainers} TC)`, amount: 897000 * nbContainers, reference: '', selected: true });

    // Dommage conteneur: ~142K × nb TC
    items.push({ category: 'CONTAINER_DAMAGE', description: `Damage fees (${nbContainers} TC)`, amount: 142000 * nbContainers, reference: '', selected: false });

    // Sécurité armateur: ~275K × nb TC
    items.push({ category: 'SECURITE_MSC', description: `Redevance sécurité (${nbContainers} TC)`, amount: 275000 * nbContainers, reference: '', selected: true });

    // Surcharge Opération: ~750K × nb TC
    items.push({ category: 'SURCHARGE', description: `Surcharge opération (${nbContainers} TC)`, amount: 750000 * nbContainers, reference: '', selected: true });

    // PAC / Redevance marchandises: ~221K × TEU (40' = 2 TEU)
    const totalTEU = containers.reduce((s, c) => s + (c.type?.includes('40') ? 2 : 1), 0) || 2;
    items.push({ category: 'PAC', description: `Redevance marchandises (${totalTEU} TEU)`, amount: 221000 * totalTEU, reference: '', selected: true });

    // ===== 4. SCANNER =====
    items.push({ category: 'SCANNER', description: 'Frais circuit / scanner', amount: 2000000, reference: '', selected: true });

    // ===== 5. TRANSPORT =====
    items.push({ category: 'TRANSPORT', description: `Transport (${nbContainers} TC)`, amount: 5500000 * nbContainers, reference: '', selected: true });

    // ===== 6. HONORAIRES =====
    items.push({ category: 'HONORAIRES', description: `Honoraires transit (${nbContainers} TC)`, amount: 1500000 * nbContainers, reference: '', selected: true });

    // ===== 7. DIVERS =====
    items.push({ category: 'AUTRE', description: 'Frais Orange Money / paiement', amount: 200000, reference: '', selected: false });

    setPrefillItems(items);
    setShowPrefillModal(true);
  };

  const handlePrefillSubmit = async () => {
    const selected = prefillItems.filter(i => i.selected && i.amount > 0);
    if (selected.length === 0) return;
    setIsPrefilling(true);
    try {
      for (const item of selected) {
        await api.post('/finance/expenses', {
          shipmentId: shipment.id,
          type: 'DISBURSEMENT' as ExpenseType,
          category: item.category,
          description: item.description,
          amount: item.amount,
          reference: item.reference || undefined,
        });
      }
      setShowPrefillModal(false);
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setIsPrefilling(false);
    }
  };

  // Calculate totals
  const { totalProvisions, totalDisbursements, paidDisbursements, unpaidDisbursements, balance } = useMemo(() => {
    let provisions = 0;
    let disbursements = 0;
    let paid = 0;

    shipment.expenses?.forEach(e => {
      if (e.type === 'PROVISION') {
        provisions += e.amount;
      } else {
        disbursements += e.amount;
        if (e.paid) paid += e.amount;
      }
    });

    return {
      totalProvisions: provisions,
      totalDisbursements: disbursements,
      paidDisbursements: paid,
      unpaidDisbursements: disbursements - paid,
      balance: provisions - paid,
    };
  }, [shipment.expenses]);

  const formatAmount = (amount: number) => amount.toLocaleString('fr-FR');

  const handleAddExpense = async () => {
    if (!newExpense.description.trim() || !newExpense.amount) {
      setError('Description et montant requis');
      return;
    }

    setIsAdding(true);
    setError('');

    try {
      await api.post('/finance/expenses', {
        shipmentId: shipment.id,
        type: newExpense.type,
        category: newExpense.category,
        description: newExpense.description.trim(),
        amount: parseFloat(newExpense.amount),
        reference: newExpense.reference.trim() || undefined,
      });

      setShowAddModal(false);
      setNewExpense({ type: 'DISBURSEMENT', category: 'AUTRE', description: '', amount: '', reference: '' });
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleMarkPaid = async (expenseId: string) => {
    setPayingId(expenseId);
    try {
      const res = await api.post<{ expense: any; statusAdvanced?: { advanced: boolean; newStatus?: string } }>(`/finance/expenses/${expenseId}/pay`);
      if (res.data?.statusAdvanced?.advanced) {
        const label = res.data.statusAdvanced.newStatus === 'TERMINAL_PAID' ? 'Terminal payé' : res.data.statusAdvanced.newStatus;
        setStatusAdvanceMsg(`✅ Statut avancé automatiquement → ${label}`);
        setTimeout(() => setStatusAdvanceMsg(''), 5000);
      }
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setPayingId(null);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    setDeletingId(expenseId);
    try {
      await api.delete(`/finance/expenses/${expenseId}`);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const handlePayAll = async () => {
    setIsPayingAll(true);
    setShowPayAllConfirm(false);
    try {
      const res = await api.post<{ paidCount: number; totalPaid: number; statusAdvanced?: { advanced: boolean; newStatus?: string } }>('/finance/expenses/pay-all', { shipmentId: shipment.id });
      if (res.data?.statusAdvanced?.advanced) {
        const label = res.data.statusAdvanced.newStatus === 'TERMINAL_PAID' ? 'Terminal payé' : res.data.statusAdvanced.newStatus;
        setStatusAdvanceMsg(`✅ Statut avancé automatiquement → ${label}`);
        setTimeout(() => setStatusAdvanceMsg(''), 5000);
      }
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsPayingAll(false);
    }
  };



  // === OCR Scan-to-Invoice ===
  const [isScanning, setIsScanning] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const handleScanToInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    if (scanInputRef.current) scanInputRef.current.value = '';

    setIsScanning(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const headers: Record<string, string> = {};
      const token = getAccessToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/ocr/scan-to-invoice`,
        { method: 'POST', headers, body: formData, credentials: 'include' }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Erreur OCR');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-scan-${shipment.trackingNumber || shipment.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Scan-to-invoice error:', err);
      alert(err instanceof Error ? err.message : 'Erreur lors du scan');
    } finally {
      setIsScanning(false);
    }
  };

  const provisions = shipment.expenses?.filter(e => e.type === 'PROVISION') || [];
  const disbursements = shipment.expenses?.filter(e => e.type === 'DISBURSEMENT') || [];

  // Group disbursements by category group
  const groupedDisbursements = useMemo(() => {
    const groups: Record<string, typeof disbursements> = {};
    
    Object.entries(categoryGroups).forEach(([groupName, categories]) => {
      const items = disbursements.filter(d => categories.includes(d.category));
      if (items.length > 0) {
        groups[groupName] = items;
      }
    });

    return groups;
  }, [disbursements]);

  return (
    <div className="space-y-4">
      {/* Status advance notification */}
      {statusAdvanceMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 font-medium animate-fade-in">
          {statusAdvanceMsg}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Provisions" amount={totalProvisions} color="green" />
        <SummaryCard label="Total débours" amount={totalDisbursements} color="orange" />
        <SummaryCard label="Payés" amount={paidDisbursements} color="blue" />
        <SummaryCard 
          label="Solde" 
          amount={balance} 
          color={balance >= 0 ? 'green' : 'red'} 
          highlight 
        />
      </div>

      {/* Alerts */}
      {balance < 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700">
          <AlertTriangle size={18} />
          <span className="text-sm font-medium">Solde négatif : {formatAmount(Math.abs(balance))} GNF de découvert</span>
        </div>
      )}

      {unpaidDisbursements > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-700">
          <Clock size={18} />
          <span className="text-sm">{formatAmount(unpaidDisbursements)} GNF de débours en attente de paiement</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Pay All - shown when there are unpaid disbursements */}
        {unpaidDisbursements > 0 && (
          <button
            onClick={() => setShowPayAllConfirm(true)}
            disabled={isPayingAll}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isPayingAll ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
            Payer tous les frais
          </button>
        )}

        {shipment.expenses && shipment.expenses.length > 0 && (
          <button
            onClick={() => api.downloadFile(`/export/shipment/${shipment.id}/facture`, `facture-${shipment.trackingNumber || shipment.id}.pdf`)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-900 transition-colors shadow-sm"
          >
            <Download size={16} />
            Télécharger la facture
          </button>
        )}

        {/* OCR Scan-to-Invoice */}
        <input
          ref={scanInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff,.gif"
          onChange={handleScanToInvoice}
          className="hidden"
        />
        <button
          onClick={() => scanInputRef.current?.click()}
          disabled={isScanning}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {isScanning ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16} />}
          {isScanning ? 'Scan en cours...' : 'Scanner une facture'}
        </button>

        <div className="flex-1" />

        {(!shipment.expenses || shipment.expenses.filter(e => e.type === 'DISBURSEMENT').length === 0) && (
          <button
            onClick={generateTypicalExpenses}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600"
          >
            <Zap size={16} />
            Pré-remplir débours
          </button>
        )}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      {/* Provisions */}
      {provisions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-green-50 border-b border-green-100 flex items-center justify-between">
            <span className="font-medium text-green-800">Provisions</span>
            <span className="text-green-600 font-semibold">{formatAmount(totalProvisions)} GNF</span>
          </div>
          <div className="divide-y divide-slate-100">
            {provisions.map(p => (
              <div key={p.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{p.description}</p>
                  {p.reference && <p className="text-xs text-slate-500">Réf: {p.reference}</p>}
                </div>
                <span className="font-semibold text-green-600">+{formatAmount(p.amount)} GNF</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disbursements by Group */}
      {Object.entries(groupedDisbursements).map(([groupName, items]) => {
        const groupTotal = items.reduce((sum, i) => sum + i.amount, 0);
        
        return (
          <div key={groupName} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-medium text-slate-700">{groupName}</span>
              <span className="text-slate-600 font-semibold">{formatAmount(groupTotal)} GNF</span>
            </div>
            <div className="divide-y divide-slate-100">
              {items.map(expense => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  onMarkPaid={() => handleMarkPaid(expense.id)}
                  onDelete={() => handleDeleteExpense(expense.id)}
                  isPaying={payingId === expense.id}
                  isDeleting={deletingId === expense.id}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {(!shipment.expenses || shipment.expenses.length === 0) && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Wallet className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500">Aucune opération financière</p>
        </div>
      )}

      {/* Recap */}
      {shipment.expenses && shipment.expenses.length > 0 && (
        <div className="bg-slate-900 rounded-xl p-4 text-white">
          <h4 className="font-medium mb-3">Récapitulatif</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Total provisions</span>
              <span className="text-green-400">+{formatAmount(totalProvisions)} GNF</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Débours payés</span>
              <span className="text-red-400">-{formatAmount(paidDisbursements)} GNF</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Débours en attente</span>
              <span className="text-amber-400">{formatAmount(unpaidDisbursements)} GNF</span>
            </div>
            <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between font-semibold">
              <span>Solde disponible</span>
              <span className={balance >= 0 ? 'text-green-400' : 'text-red-400'}>
                {formatAmount(balance)} GNF
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Ajouter une opération</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Type</label>
                <div className="flex gap-2">
                  {(['PROVISION', 'DISBURSEMENT'] as ExpenseType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setNewExpense(prev => ({ ...prev, type }))}
                      className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                        newExpense.type === type
                          ? type === 'PROVISION' ? 'bg-green-600 text-white' : 'bg-orange-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {type === 'PROVISION' ? 'Provision' : 'Débours'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">Catégorie</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value as ExpenseCategory }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
                >
                  {Object.entries(categoryGroups).map(([group, cats]) => (
                    <optgroup key={group} label={group}>
                      {cats.map(cat => (
                        <option key={cat} value={cat}>{categoryLabels[cat as ExpenseCategory]}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">Description *</label>
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex: Avance client"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">Montant (GNF) *</label>
                <input
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="150000000"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">Référence</label>
                <input
                  type="text"
                  value={newExpense.reference}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="Optionnel"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleAddExpense}
                disabled={isAdding}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isAdding && <Loader2 size={18} className="animate-spin" />}
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prefill Modal */}
      {showPrefillModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Zap size={20} className="text-amber-500" />
                  Pré-remplir les débours
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Basé sur {shipment.containers?.length || 1} conteneur(s) — montants estimés modifiables
                </p>
              </div>
              <button onClick={() => setShowPrefillModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {Object.entries(categoryGroups).map(([groupName, cats]) => {
                const groupItems = prefillItems.filter(i => (cats as string[]).includes(i.category));
                if (groupItems.length === 0) return null;
                const groupTotal = groupItems.filter(i => i.selected).reduce((s, i) => s + i.amount, 0);
                return (
                  <div key={groupName} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{groupName}</span>
                      <span className="text-xs font-semibold text-slate-600">{groupTotal.toLocaleString('fr-FR')} GNF</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {groupItems.map((item) => {
                        const globalIdx = prefillItems.indexOf(item);
                        return (
                          <div key={globalIdx} className="flex items-center gap-3 px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => {
                                setPrefillItems(prev => prev.map((p, i) => i === globalIdx ? { ...p, selected: !p.selected } : p));
                              }}
                              className="w-4 h-4 text-blue-600 rounded shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-800 truncate">{item.description}</p>
                            </div>
                            <input
                              type="number"
                              value={item.amount || ''}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setPrefillItems(prev => prev.map((p, i) => i === globalIdx ? { ...p, amount: val } : p));
                              }}
                              className="w-28 text-right text-sm border border-slate-300 rounded-lg px-2 py-1.5"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">
                  {prefillItems.filter(i => i.selected && i.amount > 0).length} lignes sélectionnées
                </span>
                <span className="font-bold text-slate-900">
                  {prefillItems.filter(i => i.selected).reduce((s, i) => s + i.amount, 0).toLocaleString('fr-FR')} GNF
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPrefillModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handlePrefillSubmit}
                  disabled={isPrefilling || prefillItems.filter(i => i.selected && i.amount > 0).length === 0}
                  className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl font-medium disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isPrefilling ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                  {isPrefilling ? 'Création...' : 'Créer les débours'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pay All Confirmation Modal */}
      {showPayAllConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPayAllConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CreditCard size={24} className="text-green-600" />
              </div>
              <h3 className="font-semibold text-lg text-slate-900">Payer tous les frais</h3>
              <p className="text-sm text-slate-500 mt-1">
                Confirmer le paiement de tous les débours en attente ?
              </p>
            </div>

            <div className="bg-green-50 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Débours en attente</span>
                <span className="font-bold text-slate-900">
                  {disbursements.filter(d => !d.paid).length} ligne(s)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Montant total</span>
                <span className="font-bold text-green-700">
                  {formatAmount(unpaidDisbursements)} GNF
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPayAllConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handlePayAll}
                disabled={isPayingAll}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {isPayingAll ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Sub-components
const SummaryCard: React.FC<{ label: string; amount: number; color: string; highlight?: boolean }> = ({
  label, amount, color, highlight
}) => {
  const colors: Record<string, string> = {
    green: 'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div className={`rounded-xl p-3 border ${highlight ? 'ring-2 ring-offset-2' : ''} ${colors[color]} ${highlight ? `ring-${color}-500` : ''}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className={`font-bold ${highlight ? 'text-lg' : ''}`}>{amount.toLocaleString('fr-FR')} GNF</p>
    </div>
  );
};

const ExpenseRow: React.FC<{ 
  expense: Shipment['expenses'][0]; 
  onMarkPaid: () => void;
  onDelete: () => void;
  isPaying: boolean;
  isDeleting: boolean;
}> = ({ expense, onMarkPaid, onDelete, isPaying, isDeleting }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-slate-900 text-sm">{expense.description}</span>
              {expense.paid ? (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center gap-1 shrink-0">
                  <CheckCircle2 size={12} />
                  Payé
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium flex items-center gap-1 shrink-0">
                  <Clock size={12} />
                  En attente
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
              <span>{categoryLabels[expense.category]}</span>
              {expense.reference && <span>Réf: {expense.reference}</span>}
              {expense.paidAt && <span>Payé le {new Date(expense.paidAt).toLocaleDateString('fr-FR')}</span>}
            </div>
          </div>

          <span className="font-semibold text-slate-900 text-sm whitespace-nowrap">
            {expense.amount.toLocaleString('fr-FR')} GNF
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3">
          {!expense.paid && (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={isPaying}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isPaying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Payer
            </button>
          )}
          {!expense.paid && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Supprimer
            </button>
          )}
          {expense.paid && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 size={14} />
              Payé {expense.paidAt && `le ${new Date(expense.paidAt).toLocaleDateString('fr-FR')}`}
            </span>
          )}
        </div>
      </div>

      {/* Confirmation paiement */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Wallet size={24} className="text-green-600" />
              </div>
              <h3 className="font-semibold text-lg text-slate-900">Confirmer le paiement</h3>
              <p className="text-sm text-slate-500 mt-1">
                Voulez-vous confirmer le paiement de ce débours ?
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Description</span>
                <span className="font-medium text-slate-800">{expense.description}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Catégorie</span>
                <span className="text-slate-700">{categoryLabels[expense.category]}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Montant</span>
                <span className="font-bold text-green-700">{expense.amount.toLocaleString('fr-FR')} GNF</span>
              </div>
              {expense.reference && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Référence</span>
                  <span className="text-slate-700">{expense.reference}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  onMarkPaid();
                }}
                disabled={isPaying}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {isPaying ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <h3 className="font-semibold text-lg text-slate-900">Supprimer le débours</h3>
              <p className="text-sm text-slate-500 mt-1">
                Cette action est irréversible.
              </p>
            </div>

            <div className="bg-red-50 rounded-xl p-3 mb-4 text-center">
              <p className="text-sm font-medium text-red-800">{expense.description}</p>
              <p className="text-lg font-bold text-red-700 mt-1">{expense.amount.toLocaleString('fr-FR')} GNF</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete();
                }}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShipmentFinance;
