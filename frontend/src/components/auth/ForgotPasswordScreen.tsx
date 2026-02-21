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
    if (!email.trim()) { setError('Saisissez votre adresse email'); return; }
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
    if (!code || code.length !== 6) { setError('Saisissez le code à 6 chiffres'); return; }
    if (newPassword.length < 8) { setError('Mot de passe minimum 8 caractères'); return; }
    if (newPassword !== confirmPassword) { setError('Les mots de passe ne correspondent pas'); return; }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { email: email.trim(), code, newPassword });
      setSuccessMsg('Mot de passe réinitialisé ! Vous pouvez maintenant vous connecter.');
      setTimeout(onSuccess, 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] relative flex items-center justify-center overflow-hidden">

      {/* Background */}
      <div className="absolute inset-0">
        <img src="/hero-bg.png" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/70 via-stone-900/60 to-stone-950/90" />
      </div>

      <div className="w-full max-w-sm p-4 relative z-10">
        {/* Back */}
        <button onClick={onBack}
          className="flex items-center gap-2 text-stone-400 hover:text-white mb-6 transition-colors animate-fade-up tap-highlight active:scale-[0.97]">
          <ArrowLeft size={18} />
          <span className="text-sm">Retour</span>
        </button>

        {/* Icon */}
        <div className="text-center mb-6 animate-fade-up stagger-1">
          <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center mx-auto mb-4">
            <KeyRound size={28} className="text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-white">
            {step === 1 ? 'Mot de passe oublié' : 'Nouveau mot de passe'}
          </h1>
          <p className="text-sm text-stone-300 mt-1">
            {step === 1 ? 'Saisissez votre email pour recevoir un code' : `Code envoyé à ${email}`}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center gap-2 backdrop-blur-sm animate-scale-in">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span className="text-sm text-red-300">{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-green-500/15 border border-green-500/30 rounded-xl flex items-center gap-2 backdrop-blur-sm animate-scale-in">
            <CheckCircle2 size={16} className="text-green-400 shrink-0" />
            <span className="text-sm text-green-300">{successMsg}</span>
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="animate-fade-up stagger-2">
              <label className="block text-sm text-amber-200/80 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full glass-strong text-white rounded-2xl pl-10 pr-4 py-[14px] text-sm focus:ring-2 focus:ring-amber-500/50 placeholder:text-stone-500 focus:outline-none transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleRequestCode()} />
              </div>
            </div>
            <button onClick={handleRequestCode} disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 rounded-2xl font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-600/20 active:scale-[0.97] tap-highlight animate-fade-up stagger-3">
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
              Envoyer le code
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="animate-fade-up stagger-1">
              <label className="block text-sm text-amber-200/80 mb-1.5">Code à 6 chiffres</label>
              <input type="text" value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456" maxLength={6}
                className="w-full glass-strong text-white rounded-2xl px-4 py-[14px] text-center text-lg tracking-[0.3em] font-mono focus:ring-2 focus:ring-amber-500/50 placeholder:text-stone-500 focus:outline-none transition-all" />
            </div>
            <div className="animate-fade-up stagger-2">
              <label className="block text-sm text-amber-200/80 mb-1.5">Nouveau mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  className="w-full glass-strong text-white rounded-2xl pl-10 pr-4 py-[14px] text-sm focus:ring-2 focus:ring-amber-500/50 placeholder:text-stone-500 focus:outline-none transition-all" />
              </div>
            </div>
            <div className="animate-fade-up stagger-3">
              <label className="block text-sm text-amber-200/80 mb-1.5">Confirmer</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retapez le mot de passe"
                className="w-full glass-strong text-white rounded-2xl px-4 py-[14px] text-sm focus:ring-2 focus:ring-amber-500/50 placeholder:text-stone-500 focus:outline-none transition-all" />
            </div>
            <button onClick={handleResetPassword} disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 rounded-2xl font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-600/20 active:scale-[0.97] tap-highlight animate-fade-up stagger-4">
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
              Réinitialiser
            </button>
            <button onClick={() => { setStep(1); setError(''); setSuccessMsg(''); }}
              className="w-full text-center text-sm text-stone-400 hover:text-amber-400 transition-colors animate-fade-up stagger-5">
              Renvoyer le code
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
