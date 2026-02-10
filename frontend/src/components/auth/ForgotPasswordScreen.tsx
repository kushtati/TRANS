// src/components/auth/ForgotPasswordScreen.tsx

import React, { useState } from 'react';
import { Mail, ArrowLeft, Loader2, Lock, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { api, ApiError } from '../../lib/api';

interface ForgotPasswordScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onBack, onSuccess }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleRequestCode = async () => {
    if (!email.trim()) {
      setError('Saisissez votre adresse email');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setStep(2);
      setSuccessMsg('Si cette adresse est enregistrée, un code vous a été envoyé.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');

    if (!code || code.length !== 6) {
      setError('Saisissez le code à 6 chiffres');
      return;
    }
    if (newPassword.length < 8) {
      setError('Mot de passe minimum 8 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/reset-password', {
        email: email.trim(),
        code,
        newPassword,
      });
      setSuccessMsg('Mot de passe réinitialisé ! Vous pouvez maintenant vous connecter.');
      setTimeout(onSuccess, 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Retour</span>
        </button>

        {/* Icon */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <KeyRound size={28} className="text-blue-400" />
          </div>
          <h1 className="text-xl font-bold text-white">
            {step === 1 ? 'Mot de passe oublié' : 'Nouveau mot de passe'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {step === 1
              ? 'Saisissez votre email pour recevoir un code'
              : `Code envoyé à ${email}`}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span className="text-sm text-red-300">{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-400 shrink-0" />
            <span className="text-sm text-green-300">{successMsg}</span>
          </div>
        )}

        {/* Step 1: Email */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-600"
                  onKeyDown={(e) => e.key === 'Enter' && handleRequestCode()}
                />
              </div>
            </div>

            <button
              onClick={handleRequestCode}
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
              Envoyer le code
            </button>
          </div>
        )}

        {/* Step 2: Code + New password */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Code à 6 chiffres</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-center text-lg tracking-[0.3em] font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Nouveau mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Confirmer</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retapez le mot de passe"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-600"
              />
            </div>

            <button
              onClick={handleResetPassword}
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
              Réinitialiser
            </button>

            <button
              onClick={() => { setStep(1); setError(''); setSuccessMsg(''); }}
              className="w-full text-center text-sm text-slate-500 hover:text-slate-300"
            >
              Renvoyer le code
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
