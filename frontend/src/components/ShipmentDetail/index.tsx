// src/components/ShipmentDetail/index.tsx

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, RefreshCw, Edit, Loader2,
  Ship, Package, FileText, Wallet, Clock, CheckCircle2,
  AlertCircle, Anchor
} from 'lucide-react';
import { api } from '../../lib/api';
import type { Shipment } from '../../types';
import { ShipmentOverview } from './ShipmentOverview';
import { ShipmentDocuments } from './ShipmentDocuments';
import { ShipmentFinance } from './ShipmentFinance';
import { ShipmentTimeline } from './ShipmentTimeline';

interface ShipmentDetailProps {
  shipmentId: string;
  onBack: () => void;
}

type Tab = 'overview' | 'documents' | 'finance' | 'timeline';

export const ShipmentDetail: React.FC<ShipmentDetailProps> = ({ shipmentId, onBack }) => {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadShipment();
  }, [shipmentId]);

  const loadShipment = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await api.get<{ shipment: Shipment }>(`/shipments/${shipmentId}`);
      if (response.data?.shipment) {
        setShipment(response.data.shipment);
      }
    } catch (err) {
      setError('Impossible de charger le dossier');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
      DRAFT: { label: 'Brouillon', color: 'text-slate-600', bg: 'bg-slate-100', icon: <FileText size={14} /> },
      PENDING: { label: 'En attente', color: 'text-amber-600', bg: 'bg-amber-100', icon: <Clock size={14} /> },
      ARRIVED: { label: 'Arrivé', color: 'text-blue-600', bg: 'bg-blue-100', icon: <Anchor size={14} /> },
      DDI_OBTAINED: { label: 'DDI obtenue', color: 'text-blue-600', bg: 'bg-blue-100', icon: <FileText size={14} /> },
      DECLARATION_FILED: { label: 'Déclaré', color: 'text-indigo-600', bg: 'bg-indigo-100', icon: <FileText size={14} /> },
      LIQUIDATION_ISSUED: { label: 'Liquidé', color: 'text-purple-600', bg: 'bg-purple-100', icon: <FileText size={14} /> },
      CUSTOMS_PAID: { label: 'Droits payés', color: 'text-violet-600', bg: 'bg-violet-100', icon: <Wallet size={14} /> },
      BAE_ISSUED: { label: 'BAE émis', color: 'text-cyan-600', bg: 'bg-cyan-100', icon: <CheckCircle2 size={14} /> },
      TERMINAL_PAID: { label: 'Terminal payé', color: 'text-teal-600', bg: 'bg-teal-100', icon: <Wallet size={14} /> },
      DO_RELEASED: { label: 'DO libéré', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: <FileText size={14} /> },
      EXIT_NOTE_ISSUED: { label: 'Bon sortie', color: 'text-green-600', bg: 'bg-green-100', icon: <FileText size={14} /> },
      IN_DELIVERY: { label: 'En livraison', color: 'text-orange-600', bg: 'bg-orange-100', icon: <Ship size={14} /> },
      DELIVERED: { label: 'Livré', color: 'text-green-600', bg: 'bg-green-100', icon: <CheckCircle2 size={14} /> },
      INVOICED: { label: 'Facturé', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: <FileText size={14} /> },
      CLOSED: { label: 'Clôturé', color: 'text-slate-600', bg: 'bg-slate-100', icon: <CheckCircle2 size={14} /> },
      ARCHIVED: { label: 'Archivé', color: 'text-slate-400', bg: 'bg-slate-50', icon: <FileText size={14} /> },
    };
    return configs[status] || { label: status, color: 'text-slate-500', bg: 'bg-slate-100', icon: <FileText size={14} /> };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-slate-600 mb-4">{error || 'Dossier non trouvé'}</p>
        <button onClick={onBack} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
          Retour
        </button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(shipment.status);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Aperçu', icon: <Ship size={18} /> },
    { id: 'documents', label: 'Documents', icon: <FileText size={18} />, count: shipment.documents?.length },
    { id: 'finance', label: 'Finance', icon: <Wallet size={18} />, count: shipment.expenses?.length },
    { id: 'timeline', label: 'Historique', icon: <Clock size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3">
          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="font-semibold text-slate-900">{shipment.clientName}</h1>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="font-mono">{shipment.trackingNumber}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig.bg} ${statusConfig.color}`}>
                    {statusConfig.icon}
                    {statusConfig.label}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={loadShipment} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
                <RefreshCw size={18} />
              </button>
              <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
                <Edit size={18} />
              </button>
            </div>
          </div>

          {/* Quick info */}
          <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-3">
            {shipment.blNumber && (
              <span className="flex items-center gap-1">
                <FileText size={14} />
                BL: <strong>{shipment.blNumber}</strong>
              </span>
            )}
            {shipment.vesselName && (
              <span className="flex items-center gap-1">
                <Anchor size={14} />
                {shipment.vesselName}
              </span>
            )}
            {shipment.containers && shipment.containers.length > 0 && (
              <span className="flex items-center gap-1">
                <Package size={14} />
                {shipment.containers.length} conteneur(s)
              </span>
            )}
            {shipment.grossWeight && (
              <span>{shipment.grossWeight.toLocaleString()} kg</span>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-slate-100 text-blue-600'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-4">
        {activeTab === 'overview' && <ShipmentOverview shipment={shipment} />}
        {activeTab === 'documents' && <ShipmentDocuments shipment={shipment} onRefresh={loadShipment} />}
        {activeTab === 'finance' && <ShipmentFinance shipment={shipment} onRefresh={loadShipment} />}
        {activeTab === 'timeline' && <ShipmentTimeline shipment={shipment} />}
      </div>
    </div>
  );
};

export default ShipmentDetail;
