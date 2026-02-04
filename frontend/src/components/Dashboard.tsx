// src/components/Dashboard.tsx

import React, { useState, useEffect } from 'react';
import {
  Ship, Package, Clock, CheckCircle2, AlertTriangle,
  TrendingUp, TrendingDown, Plus, Search, RefreshCw,
  ChevronRight, Anchor, FileText, Wallet
} from 'lucide-react';
import { api } from '../lib/api';
import type { Shipment, DashboardStats } from '../types';

interface DashboardProps {
  onViewShipment: (id: string) => void;
  onCreateShipment: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onViewShipment,
  onCreateShipment,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const [statsRes, shipmentsRes] = await Promise.all([
        api.get<{ stats: DashboardStats }>('/shipments/stats'),
        api.get<{ shipments: Shipment[] }>('/shipments?limit=10'),
      ]);

      if (statsRes.data?.stats) setStats(statsRes.data.stats);
      if (shipmentsRes.data?.shipments) setShipments(shipmentsRes.data.shipments);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: number): string => {
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} Md`;
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} M`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)} K`;
    return amount.toLocaleString();
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string }> = {
      DRAFT: { label: 'Brouillon', color: 'text-slate-500', bg: 'bg-slate-100' },
      PENDING: { label: 'En attente', color: 'text-amber-600', bg: 'bg-amber-50' },
      ARRIVED: { label: 'Arrivé', color: 'text-blue-600', bg: 'bg-blue-50' },
      DDI_OBTAINED: { label: 'DDI obtenue', color: 'text-blue-600', bg: 'bg-blue-50' },
      DECLARATION_FILED: { label: 'Déclaré', color: 'text-indigo-600', bg: 'bg-indigo-50' },
      LIQUIDATION_ISSUED: { label: 'Liquidé', color: 'text-purple-600', bg: 'bg-purple-50' },
      CUSTOMS_PAID: { label: 'Droits payés', color: 'text-violet-600', bg: 'bg-violet-50' },
      BAE_ISSUED: { label: 'BAE émis', color: 'text-cyan-600', bg: 'bg-cyan-50' },
      TERMINAL_PAID: { label: 'Terminal payé', color: 'text-teal-600', bg: 'bg-teal-50' },
      DO_RELEASED: { label: 'DO libéré', color: 'text-emerald-600', bg: 'bg-emerald-50' },
      EXIT_NOTE_ISSUED: { label: 'Bon sortie', color: 'text-green-600', bg: 'bg-green-50' },
      IN_DELIVERY: { label: 'En livraison', color: 'text-orange-600', bg: 'bg-orange-50' },
      DELIVERED: { label: 'Livré', color: 'text-green-600', bg: 'bg-green-50' },
      INVOICED: { label: 'Facturé', color: 'text-emerald-600', bg: 'bg-emerald-50' },
      CLOSED: { label: 'Clôturé', color: 'text-slate-600', bg: 'bg-slate-100' },
      ARCHIVED: { label: 'Archivé', color: 'text-slate-400', bg: 'bg-slate-50' },
    };
    return configs[status] || { label: status, color: 'text-slate-500', bg: 'bg-slate-100' };
  };

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `il y a ${days}j`;
    if (hours > 0) return `il y a ${hours}h`;
    if (minutes > 0) return `il y a ${minutes}min`;
    return 'À l\'instant';
  };

  // Filter shipments
  const filteredShipments = shipments.filter((s) => {
    const matchesSearch = !searchQuery || 
      s.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.blNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
              <div className="h-4 w-20 bg-slate-200 rounded mb-2" />
              <div className="h-8 w-16 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl p-4 animate-pulse">
          <div className="h-6 w-40 bg-slate-200 rounded mb-4" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg mb-2" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-sm text-slate-500">Vue d'ensemble de vos opérations</p>
        </div>
        <button
          onClick={onCreateShipment}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/30 transition-all"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Nouveau dossier</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Ship size={20} />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          label="En cours"
          value={stats?.shipments.inProgress || 0}
          subValue={`${stats?.shipments.total || 0} total`}
        />
        <StatCard
          icon={<Clock size={20} />}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          label="En attente"
          value={stats?.shipments.pending || 0}
          subValue="À traiter"
          alert={!!(stats?.shipments.pending && stats.shipments.pending > 5)}
        />
        <StatCard
          icon={<CheckCircle2 size={20} />}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          label="Livrés"
          value={stats?.shipments.delivered || 0}
          subValue="Ce mois"
        />
        <StatCard
          icon={<Wallet size={20} />}
          iconBg="bg-violet-100"
          iconColor="text-violet-600"
          label="Solde"
          value={`${formatAmount(stats?.finance.balance || 0)}`}
          subValue="GNF disponible"
          trend={stats?.finance.balance && stats.finance.balance > 0 ? 'up' : 'down'}
        />
      </div>

      {/* Alerts */}
      {stats?.alerts && stats.alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <AlertTriangle size={18} />
            <span className="font-medium">Alertes ({stats.alerts.length})</span>
          </div>
          <div className="space-y-2">
            {stats.alerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-2 bg-white rounded-lg"
              >
                <span className="text-sm text-slate-700">{alert.message}</span>
                {alert.shipmentId && (
                  <button
                    onClick={() => onViewShipment(alert.shipmentId!)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Voir
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher (BL, client, tracking...)"
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {['ALL', 'PENDING', 'CUSTOMS_PAID', 'DELIVERED'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {filter === 'ALL' ? 'Tous' : 
               filter === 'PENDING' ? 'En attente' :
               filter === 'CUSTOMS_PAID' ? 'Droits payés' : 'Livrés'}
            </button>
          ))}
        </div>

        <button
          onClick={loadDashboard}
          className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={18} className="text-slate-600" />
        </button>
      </div>

      {/* Shipments List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Dossiers récents</h2>
          <span className="text-sm text-slate-500">{filteredShipments.length} dossier(s)</span>
        </div>

        {filteredShipments.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto text-slate-300 mb-4" size={56} />
            <p className="text-slate-500 mb-1">Aucun dossier trouvé</p>
            <p className="text-sm text-slate-400 mb-4">
              {searchQuery ? 'Essayez une autre recherche' : 'Créez votre premier dossier de transit'}
            </p>
            {!searchQuery && (
              <button
                onClick={onCreateShipment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
              >
                Créer un dossier
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredShipments.map((shipment) => {
              const statusConfig = getStatusConfig(shipment.status);
              
              return (
                <div
                  key={shipment.id}
                  onClick={() => onViewShipment(shipment.id)}
                  className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900 truncate">
                          {shipment.clientName}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{shipment.trackingNumber}</span>
                        
                        {shipment.blNumber && (
                          <span className="flex items-center gap-1">
                            <FileText size={12} />
                            {shipment.blNumber}
                          </span>
                        )}

                        {shipment.vesselName && (
                          <span className="flex items-center gap-1">
                            <Anchor size={12} />
                            {shipment.vesselName}
                          </span>
                        )}

                        {shipment.containers && shipment.containers.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Package size={12} />
                            {shipment.containers.length} TC
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-sm text-slate-600 mt-1.5 truncate">
                        {shipment.description}
                      </p>
                    </div>

                    {/* Right */}
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-slate-400">
                        {getRelativeTime(shipment.createdAt)}
                      </span>
                      <ChevronRight size={18} className="text-slate-300" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickStatCard
          label="Conteneurs au port"
          value={stats?.containers.atPort || 0}
          icon={<Package size={16} />}
          color="text-blue-600"
        />
        <QuickStatCard
          label="Débours impayés"
          value={`${formatAmount(stats?.finance.unpaid || 0)} GNF`}
          icon={<Wallet size={16} />}
          color="text-red-600"
          alert={!!(stats?.finance.unpaid && stats.finance.unpaid > 0)}
        />
        <QuickStatCard
          label="Total provisions"
          value={`${formatAmount(stats?.finance.totalProvisions || 0)} GNF`}
          icon={<TrendingUp size={16} />}
          color="text-green-600"
        />
        <QuickStatCard
          label="Total débours"
          value={`${formatAmount(stats?.finance.totalDisbursements || 0)} GNF`}
          icon={<TrendingDown size={16} />}
          color="text-orange-600"
        />
      </div>
    </div>
  );
};

// Sub-components
interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: number | string;
  subValue?: string;
  trend?: 'up' | 'down';
  alert?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  icon, iconBg, iconColor, label, value, subValue, trend, alert,
}) => (
  <div className={`bg-white rounded-xl p-4 border ${alert ? 'border-amber-300' : 'border-slate-200'}`}>
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center ${iconColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-slate-900">{value}</span>
          {trend && (
            trend === 'up' 
              ? <TrendingUp size={16} className="text-green-500" />
              : <TrendingDown size={16} className="text-red-500" />
          )}
        </div>
        {subValue && <p className="text-xs text-slate-400">{subValue}</p>}
      </div>
    </div>
  </div>
);

interface QuickStatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  alert?: boolean;
}

const QuickStatCard: React.FC<QuickStatCardProps> = ({ label, value, icon, color, alert }) => (
  <div className={`bg-white rounded-xl p-3 border ${alert ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
    <div className="flex items-center gap-2 mb-1">
      <span className={color}>{icon}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
    <p className={`font-semibold ${alert ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
  </div>
);

export default Dashboard;
