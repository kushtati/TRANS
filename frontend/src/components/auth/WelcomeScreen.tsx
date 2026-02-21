// src/components/auth/WelcomeScreen.tsx

import React from 'react';
import { LogIn, UserPlus, ArrowRight, Ship, FileCheck, Shield } from 'lucide-react';

interface WelcomeScreenProps {
  onLogin: () => void;
  onRegister: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onLogin, onRegister }) => {
  return (
    <div className="min-h-[100dvh] relative flex flex-col overflow-hidden">

      {/* Background — cinematic port image */}
      <div className="absolute inset-0">
        <img
          src="/hero-bg.webp"
          alt=""
          className="w-full h-full object-cover animate-fade-in"
        />
        {/* Deep warm overlay for contrast & readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/50 via-stone-900/30 to-stone-950/90" />
        {/* Ambient glow at top */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.06)_0%,_transparent_50%)]" />
      </div>

      {/* Safe area spacer for iPhone notch */}
      <div className="pt-[env(safe-area-inset-top)]" />

      {/* Content — vertically centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative z-10">

        {/* Logo — floating animation */}
        <div className="text-center mb-8 animate-fade-up">
          <div className="inline-flex items-center justify-center w-36 h-36 sm:w-44 sm:h-44 mb-6 animate-float">
            <img 
              src="/logo.webp" 
              alt="E-Trans" 
              className="w-full h-full object-contain drop-shadow-[0_8px_32px_rgba(245,158,11,0.15)]" 
            />
          </div>

          <p className="text-amber-100/90 text-[13px] sm:text-base font-light tracking-[0.2em] uppercase animate-fade-up stagger-1">
            Transit & Dédouanement
          </p>
          <p className="text-stone-400 text-[11px] sm:text-xs mt-1 tracking-wider animate-fade-up stagger-2">
            Conakry — République de Guinée
          </p>
        </div>

        {/* Feature pills — staggered */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
          {[
            { icon: Ship, label: 'Suivi temps réel' },
            { icon: FileCheck, label: 'Extraction IA' },
            { icon: Shield, label: '100% sécurisé' },
          ].map((feat, i) => (
            <div key={feat.label}
              className={`flex items-center gap-2 px-4 py-2.5 glass rounded-full animate-fade-up stagger-${i + 3}`}>
              <feat.icon size={14} className="text-amber-400" />
              <span className="text-[11px] sm:text-xs text-white/90 font-medium tracking-wide">{feat.label}</span>
            </div>
          ))}
        </div>

        {/* CTA Buttons — premium mobile touch targets */}
        <div className="w-full max-w-[360px] space-y-3 animate-fade-up stagger-6">
          
          {/* Primary CTA */}
          <button
            onClick={onRegister}
            className="group w-full flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-bold rounded-2xl shadow-[0_8px_32px_-4px_rgba(245,158,11,0.35)] transition-all duration-200 active:scale-[0.97] active:shadow-[0_4px_16px_-4px_rgba(245,158,11,0.4)] animate-glow-pulse"
          >
            <UserPlus size={18} strokeWidth={2.5} />
            <span className="text-[15px]">Créer mon entreprise</span>
            <ArrowRight size={16} className="ml-auto opacity-40 group-active:translate-x-1 transition-transform" />
          </button>

          {/* Secondary CTA */}
          <button
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 glass-strong text-white font-semibold rounded-2xl transition-all duration-200 active:scale-[0.97] active:bg-white/20"
          >
            <LogIn size={18} />
            <span className="text-[15px]">Se connecter</span>
          </button>
        </div>

      </div>

      {/* Footer — safe area aware */}
      <div className="py-4 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] text-center relative z-10 animate-fade-in stagger-6">
        <p className="text-stone-500/50 text-[10px] tracking-[0.2em] uppercase">
          © 2026 E-Trans · Conakry, Guinée
        </p>
      </div>

    </div>
  );
};

export default WelcomeScreen;
