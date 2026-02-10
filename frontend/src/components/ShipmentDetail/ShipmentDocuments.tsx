// src/components/ShipmentDetail/ShipmentDocuments.tsx

import React, { useState, useRef } from 'react';
import { Plus, FileText, Download, Trash2, Eye, Loader2, X, AlertCircle, Upload, Link2 } from 'lucide-react';
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
  const [isUploading, setIsUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [autoAdvanceMsg, setAutoAdvanceMsg] = useState('');
  const [fieldHintMsg, setFieldHintMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatStatus = (s: string) => {
    const map: Record<string, string> = {
      PENDING: 'En cours', ARRIVED: 'Arrivé', DDI_OBTAINED: 'DDI obtenu',
      DECLARATION_FILED: 'Déclaration déposée', LIQUIDATION_ISSUED: 'Liquidation émise',
      CUSTOMS_PAID: 'Droits payés', BAE_ISSUED: 'BAE émis', TERMINAL_PAID: 'Terminal payé',
      DO_RELEASED: 'DO libéré', EXIT_NOTE_ISSUED: 'Bon de sortie', IN_DELIVERY: 'En livraison',
      DELIVERED: 'Livré',
    };
    return map[s] || s;
  };

  const [newDoc, setNewDoc] = useState({
    type: 'OTHER' as DocumentType,
    name: '',
    url: '',
    reference: '',
    file: null as File | null,
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNewDoc(prev => ({
      ...prev,
      file,
      name: prev.name || file.name.replace(/\.[^.]+$/, ''),
    }));
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/upload`,
      {
        method: 'POST',
        body: formData,
        credentials: 'include',
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Erreur upload');
    }

    const data = await res.json();
    return data.data.url;
  };

  const handleAddDocument = async () => {
    if (!newDoc.name.trim()) {
      setError('Nom du document requis');
      return;
    }
    if (uploadMode === 'url' && !newDoc.url.trim()) {
      setError('URL du fichier requise');
      return;
    }
    if (uploadMode === 'file' && !newDoc.file) {
      setError('Sélectionnez un fichier');
      return;
    }

    setIsAdding(true);
    setError('');

    try {
      let fileUrl = newDoc.url.trim();

      // Upload file first if in file mode
      if (uploadMode === 'file' && newDoc.file) {
        setIsUploading(true);
        fileUrl = await uploadFile(newDoc.file);
        setIsUploading(false);
      }

      const res = await api.post<{
        document: any;
        statusAdvanced?: { advanced: boolean; newStatus?: string; oldStatus?: string };
        fieldHints?: { fields: string[]; label: string } | null;
      }>(`/shipments/${shipment.id}/documents`, {
        type: newDoc.type,
        name: newDoc.name.trim(),
        url: fileUrl,
        reference: newDoc.reference.trim() || undefined,
      });
      
      setShowAddModal(false);
      setNewDoc({ type: 'OTHER', name: '', url: '', reference: '', file: null });
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Show auto-advance notification
      if (res.data?.statusAdvanced?.advanced) {
        setAutoAdvanceMsg(`✅ Statut avancé automatiquement → ${formatStatus(res.data.statusAdvanced.newStatus || '')}`);
        setTimeout(() => setAutoAdvanceMsg(''), 5000);
      }

      // Show field hints if document type has extractable fields
      if (res.data?.fieldHints) {
        setFieldHintMsg(`💡 Document "${res.data.fieldHints.label}" ajouté. Pensez à remplir : ${res.data.fieldHints.fields.slice(0, 4).join(', ')}...`);
        setTimeout(() => setFieldHintMsg(''), 8000);
      }

      onRefresh();
    } catch (err) {
      setIsUploading(false);
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
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
      {/* Auto-advance notification */}
      {autoAdvanceMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 font-medium animate-fade-in">
          {autoAdvanceMsg}
        </div>
      )}

      {/* Field hints notification */}
      {fieldHintMsg && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 animate-fade-in">
          {fieldHintMsg}
        </div>
      )}

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
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
                />
              </div>

              {/* Upload mode toggle */}
              <div>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setUploadMode('file')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      uploadMode === 'file'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Upload size={14} />
                    Fichier
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('url')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      uploadMode === 'url'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Link2 size={14} />
                    URL
                  </button>
                </div>

                {uploadMode === 'file' ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="doc-upload"
                    />
                    <label
                      htmlFor="doc-upload"
                      className="block w-full border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                    >
                      {newDoc.file ? (
                        <div className="flex items-center gap-2 justify-center">
                          <FileText size={18} className="text-blue-500" />
                          <span className="text-sm text-slate-700 font-medium">{newDoc.file.name}</span>
                          <span className="text-xs text-slate-400">
                            ({(newDoc.file.size / 1024).toFixed(0)} Ko)
                          </span>
                        </div>
                      ) : (
                        <div>
                          <Upload size={24} className="text-slate-400 mx-auto mb-1" />
                          <span className="text-sm text-slate-500">
                            Cliquez pour choisir un fichier
                          </span>
                          <p className="text-xs text-slate-400 mt-1">
                            PDF, images, Word, Excel — max 10 Mo
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                ) : (
                  <input
                    type="url"
                    value={newDoc.url}
                    onChange={(e) => setNewDoc(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
                  />
                )}
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
                {isUploading ? 'Téléchargement...' : 'Ajouter'}
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
