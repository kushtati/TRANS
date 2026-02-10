// src/pages/AccountingView.tsx

import React, { useState, useEffect } from 'react';
import {
  PieChart, TrendingUp, TrendingDown, DollarSign,
  Loader2, AlertCircle, Filter, ChevronDown,
  CheckCircle2, Clock, FileText,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { formatGNF, formatDate } from '../utils/format';
import { useToast } from '../components/ui/Toast';

interface FinanceSummary {
  totalProvisions: number;
  totalDisbursements: number;
  paidDisbursements: number;
  unpaidDisbursements: number;
  balance: number;
  totalBalance: number;
  provisionCount: number;
  disbursementCount: number;
  unpaidCount: number;
}

interface ExpenseItem {
  id: string;
  type: 'PROVISION' | 'DISBURSEMENT';
  category: string;
  description: string;
  amount: number;
  paid: boolean;
  paidAt?: string;
  createdAt: string;
  shipment: {
    id: string;
    trackingNumber: string;
    clientName: string;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  DD: 'Droit de Douane', TVA: 'TVA', RTL: 'RTL', PC: 'Prélèvement Communautaire',
  CA: 'Contribution Africaine', BFU: 'BFU', DDI_FEE: 'Frais DDI',
  ACCONAGE: 'Acconage', BRANCHEMENT: 'Branchement', SURESTARIES: 'Surestaries',
  MANUTENTION: 'Manutention', PASSAGE_TERRE: 'Passage à terre', RELEVAGE: 'Relevage',
  SECURITE_TERMINAL: 'Sécurité terminal', DO_FEE: 'Frais DO', SEAWAY_BILL: 'Seaway Bill',
  MANIFEST_FEE: 'Frais manifeste', CONTAINER_DAMAGE: 'Dégâts conteneur',
  SECURITE_MSC: 'Sécurité MSC', SURCHARGE: 'Surcharge', PAC: 'PAC', ADP_FEE: 'Frais ADP',
  TRANSPORT: 'Transport', TRANSPORT_ADD: 'Transport suppl.', HONORAIRES: 'Honoraires',
  COMMISSION: 'Commission', ASSURANCE: 'Assurance', MAGASINAGE: 'Magasinage',
  SCANNER: 'Scanner', ESCORTE: 'Escorte', AUTRE: 'Autre',
};

export const AccountingView: React.FC = () => {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'PROVISION' | 'DISBURSEMENT' | 'unpaid'>('all');
  const [showFilter, setShowFilter] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [summaryRes, expensesRes] = await Promise.all([
        api.get<{ summary: FinanceSummary }>('/finance/summary'),
        api.get<{ expenses: ExpenseItem[] }>('/finance/expenses?limit=50'),
      ]);

      if (summaryRes.data?.summary) setSummary(summaryRes.data.summary);
      if (expensesRes.data?.expenses) setExpenses(expensesRes.data.expenses);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkPaid = async (expenseId: string) => {
    try {
      await api.post(`/finance/expenses/${expenseId}/pay`);
      toast.success('Débours marqué comme payé');
      loadData();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erreur');
    }
  };

  const filteredExpenses = expenses.filter(e => {
    if (filter === 'all') return true;
    if (filter === 'unpaid') return !e.paid && e.type === 'DISBURSEMENT';
    return e.type === filter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
        <p className="text-slate-600">{error}</p>
        <button onClick={loadData} className="mt-3 text-blue-600 text-sm font-medium">
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <PieChart size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="font-semibold text-slate-800">Finance</h1>
          <p className="text-xs text-slate-500">Vue d'ensemble financière</p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <SummaryCard
            label="Provisions"
            value={summary.totalProvisions}
            icon={<TrendingUp size={18} className="text-green-500" />}
            count={summary.provisionCount}
            color="green"
          />
          <SummaryCard
            label="Débours"
            value={summary.totalDisbursements}
            icon={<TrendingDown size={18} className="text-red-500" />}
            count={summary.disbursementCount}
            color="red"
          />
          <SummaryCard
            label="Solde"
            value={summary.totalBalance}
            icon={<DollarSign size={18} className={summary.totalBalance >= 0 ? 'text-green-500' : 'text-red-500'} />}
            color={summary.totalBalance >= 0 ? 'green' : 'red'}
          />
          <SummaryCard
            label="Non payés"
            value={summary.unpaidDisbursements}
            icon={<Clock size={18} className="text-amber-500" />}
            count={summary.unpaidCount}
            color="amber"
          />
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-slate-700">Transactions récentes</h2>
        <div className="relative">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="flex items-center gap-1 text-sm text-slate-500 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50"
          >
            <Filter size={14} />
            {filter === 'all' ? 'Tous' : filter === 'unpaid' ? 'Non payés' : filter === 'PROVISION' ? 'Provisions' : 'Débours'}
            <ChevronDown size={14} />
          </button>
          {showFilter && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFilter(false)} />
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-[140px]">
                {(['all', 'PROVISION', 'DISBURSEMENT', 'unpaid'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => { setFilter(f); setShowFilter(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${filter === f ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}
                  >
                    {f === 'all' ? 'Tous' : f === 'unpaid' ? 'Non payés' : f === 'PROVISION' ? 'Provisions' : 'Débours'}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expenses List */}
      <div className="space-y-2">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Aucune transaction</p>
          </div>
        ) : (
          filteredExpenses.map(expense => (
            <div
              key={expense.id}
              className="bg-white border border-slate-200 rounded-xl p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      expense.type === 'PROVISION'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {expense.type === 'PROVISION' ? 'Provision' : 'Débours'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {CATEGORY_LABELS[expense.category] || expense.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 truncate">{expense.description}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {expense.shipment.trackingNumber} · {expense.shipment.clientName}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className={`font-semibold text-sm ${
                    expense.type === 'PROVISION' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {expense.type === 'PROVISION' ? '+' : '-'}{formatGNF(expense.amount, { showCurrency: false })}
                  </p>
                  <p className="text-xs text-slate-400">{formatDate(expense.createdAt)}</p>
                </div>
              </div>

              {/* Pay button for unpaid disbursements */}
              {expense.type === 'DISBURSEMENT' && !expense.paid && (
                <button
                  onClick={() => handleMarkPaid(expense.id)}
                  className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  <CheckCircle2 size={14} />
                  Marquer comme payé
                </button>
              )}
              {expense.paid && (
                <p className="mt-1 text-xs text-green-500 flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Payé {expense.paidAt ? `le ${formatDate(expense.paidAt)}` : ''}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const SummaryCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  count?: number;
  color: string;
}> = ({ label, value, icon, count }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-3">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-xs text-slate-500">{label}</span>
    </div>
    <p className="font-bold text-lg text-slate-800">{formatGNF(value, { compact: true })}</p>
    {count !== undefined && (
      <p className="text-xs text-slate-400">{count} transaction{count > 1 ? 's' : ''}</p>
    )}
  </div>
);
