// src/pages/TeamManagementView.tsx
// ============================================
// PAGE GESTION D'ÉQUIPE — RÉSERVÉE AU DG
// Onglets : Équipe | Historique connexions | Notifications
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Trash2, Shield, Clock, Bell,
  Loader2, AlertCircle, CheckCircle2,
  Eye, EyeOff, Activity,
  Smartphone, Monitor, Key, UserMinus,
  LogIn, AlertTriangle, Power,
  X,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useToast } from '../components/ui/Toast';
import { formatDate } from '../utils/format';
import type { TeamMember, LoginHistoryEntry, AppNotification, TeamStats } from '../types';

type Tab = 'team' | 'history' | 'notifications';

const ROLE_CONFIG: Record<string, { label: string; color: string; bgColor: string; description: string }> = {
  DIRECTOR: {
    label: 'Directeur Général',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    description: 'Accès total — gestion équipe, finances, dossiers',
  },
  ACCOUNTANT: {
    label: 'Comptable',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    description: 'Finances, factures, provisions et débours',
  },
  AGENT: {
    label: 'Assistant',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    description: 'Création et suivi des dossiers de transit',
  },
  CLIENT: {
    label: 'Passeur',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    description: 'Consultation des dossiers assignés',
  },
};

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  PASSWORD_CHANGED: <Key size={18} className="text-red-500" />,
  PASSWORD_RESET: <Key size={18} className="text-orange-500" />,
  USER_LOGIN: <LogIn size={18} className="text-blue-500" />,
  MEMBER_CREATED: <UserPlus size={18} className="text-green-500" />,
  MEMBER_DELETED: <UserMinus size={18} className="text-red-500" />,
};

export const TeamManagementView: React.FC = () => {
  const [tab, setTab] = useState<Tab>('team');
  const [stats, setStats] = useState<TeamStats | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get<{ stats: TeamStats }>('/team/stats');
      if (res.data?.stats) setStats(res.data.stats);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'team', label: 'Équipe', icon: <Users size={18} /> },
    { id: 'history', label: 'Connexions', icon: <Activity size={18} />, badge: stats?.todayLogins },
    { id: 'notifications', label: 'Alertes', icon: <Bell size={18} />, badge: stats?.unreadNotifs },
  ];

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
          <Shield size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Gestion d'équipe</h1>
          <p className="text-sm text-slate-500">
            {stats ? `${stats.activeMembers} membre${stats.activeMembers > 1 ? 's' : ''} actif${stats.activeMembers > 1 ? 's' : ''}` : 'Chargement...'}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-5">
          <StatCard label="Total" value={stats.totalMembers} color="slate" />
          <StatCard label="Comptable" value={stats.byRole.accountants} color="blue" />
          <StatCard label="Assistants" value={stats.byRole.agents} color="green" />
          <StatCard label="Passeurs" value={stats.byRole.clients} color="purple" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            {t.badge && t.badge > 0 ? (
              <span className="min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'team' && <TeamTab onUpdate={loadStats} />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'notifications' && <NotificationsTab onUpdate={loadStats} />}
    </div>
  );
};

// ============================================
// ONGLET ÉQUIPE
// ============================================

