// src/pages/CategoryDetailView.tsx — Full-page detail view for KPI & Finance cards

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Ship, Package, Clock, CheckCircle2, AlertTriangle,
  TrendingUp, TrendingDown, RefreshCw, FileText, Eye,
  ArrowUpRight, ArrowDownRight, Activity, Anchor, Truck,
  Calendar, MapPin, Hash, Layers, Search,
  CircleDollarSign, DollarSign, ChevronRight
} from 'lucide-react';
import { api } from '../lib/api';
import type { Shipment } from '../types';

type Category = 'pending' | 'inProgress' | 'delivered' | 'finance';

interface CategoryDetailViewProps {
  category: Category;
  onBack: () => void;
  onViewShipment: (id: string) => void;
}

const STATUS_GROUPS: Record<string, string[]> = {
  pending: ['PENDING', 'DRAFT'],
  inProgress: ['ARRIVED', 'DDI_OBTAINED', 'DECLARATION_FILED', 'LIQUIDATION_ISSUED', 'CUSTOMS_PAID', 'BAE_ISSUED', 'TERMINAL_PAID', 'DO_RELEASED', 'EXIT_NOTE_ISSUED', 'IN_DELIVERY'],
  delivered: ['DELIVERED', 'INVOICED', 'CLOSED'],
  finance: [],
};

const CATEGORY_CONFIG: Record<Category, {
  title: string; subtitle: string; icon: React.ElementType;
  gradient: string; shadow: string; accentText: string; accentBg: string;
}> = {
  pending: {
    title: 'Dossiers en attente',
    subtitle: 'Dossiers en attente de traitement ou en brouillon',
    icon: Clock,
    gradient: 'from-amber-500 to-orange-500',
    shadow: 'shadow-amber-500/20',
    accentText: 'text-amber-600',
    accentBg: 'bg-amber-50',
  },
  inProgress: {
    title: 'Dossiers en cours',
    subtitle: 'Dossiers en cours de dédouanement et transit',
    icon: Activity,
    gradient: 'from-blue-500 to-indigo-500',
    shadow: 'shadow-blue-500/20',
    accentText: 'text-blue-600',
    accentBg: 'bg-blue-50',
  },
  delivered: {
    title: 'Dossiers livrés',
    subtitle: 'Dossiers livrés, facturés ou clôturés',
    icon: CheckCircle2,
    gradient: 'from-emerald-500 to-green-500',
    shadow: 'shadow-emerald-500/20',
    accentText: 'text-emerald-600',
    accentBg: 'bg-emerald-50',
  },
  finance: {
    title: 'Aperçu financier',
    subtitle: 'Vue détaillée des provisions, débours et soldes par dossier',
    icon: CircleDollarSign,
    gradient: 'from-violet-500 to-purple-500',
    shadow: 'shadow-violet-500/20',
    accentText: 'text-violet-600',
    accentBg: 'bg-violet-50',
  },
};

