// src/components/auth/LoginScreen.tsx

import React, { useState } from 'react';
import { 
  Mail, Lock, ArrowLeft, Loader2, Eye, EyeOff, 
  AlertCircle 
} from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import type { User } from '../../types';

interface LoginScreenProps {
  onBack: () => void;
  onSuccess: (user: User) => void;
  onNeedsVerification: (email: string) => void;
  onForgotPassword?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onBack, 
  onSuccess,
  onNeedsVerification,
  onForgotPassword,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email requis'); return; }
    if (!password) { setError('Mot de passe requis'); return; }
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post<{ user: User }>('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      if (response.data?.user) onSuccess(response.data.user);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.message.includes('non vérifié') || err.code === 'EMAIL_NOT_VERIFIED') {
          onNeedsVerification(email.trim().toLowerCase());
          return;
        }
        setError(err.message);
      } else {
        setError('Erreur de connexion');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] relative flex flex-col overflow-hidden">

      {/* Background */}
      <div className="absolute inset-0">
        <img src="/hero-bg.webp" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/75 via-stone-900/65 to-stone-950/92" />
      </div>

      {/* Header — safe area */}
      <div className="pt-[env(safe-area-inset-top)]" />
      <div className="p-4 flex items-center gap-3 relative z-10 animate-fade-up">
        <button onClick={onBack}
          className="p-2.5 rounded-full glass tap-highlight active:scale-95 transition-all text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white/90 font-semibold text-[17px]">Connexion</h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-6 relative z-10 scroll-smooth-ios">
        <div className="w-full max-w-sm">
          
          {/* Logo */}
          <div className="text-center mb-8 animate-fade-up stagger-1">
            <div className="w-20 h-20 mx-auto mb-4 animate-float">
              <img src="/logo.webp" alt="E-Trans" className="w-full h-full object-contain drop-shadow-[0_4px_20px_rgba(245,158,11,0.12)]" />
            </div>
            <h2 className="text-[26px] font-bold text-white tracking-tight">Bienvenue</h2>
            <p className="text-stone-400 text-[13px] mt-1">Connectez-vous à votre compte</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {error && (
              <div className="p-3.5 glass border-red-500/20 !bg-red-500/10 rounded-2xl flex items-center gap-2.5 text-red-300 text-[13px] animate-scale-in">
                <AlertCircle size={18} className="flex-shrink-0 text-red-400" />
                {error}
              </div>
            )}

            {/* Email */}
            <div className="animate-fade-up stagger-2">
              <label className="block text-[11px] font-semibold text-amber-200/70 uppercase tracking-wider mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-[15px] text-stone-500" size={18} />
                <input type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  className="w-full glass-strong text-white rounded-2xl pl-11 pr-4 py-[14px] text-[15px] focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all placeholder:text-stone-600"
                  placeholder="votre@email.com" autoComplete="email" autoFocus />
              </div>
            </div>

            {/* Password */}
            <div className="animate-fade-up stagger-3">
              <label className="block text-[11px] font-semibold text-amber-200/70 uppercase tracking-wider mb-2">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-[15px] text-stone-500" size={18} />
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  className="w-full glass-strong text-white rounded-2xl pl-11 pr-12 py-[14px] text-[15px] focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all placeholder:text-stone-600"
                  placeholder="••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-[14px] text-stone-500 hover:text-white active:scale-90 transition-all p-0.5">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-right animate-fade-up stagger-3">
              <button type="button" onClick={() => onForgotPassword?.()}
                className="text-[13px] text-stone-500 hover:text-amber-400 active:text-amber-300 transition-colors py-1">
                Mot de passe oublié ?
              </button>
            </div>

            {/* Submit */}
            <div className="animate-fade-up stagger-4 pt-1">
              <button type="submit" disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-bold rounded-2xl transition-all disabled:opacity-60 flex items-center justify-center gap-2.5 shadow-[0_8px_32px_-4px_rgba(245,158,11,0.3)] active:scale-[0.97] active:shadow-[0_4px_16px_-4px_rgba(245,158,11,0.4)] text-[15px]">
                {isLoading ? (<><Loader2 size={20} className="animate-spin" /> Connexion...</>) : 'Se connecter'}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-7 animate-fade-up stagger-5">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="text-stone-600 text-[11px] uppercase tracking-wider">ou</span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          {/* Register */}
          <div className="text-center animate-fade-up stagger-5">
            <p className="text-stone-500 text-[13px]">Pas encore de compte ?</p>
            <button onClick={onBack} className="text-amber-400 font-semibold hover:text-amber-300 active:text-amber-200 transition-colors mt-1.5 text-[15px]">
              Créer mon entreprise
            </button>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center relative z-10">
        <p className="text-stone-600/50 text-[10px] tracking-[0.15em]">© 2026 E-Trans · v4.0</p>
      </div>
    </div>
  );
};

export default LoginScreen;
