// src/pages/AuditTrailView.tsx

import React, { useState, useEffect } from 'react';
import {
  Shield, Loader2, AlertCircle, ChevronLeft, ChevronRight,
  User, FileText, DollarSign, Lock, Trash2, Edit,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { formatDate } from '../utils/format';

interface AuditLog {
  id: string;
  action: string;
  entity?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  SHIPMENT_CREATED: <FileText size={14} className="text-blue-500" />,
  SHIPMENT_UPDATED: <Edit size={14} className="text-amber-500" />,
  STATUS_CHANGED: <Edit size={14} className="text-violet-500" />,
  EXPENSE_CREATED: <DollarSign size={14} className="text-green-500" />,
  EXPENSE_PAID: <DollarSign size={14} className="text-emerald-500" />,
  EXPENSE_DELETED: <Trash2 size={14} className="text-red-500" />,
  DOCUMENT_ADDED: <FileText size={14} className="text-cyan-500" />,
  DOCUMENT_DELETED: <Trash2 size={14} className="text-red-400" />,
  SHIPMENT_DELETED: <Trash2 size={14} className="text-red-600" />,
  PASSWORD_CHANGED: <Lock size={14} className="text-orange-500" />,
  LOGIN: <User size={14} className="text-green-500" />,
};

const ACTION_LABELS: Record<string, string> = {
  SHIPMENT_CREATED: 'Dossier créé',
  SHIPMENT_UPDATED: 'Dossier modifié',
  STATUS_CHANGED: 'Statut modifié',
  EXPENSE_CREATED: 'Dépense ajoutée',
  EXPENSE_PAID: 'Dépense payée',
  EXPENSE_DELETED: 'Dépense supprimée',
  DOCUMENT_ADDED: 'Document ajouté',
  DOCUMENT_DELETED: 'Document supprimé',
  SHIPMENT_DELETED: 'Dossier supprimé',
  PASSWORD_CHANGED: 'Mot de passe modifié',
  LOGIN: 'Connexion',
  'Profile updated': 'Profil modifié',
};

export const AuditTrailView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 30, total: 0, pages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const loadLogs = async (page: number = 1) => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30' });
      if (entityFilter) params.set('entity', entityFilter);

      const res = await api.get<{ logs: AuditLog[]; pagination: Pagination }>(
        `/audit?${params.toString()}`
      );

      if (res.data) {
        setLogs(res.data.logs);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError('Accès réservé aux directeurs');
      } else {
        setError('Erreur de chargement');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [entityFilter]);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
          <Shield size={20} className="text-slate-600" />
        </div>
        <div>
          <h1 className="font-semibold text-slate-800">Journal d'audit</h1>
          <p className="text-xs text-slate-500">Historique des actions ({pagination.total})</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {['', 'Shipment', 'Expense', 'User'].map(entity => (
          <button
            key={entity}
            onClick={() => setEntityFilter(entity)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              entityFilter === entity
                ? 'bg-slate-800 text-white'
                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {entity || 'Tout'}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertCircle size={28} className="text-red-400 mx-auto mb-2" />
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12">
          <Shield size={28} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Aucune activité enregistrée</p>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            {logs.map(log => (
              <div
                key={log.id}
                className="flex items-start gap-3 bg-white border border-slate-100 rounded-xl px-3 py-2.5"
              >
                <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center mt-0.5 shrink-0">
                  {ACTION_ICONS[log.action] || <FileText size={14} className="text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                    {log.entity && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                        {log.entity}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">
                      {log.user?.name || 'Système'}
                    </span>
                    <span className="text-xs text-slate-300">•</span>
                    <span className="text-xs text-slate-400">
                      {formatDate(log.createdAt, { time: true })}
                    </span>
                  </div>
                  {log.entityId && (
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      ID: {log.entityId}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => loadLogs(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-slate-500">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                onClick={() => loadLogs(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="p-2 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
