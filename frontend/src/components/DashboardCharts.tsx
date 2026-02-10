// src/components/DashboardCharts.tsx

import React from 'react';
import type { DashboardStats } from '../types';
import { formatGNF } from '../utils/format';

interface DashboardChartsProps {
  stats: DashboardStats;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <StatusChart stats={stats} />
      <FinanceChart stats={stats} />
    </div>
  );
};

// ============================================
// Shipment Status Distribution
// ============================================

const StatusChart: React.FC<{ stats: DashboardStats }> = ({ stats }) => {
  const data = [
    { label: 'En attente', value: stats.shipments.pending, color: '#f59e0b' },
    { label: 'En cours', value: stats.shipments.inProgress, color: '#3b82f6' },
    { label: 'Livrés', value: stats.shipments.delivered, color: '#10b981' },
    { label: 'Ce mois', value: stats.shipments.thisMonth, color: '#8b5cf6' },
  ];

  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Répartition des dossiers</h3>
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={i}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-500">{item.label}</span>
              <span className="text-xs font-semibold text-slate-700">{item.value}</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.max((item.value / max) * 100, item.value > 0 ? 4 : 0)}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between">
        <span className="text-xs text-slate-400">Total</span>
        <span className="text-sm font-bold text-slate-800">{stats.shipments.total}</span>
      </div>
    </div>
  );
};

// ============================================
// Finance Overview Donut-style
// ============================================

const FinanceChart: React.FC<{ stats: DashboardStats }> = ({ stats }) => {
  const { totalProvisions, totalDisbursements, balance, unpaid } = stats.finance;
  const total = totalProvisions + totalDisbursements || 1;
  const provPercent = Math.round((totalProvisions / total) * 100);
  const disbPercent = 100 - provPercent;

  // SVG donut
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const provStroke = (provPercent / 100) * circumference;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Aperçu financier</h3>

      <div className="flex items-center gap-6">
        {/* Mini donut chart */}
        <div className="relative shrink-0">
          <svg width="100" height="100" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50" cy="50" r={radius}
              fill="none" stroke="#fee2e2" strokeWidth="10"
            />
            {/* Provisions arc */}
            <circle
              cx="50" cy="50" r={radius}
              fill="none" stroke="#10b981" strokeWidth="10"
              strokeDasharray={`${provStroke} ${circumference - provStroke}`}
              strokeDashoffset={circumference * 0.25}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xs font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {provPercent}%
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          <FinanceRow
            color="bg-green-500"
            label="Provisions"
            value={totalProvisions}
            percent={provPercent}
          />
          <FinanceRow
            color="bg-red-400"
            label="Débours"
            value={totalDisbursements}
            percent={disbPercent}
          />
          <div className="border-t border-slate-100 pt-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Solde</span>
              <span className={`text-sm font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatGNF(balance, { compact: true })}
              </span>
            </div>
          </div>
          {unpaid > 0 && (
            <div className="flex justify-between">
              <span className="text-xs text-amber-500">Non payés</span>
              <span className="text-xs font-medium text-amber-600">
                {formatGNF(unpaid, { compact: true })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FinanceRow: React.FC<{
  color: string;
  label: string;
  value: number;
  percent: number;
}> = ({ color, label, value, percent }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-xs text-slate-500">{label}</span>
    </div>
    <div className="text-right">
      <span className="text-xs font-medium text-slate-700">
        {formatGNF(value, { compact: true, showCurrency: false })}
      </span>
      <span className="text-[10px] text-slate-400 ml-1">({percent}%)</span>
    </div>
  </div>
);
