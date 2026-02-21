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
    <div className="min-h-screen relative flex flex-col overflow-hidden">

      {/* Background */}
      <div className="absolute inset-0">
        <img src="/hero-bg.png" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/70 via-stone-900/60 to-stone-950/90" />
      </div>

      {/* Header */}
      <div className="p-4 flex items-center gap-3 relative z-10">
        <button onClick={onBack}
          className="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white font-semibold">Connexion</h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-sm">
          
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4">
              <img src="/logo.png" alt="E-Trans" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-white">Bienvenue</h2>
            <p className="text-stone-300 text-sm mt-1">Connectez-vous à votre compte</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {error && (
              <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-300 text-sm backdrop-blur-sm">
                <AlertCircle size={18} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-amber-200/80 uppercase mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-stone-400" size={18} />
                <input type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/30 transition-all placeholder:text-stone-500"
                  placeholder="votre@email.com" autoComplete="email" autoFocus />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-200/80 uppercase mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-stone-400" size={18} />
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl pl-10 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/30 transition-all placeholder:text-stone-500"
                  placeholder="••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-stone-400 hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <button type="button" onClick={() => onForgotPassword?.()}
                className="text-sm text-stone-400 hover:text-amber-400 transition-colors">
                Mot de passe oublié ?
              </button>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 active:scale-[0.97]">
              {isLoading ? (<><Loader2 size={20} className="animate-spin" /> Connexion...</>) : 'Se connecter'}
            </button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-stone-500 text-xs">OU</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div className="text-center">
            <p className="text-stone-400 text-sm">Pas encore de compte ?</p>
            <button onClick={onBack} className="text-amber-400 font-medium hover:text-amber-300 transition-colors mt-1">
              Créer mon entreprise
            </button>
          </div>

        </div>
      </div>

      <div className="p-6 text-center relative z-10">
        <p className="text-stone-500/60 text-xs">© 2026 E-Trans · v3.2</p>
      </div>
    </div>
  );
};

export default LoginScreen;
