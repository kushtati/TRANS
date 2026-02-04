// src/components/auth/WelcomeScreen.tsx

import React from 'react';
import { Ship } from 'lucide-react';

interface WelcomeScreenProps {
  onLogin: () => void;
  onRegister: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onLogin, onRegister }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/30">
        <Ship className="w-12 h-12 text-white" />
      </div>

      {/* Title */}
      <h1 className="text-4xl font-bold text-white mb-2">E-Trans</h1>
      <p className="text-slate-400 text-lg mb-2">Transit & Dédouanement</p>
      <p className="text-slate-500 text-sm mb-12">Guinée Conakry</p>

      {/* Features */}
      <div className="w-full max-w-xs space-y-3 mb-12">
        {[
          'Gestion des dossiers de transit',
          'Suivi des conteneurs en temps réel',
          'Calcul automatique des droits',
          'Facturation des débours',
        ].map((feature, i) => (
          <div key={i} className="flex items-center gap-3 text-slate-300">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-sm">{feature}</span>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={onRegister}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition-all"
        >
          Créer mon entreprise
        </button>
        <button
          onClick={onLogin}
          className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-700 transition-all"
        >
          J'ai déjà un compte
        </button>
      </div>

      {/* Footer */}
      <p className="text-slate-600 text-xs mt-12">© 2026 E-Trans v3.0</p>
    </div>
  );
};

export default WelcomeScreen;
