// src/components/auth/RegisterScreen.tsx

import React, { useState } from 'react';
import { 
  Building2, User, Mail, Lock, Phone, ArrowLeft, 
  Loader2, Eye, EyeOff, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { api, ApiError } from '../../lib/api';

interface RegisterScreenProps {
  onSuccess: (email: string) => void;
  onLogin: () => void;
  initialStep?: 1 | 2;
}

interface FormData {
  companyName: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onSuccess, onLogin, initialStep = 1 }) => {
  const [step, setStep] = useState<1 | 2>(initialStep);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<FormData>({
    companyName: '', name: '', email: '',
    password: '', confirmPassword: '', phone: '',
  });

  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.companyName.trim()) errors.companyName = 'Nom de l\'entreprise requis';
    else if (formData.companyName.length < 2) errors.companyName = 'Minimum 2 caractères';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Nom complet requis';
    if (!formData.email.trim()) errors.email = 'Email requis';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Email invalide';
    if (!formData.password) errors.password = 'Mot de passe requis';
    else if (formData.password.length < 8) errors.password = 'Minimum 8 caractères';
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: '' }));
    setError('');
  };

  const handleNextStep = () => { if (validateStep1()) setStep(2); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;
    setIsLoading(true);
    setError('');

    try {
      await api.post('/auth/register', {
        companyName: formData.companyName.trim(),
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone.trim() || undefined,
      });
      onSuccess(formData.email);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isValidationError() && err.errors) {
          const errors: Record<string, string> = {};
          err.errors.forEach(e => { errors[e.field] = e.message; });
          setFieldErrors(errors);
        } else setError(err.message);
      } else setError('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="min-h-[100dvh] relative flex flex-col overflow-hidden">

      {/* Background */}
      <div className="absolute inset-0">
        <img src="/hero-bg.webp" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/70 via-stone-900/60 to-stone-950/90" />
      </div>

      {/* Header */}
      <div className="p-4 pt-[max(1rem,env(safe-area-inset-top))] flex items-center gap-3 relative z-10 animate-fade-up">
        <button onClick={step === 1 ? onLogin : () => setStep(1)}
          className="p-2.5 rounded-full glass hover:bg-white/20 text-white transition-all active:scale-[0.95] tap-highlight">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-white font-semibold">Créer mon entreprise</h1>
          <p className="text-stone-400 text-sm">Étape {step} sur 2</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 mb-6 relative z-10 animate-fade-up stagger-1">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
            style={{ width: step === 1 ? '50%' : '100%' }} />
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] overflow-y-auto relative z-10 scroll-smooth-ios">
        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-5">
          
          {error && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-300 text-sm backdrop-blur-sm">
              <AlertCircle size={18} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-5">
              <div className="text-center mb-8 animate-fade-up stagger-2">
                <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Building2 size={32} className="text-amber-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Votre entreprise</h2>
                <p className="text-stone-300 text-sm mt-1">Informations de votre société de transit</p>
              </div>

              <div className="animate-fade-up stagger-3">
                <InputField
                  label="Nom de l'entreprise" icon={<Building2 size={18} />}
                  type="text" value={formData.companyName}
                  onChange={handleChange('companyName')}
                  placeholder="Ex: Transit Express Guinée"
                  error={fieldErrors.companyName} required />
              </div>

              <button type="button" onClick={handleNextStep}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold rounded-2xl transition-all shadow-lg shadow-amber-600/20 active:scale-[0.97] tap-highlight animate-fade-up stagger-4">
                Continuer
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center mb-6 animate-fade-up stagger-1">
                <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <User size={32} className="text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Compte administrateur</h2>
                <p className="text-stone-300 text-sm mt-1">
                  Vous serez l'admin de <span className="text-amber-400">{formData.companyName}</span>
                </p>
              </div>

              <div className="animate-fade-up stagger-2">
              <InputField label="Nom complet" icon={<User size={18} />} type="text"
                value={formData.name} onChange={handleChange('name')}
                placeholder="Mamadou Diallo" error={fieldErrors.name} required />
              </div>

              <div className="animate-fade-up stagger-3">
              <InputField label="Email" hint="Gmail ou iCloud recommandé" icon={<Mail size={18} />}
                type="email" value={formData.email} onChange={handleChange('email')}
                placeholder="votre@email.com" error={fieldErrors.email} required />
              </div>

              <div className="animate-fade-up stagger-4">
              <InputField label="Téléphone" hint="Optionnel" icon={<Phone size={18} />}
                type="tel" value={formData.phone} onChange={handleChange('phone')}
                placeholder="+224 XXX XXX XXX" />
              </div>

              {/* Password */}
              <div className="animate-fade-up stagger-5">
                <label className="block text-xs font-semibold text-amber-200/80 uppercase mb-1.5">
                  Mot de passe <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-stone-400" size={18} />
                  <input type={showPassword ? 'text' : 'password'} value={formData.password}
                    onChange={handleChange('password')}
                    className={`w-full glass-strong text-white rounded-2xl pl-10 pr-12 py-[14px] focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all placeholder:text-stone-500 ${fieldErrors.password ? 'ring-1 ring-red-500/50' : ''}`}
                    placeholder="Min. 8 caractères" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-stone-400 hover:text-white p-1">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.password && <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>}
                {formData.password && (
                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3, 4].map(level => (
                      <div key={level} className={`h-1 flex-1 rounded-full transition-colors ${
                        passwordStrength >= level
                          ? level <= 1 ? 'bg-red-500' : level <= 2 ? 'bg-yellow-500' : 'bg-green-500'
                          : 'bg-white/10'
                      }`} />
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="animate-fade-up stagger-6">
                <label className="block text-xs font-semibold text-amber-200/80 uppercase mb-1.5">
                  Confirmer le mot de passe <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-stone-400" size={18} />
                  <input type={showPassword ? 'text' : 'password'} value={formData.confirmPassword}
                    onChange={handleChange('confirmPassword')}
                    className={`w-full glass-strong text-white rounded-2xl pl-10 pr-12 py-[14px] focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all placeholder:text-stone-500 ${fieldErrors.confirmPassword ? 'ring-1 ring-red-500/50' : ''}`}
                    placeholder="Répétez le mot de passe" />
                  {formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <CheckCircle2 className="absolute right-3 top-3.5 text-green-500" size={18} />
                  )}
                </div>
                {fieldErrors.confirmPassword && <p className="text-red-400 text-xs mt-1">{fieldErrors.confirmPassword}</p>}
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold rounded-2xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-6 shadow-lg shadow-amber-600/20 active:scale-[0.97] tap-highlight">
                {isLoading ? (<><Loader2 size={20} className="animate-spin" /> Création en cours...</>) : 'Créer mon compte'}
              </button>

              <p className="text-center text-xs text-stone-500 pb-4">
                En créant un compte, vous acceptez nos conditions d'utilisation
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

// ============================================
// INPUT FIELD COMPONENT
// ============================================

interface InputFieldProps {
  label: string;
  hint?: string;
  icon: React.ReactNode;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  error?: string;
  required?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  label, hint, icon, type, value, onChange, placeholder, error, required,
}) => (
  <div>
    <label className="block text-xs font-semibold text-amber-200/80 uppercase mb-1.5">
      {label} {required && <span className="text-red-400">*</span>}
      {hint && <span className="text-stone-500 normal-case font-normal"> ({hint})</span>}
    </label>
    <div className="relative">
      <div className="absolute left-3 top-[15px] text-stone-400">{icon}</div>
      <input type={type} value={value} onChange={onChange}
        className={`w-full glass-strong text-white rounded-2xl pl-10 pr-4 py-[14px] focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all placeholder:text-stone-500 ${error ? 'ring-1 ring-red-500/50' : ''}`}
        placeholder={placeholder} />
    </div>
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
);

export default RegisterScreen;
