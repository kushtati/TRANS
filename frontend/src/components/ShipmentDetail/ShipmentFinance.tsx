// src/components/ShipmentDetail/ShipmentFinance.tsx

import React, { useState, useMemo } from 'react';
import { Plus, Wallet, CheckCircle2, Clock, Loader2, X, AlertCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
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

  const [newExpense, setNewExpense] = useState({
    type: 'DISBURSEMENT' as ExpenseType,
    category: 'AUTRE' as ExpenseCategory,
    description: '',
    amount: '',
    reference: '',
  });

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
      await api.post(`/finance/expenses/${expenseId}/pay`);
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

      {/* Add Button */}
      <div className="flex justify-end">
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
