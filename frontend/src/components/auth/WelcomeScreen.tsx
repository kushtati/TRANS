// src/components/auth/WelcomeScreen.tsx

import React from 'react';
import { Zap, Building2, LogIn, UserPlus, Shield, Truck, Globe } from 'lucide-react';

interface WelcomeScreenProps {
  onLogin: () => void;
  onRegister: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onLogin, onRegister }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        
        {/* Logo */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-2xl shadow-blue-500/25 mb-6">
            <Zap size={40} className="text-white" fill="currentColor" />
          </div>
          
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
            E-Trans
          </h1>
          <p className="text-slate-400 text-lg">
            Gestion de Transit & Dédouanement
          </p>
          
          <div className="flex items-center justify-center gap-2 mt-3 text-slate-500">
            <Globe size={14} />
            <span className="text-sm">Guinée Conakry</span>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mb-10 max-w-xs w-full">
          <FeatureIcon 
            icon={<Building2 size={20} />} 
            label="Multi-Entreprise" 
            color="blue" 
          />
          <FeatureIcon 
            icon={<Shield size={20} />} 
            label="Sécurisé" 
            color="green" 
          />
          <FeatureIcon 
            icon={<Truck size={20} />} 
            label="Temps Réel" 
            color="amber" 
          />
        </div>

        {/* Action Buttons */}
        <div className="w-full max-w-xs space-y-3">
          
          {/* Primary: Register */}
          <button
            onClick={onRegister}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98]"
          >
            <UserPlus size={20} />
            Créer mon entreprise
          </button>
          
          {/* Secondary: Login */}
          <button
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-slate-800/80 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-700 transition-all"
          >
            <LogIn size={20} />
            J'ai déjà un compte
          </button>
          
        </div>

        {/* Trust Badges */}
        <div className="mt-10 flex items-center gap-6 text-slate-600">
          <div className="flex items-center gap-1.5">
            <Shield size={14} />
            <span className="text-xs">SSL Sécurisé</span>
          </div>
          <div className="w-1 h-1 bg-slate-700 rounded-full" />
          <div className="flex items-center gap-1.5">
            <Zap size={14} />
            <span className="text-xs">IA Intégrée</span>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="p-6 text-center relative z-10">
        <p className="text-slate-600 text-xs">
          © 2026 E-Trans · Tous droits réservés
        </p>
        <p className="text-slate-700 text-[10px] mt-1">
          v2.2.0
        </p>
      </div>

    </div>
  );
};

// ============================================
// SUB-COMPONENTS
// ============================================

interface FeatureIconProps {
  icon: React.ReactNode;
  label: string;
  color: 'blue' | 'green' | 'amber';
}

const FeatureIcon: React.FC<FeatureIconProps> = ({ icon, label, color }) => {
  const colorClasses = {
    blue: 'text-blue-400 bg-blue-500/10',
    green: 'text-green-400 bg-green-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
  };

  return (
    <div className="text-center">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 ${colorClasses[color]}`}>
        {icon}
      </div>
      <span className="text-[10px] text-slate-500 leading-tight block">
        {label}
      </span>
    </div>
  );
};

export default WelcomeScreen;
