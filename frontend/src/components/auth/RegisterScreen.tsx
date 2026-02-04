// src/components/auth/RegisterScreen.tsx

import React, { useState } from 'react';
import { Building2, User, Mail, Lock, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '../../lib/api';

interface RegisterScreenProps {
  onSuccess: (email: string) => void;
  onLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onSuccess, onLogin }) => {
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const totalSteps = 2;

  const validateStep1 = () => {
    if (companyName.trim().length < 2) {
      setError('Le nom de l\'entreprise doit contenir au moins 2 caractères');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (name.trim().length < 2) {
      setError('Le nom doit contenir au moins 2 caractères');
      return false;
    }
    if (!email.includes('@')) {
      setError('Email invalide');
      return false;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateStep2()) return;

    setIsLoading(true);

    try {
      await api.post('/auth/register', {
        companyName: companyName.trim(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
      });
      onSuccess(email.trim().toLowerCase());
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Erreur lors de l\'inscription');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900">
              {step === 1 ? 'Créer votre entreprise' : 'Votre compte'}
            </h2>
            <p className="text-sm text-slate-500">
              Étape {step} sur {totalSteps}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="h-1.5 bg-slate-100 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nom de l'entreprise
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: EMERGENCE TRANSIT GUINEE"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  Ce que vous obtenez
                </h4>
                <ul className="space-y-1.5 text-sm text-blue-700">
                  <li>✓ Gestion complète des dossiers</li>
                  <li>✓ Suivi des conteneurs</li>
                  <li>✓ Comptabilité des débours</li>
                  <li>✓ Facturation automatique</li>
                </ul>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nom complet
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Votre nom"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email professionnel
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 caractères"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Téléphone (optionnel)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+224 XXX XXX XXX"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Création...
              </>
            ) : step === 1 ? (
              'Continuer'
            ) : (
              'Créer mon compte'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Déjà un compte ?{' '}
          <button onClick={onLogin} className="text-blue-600 font-semibold hover:underline">
            Se connecter
          </button>
        </p>
      </div>
    </div>
  );
};

export default RegisterScreen;
