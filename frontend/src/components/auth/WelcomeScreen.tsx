// src/components/auth/WelcomeScreen.tsx

import React from 'react';
import { LogIn, UserPlus, ArrowRight, Ship, FileCheck, Shield } from 'lucide-react';

interface WelcomeScreenProps {
  onLogin: () => void;
  onRegister: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onLogin, onRegister }) => {
  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">

      {/* Background — golden hour port atmosphere */}
      <div className="absolute inset-0">
        <img
          src="/hero-bg.png"
          alt=""
          className="w-full h-full object-cover"
        />
        {/* Warm overlay — golden/amber tones matching the image */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/60 via-stone-900/40 to-stone-950/85" />
        {/* Subtle warm radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.08)_0%,_transparent_60%)]" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-6 relative z-10">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-40 h-40 mb-7">
            <img src="/logo.png" alt="E-Trans" className="w-full h-full object-contain" />
          </div>

          <p className="text-amber-100 text-sm sm:text-base font-light tracking-[0.15em] uppercase">
            Transit & Dédouanement
          </p>
          <p className="text-stone-300 text-xs mt-1.5 tracking-wider">
            Conakry — République de Guinée
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-10">
          <div className="flex items-center gap-2 px-3.5 py-2 bg-white/[0.12] backdrop-blur-sm rounded-full border border-white/[0.15]">
            <Ship size={13} className="text-amber-400" />
            <span className="text-[11px] text-white font-medium tracking-wide">Suivi temps réel</span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 bg-white/[0.12] backdrop-blur-sm rounded-full border border-white/[0.15]">
            <FileCheck size={13} className="text-amber-400" />
            <span className="text-[11px] text-white font-medium tracking-wide">Extraction IA</span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 bg-white/[0.12] backdrop-blur-sm rounded-full border border-white/[0.15]">
            <Shield size={13} className="text-amber-400" />
            <span className="text-[11px] text-white font-medium tracking-wide">100% sécurisé</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full max-w-[340px] space-y-3">
          <button
            onClick={onRegister}
            className="group w-full flex items-center justify-center gap-3 py-[15px] px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold rounded-2xl shadow-xl shadow-amber-600/20 transition-all duration-200 active:scale-[0.97]"
          >
            <UserPlus size={17} strokeWidth={2.5} />
            <span className="text-[15px]">Créer mon entreprise</span>
            <ArrowRight size={15} className="ml-auto opacity-50 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-3 py-[15px] px-6 bg-white/[0.12] backdrop-blur-md text-white font-semibold rounded-2xl border border-amber-400/30 hover:bg-white/[0.18] hover:border-amber-400/40 transition-all duration-200 active:scale-[0.97]"
          >
            <LogIn size={17} />
            <span className="text-[15px]">Se connecter</span>
          </button>
        </div>

      </div>

      {/* Footer */}
      <div className="py-5 px-6 text-center relative z-10">
        <p className="text-stone-300/70 text-[11px] tracking-widest uppercase">
          © 2026 E-Trans · Conakry, Guinée
        </p>
      </div>

    </div>
  );
};

export default WelcomeScreen;
