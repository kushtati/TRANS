// src/components/ShipmentDetail/ShipmentDocuments.tsx

import React, { useState } from 'react';
import { Plus, FileText, Download, Trash2, Eye, Loader2, X, AlertCircle } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import type { Shipment, DocumentType } from '../../types';

interface ShipmentDocumentsProps {
  shipment: Shipment;
  onRefresh: () => void;
}

const documentTypeLabels: Record<DocumentType, string> = {
  BL: 'Connaissement (BL)',
  INVOICE: 'Facture commerciale',
  PACKING_LIST: 'Liste de colisage',
  DDI: 'DDI',
  PHYTO_CERT: 'Certificat phytosanitaire',
  ORIGIN_CERT: "Certificat d'origine",
  EUR1: 'EUR1',
  TRANSIT_ORDER: 'Ordre de transit',
  DECLARATION: 'Déclaration en douane',
  LIQUIDATION: 'Liquidation',
  QUITTANCE: 'Quittance',
  BAE: 'BAE',
  DO: 'Delivery Order',
  EXIT_NOTE: 'Bon de sortie',
  EIR: 'EIR',
  TERMINAL_INVOICE: 'Facture terminal',
  TERMINAL_RECEIPT: 'Reçu terminal',
  MSC_INVOICE: 'Facture armateur',
  DELIVERY_NOTE: 'Bon de livraison',
  CUSTOMS_INVOICE: 'Facture douane',
  OTHER: 'Autre',
};

const documentTypeColors: Record<string, string> = {
  BL: 'bg-blue-100 text-blue-700',
  INVOICE: 'bg-green-100 text-green-700',
  DDI: 'bg-purple-100 text-purple-700',
  DECLARATION: 'bg-indigo-100 text-indigo-700',
  QUITTANCE: 'bg-amber-100 text-amber-700',
  BAE: 'bg-cyan-100 text-cyan-700',
};

export const ShipmentDocuments: React.FC<ShipmentDocumentsProps> = ({ shipment, onRefresh }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [newDoc, setNewDoc] = useState({
    type: 'OTHER' as DocumentType,
    name: '',
    url: '',
    reference: '',
  });

  const handleAddDocument = async () => {
    if (!newDoc.name.trim() || !newDoc.url.trim()) {
      setError('Nom et URL requis');
      return;
    }

    setIsAdding(true);
    setError('');

    try {
      await api.post(`/shipments/${shipment.id}/documents`, {
        type: newDoc.type,
        name: newDoc.name.trim(),
        url: newDoc.url.trim(),
        reference: newDoc.reference.trim() || undefined,
      });
      
      setShowAddModal(false);
      setNewDoc({ type: 'OTHER', name: '', url: '', reference: '' });
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await api.delete(`/shipments/${shipment.id}/documents/${docId}`);
      setDeleteId(null);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Group documents by type
  const groupedDocs = shipment.documents?.reduce((acc, doc) => {
    if (!acc[doc.type]) acc[doc.type] = [];
    acc[doc.type].push(doc);
    return acc;
  }, {} as Record<string, typeof shipment.documents>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-900">
          {shipment.documents?.length || 0} document(s)
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      {/* Documents list */}
      {!shipment.documents || shipment.documents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <FileText className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500 mb-1">Aucun document</p>
          <p className="text-sm text-slate-400">Ajoutez des documents à ce dossier</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedDocs || {}).map(([type, docs]) => (
            <div key={type} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${documentTypeColors[type] || 'bg-slate-100 text-slate-600'}`}>
                  {documentTypeLabels[type as DocumentType] || type}
                </span>
                <span className="text-xs text-slate-400">({docs?.length})</span>
              </div>
              
              <div className="divide-y divide-slate-100">
                {docs?.map((doc) => (
                  <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{doc.name}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        {doc.reference && <span>Réf: {doc.reference}</span>}
                        {doc.issueDate && <span>{new Date(doc.issueDate).toLocaleDateString('fr-FR')}</span>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Eye size={18} />
                      </a>
                      <a
                        href={doc.url}
                        download
                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                      >
                        <Download size={18} />
                      </a>
                      <button
                        onClick={() => setDeleteId(doc.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Ajouter un document</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Type</label>
                <select
                  value={newDoc.type}
                  onChange={(e) => setNewDoc(prev => ({ ...prev, type: e.target.value as DocumentType }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
                >
                  {Object.entries(documentTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">Nom du document *</label>
                <input
                  type="text"
                  value={newDoc.name}
                  onChange={(e) => setNewDoc(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: BL MEDU09243710"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">URL du fichier *</label>
                <input
                  type="url"
                  value={newDoc.url}
                  onChange={(e) => setNewDoc(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">Référence</label>
                <input
                  type="text"
                  value={newDoc.reference}
                  onChange={(e) => setNewDoc(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="Optionnel"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleAddDocument}
                disabled={isAdding}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isAdding && <Loader2 size={18} className="animate-spin" />}
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
            <Trash2 className="mx-auto text-red-500 mb-4" size={40} />
            <h3 className="font-semibold text-lg mb-2">Supprimer ce document ?</h3>
            <p className="text-slate-500 text-sm mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipmentDocuments;
