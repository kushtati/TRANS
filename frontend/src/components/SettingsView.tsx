// src/components/SettingsView.tsx

import React, { useState } from 'react';
import {
  User as UserIcon, Building2, Shield, Bell, LogOut,
  ChevronRight, Lock, Eye, EyeOff, Loader2,
  CheckCircle2, AlertCircle, Moon,
} from 'lucide-react';
import type { User as UserType } from '../types';
import { api, ApiError } from '../lib/api';
import { useToast } from './ui/Toast';
import { useTheme } from '../contexts/ThemeContext';

interface SettingsViewProps {
  user: UserType;
  onLogout: () => void;
  onNavigate?: (view: string) => void;
}

type Section = 'main' | 'profile' | 'company' | 'security' | 'notifications';

export const SettingsView: React.FC<SettingsViewProps> = ({ user, onLogout, onNavigate }) => {
  const [activeSection, setActiveSection] = useState<Section>('main');
  const { isDark, toggle } = useTheme();

  if (activeSection === 'profile') {
    return <ProfileSection user={user} onBack={() => setActiveSection('main')} />;
  }

  if (activeSection === 'company') {
    return <CompanySection user={user} onBack={() => setActiveSection('main')} />;
  }

  if (activeSection === 'security') {
    return <SecuritySection onBack={() => setActiveSection('main')} />;
  }

  if (activeSection === 'notifications') {
    return <NotificationsSection onBack={() => setActiveSection('main')} />;
  }

  const roleLabels: Record<string, string> = {
    DIRECTOR: 'Directeur',
    ACCOUNTANT: 'Comptable',
    AGENT: 'Agent',
    CLIENT: 'Client',
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Paramètres</h1>

      {/* User Card */}
      <div className="bg-white rounded-xl p-4 border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-lg text-slate-900">{user.name}</h2>
            <p className="text-sm text-slate-500">{user.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              {roleLabels[user.role] || user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <MenuItem
          icon={<UserIcon size={20} className="text-blue-500" />}
          label="Mon profil"
          sublabel="Nom, téléphone"
          onClick={() => setActiveSection('profile')}
        />
        <MenuItem
          icon={<Building2 size={20} className="text-purple-500" />}
          label="Entreprise"
          sublabel={user.company.name}
          onClick={() => setActiveSection('company')}
        />
        <MenuItem
          icon={<Shield size={20} className="text-green-500" />}
          label="Sécurité"
          sublabel="Mot de passe"
          onClick={() => setActiveSection('security')}
        />
        <MenuItem
          icon={<Bell size={20} className="text-orange-500" />}
          label="Notifications"
          sublabel="Préférences"
          onClick={() => setActiveSection('notifications')}
        />
        {user.role === 'DIRECTOR' && onNavigate && (
          <MenuItem
            icon={<Shield size={20} className="text-slate-500" />}
            label="Journal d'audit"
            sublabel="Historique des actions"
            onClick={() => onNavigate('audit')}
          />
        )}
      </div>

      {/* Dark mode toggle */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Moon size={20} className="text-indigo-500" />
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Mode sombre</p>
              <p className="text-xs text-slate-400">{isDark ? 'Activé' : 'Désactivé'}</p>
            </div>
          </div>
          <button
            onClick={toggle}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              isDark ? 'bg-indigo-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                isDark ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors"
      >
        <LogOut size={18} />
        Déconnexion
      </button>

      <p className="text-center text-xs text-slate-400">E-Trans v2.2.0</p>
    </div>
  );
};

// ============================================
// Shared Components
// ============================================

const MenuItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
}> = ({ icon, label, sublabel, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
  >
    {icon}
    <div className="flex-1 text-left">
      <p className="text-sm font-medium text-slate-800">{label}</p>
      {sublabel && <p className="text-xs text-slate-400">{sublabel}</p>}
    </div>
    <ChevronRight size={18} className="text-slate-400" />
  </button>
);

const SectionLayout: React.FC<{
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}> = ({ title, onBack, children }) => (
  <div className="p-4 max-w-2xl mx-auto">
    <button onClick={onBack} className="flex items-center gap-2 text-slate-600 mb-4 hover:text-slate-800 transition-colors">
      <ChevronRight size={20} className="rotate-180" />
      <span className="text-sm">Retour</span>
    </button>
    <h1 className="text-xl font-bold text-slate-900 mb-4">{title}</h1>
    {children}
  </div>
);

// ============================================
// Profile Section — REAL API
// ============================================

const ProfileSection: React.FC<{ user: UserType; onBack: () => void }> = ({ user, onBack }) => {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Le nom est requis');
      return;
    }

    setIsLoading(true);
    try {
      await api.patch('/user/profile', { name: name.trim(), phone: phone.trim() || undefined });
      toast.success('Profil mis à jour');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SectionLayout title="Mon profil" onBack={onBack}>
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <div>
          <label className="block text-sm text-slate-600 mb-1">Nom complet</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Email</label>
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2.5 text-sm text-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Téléphone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+224 XXX XXX XXX"
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm disabled:opacity-60 flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
        >
          {isLoading && <Loader2 size={18} className="animate-spin" />}
          Enregistrer
        </button>
      </div>
    </SectionLayout>
  );
};

// ============================================
// Company Section (read-only for non-directors)
// ============================================

const CompanySection: React.FC<{ user: UserType; onBack: () => void }> = ({ user, onBack }) => (
  <SectionLayout title="Entreprise" onBack={onBack}>
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
      <InfoRow label="Nom" value={user.company.name} />
      <InfoRow label="Identifiant" value={user.company.slug} />
      {user.company.phone && <InfoRow label="Téléphone" value={user.company.phone} />}
      {user.company.address && <InfoRow label="Adresse" value={user.company.address} />}
      <div className="pt-2 border-t border-slate-100">
        <p className="text-xs text-slate-400">
          Pour modifier les informations de l'entreprise, contactez un administrateur.
        </p>
      </div>
    </div>
  </SectionLayout>
);

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <label className="block text-xs text-slate-400 mb-0.5">{label}</label>
    <p className="text-sm text-slate-800 font-medium">{value}</p>
  </div>
);

// ============================================
// Security Section — REAL API
// ============================================

const SecuritySection: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const handleChangePassword = async () => {
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Tous les champs sont requis');
      return;
    }
    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/user/change-password', { currentPassword, newPassword });
      toast.success('Mot de passe modifié avec succès');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erreur';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SectionLayout title="Sécurité" onBack={onBack}>
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <h3 className="font-medium text-slate-900">Changer le mot de passe</h3>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle size={18} className="shrink-0" />
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm text-slate-600 mb-1">Mot de passe actuel</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg pl-10 pr-12 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Nouveau mot de passe</label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 8 caractères"
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Confirmer</label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Retapez le nouveau mot de passe"
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={handleChangePassword}
          disabled={isLoading}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm disabled:opacity-60 flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
        >
          {isLoading && <Loader2 size={18} className="animate-spin" />}
          Modifier le mot de passe
        </button>
      </div>
    </SectionLayout>
  );
};

// ============================================
// Notifications Section
// ============================================

const NotificationsSection: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [statusUpdates, setStatusUpdates] = useState(true);
  const [financeAlerts, setFinanceAlerts] = useState(true);
  const toast = useToast();

  const handleSave = () => {
    // Notifications preferences will be persisted when the backend supports it
    toast.info('Préférences enregistrées localement');
  };

  return (
    <SectionLayout title="Notifications" onBack={onBack}>
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <ToggleRow
          label="Notifications par email"
          description="Recevoir un email pour les événements importants"
          checked={emailNotifs}
          onChange={setEmailNotifs}
        />
        <ToggleRow
          label="Mises à jour de statut"
          description="Être notifié quand un dossier change de statut"
          checked={statusUpdates}
          onChange={setStatusUpdates}
        />
        <ToggleRow
          label="Alertes financières"
          description="Solde négatif, débours en attente"
          checked={financeAlerts}
          onChange={setFinanceAlerts}
        />

        <button
          onClick={handleSave}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          Enregistrer
        </button>
      </div>
    </SectionLayout>
  );
};

const ToggleRow: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
    <div className="flex-1">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="text-xs text-slate-400">{description}</p>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);