const STATUS_MAP: Record<string, { label: string; color: string; dot: string; bg: string; border: string }> = {
  DRAFT:              { label: 'Brouillon',     color: 'text-stone-600',   dot: 'bg-stone-400',   bg: 'bg-stone-50',    border: 'border-stone-200' },
  PENDING:            { label: 'En attente',    color: 'text-amber-700',   dot: 'bg-amber-500',   bg: 'bg-amber-50',    border: 'border-amber-200' },
  ARRIVED:            { label: 'Arrivé',        color: 'text-blue-700',    dot: 'bg-blue-500',    bg: 'bg-blue-50',     border: 'border-blue-200' },
  DDI_OBTAINED:       { label: 'DDI obtenue',   color: 'text-blue-700',    dot: 'bg-blue-500',    bg: 'bg-blue-50',     border: 'border-blue-200' },
  DECLARATION_FILED:  { label: 'Déclaré',       color: 'text-indigo-700',  dot: 'bg-indigo-500',  bg: 'bg-indigo-50',   border: 'border-indigo-200' },
  LIQUIDATION_ISSUED: { label: 'Liquidé',       color: 'text-purple-700',  dot: 'bg-purple-500',  bg: 'bg-purple-50',   border: 'border-purple-200' },
  CUSTOMS_PAID:       { label: 'Droits payés',  color: 'text-violet-700',  dot: 'bg-violet-500',  bg: 'bg-violet-50',   border: 'border-violet-200' },
  BAE_ISSUED:         { label: 'BAE émis',      color: 'text-cyan-700',    dot: 'bg-cyan-500',    bg: 'bg-cyan-50',     border: 'border-cyan-200' },
  TERMINAL_PAID:      { label: 'Terminal payé',  color: 'text-teal-700',   dot: 'bg-teal-500',    bg: 'bg-teal-50',     border: 'border-teal-200' },
  DO_RELEASED:        { label: 'DO libéré',     color: 'text-emerald-700', dot: 'bg-emerald-500', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  EXIT_NOTE_ISSUED:   { label: 'Bon sortie',    color: 'text-green-700',   dot: 'bg-green-500',   bg: 'bg-green-50',    border: 'border-green-200' },
  IN_DELIVERY:        { label: 'En livraison',  color: 'text-orange-700',  dot: 'bg-orange-500',  bg: 'bg-orange-50',   border: 'border-orange-200' },
  DELIVERED:          { label: 'Livré',         color: 'text-green-700',   dot: 'bg-green-500',   bg: 'bg-green-50',    border: 'border-green-200' },
  INVOICED:           { label: 'Facturé',       color: 'text-emerald-700', dot: 'bg-emerald-500', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  CLOSED:             { label: 'Clôturé',       color: 'text-stone-600',   dot: 'bg-stone-400',   bg: 'bg-stone-50',    border: 'border-stone-200' },
  ARCHIVED:           { label: 'Archivé',       color: 'text-stone-500',   dot: 'bg-stone-300',   bg: 'bg-stone-50',    border: 'border-stone-200' },
};

const fmt = (n: number): string => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}Md`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString('fr-GN');
};

export const CategoryDetailView: React.FC<CategoryDetailViewProps> = ({
  category, onBack, onViewShipment,
}) => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const cfg = CATEGORY_CONFIG[category];
  const Icon = cfg.icon;

  useEffect(() => {
    loadData();
  }, [category]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (category === 'finance') {
        const res = await api.get<{ shipments: Shipment[] }>('/shipments?limit=200');
        if (res.data?.shipments) setShipments(res.data.shipments);
      } else {
        const statuses = STATUS_GROUPS[category] || [];
        // Single request with comma-separated statuses
        const statusParam = statuses.join(',');
        const res = await api.get<{ shipments: Shipment[] }>(`/shipments?statuses=${statusParam}&limit=200`);
        if (res.data?.shipments) setShipments(res.data.shipments);
      }
    } catch (e) {
      console.error('CategoryDetailView load error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Filter by search
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return shipments;
    const q = searchQuery.toLowerCase();
    return shipments.filter(s =>
      s.clientName.toLowerCase().includes(q) ||
      s.trackingNumber.toLowerCase().includes(q) ||
      (s.blNumber && s.blNumber.toLowerCase().includes(q)) ||
      (s.vesselName && s.vesselName.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  }, [shipments, searchQuery]);

  // Finance totals
  const totals = useMemo(() => {
    const allExp = filtered.flatMap(s => s.expenses || []);
    return {
      provisions: allExp.filter(e => e.type === 'PROVISION').reduce((a, e) => a + e.amount, 0),
      disbursements: allExp.filter(e => e.type === 'DISBURSEMENT').reduce((a, e) => a + e.amount, 0),
      unpaid: allExp.filter(e => !e.paid).reduce((a, e) => a + e.amount, 0),
      containers: filtered.reduce((a, s) => a + (s.containers || []).length, 0),
    };
  }, [filtered]);

  const balance = totals.provisions - totals.disbursements;

  return (
    <div className="min-h-screen bg-stone-50/50">
      {/* ═══ HEADER ═══ */}
      <div className={`bg-gradient-to-r ${cfg.gradient} ${cfg.shadow} shadow-xl`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-6">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-white" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Icon size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">{cfg.title}</h1>
              <p className="text-sm text-white/70 mt-0.5">{cfg.subtitle}</p>
            </div>
          </div>

          {/* Summary chips */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-sm font-semibold text-white">
              {filtered.length} dossier{filtered.length > 1 ? 's' : ''}
            </span>
            <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-sm font-semibold text-white">
              {totals.containers} conteneur{totals.containers > 1 ? 's' : ''}
            </span>
            {category === 'finance' && (
              <>
                <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-sm font-semibold text-white">
                  Solde: {balance >= 0 ? '+' : ''}{fmt(balance)} GNF
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 space-y-4">

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer par client, BL, tracking, navire..."
            className="w-full bg-white border border-stone-200 rounded-xl pl-10 pr-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-300 transition-all placeholder:text-stone-400 shadow-sm"
          />
        </div>

        {/* Finance summary bar */}
        {category === 'finance' && !loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Provisions" value={totals.provisions} icon={<ArrowDownRight size={16} />} color="text-emerald-700" bg="bg-emerald-50" border="border-emerald-100" shadow="shadow-emerald-100/50" />
            <SummaryCard label="Débours" value={totals.disbursements} icon={<ArrowUpRight size={16} />} color="text-red-700" bg="bg-red-50" border="border-red-100" shadow="shadow-red-100/50" />
            <SummaryCard label="Impayés" value={totals.unpaid} icon={<AlertTriangle size={16} />} color="text-amber-700" bg="bg-amber-50" border="border-amber-100" shadow="shadow-amber-100/50" />
            <SummaryCard
              label="Solde net"
              value={Math.abs(balance)}
              icon={balance >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              color={balance >= 0 ? 'text-emerald-700' : 'text-red-700'}
              bg={balance >= 0 ? 'bg-emerald-50' : 'bg-red-50'}
              border={balance >= 0 ? 'border-emerald-100' : 'border-red-100'}
              shadow={balance >= 0 ? 'shadow-emerald-100/50' : 'shadow-red-100/50'}
              prefix={balance >= 0 ? '+' : '-'}
            />
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw size={24} className="text-stone-300 animate-spin mx-auto mb-3" />
            <p className="text-sm text-stone-400 font-medium">Chargement des dossiers...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
              <Package size={28} className="text-stone-300" />
            </div>
            <p className="font-semibold text-stone-600 mb-1">Aucun dossier trouvé</p>
            <p className="text-sm text-stone-400">
              {searchQuery ? 'Essayez une autre recherche' : 'Aucun dossier dans cette catégorie'}
            </p>
          </div>
        ) : (
          /* ═══ SHIPMENT CARDS ═══ */
          <div className="space-y-3">
            {filtered.map((s, index) => (
              <ShipmentCard
                key={s.id}
                shipment={s}
                category={category}
                onView={() => onViewShipment(s.id)}
                index={index}
              />
            ))}
          </div>
        )}

        {/* Finance totals footer */}
        {category === 'finance' && !loading && filtered.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 md:p-5">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign size={16} className="text-violet-500" />
              <span className="font-semibold text-stone-800">Récapitulatif global</span>
              <span className="text-xs text-stone-400">({filtered.length} dossiers)</span>
            </div>
            <div className="h-3 bg-stone-100 rounded-full overflow-hidden flex mb-2">
              {(() => {
                const total = totals.provisions + totals.disbursements;
                const provPct = total > 0 ? (totals.provisions / total) * 100 : 50;
                return (
                  <>
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-l-full transition-all duration-700" style={{ width: `${provPct}%` }} />
                    <div className="h-full bg-gradient-to-r from-red-400 to-rose-500 rounded-r-full transition-all duration-700" style={{ width: `${100 - provPct}%` }} />
                  </>
                );
              })()}
            </div>
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>Provisions: <strong className="text-emerald-700">{fmt(totals.provisions)} GNF</strong></span>
              <span>Débours: <strong className="text-red-700">{fmt(totals.disbursements)} GNF</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   Sub-components
═══════════════════════════════════════════════════ */

/** Summary card for finance header */
const SummaryCard: React.FC<{
  label: string; value: number; icon: React.ReactNode;
  color: string; bg: string; border: string; shadow: string; prefix?: string;
}> = ({ label, value, icon, color, bg, border, shadow, prefix }) => (
  <div className={`${bg} border ${border} rounded-xl p-3.5 ${shadow} shadow-md transition-all`}>
    <div className="flex items-center gap-1.5 mb-1">
      <span className={color}>{icon}</span>
      <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">{label}</span>
    </div>
    <p className={`text-lg font-bold tabular-nums ${color}`}>
      {prefix}{fmt(value)} <span className="text-[10px] font-normal text-stone-400">GNF</span>
    </p>
  </div>
);

/** Individual shipment card — detailed, color-coded */
const ShipmentCard: React.FC<{
  shipment: Shipment; category: Category; onView: () => void; index: number;
}> = ({ shipment: s, category, onView, index }) => {
  const st = STATUS_MAP[s.status] || { label: s.status, color: 'text-stone-500', dot: 'bg-stone-400', bg: 'bg-stone-50', border: 'border-stone-200' };
  const containers = s.containers || [];
  const expenses = s.expenses || [];
  const documents = s.documents || [];
  const timeline = s.timeline || [];

  const prov = expenses.filter(e => e.type === 'PROVISION').reduce((a, e) => a + e.amount, 0);
  const disb = expenses.filter(e => e.type === 'DISBURSEMENT').reduce((a, e) => a + e.amount, 0);
  const solde = prov - disb;
  const unpaidExpenses = expenses.filter(e => !e.paid);
  const paidExpenses = expenses.filter(e => e.paid);

  // Card border accent based on category
  const cardCfg = CATEGORY_CONFIG[category];

  // Alternating subtle background for visual rhythm
  const isEven = index % 2 === 0;

  return (
    <div className={`bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${isEven ? '' : 'bg-stone-50/30'}`}>
      {/* Top accent strip */}
      <div className={`h-1 bg-gradient-to-r ${cardCfg.gradient}`} />

      <div className="p-4 md:p-5">
        {/* Row 1: Client, status, view button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl ${st.bg} border ${st.border} flex items-center justify-center shrink-0`}>
              {s.status === 'DELIVERED' || s.status === 'IN_DELIVERY' ? <Truck size={16} className={st.color} />
                : s.status === 'ARRIVED' ? <Anchor size={16} className={st.color} />
                : s.status === 'PENDING' || s.status === 'DRAFT' ? <Clock size={16} className={st.color} />
                : s.status.includes('CUSTOMS') || s.status.includes('BAE') || s.status.includes('DECLARATION') || s.status.includes('LIQUIDATION') ? <FileText size={16} className={st.color} />
                : <Ship size={16} className={st.color} />
              }
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-stone-900 text-[15px] truncate">{s.clientName}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.color} border ${st.border}`}>
                  {st.label}
                </span>
                <span className="text-[10px] text-stone-400">
                  {new Date(s.createdAt).toLocaleDateString('fr-GN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onView}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${cardCfg.accentBg} ${cardCfg.accentText} hover:shadow-sm border border-transparent hover:border-stone-200`}
          >
            <Eye size={13} /> Ouvrir
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Row 2: Identification tags */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="flex items-center gap-1 text-[11px] font-mono text-stone-700 bg-stone-100 border border-stone-200/60 px-2.5 py-1 rounded-lg shadow-sm">
            <Hash size={10} className="text-stone-400" />{s.trackingNumber}
          </span>
          {s.blNumber && (
            <span className="flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg shadow-sm">
              <FileText size={10} />BL: {s.blNumber}
            </span>
          )}
          {s.vesselName && (
            <span className="flex items-center gap-1 text-[11px] text-cyan-700 bg-cyan-50 border border-cyan-100 px-2.5 py-1 rounded-lg shadow-sm">
              <Ship size={10} />{s.vesselName}
            </span>
          )}
          {s.portOfLoading && (
            <span className="flex items-center gap-1 text-[11px] text-violet-700 bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-lg shadow-sm">
              <MapPin size={10} />{s.portOfLoading}
            </span>
          )}
          {s.eta && (
            <span className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg shadow-sm">
              <Calendar size={10} />ETA: {new Date(s.eta).toLocaleDateString('fr-GN', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>

        {/* Description */}
        {s.description && (
          <p className="text-[13px] text-stone-500 mb-3 line-clamp-2">{s.description}</p>
        )}

        {/* Row 3: Detail grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-3">
          {/* Containers */}
          <div className="bg-stone-50 border border-stone-100 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Package size={13} className="text-stone-400" />
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Conteneurs</span>
              <span className="text-[10px] font-bold text-stone-800 ml-auto">{containers.length}</span>
            </div>
            {containers.length > 0 ? (
              <div className="space-y-1">
                {containers.slice(0, 4).map((c, ci) => (
                  <p key={ci} className="text-[11px] text-stone-700 font-mono truncate">
                    {c.number} <span className="text-stone-400 text-[10px]">· {c.type}</span>
                  </p>
                ))}
                {containers.length > 4 && <p className="text-[10px] text-stone-400">+{containers.length - 4} autres</p>}
              </div>
            ) : (
              <p className="text-[11px] text-stone-400 italic">Aucun</p>
            )}
          </div>

          {/* Provisions */}
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 shadow-sm shadow-emerald-100/40">
            <div className="flex items-center gap-1.5 mb-1.5">
              <ArrowDownRight size={13} className="text-emerald-500" />
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Provisions</span>
            </div>
            <p className="text-base font-bold text-emerald-700 tabular-nums">
              {fmt(prov)} <span className="text-[9px] font-normal text-stone-400">GNF</span>
            </p>
            {paidExpenses.filter(e => e.type === 'PROVISION').length > 0 && (
              <p className="text-[10px] text-emerald-600 mt-0.5">
                {paidExpenses.filter(e => e.type === 'PROVISION').length} paiement(s) reçu(s)
              </p>
            )}
          </div>

          {/* Débours */}
          <div className="bg-red-50/70 border border-red-100 rounded-xl p-3 shadow-sm shadow-red-100/40">
            <div className="flex items-center gap-1.5 mb-1.5">
              <ArrowUpRight size={13} className="text-red-500" />
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Débours</span>
            </div>
            <p className="text-base font-bold text-red-700 tabular-nums">
              {fmt(disb)} <span className="text-[9px] font-normal text-stone-400">GNF</span>
            </p>
            {expenses.filter(e => e.type === 'DISBURSEMENT').length > 0 && (
              <p className="text-[10px] text-red-600 mt-0.5">
                {expenses.filter(e => e.type === 'DISBURSEMENT').length} dépense(s)
              </p>
            )}
          </div>

          {/* Solde / Impayés */}
          <div className={`rounded-xl p-3 shadow-sm ${
            unpaidExpenses.length > 0
              ? 'bg-amber-50/70 border border-amber-100 shadow-amber-100/40'
              : solde >= 0
                ? 'bg-emerald-50/70 border border-emerald-100 shadow-emerald-100/40'
                : 'bg-red-50/70 border border-red-100 shadow-red-100/40'
          }`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              {unpaidExpenses.length > 0
                ? <AlertTriangle size={13} className="text-amber-500" />
                : solde >= 0 ? <TrendingUp size={13} className="text-emerald-500" /> : <TrendingDown size={13} className="text-red-500" />
              }
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                {unpaidExpenses.length > 0 ? 'Impayés' : 'Solde'}
              </span>
            </div>
            {unpaidExpenses.length > 0 ? (
              <>
                <p className="text-base font-bold text-amber-700 tabular-nums">
                  {fmt(unpaidExpenses.reduce((a, e) => a + e.amount, 0))} <span className="text-[9px] font-normal text-stone-400">GNF</span>
                </p>
                <p className="text-[10px] text-amber-600 mt-0.5">{unpaidExpenses.length} impayé(s)</p>
              </>
            ) : (
              <p className={`text-base font-bold tabular-nums ${solde >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {solde >= 0 ? '+' : ''}{fmt(solde)} <span className="text-[9px] font-normal text-stone-400">GNF</span>
              </p>
            )}
          </div>
        </div>

        {/* Row 4: Documents + Timeline count */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-400">
          {documents.length > 0 && (
            <span className="flex items-center gap-1 bg-stone-50 border border-stone-100 px-2 py-1 rounded-md">
              <Layers size={10} />{documents.length} document{documents.length > 1 ? 's' : ''}
            </span>
          )}
          {timeline.length > 0 && (
            <span className="flex items-center gap-1 bg-stone-50 border border-stone-100 px-2 py-1 rounded-md">
              <Activity size={10} />{timeline.length} événement{timeline.length > 1 ? 's' : ''}
            </span>
          )}
          {s.updatedAt && (
            <span>
              Mis à jour: {new Date(s.updatedAt).toLocaleDateString('fr-GN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryDetailView;
