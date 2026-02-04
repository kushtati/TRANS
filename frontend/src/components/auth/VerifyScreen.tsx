// src/components/auth/VerifyScreen.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Mail, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import type { User } from '../../types';

interface VerifyScreenProps {
  email: string;
  onSuccess: (user: User) => void;
  onBack: () => void;
}

export const VerifyScreen: React.FC<VerifyScreenProps> = ({ email, onSuccess, onBack }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError('');

    // Auto-focus next
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit
    if (newCode.every(c => c) && newCode.join('').length === 6) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (verificationCode: string) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post<{ user: User }>('/auth/verify-email', {
        email,
        code: verificationCode,
      });

      if (response.data?.user) {
        onSuccess(response.data.user);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Erreur de vérification');
      }
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);
    setError('');

    try {
      await api.post('/auth/resend-code', { email });
      setResendCooldown(60);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-10 h-10 text-blue-600" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Vérifiez votre email</h2>
        <p className="text-slate-500 text-sm mb-6">
          Entrez le code à 6 chiffres envoyé à<br />
          <strong className="text-slate-700">{email}</strong>
        </p>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm flex items-center justify-center gap-2 animate-shake">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Code Inputs */}
        <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 text-center text-2xl font-bold bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              maxLength={1}
              disabled={isLoading}
            />
          ))}
        </div>

        {/* Verify Button */}
        <button
          onClick={() => handleVerify(code.join(''))}
          disabled={isLoading || code.some(c => !c)}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 mb-4"
        >
          {isLoading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Vérification...
            </>
          ) : (
            'Vérifier'
          )}
        </button>

        {/* Resend */}
        <button
          onClick={handleResend}
          disabled={isResending || resendCooldown > 0}
          className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center justify-center gap-2 mx-auto disabled:text-slate-400"
        >
          {isResending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Envoi...
            </>
          ) : resendCooldown > 0 ? (
            `Renvoyer dans ${resendCooldown}s`
          ) : (
            <>
              <RefreshCw size={16} />
              Renvoyer le code
            </>
          )}
        </button>

        {/* Back */}
        <button
          onClick={onBack}
          className="mt-6 text-slate-500 hover:text-slate-700 text-sm"
        >
          Retour à la connexion
        </button>
      </div>
    </div>
  );
};

export default VerifyScreen;
