// src/pages/EditShipmentView.tsx

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Loader2, Save, AlertCircle,
  User, Package, Ship, FileText, Truck,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useToast } from '../components/ui/Toast';
import type { Shipment, ShipmentStatus } from '../types';
import { statusLabels } from '../utils/format';

interface EditShipmentViewProps {
  shipmentId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const STATUS_ORDER: ShipmentStatus[] = [
  'DRAFT', 'PENDING', 'ARRIVED', 'DDI_OBTAINED',
  'DECLARATION_FILED', 'LIQUIDATION_ISSUED', 'CUSTOMS_PAID',
  'BAE_ISSUED', 'TERMINAL_PAID', 'DO_RELEASED',
  'EXIT_NOTE_ISSUED', 'IN_DELIVERY', 'DELIVERED',
  'INVOICED', 'CLOSED', 'ARCHIVED',
];

export const EditShipmentView: React.FC<EditShipmentViewProps> = ({ shipmentId, onSuccess, onCancel }) => {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  // Editable fields
  const [form, setForm] = useState({
    clientName: '',
    clientNif: '',
    clientPhone: '',
    clientAddress: '',
    description: '',
    hsCode: '',
    blNumber: '',
    doNumber: '',
    declarationNumber: '',
    liquidationNumber: '',
    quittanceNumber: '',
    baeNumber: '',
    bsNumber: '',
    vesselName: '',
    voyageNumber: '',
    portOfLoading: '',
    portOfDischarge: '',
    manifestNumber: '',
    cifValue: '',
    exchangeRate: '',
    supplierName: '',
    supplierCountry: '',
    customsOffice: '',
    declarantCode: '',
    declarantName: '',
    deliveryPlace: '',
    deliveryDriver: '',
    deliveryPhone: '',
    deliveryTruck: '',
    status: '' as ShipmentStatus | '',
  });

  useEffect(() => {
    loadShipment();
  }, [shipmentId]);

  const loadShipment = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ shipment: Shipment }>(`/shipments/${shipmentId}`);
      if (res.data?.shipment) {
        const s = res.data.shipment;
        setShipment(s);
        setForm({
          clientName: s.clientName || '',
          clientNif: s.clientNif || '',
          clientPhone: s.clientPhone || '',
          clientAddress: s.clientAddress || '',
          description: s.description || '',
          hsCode: s.hsCode || '',
          blNumber: s.blNumber || '',
          doNumber: s.doNumber || '',
          declarationNumber: s.declarationNumber || '',
          liquidationNumber: s.liquidationNumber || '',
          quittanceNumber: s.quittanceNumber || '',
          baeNumber: s.baeNumber || '',
          bsNumber: s.bsNumber || '',
          vesselName: s.vesselName || '',
          voyageNumber: s.voyageNumber || '',
          portOfLoading: s.portOfLoading || '',
          portOfDischarge: s.portOfDischarge || '',
          manifestNumber: s.manifestNumber || '',
          cifValue: s.cifValue?.toString() || '',
          exchangeRate: s.exchangeRate?.toString() || '',
          supplierName: s.supplierName || '',
          supplierCountry: s.supplierCountry || '',
          customsOffice: s.customsOffice || '',
          declarantCode: s.declarantCode || '',
          declarantName: s.declarantName || '',
          deliveryPlace: s.deliveryPlace || '',
          deliveryDriver: s.deliveryDriver || '',
          deliveryPhone: s.deliveryPhone || '',
          deliveryTruck: s.deliveryTruck || '',
          status: s.status,
        });
      }
    } catch (err) {
      setError('Impossible de charger le dossier');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.clientName.trim() || !form.description.trim()) {
      toast.error('Nom du client et description sont requis');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      // Only send changed fields
      if (shipment) {
        if (form.clientName !== shipment.clientName) payload.clientName = form.clientName;
        if (form.clientNif !== (shipment.clientNif || '')) payload.clientNif = form.clientNif || undefined;
        if (form.clientPhone !== (shipment.clientPhone || '')) payload.clientPhone = form.clientPhone || undefined;
        if (form.clientAddress !== (shipment.clientAddress || '')) payload.clientAddress = form.clientAddress || undefined;
        if (form.description !== shipment.description) payload.description = form.description;
        if (form.hsCode !== (shipment.hsCode || '')) payload.hsCode = form.hsCode || undefined;
        if (form.blNumber !== (shipment.blNumber || '')) payload.blNumber = form.blNumber || undefined;
        if (form.doNumber !== (shipment.doNumber || '')) payload.doNumber = form.doNumber || undefined;
        if (form.declarationNumber !== (shipment.declarationNumber || '')) payload.declarationNumber = form.declarationNumber || undefined;
        if (form.liquidationNumber !== (shipment.liquidationNumber || '')) payload.liquidationNumber = form.liquidationNumber || undefined;
        if (form.quittanceNumber !== (shipment.quittanceNumber || '')) payload.quittanceNumber = form.quittanceNumber || undefined;
        if (form.baeNumber !== (shipment.baeNumber || '')) payload.baeNumber = form.baeNumber || undefined;
        if (form.bsNumber !== (shipment.bsNumber || '')) payload.bsNumber = form.bsNumber || undefined;
        if (form.vesselName !== (shipment.vesselName || '')) payload.vesselName = form.vesselName || undefined;
        if (form.voyageNumber !== (shipment.voyageNumber || '')) payload.voyageNumber = form.voyageNumber || undefined;
        if (form.portOfLoading !== (shipment.portOfLoading || '')) payload.portOfLoading = form.portOfLoading || undefined;
        if (form.portOfDischarge !== (shipment.portOfDischarge || '')) payload.portOfDischarge = form.portOfDischarge || undefined;
        if (form.manifestNumber !== (shipment.manifestNumber || '')) payload.manifestNumber = form.manifestNumber || undefined;
        if (form.cifValue && parseFloat(form.cifValue) !== shipment.cifValue) payload.cifValue = parseFloat(form.cifValue);
        if (form.exchangeRate && parseFloat(form.exchangeRate) !== shipment.exchangeRate) payload.exchangeRate = parseFloat(form.exchangeRate);
        if (form.supplierName !== (shipment.supplierName || '')) payload.supplierName = form.supplierName || undefined;
        if (form.supplierCountry !== (shipment.supplierCountry || '')) payload.supplierCountry = form.supplierCountry || undefined;
        if (form.customsOffice !== (shipment.customsOffice || '')) payload.customsOffice = form.customsOffice || undefined;
        if (form.declarantCode !== (shipment.declarantCode || '')) payload.declarantCode = form.declarantCode || undefined;
        if (form.declarantName !== (shipment.declarantName || '')) payload.declarantName = form.declarantName || undefined;
        if (form.deliveryPlace !== (shipment.deliveryPlace || '')) payload.deliveryPlace = form.deliveryPlace || undefined;
        if (form.deliveryDriver !== (shipment.deliveryDriver || '')) payload.deliveryDriver = form.deliveryDriver || undefined;
        if (form.deliveryPhone !== (shipment.deliveryPhone || '')) payload.deliveryPhone = form.deliveryPhone || undefined;
        if (form.deliveryTruck !== (shipment.deliveryTruck || '')) payload.deliveryTruck = form.deliveryTruck || undefined;
        if (form.status && form.status !== shipment.status) payload.status = form.status;
      }

      if (Object.keys(payload).length === 0) {
        toast.info('Aucune modification détectée');
        onCancel();
        return;
      }

      await api.patch(`/shipments/${shipmentId}`, payload);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="p-6 text-center">
        <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
        <p className="text-slate-600">{error || 'Dossier introuvable'}</p>
        <button onClick={onCancel} className="mt-3 text-blue-600 text-sm font-medium">Retour</button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-slate-200 text-slate-600">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-semibold text-slate-800">Modifier — {shipment.trackingNumber}</h1>
          <p className="text-xs text-slate-500">{shipment.clientName}</p>
        </div>
      </div>

      {/* Status */}
      <Section icon={<FileText size={18} className="text-violet-500" />} title="Statut">
        <select
          value={form.status}
          onChange={(e) => handleChange('status', e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white"
        >
          {STATUS_ORDER.map(s => (
            <option key={s} value={s}>{statusLabels[s] || s}</option>
          ))}
        </select>
      </Section>

      {/* Client */}
      <Section icon={<User size={18} className="text-blue-500" />} title="Client">
        <Field label="Nom *" value={form.clientName} onChange={v => handleChange('clientName', v)} />
        <Field label="NIF" value={form.clientNif} onChange={v => handleChange('clientNif', v)} />
        <Field label="Téléphone" value={form.clientPhone} onChange={v => handleChange('clientPhone', v)} />
        <Field label="Adresse" value={form.clientAddress} onChange={v => handleChange('clientAddress', v)} />
      </Section>

      {/* Marchandise */}
      <Section icon={<Package size={18} className="text-green-500" />} title="Marchandise">
        <Field label="Description *" value={form.description} onChange={v => handleChange('description', v)} />
        <Field label="Code SH" value={form.hsCode} onChange={v => handleChange('hsCode', v)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valeur CIF" value={form.cifValue} onChange={v => handleChange('cifValue', v)} type="number" />
          <Field label="Taux de change" value={form.exchangeRate} onChange={v => handleChange('exchangeRate', v)} type="number" />
        </div>
      </Section>

      {/* Transport */}
      <Section icon={<Ship size={18} className="text-cyan-500" />} title="Transport">
        <Field label="N° BL" value={form.blNumber} onChange={v => handleChange('blNumber', v)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Navire" value={form.vesselName} onChange={v => handleChange('vesselName', v)} />
          <Field label="Voyage" value={form.voyageNumber} onChange={v => handleChange('voyageNumber', v)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Port chargement" value={form.portOfLoading} onChange={v => handleChange('portOfLoading', v)} />
          <Field label="Port déchargement" value={form.portOfDischarge} onChange={v => handleChange('portOfDischarge', v)} />
        </div>
        <Field label="N° manifeste" value={form.manifestNumber} onChange={v => handleChange('manifestNumber', v)} />
      </Section>

      {/* Numéros officiels */}
      <Section icon={<FileText size={18} className="text-purple-500" />} title="Numéros officiels">
        <div className="grid grid-cols-2 gap-3">
          <Field label="N° Déclaration" value={form.declarationNumber} onChange={v => handleChange('declarationNumber', v)} />
          <Field label="N° Liquidation" value={form.liquidationNumber} onChange={v => handleChange('liquidationNumber', v)} />
          <Field label="N° Quittance" value={form.quittanceNumber} onChange={v => handleChange('quittanceNumber', v)} />
          <Field label="N° BAE" value={form.baeNumber} onChange={v => handleChange('baeNumber', v)} />
          <Field label="N° DO" value={form.doNumber} onChange={v => handleChange('doNumber', v)} />
          <Field label="N° Bon de sortie" value={form.bsNumber} onChange={v => handleChange('bsNumber', v)} />
        </div>
      </Section>

      {/* Livraison */}
      <Section icon={<Truck size={18} className="text-orange-500" />} title="Livraison">
        <Field label="Lieu" value={form.deliveryPlace} onChange={v => handleChange('deliveryPlace', v)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Chauffeur" value={form.deliveryDriver} onChange={v => handleChange('deliveryDriver', v)} />
          <Field label="Tél chauffeur" value={form.deliveryPhone} onChange={v => handleChange('deliveryPhone', v)} />
        </div>
        <Field label="N° camion" value={form.deliveryTruck} onChange={v => handleChange('deliveryTruck', v)} />
      </Section>

      {/* Save bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 md:static md:border-0 md:mt-6 md:p-0 z-30">
        <div className="flex gap-3 max-w-2xl mx-auto">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper components
const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="mb-5">
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h2 className="font-medium text-sm text-slate-700">{title}</h2>
    </div>
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      {children}
    </div>
  </div>
);

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}> = ({ label, value, onChange, type = 'text' }) => (
  <div>
    <label className="block text-xs text-slate-500 mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  </div>
);
