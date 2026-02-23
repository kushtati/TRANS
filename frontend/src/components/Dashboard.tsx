// src/components/Dashboard.tsx — UxPro Life-OS style dashboard v5.0

import React, { useState, useEffect, useMemo } from 'react';
import {
  Ship, Package, Clock, CheckCircle2, AlertTriangle,
  TrendingUp, TrendingDown, Plus, Search, RefreshCw,
  ChevronRight, Anchor, FileText,
  ArrowUpRight, ArrowDownRight, Activity,
  Truck, Zap,
  Calendar, Bell, BarChart3, FolderOpen,
  Settings, Pencil, Eye
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

  const statusMap: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    DRAFT:              { label: 'Brouillon',    color: 'text-stone-600',   bg: 'bg-stone-100',  dot: 'bg-stone-400' },
    PENDING:            { label: 'En attente',   color: 'text-amber-700',   bg: 'bg-amber-50',   dot: 'bg-amber-500' },
    ARRIVED:            { label: 'Arrivé',       color: 'text-blue-700',    bg: 'bg-blue-50',    dot: 'bg-blue-500' },
    DDI_OBTAINED:       { label: 'DDI obtenue',  color: 'text-blue-700',    bg: 'bg-blue-50',    dot: 'bg-blue-500' },
    DECLARATION_FILED:  { label: 'Déclaré',      color: 'text-indigo-700',  bg: 'bg-indigo-50',  dot: 'bg-indigo-500' },
    LIQUIDATION_ISSUED: { label: 'Liquidé',      color: 'text-purple-700',  bg: 'bg-purple-50',  dot: 'bg-purple-500' },
    CUSTOMS_PAID:       { label: 'Droits payés', color: 'text-violet-700',  bg: 'bg-violet-50',  dot: 'bg-violet-500' },
    BAE_ISSUED:         { label: 'BAE émis',     color: 'text-cyan-700',    bg: 'bg-cyan-50',    dot: 'bg-cyan-500' },
    TERMINAL_PAID:      { label: 'Terminal payé', color: 'text-teal-700',   bg: 'bg-teal-50',    dot: 'bg-teal-500' },
    DO_RELEASED:        { label: 'DO libéré',    color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
    EXIT_NOTE_ISSUED:   { label: 'Bon sortie',   color: 'text-green-700',   bg: 'bg-green-50',   dot: 'bg-green-500' },
    IN_DELIVERY:        { label: 'En livraison', color: 'text-orange-700',  bg: 'bg-orange-50',  dot: 'bg-orange-500' },
    DELIVERED:          { label: 'Livré',        color: 'text-green-700',   bg: 'bg-green-50',   dot: 'bg-green-500' },
    INVOICED:           { label: 'Facturé',      color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
    CLOSED:             { label: 'Clôturé',      color: 'text-stone-600',   bg: 'bg-stone-100',  dot: 'bg-stone-400' },
    ARCHIVED:           { label: 'Archivé',      color: 'text-stone-500',   bg: 'bg-stone-50',   dot: 'bg-stone-300' },
  };

  const timeAgo = (d: string) => {
    const ms = Date.now() - new Date(d).getTime();
    const m = Math.floor(ms / 60000), h = Math.floor(ms / 3600000), day = Math.floor(ms / 86400000);
    if (day > 0) return `${day}j`;
    if (h > 0) return `${h}h`;
    if (m > 0) return `${m}min`;
    return 'Maintenant';
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    return date.toLocaleDateString('fr-GN', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  // Action tiles data
  const actionTiles = useMemo(() => {
    if (!stats) return [];
    return [
      {
        key: 'dossiers',
        label: 'Dossiers actifs',
        count: stats.shipments.inProgress,
        icon: FolderOpen,
        gradient: 'from-orange-500 to-amber-500',
        shadow: 'shadow-orange-500/25',
        lightBg: 'bg-orange-50',
        text: 'text-orange-700',
      },
      {
        key: 'events',
        label: 'Événements',
        count: stats.shipments.thisMonth,
        icon: Calendar,
        gradient: 'from-emerald-500 to-green-500',
        shadow: 'shadow-emerald-500/25',
        lightBg: 'bg-emerald-50',
        text: 'text-emerald-700',
      },
      {
        key: 'alerts',
        label: 'Alertes',
        count: stats.alerts?.length || 0,
        icon: Bell,
        gradient: 'from-rose-500 to-red-500',
        shadow: 'shadow-rose-500/25',
        lightBg: 'bg-rose-50',
        text: 'text-rose-700',
      },
      {
        key: 'containers',
        label: 'Conteneurs',
        count: stats.containers.total,
        icon: Package,
        gradient: 'from-violet-500 to-purple-500',
        shadow: 'shadow-violet-500/25',
        lightBg: 'bg-violet-50',
        text: 'text-violet-700',
      },
    ];
  }, [stats]);

  // Group shipments by day for timeline
  const timelineGroups = useMemo(() => {
    const groups: Record<string, Shipment[]> = {};
    shipments.forEach(s => {
      const key = formatDate(s.updatedAt || s.createdAt);
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return Object.entries(groups);
  }, [shipments]);

  const balance = stats?.finance.balance || 0;
  const provisions = stats?.finance.totalProvisions || 0;
  const disbursements = stats?.finance.totalDisbursements || 0;
  const maxFinance = Math.max(provisions, disbursements, 1);

  // ─── Skeleton ─────────────────────────────────────
  if (isLoading && !stats) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
        <div className="h-8 w-48 bg-stone-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse bg-stone-100" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 h-72 bg-white rounded-2xl border border-stone-200/60 animate-pulse" />
          <div className="lg:col-span-2 h-72 bg-white rounded-2xl border border-stone-200/60 animate-pulse" />
        </div>
        <div className="h-64 bg-white rounded-2xl border border-stone-200/60 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">

      {/* ═══════════════════════════════════════════════
          HEADER — clean & data-driven
      ═══════════════════════════════════════════════ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-stone-900">Tableau de bord</h1>
          <p className="text-xs md:text-sm text-stone-400 mt-0.5">
            {new Date().toLocaleDateString('fr-GN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            <span className="mx-1.5 text-stone-300">·</span>
            {stats?.shipments.thisMonth || 0} dossier{(stats?.shipments.thisMonth || 0) > 1 ? 's' : ''} ce mois
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className={`p-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 transition-all active:scale-95 ${refreshing ? 'animate-spin' : ''}`}
            title="Rafraîchir"
          >
            <RefreshCw size={15} className="text-stone-400" />
          </button>
          <button
            onClick={onCreateShipment}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-semibold transition-all active:scale-[0.97]"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span className="hidden sm:inline">Nouveau</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          ACTION TILES — 4 tuiles colorées (UxPro style)
          Orange=Dossiers, Vert=Événements, Rouge=Alertes, Violet=Conteneurs
      ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actionTiles.map((tile) => (
          <div
            key={tile.key}
            className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${tile.gradient} ${tile.shadow} shadow-lg group cursor-default hover:scale-[1.02] transition-all duration-200`}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
            <div className="absolute bottom-0 left-0 w-12 h-12 bg-white/5 rounded-full translate-y-4 -translate-x-4" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <tile.icon size={18} className="text-white" />
                </div>
                <span className="text-2xl md:text-3xl font-bold text-white tabular-nums">{tile.count}</span>
              </div>
              <p className="text-xs font-medium text-white/80 uppercase tracking-wide">{tile.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════
          TIMELINE + FINANCE (3/5 + 2/5)
      ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* ── Timeline chronologique ── */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-stone-200/60 overflow-hidden">
          {/* Section Header with edit/settings */}
          <div className="px-4 md:px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
            <h2 className="font-semibold text-stone-900 flex items-center gap-2">
              <Activity size={16} className="text-emerald-500" />
              Activité récente
            </h2>
            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors" title="Paramètres">
                <Settings size={13} className="text-stone-400" />
              </button>
            </div>
          </div>

          {/* Search inline */}
          <div className="px-4 md:px-5 py-3 border-b border-stone-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher (BL, client, tracking...)"
                className="w-full bg-stone-50 border border-stone-100 rounded-lg pl-9 pr-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all placeholder:text-stone-400"
              />
            </div>
          </div>

          {/* Status filter pills */}
          <div className="px-4 md:px-5 py-2.5 border-b border-stone-50 flex gap-1.5 overflow-x-auto no-scrollbar">
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
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all active:scale-95 ${
                  statusFilter === f.key
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-50 text-stone-500 hover:bg-stone-100 hover:text-stone-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Timeline grouped by day */}
          <div className="max-h-[420px] overflow-y-auto">
            {shipments.length === 0 ? (
              <div className="py-14 text-center">
                <div className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Package size={24} className="text-stone-300" />
                </div>
                <p className="font-medium text-stone-500 text-sm mb-1">Aucun dossier trouvé</p>
                <p className="text-xs text-stone-400 mb-4">
                  {searchQuery ? 'Essayez une autre recherche' : 'Créez votre premier dossier'}
                </p>
                {!searchQuery && (
                  <button onClick={onCreateShipment} className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold transition-all active:scale-95">
                    Créer un dossier
                  </button>
                )}
              </div>
            ) : (
              timelineGroups.map(([day, items]) => (
                <div key={day}>
                  {/* Day separator */}
                  <div className="px-4 md:px-5 py-2 bg-stone-50/80 sticky top-0 z-10 border-b border-stone-100/50">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">{day}</span>
                  </div>
                  {/* Items */}
                  {items.map((s) => {
                    const st = statusMap[s.status] || { label: s.status, color: 'text-stone-500', bg: 'bg-stone-100', dot: 'bg-stone-400' };
                    const containers = s.containers || [];
                    // Icon by status category
                    const StatusIcon = s.status === 'DELIVERED' || s.status === 'IN_DELIVERY' ? Truck
                      : s.status === 'ARRIVED' ? Anchor
                      : s.status === 'PENDING' || s.status === 'DRAFT' ? Clock
                      : s.status.includes('CUSTOMS') || s.status.includes('BAE') || s.status.includes('LIQUIDATION') || s.status.includes('DECLARATION') ? FileText
                      : Ship;

                    return (
                      <div
                        key={s.id}
                        onClick={() => onViewShipment(s.id)}
                        className="px-4 md:px-5 py-3 hover:bg-stone-50/60 cursor-pointer transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon column */}
                          <div className={`w-9 h-9 rounded-xl ${st.bg} flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform`}>
                            <StatusIcon size={16} className={st.color} />
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="font-semibold text-stone-900 text-[14px] truncate group-hover:text-emerald-600 transition-colors">
                                {s.clientName}
                              </h3>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>
                                {st.label}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-400">
                              <span className="font-mono bg-stone-50 px-1.5 py-0.5 rounded text-stone-500">{s.trackingNumber}</span>
                              {s.blNumber && <span className="flex items-center gap-0.5"><FileText size={10} />{s.blNumber}</span>}
                              {s.vesselName && <span className="flex items-center gap-0.5 hidden sm:flex"><Ship size={10} />{s.vesselName}</span>}
                              {containers.length > 0 && <span className="flex items-center gap-0.5"><Package size={10} />{containers.length} TC</span>}
                            </div>
                            {s.description && (
                              <p className="text-[12px] text-stone-400 mt-1 truncate">{s.description}</p>
                            )}
                          </div>
                          {/* Time + arrow */}
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[10px] text-stone-400 tabular-nums font-medium">{timeAgo(s.updatedAt || s.createdAt)}</span>
                            <ChevronRight size={14} className="text-stone-200 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Finance — Bar chart style ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Monthly Spending Card */}
          <div className="bg-white rounded-2xl border border-stone-200/60 overflow-hidden">
            <div className="px-4 md:px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
              <h2 className="font-semibold text-stone-900 flex items-center gap-2">
                <BarChart3 size={16} className="text-violet-500" />
                Finances
              </h2>
              <div className="flex items-center gap-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${balance >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {balance >= 0 ? '+' : ''}{fmt(balance)} GNF
                </span>
              </div>
            </div>

            <div className="p-4 md:p-5 space-y-4">
              {/* Visual bar chart */}
              <div className="space-y-3">
                <FinanceBar label="Provisions" value={provisions} max={maxFinance} fmt={fmt} color="bg-emerald-500" lightBg="bg-emerald-50" icon={<ArrowDownRight size={12} className="text-emerald-600" />} />
                <FinanceBar label="Débours" value={disbursements} max={maxFinance} fmt={fmt} color="bg-rose-500" lightBg="bg-rose-50" icon={<ArrowUpRight size={12} className="text-rose-600" />} />
                <FinanceBar label="Impayés" value={stats?.finance.unpaid || 0} max={maxFinance} fmt={fmt} color="bg-amber-500" lightBg="bg-amber-50" icon={<AlertTriangle size={12} className="text-amber-600" />} alert />
              </div>

              {/* Balance summary */}
              <div className={`rounded-xl p-3.5 flex items-center justify-between ${balance >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <div className="flex items-center gap-2">
                  {balance >= 0 ? <TrendingUp size={16} className="text-emerald-600" /> : <TrendingDown size={16} className="text-red-600" />}
                  <span className="text-sm font-semibold text-stone-700">Solde net</span>
                </div>
                <span className={`text-lg font-bold tabular-nums ${balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {fmt(Math.abs(balance))} <span className="text-[10px] font-normal text-stone-400">GNF</span>
                </span>
              </div>
            </div>
          </div>

          {/* Containers Card */}
          <div className="bg-white rounded-2xl border border-stone-200/60 overflow-hidden">
            <div className="px-4 md:px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
              <h2 className="font-semibold text-stone-900 flex items-center gap-2">
                <Package size={16} className="text-orange-500" />
                Conteneurs
              </h2>
              <span className="text-xs font-bold text-stone-900 tabular-nums">{stats?.containers.total || 0} TC</span>
            </div>
            <div className="p-4 md:p-5 space-y-3">
              <ContainerRow label="Au port" value={stats?.containers.atPort || 0} total={stats?.containers.total || 0} color="bg-blue-500" lightBg="bg-blue-50" icon={<Anchor size={13} className="text-blue-600" />} />
              <ContainerRow label="En transit" value={stats?.containers.inTransit || 0} total={stats?.containers.total || 0} color="bg-orange-500" lightBg="bg-orange-50" icon={<Truck size={13} className="text-orange-600" />} />
              <ContainerRow label="Livrés" value={stats?.containers.delivered || 0} total={stats?.containers.total || 0} color="bg-emerald-500" lightBg="bg-emerald-50" icon={<CheckCircle2 size={13} className="text-emerald-600" />} />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          ALERTS — codage couleur catégoriel
      ═══════════════════════════════════════════════ */}
      {stats?.alerts && stats.alerts.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200/60 overflow-hidden">
          <div className="px-4 md:px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
            <h2 className="font-semibold text-stone-900 flex items-center gap-2">
              <Zap size={16} className="text-rose-500" />
              Alertes
              <span className="w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {stats.alerts.length}
              </span>
            </h2>
            <button className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors" title="Paramètres alertes">
              <Settings size={13} className="text-stone-400" />
            </button>
          </div>

          <div className="p-4 md:p-5 space-y-2">
            {stats.alerts.slice(0, 6).map((alert) => {
              const cfg = {
                danger:  { bg: 'bg-red-50', border: 'border-red-200/60', text: 'text-red-700', icon: 'text-red-500', iconBg: 'bg-red-100' },
                warning: { bg: 'bg-amber-50', border: 'border-amber-200/60', text: 'text-amber-700', icon: 'text-amber-500', iconBg: 'bg-amber-100' },
                info:    { bg: 'bg-blue-50', border: 'border-blue-200/60', text: 'text-blue-700', icon: 'text-blue-500', iconBg: 'bg-blue-100' },
              }[alert.type] || { bg: 'bg-stone-50', border: 'border-stone-200/60', text: 'text-stone-700', icon: 'text-stone-500', iconBg: 'bg-stone-100' };

              return (
                <div key={alert.id} className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border ${cfg.bg} ${cfg.border} transition-all hover:shadow-sm`}>
                  <div className={`w-7 h-7 rounded-lg ${cfg.iconBg} flex items-center justify-center shrink-0`}>
                    <AlertTriangle size={13} className={cfg.icon} />
                  </div>
                  <span className={`text-[13px] flex-1 ${cfg.text}`}>{alert.message}</span>
                  {alert.shipmentId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onViewShipment(alert.shipmentId!); }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-stone-700 px-2.5 py-1.5 rounded-lg hover:bg-white transition-colors"
                    >
                      <Eye size={12} /> Voir
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          RECENT DOCUMENTS — galerie cards
      ═══════════════════════════════════════════════ */}
      {shipments.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200/60 overflow-hidden">
          <div className="px-4 md:px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
            <h2 className="font-semibold text-stone-900 flex items-center gap-2">
              <FolderOpen size={16} className="text-orange-500" />
              Dossiers récents
            </h2>
            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors" title="Modifier">
                <Pencil size={13} className="text-stone-400" />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors" title="Paramètres">
                <Settings size={13} className="text-stone-400" />
              </button>
            </div>
          </div>
          <div className="p-4 md:p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {shipments.slice(0, 10).map((s) => {
                const st = statusMap[s.status] || { label: s.status, color: 'text-stone-500', bg: 'bg-stone-100', dot: 'bg-stone-400' };
                return (
                  <div
                    key={s.id}
                    onClick={() => onViewShipment(s.id)}
                    className="group cursor-pointer rounded-xl border border-stone-100 hover:border-stone-200 hover:shadow-md transition-all overflow-hidden"
                  >
                    {/* Color band top */}
                    <div className={`h-20 ${st.bg} flex items-center justify-center relative`}>
                      <FileText size={28} className={`${st.color} opacity-40`} />
                      <div className="absolute top-2 right-2">
                        <span className={`w-2 h-2 rounded-full ${st.dot} block`} />
                      </div>
                    </div>
                    <div className="p-2.5">
                      <p className="text-[12px] font-semibold text-stone-800 truncate group-hover:text-emerald-600 transition-colors">{s.clientName}</p>
                      <p className="text-[10px] text-stone-400 font-mono mt-0.5">{s.trackingNumber}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">{new Date(s.createdAt).toLocaleDateString('fr-GN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

/* ═══════════════════════════════════════════════════
   Sub-components
═══════════════════════════════════════════════════ */

/** Finance bar — visual horizontal bar chart */
const FinanceBar: React.FC<{
  label: string; value: number; max: number; fmt: (n: number) => string;
  color: string; lightBg: string; icon: React.ReactNode; alert?: boolean;
}> = ({ label, value, max, fmt: format, color, lightBg, icon, alert }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-lg ${lightBg} flex items-center justify-center`}>{icon}</div>
        <span className="text-[12px] font-medium text-stone-600">{label}</span>
      </div>
      <span className={`text-[12px] font-bold tabular-nums ${alert ? 'text-amber-700' : 'text-stone-800'}`}>
        {format(value)} <span className="text-[10px] font-normal text-stone-400">GNF</span>
      </span>
    </div>
    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
        style={{ width: `${Math.max((value / max) * 100, value > 0 ? 3 : 0)}%` }}
      />
    </div>
  </div>
);

/** Container row with progress bar */
const ContainerRow: React.FC<{
  label: string; value: number; total: number; color: string; lightBg: string; icon: React.ReactNode;
}> = ({ label, value, total, color, lightBg, icon }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-lg ${lightBg} flex items-center justify-center`}>{icon}</div>
        <span className="text-[12px] font-medium text-stone-600">{label}</span>
      </div>
      <span className="text-[12px] font-bold text-stone-800 tabular-nums">{value}</span>
    </div>
    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
        style={{ width: `${Math.max((value / Math.max(total, 1)) * 100, value > 0 ? 4 : 0)}%` }}
      />
    </div>
  </div>
);

export default Dashboard;
