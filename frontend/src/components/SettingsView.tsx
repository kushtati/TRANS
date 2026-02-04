// src/components/SettingsView.tsx

import React, { useState } from 'react';
import { User as UserIcon, Building2, Shield, Bell, LogOut, ChevronRight, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { User as UserType } from '../types';

interface SettingsViewProps {
  user: UserType;
  onLogout: () => void;
}

type Section = 'main' | 'profile' | 'company' | 'security' | 'notifications';

export const SettingsView: React.FC<SettingsViewProps> = ({ user, onLogout }) => {
  const [activeSection, setActiveSection] = useState<Section>('main');

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
              {user.role === 'DIRECTOR' ? 'Directeur' : 
               user.role === 'ACCOUNTANT' ? 'Comptable' : 
               user.role === 'AGENT' ? 'Agent' : 'Client'}
            </span>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
        <MenuItem
          icon={<UserIcon size={20} />}
          label="Mon profil"
          sublabel="Nom, email, téléphone"
          onClick={() => setActiveSection('profile')}
        />
        <MenuItem
          icon={<Building2 size={20} />}
          label="Entreprise"
          sublabel={user.company.name}
          onClick={() => setActiveSection('company')}
        />
        <MenuItem
          icon={<Shield size={20} />}
          label="Sécurité"
          sublabel="Mot de passe"
          onClick={() => setActiveSection('security')}
        />
        <MenuItem
          icon={<Bell size={20} />}
          label="Notifications"
          sublabel="Alertes, emails"
          onClick={() => setActiveSection('notifications')}
        />
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full p-4 bg-white rounded-xl border border-red-200 text-red-600 flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
      >
        <LogOut size={20} />
        <span className="font-medium">Déconnexion</span>
      </button>

      {/* App Info */}
      <div className="text-center py-4">
        <p className="text-sm text-slate-500">E-Trans v3.0.0</p>
        <p className="text-xs text-slate-400">© 2026 Emergence Transit Guinée</p>
      </div>
    </div>
  );
};

// Sub-components
const MenuItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onClick: () => void;
}> = ({ icon, label, sublabel, onClick }) => (
  <button
    onClick={onClick}
    className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
  >
    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
      {icon}
    </div>
    <div className="flex-1 text-left">
      <p className="font-medium text-slate-900">{label}</p>
      <p className="text-sm text-slate-500">{sublabel}</p>
    </div>
    <ChevronRight size={20} className="text-slate-400" />
  </button>
);

const SectionLayout: React.FC<{
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}> = ({ title, onBack, children }) => (
  <div className="p-4 max-w-2xl mx-auto">
    <button onClick={onBack} className="flex items-center gap-2 text-slate-600 mb-4">
      <ChevronRight size={20} className="rotate-180" />
      <span>Retour</span>
    </button>
    <h1 className="text-xl font-bold text-slate-900 mb-4">{title}</h1>
    {children}
  </div>
);

const ProfileSection: React.FC<{ user: UserType; onBack: () => void }> = ({ user, onBack }) => {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    // API call would go here
    await new Promise(r => setTimeout(r, 500));
    setIsLoading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
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
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Email</label>
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2.5 text-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Téléphone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+224 XXX XXX XXX"
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
          />
        </div>

        {success && (
          <div className="p-3 bg-green-50 text-green-600 rounded-lg flex items-center gap-2">
            <CheckCircle2 size={18} />
            Profil mis à jour
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 size={18} className="animate-spin" />}
          Enregistrer
        </button>
      </div>
    </SectionLayout>
  );
};

const CompanySection: React.FC<{ user: UserType; onBack: () => void }> = ({ user, onBack }) => (
  <SectionLayout title="Entreprise" onBack={onBack}>
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
      <InfoRow label="Nom" value={user.company.name} />
      <InfoRow label="Identifiant" value={user.company.slug} mono />
      {user.company.phone && <InfoRow label="Téléphone" value={user.company.phone} />}
      {user.company.address && <InfoRow label="Adresse" value={user.company.address} />}
    </div>

    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
      <p className="text-sm text-amber-700">
        Pour modifier les informations de l'entreprise, contactez l'administrateur.
      </p>
    </div>
  </SectionLayout>
);

const SecuritySection: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
    // API call would go here
    await new Promise(r => setTimeout(r, 500));
    setIsLoading(false);
    setSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <SectionLayout title="Sécurité" onBack={onBack}>
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <h3 className="font-medium text-slate-900">Changer le mot de passe</h3>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 text-green-600 rounded-lg flex items-center gap-2">
            <CheckCircle2 size={18} />
            Mot de passe modifié
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
              className="w-full border border-slate-300 rounded-lg pl-10 pr-12 py-2.5"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Nouveau mot de passe</label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 8 caractères"
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Confirmer</label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowPasswords(!showPasswords)}
          className="flex items-center gap-2 text-sm text-slate-600"
        >
          {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
          {showPasswords ? 'Masquer' : 'Afficher'} les mots de passe
        </button>

        <button
          onClick={handleChangePassword}
          disabled={isLoading}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 size={18} className="animate-spin" />}
          Changer le mot de passe
        </button>
      </div>
    </SectionLayout>
  );
};

const NotificationsSection: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [statusUpdates, setStatusUpdates] = useState(true);
  const [financialAlerts, setFinancialAlerts] = useState(true);
  const [dailySummary, setDailySummary] = useState(false);

  return (
    <SectionLayout title="Notifications" onBack={onBack}>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
        <ToggleRow
          label="Notifications par email"
          description="Recevoir les notifications par email"
          checked={emailNotifs}
          onChange={setEmailNotifs}
        />
        <ToggleRow
          label="Mises à jour de statut"
          description="Quand un dossier change de statut"
          checked={statusUpdates}
          onChange={setStatusUpdates}
        />
        <ToggleRow
          label="Alertes financières"
          description="Solde faible, débours impayés"
          checked={financialAlerts}
          onChange={setFinancialAlerts}
        />
        <ToggleRow
          label="Résumé quotidien"
          description="Recevoir un résumé chaque jour"
          checked={dailySummary}
          onChange={setDailySummary}
        />
      </div>
    </SectionLayout>
  );
};

const InfoRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div>
    <span className="text-xs text-slate-500 block mb-0.5">{label}</span>
    <span className={`text-slate-900 ${mono ? 'font-mono' : ''}`}>{value}</span>
  </div>
);

const ToggleRow: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <div className="p-4 flex items-center justify-between">
    <div>
      <p className="font-medium text-slate-900">{label}</p>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`w-12 h-7 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-200'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

export default SettingsView;