const TeamTab: React.FC<{ onUpdate: () => void }> = ({ onUpdate }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TeamMember | null>(null);
  const toast = useToast();

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ members: TeamMember[] }>('/team/members');
      if (res.data?.members) setMembers(res.data.members);
    } catch (err) {
      toast.error('Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleDelete = async (member: TeamMember) => {
    setDeletingId(member.id);
    try {
      await api.delete(`/team/members/${member.id}`);
      toast.success(`${member.name} a été supprimé(e)`);
      setConfirmDelete(null);
      loadMembers();
      onUpdate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erreur');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (member: TeamMember) => {
    try {
      await api.patch(`/team/members/${member.id}/toggle`);
      toast.success(`${member.name} ${member.isActive ? 'désactivé(e)' : 'activé(e)'}`);
      loadMembers();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erreur');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const directors = members.filter(m => m.role === 'DIRECTOR');
  const collaborators = members.filter(m => m.role !== 'DIRECTOR');

  return (
    <>
      {/* Add button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full mb-5 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium text-sm hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
      >
        <UserPlus size={18} />
        Ajouter un collaborateur
      </button>

      {/* Directors */}
      {directors.map(d => (
        <MemberCard key={d.id} member={d} isDirector onToggle={() => {}} onDelete={() => {}} />
      ))}

      {/* Collaborators */}
      {collaborators.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <Users className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500 font-medium">Aucun collaborateur</p>
          <p className="text-sm text-slate-400 mt-1">Ajoutez votre premier membre d'équipe</p>
        </div>
      ) : (
        <div className="space-y-2">
          {collaborators.map(m => (
            <MemberCard
              key={m.id}
              member={m}
              onToggle={() => handleToggle(m)}
              onDelete={() => setConfirmDelete(m)}
            />
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); loadMembers(); onUpdate(); }}
        />
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <h3 className="font-semibold text-lg text-slate-900">Supprimer {confirmDelete.name} ?</h3>
              <p className="text-sm text-slate-500 mt-1">
                Cette action est irréversible. Tous les accès seront révoqués immédiatement.
              </p>
            </div>

            <div className="bg-red-50 rounded-xl p-3 mb-4">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_CONFIG[confirmDelete.role]?.bgColor} ${ROLE_CONFIG[confirmDelete.role]?.color}`}>
                  {ROLE_CONFIG[confirmDelete.role]?.label}
                </span>
              </div>
              <p className="text-sm text-red-700 mt-1">{confirmDelete.email}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deletingId === confirmDelete.id}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deletingId === confirmDelete.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ============================================
// CARTE MEMBRE
// ============================================

const MemberCard: React.FC<{
  member: TeamMember;
  isDirector?: boolean;
  onToggle: () => void;
  onDelete: () => void;
}> = ({ member, isDirector, onToggle, onDelete }) => {
  const config = ROLE_CONFIG[member.role];

  return (
    <div className={`bg-white border rounded-xl p-4 mb-2 ${
      !member.isActive ? 'opacity-60 border-slate-200' : isDirector ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'
    }`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
          isDirector ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-slate-400 to-slate-600'
        }`}>
          {member.name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm">{member.name}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config?.bgColor} ${config?.color}`}>
              {config?.label}
            </span>
            {!member.isActive && (
              <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                Désactivé
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{member.email}</p>
          {member.phone && <p className="text-xs text-slate-400">{member.phone}</p>}

          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            <span>{member._count.shipments} dossier{member._count.shipments !== 1 ? 's' : ''}</span>
            <span>{member._count.loginHistory} connexion{member._count.loginHistory !== 1 ? 's' : ''}</span>
            {member.lastLogin && (
              <span>Dernière : {formatDate(member.lastLogin)}</span>
            )}
          </div>
        </div>

        {/* Actions (pas pour le DG) */}
        {!isDirector && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onToggle}
              className={`p-2 rounded-lg transition-colors ${
                member.isActive ? 'hover:bg-amber-50 text-amber-500' : 'hover:bg-green-50 text-green-500'
              }`}
              title={member.isActive ? 'Désactiver' : 'Activer'}
            >
              <Power size={16} />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
              title="Supprimer"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// MODAL AJOUT COLLABORATEUR
// ============================================

const AddMemberModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ACCOUNTANT' | 'AGENT' | 'CLIENT'>('AGENT');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const availableRoles: { value: 'ACCOUNTANT' | 'AGENT' | 'CLIENT'; label: string; desc: string; icon: React.ReactNode }[] = [
    { value: 'ACCOUNTANT', label: 'Comptable', desc: 'Accès finances et factures', icon: <span className="text-lg">💼</span> },
    { value: 'AGENT', label: 'Assistant', desc: 'Crée et gère les dossiers', icon: <span className="text-lg">📋</span> },
    { value: 'CLIENT', label: 'Passeur', desc: 'Consultation des dossiers', icon: <span className="text-lg">👤</span> },
  ];

  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) { setError('Le nom est requis'); return; }
    if (!email.trim()) { setError("L'email est requis"); return; }
    if (password.length < 8) { setError('Mot de passe min 8 caractères'); return; }

    setIsLoading(true);
    try {
      await api.post('/team/members', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password,
        role,
      });
      toast.success(`${name} ajouté(e) avec succès !`);
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="font-bold text-lg text-slate-900">Nouveau collaborateur</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Role selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Rôle</label>
            <div className="space-y-2">
              {availableRoles.map(r => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    role === r.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {r.icon}
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${role === r.value ? 'text-blue-700' : 'text-slate-700'}`}>{r.label}</p>
                    <p className="text-xs text-slate-400">{r.desc}</p>
                  </div>
                  {role === r.value && <CheckCircle2 size={20} className="text-blue-500" />}
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet *</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Mamadou Diallo"
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="mamadou@example.com"
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
            <input
              type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+224 XXX XXX XXX"
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe initial *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Le collaborateur pourra le changer après connexion</p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-100 p-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// ONGLET HISTORIQUE DE CONNEXION
// ============================================

const HistoryTab: React.FC = () => {
  const [history, setHistory] = useState<LoginHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await api.get<{ history: LoginHistoryEntry[] }>('/team/login-history?limit=50');
        if (res.data?.history) setHistory(res.data.history);
      } catch { /* silent */ }
      finally { setIsLoading(false); }
    };
    load();
  }, []);

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
  }

  if (history.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
        <Clock className="mx-auto text-slate-300 mb-3" size={48} />
        <p className="text-slate-500">Aucune connexion enregistrée</p>
      </div>
    );
  }

  // Group by date
  const grouped = history.reduce<Record<string, LoginHistoryEntry[]>>((acc, entry) => {
    const date = new Date(entry.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, entries]) => (
        <div key={date}>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">{date}</p>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {entries.map((entry, i) => {
              const config = ROLE_CONFIG[entry.user.role];
              const time = new Date(entry.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

              return (
                <div key={entry.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    entry.success ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {entry.device === 'Mobile' ? (
                      <Smartphone size={16} className={entry.success ? 'text-green-600' : 'text-red-600'} />
                    ) : (
                      <Monitor size={16} className={entry.success ? 'text-green-600' : 'text-red-600'} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-900">{entry.user.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${config?.bgColor} ${config?.color}`}>
                        {config?.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {entry.device} · {entry.browser} · {entry.ipAddress}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-slate-600">{time}</p>
                    {!entry.success && (
                      <span className="text-xs text-red-500 font-medium">Échec</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// ONGLET NOTIFICATIONS
// ============================================

const NotificationsTab: React.FC<{ onUpdate: () => void }> = ({ onUpdate }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  const loadNotifs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ notifications: AppNotification[]; unreadCount: number }>('/team/notifications?limit=50');
      if (res.data) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadNotifs(); }, [loadNotifs]);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/team/notifications/read-all');
      toast.success('Toutes les alertes marquées comme lues');
      loadNotifs();
      onUpdate();
    } catch {
      toast.error('Erreur');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
  }

  return (
    <div>
      {unreadCount > 0 && (
        <button
          onClick={handleMarkAllRead}
          className="w-full mb-4 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
        >
          <CheckCircle2 size={16} />
          Tout marquer comme lu ({unreadCount})
        </button>
      )}

      {notifications.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <Bell className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500">Aucune alerte</p>
          <p className="text-sm text-slate-400 mt-1">Les alertes apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`bg-white border rounded-xl p-4 transition-all ${
                notif.read ? 'border-slate-200' : 'border-blue-200 bg-blue-50/30 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {NOTIF_ICONS[notif.type] || <Bell size={18} className="text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-slate-900">{notif.title}</span>
                    {!notif.read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{notif.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDate(notif.createdAt, { time: true })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// COMPOSANTS UTILITAIRES
// ============================================

const StatCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => {
  const colors: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className={`rounded-xl p-3 ${colors[color] || colors.slate}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-70">{label}</p>
    </div>
  );
};

export default TeamManagementView;
