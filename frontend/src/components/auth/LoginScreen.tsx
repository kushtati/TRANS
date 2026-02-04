// src/components/auth/LoginScreen.tsx

import React, { useState } from 'react';
import { 
  Mail, Lock, ArrowLeft, Loader2, Eye, EyeOff, 
  AlertCircle, Zap 
} from 'lucide-react';
import { api, ApiError } from '../../lib/api';

interface LoginScreenProps {
  onBack: () => void;
  onSuccess: (user: any) => void;
  onNeedsVerification: (email: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onBack, 
  onSuccess,
  onNeedsVerification,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ============================================
  // HANDLERS
  // ============================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation basique
    if (!email.trim()) {
      setError('Email requis');
      return;
    }
    if (!password) {
      setError('Mot de passe requis');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.post<{ user: any }>('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      onSuccess(response.data?.user);
    } catch (err) {
      if (err instanceof ApiError) {
        // Email non vérifié → rediriger vers vérification
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

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white font-semibold">Connexion</h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
              <Zap size={32} className="text-white" fill="currentColor" />
            </div>
            <h2 className="text-2xl font-bold text-white">Bienvenue</h2>
            <p className="text-slate-400 text-sm mt-1">
              Connectez-vous à votre compte
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-sm animate-shake">
                <AlertCircle size={18} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="votre@email.com"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-10 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-blue-400 transition-colors"
                onClick={() => {
                  // TODO: Implement forgot password
                  alert('Fonctionnalité à venir');
                }}
              >
                Mot de passe oublié ?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </button>

          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-slate-500 text-xs">OU</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-slate-500 text-sm">
              Pas encore de compte ?
            </p>
            <button
              onClick={onBack}
              className="text-blue-400 font-medium hover:text-blue-300 transition-colors mt-1"
            >
              Créer mon entreprise
            </button>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="p-6 text-center">
        <p className="text-slate-600 text-xs">
          © 2026 E-Trans · v3.0.0
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
