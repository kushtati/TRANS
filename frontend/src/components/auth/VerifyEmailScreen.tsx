// src/components/auth/VerifyEmailScreen.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Mail, ArrowLeft, Loader2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import type { User } from '../../types';

interface VerifyEmailScreenProps {
  email: string;
  onBack: () => void;
  onSuccess: (user: User) => void;
}

export const VerifyEmailScreen: React.FC<VerifyEmailScreenProps> = ({ email, onBack, onSuccess }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  const handleChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (value && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) handleVerify(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setCode(digits);
      inputRefs.current[5]?.focus();
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (verificationCode: string) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.post<{ user: User }>('/auth/verify-email', { email, code: verificationCode });
      setSuccess(true);
      setTimeout(() => { if (response.data?.user) onSuccess(response.data.user); }, 1500);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Erreur de vérification');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    setIsResending(true);
    setError('');
    try {
      await api.post('/auth/resend-code', { email });
      setCountdown(60);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Impossible de renvoyer le code');
    } finally {
      setIsResending(false);
    }
  };

  // SUCCESS STATE
  if (success) {
    return (
      <div className="min-h-[100dvh] relative flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src="/hero-bg.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-900/70 via-stone-900/60 to-stone-950/90" />
        </div>
        <div className="text-center animate-scale-in relative z-10">
          <div className="w-20 h-20 bg-green-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
            <CheckCircle2 size={48} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Email vérifié !</h2>
          <p className="text-stone-300">Connexion en cours...</p>
          <Loader2 size={24} className="animate-spin text-amber-400 mx-auto mt-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] relative flex flex-col overflow-hidden">

      {/* Background */}
      <div className="absolute inset-0">
        <img src="/hero-bg.png" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/70 via-stone-900/60 to-stone-950/90" />
      </div>
      
      {/* Header */}
      <div className="p-4 pt-[max(1rem,env(safe-area-inset-top))] flex items-center gap-3 relative z-10 animate-fade-up">
        <button onClick={onBack}
          className="p-2.5 rounded-full glass hover:bg-white/20 text-white transition-all active:scale-[0.95] tap-highlight">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white font-semibold">Vérification email</h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-sm">
          
          {/* Icon & Title */}
          <div className="text-center mb-8 animate-fade-up stagger-1">
            <div className="w-20 h-20 glass rounded-full flex items-center justify-center mx-auto mb-4 relative">
              <Mail size={36} className="text-amber-400" />
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-stone-950 text-xs font-bold">1</span>
              </div>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Vérifiez votre email</h2>
            <p className="text-stone-300 text-sm">Un code à 6 chiffres a été envoyé à</p>
            <p className="text-amber-400 font-medium mt-1">{email}</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-300 text-sm backdrop-blur-sm animate-scale-in">
              <AlertCircle size={18} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Code Input */}
          <div className="flex justify-center gap-2.5 mb-6 animate-fade-up stagger-2">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text" inputMode="numeric" maxLength={1}
                value={digit}
                onChange={e => handleChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                disabled={isLoading}
                className={`w-12 h-14 text-center text-2xl font-bold rounded-2xl
                  glass-strong transition-all outline-none
                  ${error ? 'ring-1 ring-red-500/50 text-red-400' 
                    : digit ? 'ring-2 ring-amber-500 text-white' 
                    : 'text-white focus:ring-2 focus:ring-amber-500'}
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            ))}
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 text-amber-400 mb-6 animate-fade-in">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Vérification...</span>
            </div>
          )}

          {/* Resend */}
          <div className="text-center animate-fade-up stagger-3">
            <p className="text-stone-400 text-sm mb-2">Vous n'avez pas reçu le code ?</p>
            <button onClick={handleResend} disabled={countdown > 0 || isResending}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all tap-highlight
                ${countdown > 0 || isResending ? 'text-stone-500 cursor-not-allowed' : 'text-amber-400 hover:bg-amber-500/10 active:scale-[0.97]'}`}>
              {isResending ? (<><Loader2 size={16} className="animate-spin" /> Envoi...</>)
                : countdown > 0 ? (<><RefreshCw size={16} /> Renvoyer dans {countdown}s</>)
                : (<><RefreshCw size={16} /> Renvoyer le code</>)}
            </button>
          </div>

          {/* Tips */}
          <div className="mt-8 p-4 glass rounded-xl animate-fade-up stagger-4">
            <p className="text-stone-400 text-xs text-center">
              💡 <span className="text-stone-300 font-medium">Astuce :</span> Vérifiez votre dossier spam si vous ne trouvez pas l'email.
            </p>
          </div>

          <div className="mt-6 text-center animate-fade-up stagger-5">
            <button onClick={onBack}
              className="text-stone-400 text-sm hover:text-amber-400 transition-colors underline tap-highlight">
              Modifier l'adresse email
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default VerifyEmailScreen;
