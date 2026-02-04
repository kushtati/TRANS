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
}

interface FormData {
  companyName: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onSuccess, onLogin }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });

  // ============================================
  // VALIDATION
  // ============================================

  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.companyName.trim()) {
      errors.companyName = 'Nom de l\'entreprise requis';
    } else if (formData.companyName.length < 2) {
      errors.companyName = 'Minimum 2 caractères';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Nom complet requis';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email invalide';
    }

    if (!formData.password) {
      errors.password = 'Mot de passe requis';
    } else if (formData.password.length < 8) {
      errors.password = 'Minimum 8 caractères';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============================================
  // HANDLERS
  // ============================================

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear field error
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
    setError('');
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

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
          err.errors.forEach(e => {
            errors[e.field] = e.message;
          });
          setFieldErrors(errors);
        } else {
          setError(err.message);
        }
      } else {
        setError('Une erreur est survenue');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // PASSWORD STRENGTH
  // ============================================

  const getPasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(formData.password);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <button
          onClick={step === 1 ? onLogin : () => setStep(1)}
          className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-white font-semibold">Créer mon entreprise</h1>
          <p className="text-slate-400 text-sm">Étape {step} sur 2</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 mb-6">
        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-4 pb-8 overflow-y-auto">
        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-5">
          
          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={18} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {step === 1 ? (
            // ============================================
            // STEP 1: Company Info
            // ============================================
            <div className="space-y-5 animate-fade-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Building2 size={32} className="text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Votre entreprise</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Informations de votre société de transit
                </p>
              </div>

              <InputField
                label="Nom de l'entreprise"
                icon={<Building2 size={18} />}
                type="text"
                value={formData.companyName}
                onChange={handleChange('companyName')}
                placeholder="Ex: Transit Express Guinée"
                error={fieldErrors.companyName}
                required
              />

              <button
                type="button"
                onClick={handleNextStep}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all"
              >
                Continuer
              </button>
            </div>
          ) : (
            // ============================================
            // STEP 2: Admin Info
            // ============================================
            <div className="space-y-4 animate-fade-in">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <User size={32} className="text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Compte administrateur</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Vous serez l'admin de{' '}
                  <span className="text-blue-400">{formData.companyName}</span>
                </p>
              </div>

              <InputField
                label="Nom complet"
                icon={<User size={18} />}
                type="text"
                value={formData.name}
                onChange={handleChange('name')}
                placeholder="Mamadou Diallo"
                error={fieldErrors.name}
                required
              />

              <InputField
                label="Email"
                hint="Gmail ou iCloud recommandé"
                icon={<Mail size={18} />}
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                placeholder="votre@email.com"
                error={fieldErrors.email}
                required
              />

              <InputField
                label="Téléphone"
                hint="Optionnel"
                icon={<Phone size={18} />}
                type="tel"
                value={formData.phone}
                onChange={handleChange('phone')}
                placeholder="+224 XXX XXX XXX"
              />

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                  Mot de passe <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange('password')}
                    className={`w-full bg-slate-800 border ${
                      fieldErrors.password ? 'border-red-500' : 'border-slate-700'
                    } text-white rounded-xl pl-10 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                    placeholder="Min. 8 caractères"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>
                )}
                
                {/* Password Strength */}
                {formData.password && (
                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3, 4].map(level => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          passwordStrength >= level
                            ? level <= 1 ? 'bg-red-500' 
                            : level <= 2 ? 'bg-yellow-500' 
                            : 'bg-green-500'
                            : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                  Confirmer le mot de passe <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange('confirmPassword')}
                    className={`w-full bg-slate-800 border ${
                      fieldErrors.confirmPassword ? 'border-red-500' : 'border-slate-700'
                    } text-white rounded-xl pl-10 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                    placeholder="Répétez le mot de passe"
                  />
                  {formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <CheckCircle2 className="absolute right-3 top-3.5 text-green-500" size={18} />
                  )}
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-6"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  'Créer mon compte'
                )}
              </button>

              <p className="text-center text-xs text-slate-500">
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
  label,
  hint,
  icon,
  type,
  value,
  onChange,
  placeholder,
  error,
  required,
}) => (
  <div>
    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
      {label} {required && <span className="text-red-400">*</span>}
      {hint && <span className="text-slate-500 normal-case font-normal"> ({hint})</span>}
    </label>
    <div className="relative">
      <div className="absolute left-3 top-3.5 text-slate-500">
        {icon}
      </div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className={`w-full bg-slate-800 border ${
          error ? 'border-red-500' : 'border-slate-700'
        } text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
        placeholder={placeholder}
      />
    </div>
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
);

export default RegisterScreen;
