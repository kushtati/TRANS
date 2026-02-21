// src/components/Dashboard.tsx — Ultra-modern enterprise dashboard

import React, { useState, useEffect, useMemo } from 'react';
import {
  Ship, Package, Clock, CheckCircle2, AlertTriangle,
  TrendingUp, TrendingDown, Plus, Search, RefreshCw,
  ChevronRight, Anchor, FileText, Wallet,
  ArrowUpRight, ArrowDownRight, Activity,
  Truck, CircleDollarSign, Zap
} from 'lucide-react';
import { api } from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';
import type { Shipment, DashboardStats } from '../types';

interface DashboardProps {
  onViewShipment: (id: string) => void;
  onCreateShipment: () => void;
  searchQuery?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onViewShipment,
  onCreateShipment,
  searchQuery: externalSearch,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (externalSearch !== undefined) setSearchQuery(externalSearch);
  }, [externalSearch]);

  const debouncedSearch = useDebounce(searchQuery, 400);

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadShipments(); }, [debouncedSearch, statusFilter]);

  const loadStats = async () => {
    try {
      const res = await api.get<{ stats: DashboardStats }>('/shipments/stats');
      if (res.data?.stats) setStats(res.data.stats);
    } catch (e) { console.error('Stats error:', e); }
  };

  const loadShipments = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await api.get<{ shipments: Shipment[]; pagination: { total: number; pages: number } }>(`/shipments?${params}`);
      if (res.data?.shipments) setShipments(res.data.shipments);
    } catch (e) { console.error('Shipments error:', e); }
    finally { setIsLoading(false); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadShipments()]);
    setTimeout(() => setRefreshing(false), 600);
  };

  const fmt = (n: number): string => {
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}Md`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
    return n.toLocaleString('fr-GN');
  };

  const statusMap: Record<string, { label: string; color: string; dot: string }> = {
    DRAFT: { label: 'Brouillon', color: 'text-slate-500', dot: 'bg-slate-400' },
    PENDING: { label: 'En attente', color: 'text-amber-600', dot: 'bg-amber-500' },
    ARRIVED: { label: 'Arrivé', color: 'text-blue-600', dot: 'bg-blue-500' },
    DDI_OBTAINED: { label: 'DDI obtenue', color: 'text-blue-600', dot: 'bg-blue-500' },
    DECLARATION_FILED: { label: 'Déclaré', color: 'text-indigo-600', dot: 'bg-indigo-500' },
    LIQUIDATION_ISSUED: { label: 'Liquidé', color: 'text-purple-600', dot: 'bg-purple-500' },
    CUSTOMS_PAID: { label: 'Droits payés', color: 'text-violet-600', dot: 'bg-violet-500' },
    BAE_ISSUED: { label: 'BAE émis', color: 'text-cyan-600', dot: 'bg-cyan-500' },
    TERMINAL_PAID: { label: 'Terminal payé', color: 'text-teal-600', dot: 'bg-teal-500' },
    DO_RELEASED: { label: 'DO libéré', color: 'text-emerald-600', dot: 'bg-emerald-500' },
    EXIT_NOTE_ISSUED: { label: 'Bon sortie', color: 'text-green-600', dot: 'bg-green-500' },
    IN_DELIVERY: { label: 'En livraison', color: 'text-orange-600', dot: 'bg-orange-500' },
    DELIVERED: { label: 'Livré', color: 'text-green-600', dot: 'bg-green-500' },
    INVOICED: { label: 'Facturé', color: 'text-emerald-600', dot: 'bg-emerald-500' },
    CLOSED: { label: 'Clôturé', color: 'text-slate-600', dot: 'bg-slate-400' },
    ARCHIVED: { label: 'Archivé', color: 'text-slate-400', dot: 'bg-slate-300' },
  };

  const timeAgo = (d: string) => {
    const ms = Date.now() - new Date(d).getTime();
    const m = Math.floor(ms / 60000), h = Math.floor(ms / 3600000), day = Math.floor(ms / 86400000);
    if (day > 0) return `${day}j`;
    if (h > 0) return `${h}h`;
    if (m > 0) return `${m}min`;
    return 'Now';
  };

  // Pipeline KPI cards
  const pipeline = useMemo(() => {
    if (!stats) return [];
    return [
      { key: 'pending', label: 'En attente', count: stats.shipments.pending, color: 'from-amber-500 to-orange-500', icon: Clock },
      { key: 'inProgress', label: 'En cours', count: stats.shipments.inProgress, color: 'from-blue-500 to-indigo-500', icon: Activity },
      { key: 'delivered', label: 'Livrés', count: stats.shipments.delivered, color: 'from-green-500 to-emerald-500', icon: CheckCircle2 },
    ];
  }, [stats]);

  const balance = stats?.finance.balance || 0;
  const provTotal = (stats?.finance.totalProvisions || 0) + (stats?.finance.totalDisbursements || 0);
  const provPercent = provTotal > 0 ? Math.round(((stats?.finance.totalProvisions || 0) / provTotal) * 100) : 50;

  // Skeleton
  if (isLoading && !stats) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div className="h-10 w-64 bg-slate-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-36 bg-white rounded-2xl border border-slate-200 animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-56 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          <div className="h-56 bg-white rounded-2xl border border-slate-200 animate-pulse" />
        </div>
        <div className="h-64 bg-white rounded-2xl border border-slate-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {stats?.shipments.thisMonth || 0} dossier{(stats?.shipments.thisMonth || 0) > 1 ? 's' : ''} ce mois
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className={`p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all ${refreshing ? 'animate-spin' : ''}`}
            title="Rafraîchir"
          >
            <RefreshCw size={16} className="text-slate-500" />
          </button>
          <button
            onClick={onCreateShipment}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98]"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Nouveau dossier</span>
          </button>
        </div>
      </div>

      {/* ═══ KPI PIPELINE ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {pipeline.map((p) => (
          <div
            key={p.key}
            className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 group"
          >
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${p.color}`} />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{p.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">{p.count}</p>
                <p className="text-xs text-slate-400 mt-1">
                  sur {stats?.shipments.total || 0} dossiers
                </p>
              </div>
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                <p.icon size={20} className="text-white" />
              </div>
            </div>
            <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${p.color} rounded-full transition-all duration-1000 ease-out`}
                style={{ width: `${Math.max((p.count / Math.max(stats?.shipments.total || 1, 1)) * 100, p.count > 0 ? 3 : 0)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ═══ FINANCE + CONTAINERS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Finance Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 hover:shadow-lg hover:shadow-slate-200/50 transition-all">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <CircleDollarSign size={18} className="text-slate-400" />
              Aperçu financier
            </h2>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${balance >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              Solde: {balance >= 0 ? '+' : '-'}{fmt(Math.abs(balance))} GNF
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FinanceMetric label="Provisions" value={stats?.finance.totalProvisions || 0} fmt={fmt} icon={<ArrowDownRight size={14} />} color="text-green-600" bg="bg-green-50" />
            <FinanceMetric label="Débours" value={stats?.finance.totalDisbursements || 0} fmt={fmt} icon={<ArrowUpRight size={14} />} color="text-red-500" bg="bg-red-50" />
            <FinanceMetric label="Impayés" value={stats?.finance.unpaid || 0} fmt={fmt} icon={<AlertTriangle size={14} />} color="text-amber-600" bg="bg-amber-50" alert={!!(stats?.finance.unpaid && stats.finance.unpaid > 0)} />
            <FinanceMetric label="Solde net" value={Math.abs(balance)} fmt={fmt} icon={balance >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} color={balance >= 0 ? 'text-green-600' : 'text-red-600'} bg={balance >= 0 ? 'bg-green-50' : 'bg-red-50'} />
          </div>

          {/* Provisions vs Disbursements bar */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Provisions ({provPercent}%)</span>
              <span>Débours ({100 - provPercent}%)</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-l-full transition-all duration-1000" style={{ width: `${provPercent}%` }} />
              <div className="h-full bg-gradient-to-r from-red-400 to-rose-500 rounded-r-full transition-all duration-1000" style={{ width: `${100 - provPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Containers Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:shadow-lg hover:shadow-slate-200/50 transition-all">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-5">
            <Package size={18} className="text-slate-400" />
            Conteneurs
          </h2>
          <div className="space-y-4">
            <ContainerRow label="Au port" value={stats?.containers.atPort || 0} total={stats?.containers.total || 0} color="bg-blue-500" icon={<Anchor size={14} />} />
            <ContainerRow label="En transit" value={stats?.containers.inTransit || 0} total={stats?.containers.total || 0} color="bg-orange-500" icon={<Truck size={14} />} />
            <ContainerRow label="Livrés" value={stats?.containers.delivered || 0} total={stats?.containers.total || 0} color="bg-green-500" icon={<CheckCircle2 size={14} />} />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">Total</span>
            <span className="text-lg font-bold text-slate-900 tabular-nums">{stats?.containers.total || 0} TC</span>
          </div>
        </div>
      </div>

      {/* ═══ ALERTS ═══ */}
      {stats?.alerts && stats.alerts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Zap size={18} className="text-amber-500" />
              Alertes
              <span className="ml-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {stats.alerts.length}
              </span>
            </h2>
          </div>
          <div className="space-y-2">
            {stats.alerts.slice(0, 6).map((alert) => {
              const cfg = {
                danger: { bg: 'bg-red-50 border-red-100', text: 'text-red-700', icon: 'text-red-500' },
                warning: { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700', icon: 'text-amber-500' },
                info: { bg: 'bg-blue-50 border-blue-100', text: 'text-blue-700', icon: 'text-blue-500' },
              }[alert.type] || { bg: 'bg-slate-50 border-slate-100', text: 'text-slate-700', icon: 'text-slate-500' };

              return (
                <div key={alert.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.bg} transition-all hover:shadow-sm`}>
                  <AlertTriangle size={14} className={`shrink-0 ${cfg.icon}`} />
                  <span className={`text-sm flex-1 ${cfg.text}`}>{alert.message}</span>
                  {alert.shipmentId && (
                    <button onClick={() => onViewShipment(alert.shipmentId!)} className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                      Voir
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ SEARCH + FILTERS ═══ */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par BL, client, tracking..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { key: 'ALL', label: 'Tous' },
            { key: 'PENDING', label: 'En attente' },
            { key: 'ARRIVED', label: 'Arrivés' },
            { key: 'CUSTOMS_PAID', label: 'Droits payés' },
            { key: 'DELIVERED', label: 'Livrés' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === f.key
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ SHIPMENT LIST ═══ */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Dossiers</h2>
          <span className="text-xs text-slate-400 tabular-nums">{shipments.length} résultat{shipments.length > 1 ? 's' : ''}</span>
        </div>

        {shipments.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package size={28} className="text-slate-300" />
            </div>
            <p className="font-medium text-slate-500 mb-1">Aucun dossier trouvé</p>
            <p className="text-sm text-slate-400 mb-5">
              {searchQuery ? 'Essayez une autre recherche' : 'Créez votre premier dossier de transit'}
            </p>
            {!searchQuery && (
              <button onClick={onCreateShipment} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
                Créer un dossier
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100/80">
            {shipments.map((s) => {
              const st = statusMap[s.status] || { label: s.status, color: 'text-slate-500', dot: 'bg-slate-400' };
              const containers = s.containers || [];

              return (
                <div
                  key={s.id}
                  onClick={() => onViewShipment(s.id)}
                  className="px-5 py-4 hover:bg-slate-50/80 cursor-pointer transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <h3 className="font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {s.clientName}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                          <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{s.trackingNumber}</span>
                        {s.blNumber && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <FileText size={11} />{s.blNumber}
                          </span>
                        )}
                        {s.vesselName && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <Ship size={11} />{s.vesselName}
                          </span>
                        )}
                        {containers.length > 0 && (
                          <span className="flex items-center gap-1 text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">
                            <Package size={11} />{containers.length} TC
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1.5 truncate">{s.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[11px] text-slate-400 tabular-nums">{timeAgo(s.createdAt)}</span>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

/* ═══════════ Sub-components ═══════════ */

const FinanceMetric: React.FC<{
  label: string; value: number; fmt: (n: number) => string;
  icon: React.ReactNode; color: string; bg: string; alert?: boolean;
}> = ({ label, value, fmt: format, icon, color, bg, alert }) => (
  <div className={`rounded-xl p-3.5 ${bg} ${alert ? 'ring-1 ring-amber-300' : ''} transition-all`}>
    <div className="flex items-center gap-1.5 mb-1">
      <span className={color}>{icon}</span>
      <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
    <p className={`text-lg font-bold tabular-nums ${alert ? 'text-amber-700' : 'text-slate-900'}`}>
      {format(value)} <span className="text-[10px] font-normal text-slate-400">GNF</span>
    </p>
  </div>
);

const ContainerRow: React.FC<{
  label: string; value: number; total: number; color: string; icon: React.ReactNode;
}> = ({ label, value, total, color, icon }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span className="text-slate-400">{icon}</span>
        {label}
      </div>
      <span className="text-sm font-semibold text-slate-900 tabular-nums">{value}</span>
    </div>
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
        style={{ width: `${Math.max((value / Math.max(total, 1)) * 100, value > 0 ? 4 : 0)}%` }}
      />
    </div>
  </div>
);

export default Dashboard;
