// src/pages/CalculatorView.tsx

import React, { useState } from 'react';
import { Calculator, Loader2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { formatGNF } from '../utils/format';

interface DutyResult {
  cifValueGnf: number;
  dd: number;
  rtl: number;
  tva: number;
  pc: number;
  ca: number;
  bfu: number;
  total: number;
  details?: string;
}

const REGIMES = [
  { value: 'IM4', label: 'IM4 — Mise à la consommation' },
  { value: 'IM5', label: 'IM5 — Admission temporaire' },
  { value: 'IM7', label: 'IM7 — Mise en entrepôt' },
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CNY'];

export const CalculatorView: React.FC = () => {
  const [cifValue, setCifValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState('');
  const [hsCode, setHsCode] = useState('');
  const [regime, setRegime] = useState('IM4');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DutyResult | null>(null);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const handleCalculate = async () => {
    const cif = parseFloat(cifValue);
    const rate = parseFloat(exchangeRate);

    if (!cif || cif <= 0) {
      setError('Saisissez une valeur CIF valide');
      return;
    }
    if (!rate || rate <= 0) {
      setError('Saisissez un taux de change valide');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await api.post<DutyResult>('/ai/calculate-duties', {
        cifValue: cif,
        currency,
        exchangeRate: rate,
        hsCode: hsCode || undefined,
        regime,
        description: description || undefined,
      });

      if (response.data) {
        setResult(response.data);
      }
    } catch (err) {
      const cifGnf = Math.round(cif * rate);
      // Fallback local calculation (standard IM4 rates)
      const dd = Math.round(cifGnf * 0.35);
      const rtl = Math.round(cifGnf * 0.02);
      const baseForTVA = cifGnf + dd + rtl;
      const tva = Math.round(baseForTVA * 0.18);
      const pc = Math.round(cifGnf * 0.005);
      const ca = 0;
      const bfu = Math.round(cifGnf * 0.005);
      const total = dd + rtl + tva + pc + ca + bfu;

      setResult({
        cifValueGnf: cifGnf,
        dd, rtl, tva, pc, ca, bfu, total,
        details: '⚠️ Calcul local (taux standard IM4). Connectez-vous pour un calcul IA plus précis.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCifValue('');
    setExchangeRate('');
    setHsCode('');
    setDescription('');
    setRegime('IM4');
    setCurrency('USD');
    setResult(null);
    setError('');
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
          <Calculator size={20} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="font-semibold text-slate-800">Calculateur de droits</h1>
          <p className="text-xs text-slate-500">Estimation des droits et taxes à l'importation</p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4 bg-white rounded-2xl border border-slate-200 p-4">
        {/* CIF + Currency */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Valeur CIF</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={cifValue}
              onChange={(e) => setCifValue(e.target.value)}
              placeholder="Ex: 25000"
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white"
            >
              {CURRENCIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Exchange Rate */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Taux de change (1 {currency} = ? GNF)
          </label>
          <input
            type="number"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
            placeholder={currency === 'USD' ? 'Ex: 8600' : 'Ex: 9400'}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Regime */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Régime douanier</label>
          <select
            value={regime}
            onChange={(e) => setRegime(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white"
          >
            {REGIMES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Optional fields */}
        <div>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Options avancées
          </button>

          {showDetails && (
            <div className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Code SH (optionnel)</label>
                <input
                  type="text"
                  value={hsCode}
                  onChange={(e) => setHsCode(e.target.value)}
                  placeholder="Ex: 8471.30"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description (optionnel)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Ordinateurs portables"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleCalculate}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl py-3 font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Calculator size={18} />
            )}
            Calculer
          </button>
          <button
            onClick={handleReset}
            className="p-3 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="mt-4 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
            <h3 className="font-semibold text-emerald-800">Résultat du calcul</h3>
            <p className="text-xs text-emerald-600">
              Base CIF : {formatGNF(result.cifValueGnf)}
            </p>
          </div>

          <div className="p-4 space-y-2">
            <ResultRow label="Droit de Douane (DD)" value={result.dd} rate="35%" />
            <ResultRow label="Redevance Traitement Liquidation (RTL)" value={result.rtl} rate="2%" />
            <ResultRow label="TVA" value={result.tva} rate="18%" />
            <ResultRow label="Prélèvement Communautaire (PC)" value={result.pc} rate="0.5%" />
            <ResultRow label="Contribution Africaine (CA)" value={result.ca} rate="0%" />
            <ResultRow label="Budget Fonds Unique (BFU)" value={result.bfu} rate="0.5%" />

            <div className="border-t border-slate-200 pt-2 mt-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800">TOTAL DROITS</span>
                <span className="font-bold text-lg text-emerald-700">{formatGNF(result.total)}</span>
              </div>
            </div>

            {result.details && (
              <p className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg mt-3">
                {result.details}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ResultRow: React.FC<{ label: string; value: number; rate: string }> = ({ label, value, rate }) => (
  <div className="flex justify-between items-center py-1">
    <div>
      <span className="text-sm text-slate-700">{label}</span>
      <span className="text-xs text-slate-400 ml-1">({rate})</span>
    </div>
    <span className="text-sm font-medium text-slate-800">{formatGNF(value, { showCurrency: false })}</span>
  </div>
);
