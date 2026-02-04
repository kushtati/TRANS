// src/components/ShipmentDetail/ShipmentOverview.tsx

import React from 'react';
import { User, Package, Ship, MapPin, DollarSign, FileText, Truck, Thermometer } from 'lucide-react';
import type { Shipment } from '../../types';

interface ShipmentOverviewProps {
  shipment: Shipment;
}

export const ShipmentOverview: React.FC<ShipmentOverviewProps> = ({ shipment }) => {
  const formatAmount = (amount: number | undefined) => {
    if (!amount) return '-';
    return amount.toLocaleString('fr-FR');
  };

  const getContainerTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      DRY_20: "20' Dry",
      DRY_40: "40' Dry",
      DRY_40HC: "40' HC",
      REEFER_20: "20' Reefer",
      REEFER_40: "40' Reefer",
      REEFER_40HR: "40' HR Reefer",
      OPEN_TOP_20: "20' Open Top",
      OPEN_TOP_40: "40' Open Top",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-4">
      {/* Client */}
      <Card title="Client" icon={<User size={18} />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoItem label="Nom" value={shipment.clientName} />
          <InfoItem label="NIF" value={shipment.clientNif} />
          <InfoItem label="Téléphone" value={shipment.clientPhone} />
          <InfoItem label="Adresse" value={shipment.clientAddress} />
        </div>
      </Card>

      {/* Marchandise */}
      <Card title="Marchandise" icon={<Package size={18} />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoItem label="Description" value={shipment.description} className="col-span-2" />
          <InfoItem label="Code SH" value={shipment.hsCode} mono />
          <InfoItem label="Emballage" value={shipment.packaging} />
          <InfoItem label="Nombre colis" value={shipment.packageCount?.toLocaleString()} />
          <InfoItem label="Poids brut" value={shipment.grossWeight ? `${formatAmount(shipment.grossWeight)} kg` : undefined} />
          <InfoItem label="Poids net" value={shipment.netWeight ? `${formatAmount(shipment.netWeight)} kg` : undefined} />
        </div>
      </Card>

      {/* Conteneurs */}
      {shipment.containers && shipment.containers.length > 0 && (
        <Card title={`Conteneurs (${shipment.containers.length})`} icon={<Package size={18} />}>
          <div className="space-y-3">
            {shipment.containers.map((container) => (
              <div key={container.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-medium text-slate-900">{container.number}</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {getContainerTypeLabel(container.type)}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {container.sealNumber && (
                    <div>
                      <span className="text-slate-500">Scellé: </span>
                      <span className="font-medium">{container.sealNumber}</span>
                    </div>
                  )}
                  {container.grossWeight && (
                    <div>
                      <span className="text-slate-500">Poids: </span>
                      <span className="font-medium">{formatAmount(container.grossWeight)} kg</span>
                    </div>
                  )}
                  {container.packageCount && (
                    <div>
                      <span className="text-slate-500">Colis: </span>
                      <span className="font-medium">{container.packageCount}</span>
                    </div>
                  )}
                  {container.temperature !== undefined && (
                    <div className="flex items-center gap-1">
                      <Thermometer size={14} className="text-blue-500" />
                      <span className="font-medium">{container.temperature}°C</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Transport */}
      <Card title="Transport maritime" icon={<Ship size={18} />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoItem label="N° BL" value={shipment.blNumber} mono highlight />
          <InfoItem label="Navire" value={shipment.vesselName} />
          <InfoItem label="Voyage" value={shipment.voyageNumber} />
          <InfoItem label="Manifeste" value={shipment.manifestNumber ? `${shipment.manifestNumber}/${shipment.manifestYear}` : undefined} />
          <InfoItem label="Port chargement" value={shipment.portOfLoading} />
          <InfoItem label="Port déchargement" value={shipment.portOfDischarge} />
          <InfoItem label="ETA" value={shipment.eta ? new Date(shipment.eta).toLocaleDateString('fr-FR') : undefined} />
          <InfoItem label="ATA" value={shipment.ata ? new Date(shipment.ata).toLocaleDateString('fr-FR') : undefined} />
        </div>
      </Card>

      {/* Fournisseur */}
      {(shipment.supplierName || shipment.supplierCountry) && (
        <Card title="Fournisseur" icon={<MapPin size={18} />}>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Nom" value={shipment.supplierName} />
            <InfoItem label="Pays" value={shipment.supplierCountry} />
          </div>
        </Card>
      )}

      {/* Valeur */}
      <Card title="Valeur" icon={<DollarSign size={18} />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoItem label="Valeur CIF" value={shipment.cifValue ? `${formatAmount(shipment.cifValue)} ${shipment.cifCurrency}` : undefined} highlight />
          <InfoItem label="FOB" value={shipment.fobValue ? `${formatAmount(shipment.fobValue)} ${shipment.cifCurrency}` : undefined} />
          <InfoItem label="Fret" value={shipment.freightValue ? `${formatAmount(shipment.freightValue)} ${shipment.cifCurrency}` : undefined} />
          <InfoItem label="Assurance" value={shipment.insuranceValue ? `${formatAmount(shipment.insuranceValue)} ${shipment.cifCurrency}` : undefined} />
          <InfoItem label="Taux de change" value={shipment.exchangeRate?.toLocaleString('fr-FR')} />
          <InfoItem label="Valeur CIF GNF" value={shipment.cifValueGnf ? `${formatAmount(shipment.cifValueGnf)} GNF` : undefined} />
        </div>
      </Card>

      {/* Douane */}
      <Card title="Douane" icon={<FileText size={18} />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <InfoItem label="Régime" value={shipment.customsRegime} />
          <InfoItem label="Bureau" value={shipment.customsOfficeName || shipment.customsOffice} />
          <InfoItem label="Déclarant" value={shipment.declarantName} />
          <InfoItem label="Code déclarant" value={shipment.declarantCode} mono />
          <InfoItem label="N° DDI" value={shipment.ddiNumber} mono />
          <InfoItem label="N° Déclaration" value={shipment.declarationNumber} mono />
          <InfoItem label="N° Liquidation" value={shipment.liquidationNumber} mono />
          <InfoItem label="N° Quittance" value={shipment.quittanceNumber} mono />
          <InfoItem label="N° BAE" value={shipment.baeNumber} mono />
          <InfoItem label="N° BS" value={shipment.bsNumber} mono />
          {shipment.circuit && (
            <div>
              <span className="text-xs text-slate-500">Circuit</span>
              <div className={`inline-block ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                shipment.circuit === 'GREEN' ? 'bg-green-100 text-green-700' :
                shipment.circuit === 'YELLOW' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {shipment.circuit}
              </div>
            </div>
          )}
        </div>

        {/* Taxes */}
        {shipment.totalDuties && (
          <div className="border-t border-slate-200 pt-4 mt-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Droits et taxes</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <TaxItem label="DD" value={shipment.dutyDD} />
              <TaxItem label="RTL" value={shipment.dutyRTL} />
              <TaxItem label="TVA" value={shipment.dutyTVA} />
              <TaxItem label="PC" value={shipment.dutyPC} />
              <TaxItem label="CA" value={shipment.dutyCA} />
              <TaxItem label="BFU" value={shipment.dutyBFU} />
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded-lg flex justify-between items-center">
              <span className="font-medium text-blue-900">Total droits et taxes</span>
              <span className="text-lg font-bold text-blue-600">{formatAmount(shipment.totalDuties)} GNF</span>
            </div>
          </div>
        )}
      </Card>

      {/* Livraison */}
      {(shipment.deliveryPlace || shipment.deliveryDate) && (
        <Card title="Livraison" icon={<Truck size={18} />}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoItem label="Lieu" value={shipment.deliveryPlace} />
            <InfoItem label="Date" value={shipment.deliveryDate ? new Date(shipment.deliveryDate).toLocaleDateString('fr-FR') : undefined} />
            <InfoItem label="Chauffeur" value={shipment.deliveryDriver} />
            <InfoItem label="Téléphone" value={shipment.deliveryPhone} />
            <InfoItem label="Camion" value={shipment.deliveryTruck} />
          </div>
        </Card>
      )}
    </div>
  );
};

// Sub-components
const Card: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
      <span className="text-slate-500">{icon}</span>
      <span className="font-medium text-slate-700">{title}</span>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const InfoItem: React.FC<{ 
  label: string; 
  value?: string | number | null; 
  mono?: boolean; 
  highlight?: boolean;
  className?: string;
}> = ({ label, value, mono, highlight, className }) => (
  <div className={className}>
    <span className="text-xs text-slate-500 block mb-0.5">{label}</span>
    <span className={`text-sm ${mono ? 'font-mono' : ''} ${highlight ? 'text-blue-600 font-medium' : 'text-slate-900'}`}>
      {value || '-'}
    </span>
  </div>
);

const TaxItem: React.FC<{ label: string; value?: number }> = ({ label, value }) => (
  <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
    <span className="text-sm text-slate-600">{label}</span>
    <span className="text-sm font-medium">{value ? value.toLocaleString('fr-FR') : '-'} GNF</span>
  </div>
);

export default ShipmentOverview;
