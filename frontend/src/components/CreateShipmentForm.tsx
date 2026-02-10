// src/components/CreateShipmentForm.tsx

import React, { useState } from 'react';
import {
  ArrowLeft, Save, Ship, User, Package, FileText,
  MapPin, DollarSign, Plus, Trash2, Loader2, AlertCircle
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { ContainerType, CustomsRegime } from '../types';

// UUID fallback for older mobile browsers
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return generateId();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface CreateShipmentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface ContainerInput {
  id: string;
  number: string;
  type: ContainerType;
  sealNumber: string;
  grossWeight: string;
  packageCount: string;
  temperature: string;
}

interface FormData {
  clientName: string;
  clientNif: string;
  clientPhone: string;
  clientAddress: string;
  description: string;
  hsCode: string;
  packaging: string;
  packageCount: string;
  grossWeight: string;
  cifValue: string;
  cifCurrency: string;
  blNumber: string;
  vesselName: string;
  voyageNumber: string;
  portOfLoading: string;
  portOfDischarge: string;
  eta: string;
  supplierName: string;
  supplierCountry: string;
  customsRegime: CustomsRegime;
  ddiNumber: string;
  containers: ContainerInput[];
}

const initialContainer: ContainerInput = {
  id: generateId(),
  number: '',
  type: 'DRY_40HC',
  sealNumber: '',
  grossWeight: '',
  packageCount: '',
  temperature: '',
};

const initialFormData: FormData = {
  clientName: '',
  clientNif: '',
  clientPhone: '',
  clientAddress: '',
  description: '',
  hsCode: '',
  packaging: 'Sac',
  packageCount: '',
  grossWeight: '',
  cifValue: '',
  cifCurrency: 'USD',
  blNumber: '',
  vesselName: '',
  voyageNumber: '',
  portOfLoading: '',
  portOfDischarge: 'CONAKRY',
  eta: '',
  supplierName: '',
  supplierCountry: '',
  customsRegime: 'IM4',
  ddiNumber: '',
  containers: [{ ...initialContainer }],
};

export const CreateShipmentForm: React.FC<CreateShipmentFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const totalSteps = 4;

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleContainerChange = (containerId: string, field: keyof ContainerInput) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      containers: prev.containers.map(c =>
        c.id === containerId ? { ...c, [field]: e.target.value } : c
      ),
    }));
  };

  const addContainer = () => {
    setFormData(prev => ({
      ...prev,
      containers: [...prev.containers, { ...initialContainer, id: generateId() }],
    }));
  };

  const removeContainer = (containerId: string) => {
    if (formData.containers.length === 1) return;
    setFormData(prev => ({
      ...prev,
      containers: prev.containers.filter(c => c.id !== containerId),
    }));
  };

  const validateStep = (): boolean => {
    switch (step) {
      case 1:
        if (!formData.clientName.trim()) {
          setError('Nom du client requis');
          return false;
        }
        if (!formData.description.trim()) {
          setError('Description de la marchandise requise');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(s => Math.min(s + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');

    try {
      const payload = {
        clientName: formData.clientName.trim(),
        clientNif: formData.clientNif.trim() || undefined,
        clientPhone: formData.clientPhone.trim() || undefined,
        clientAddress: formData.clientAddress.trim() || undefined,
        description: formData.description.trim(),
        hsCode: formData.hsCode.trim() || undefined,
        packaging: formData.packaging || undefined,
        packageCount: formData.packageCount ? parseInt(formData.packageCount) : undefined,
        grossWeight: formData.grossWeight ? parseFloat(formData.grossWeight) : undefined,
        cifValue: formData.cifValue ? parseFloat(formData.cifValue) : undefined,
        cifCurrency: formData.cifCurrency,
        blNumber: formData.blNumber.trim() || undefined,
        vesselName: formData.vesselName.trim() || undefined,
        voyageNumber: formData.voyageNumber.trim() || undefined,
        portOfLoading: formData.portOfLoading.trim() || undefined,
        portOfDischarge: formData.portOfDischarge,
        eta: formData.eta || undefined,
        supplierName: formData.supplierName.trim() || undefined,
        supplierCountry: formData.supplierCountry.trim() || undefined,
        customsRegime: formData.customsRegime,
        ddiNumber: formData.ddiNumber.trim() || undefined,
        containers: formData.containers
          .filter(c => c.number.trim())
          .map(c => ({
            number: c.number.trim(),
            type: c.type,
            sealNumber: c.sealNumber.trim() || undefined,
            grossWeight: c.grossWeight ? parseFloat(c.grossWeight) : undefined,
            packageCount: c.packageCount ? parseInt(c.packageCount) : undefined,
            temperature: c.temperature ? parseFloat(c.temperature) : undefined,
          })),
      };

      await api.post('/shipments', payload);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Erreur lors de la création');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-slate-900">Nouveau dossier</h1>
            <p className="text-sm text-slate-500">Étape {step} sur {totalSteps}</p>
          </div>
        </div>
        
        {/* Progress */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto p-4 pb-32">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Step 1: Client & Marchandise */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <Section title="Client" icon={<User size={18} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Nom du client" value={formData.clientName} onChange={handleChange('clientName')} placeholder="Ex: SOGECO SARL" required />
                <InputField label="NIF" value={formData.clientNif} onChange={handleChange('clientNif')} placeholder="Ex: 7087525482L" />
                <InputField label="Téléphone" value={formData.clientPhone} onChange={handleChange('clientPhone')} placeholder="+224 XXX XXX XXX" />
                <InputField label="Adresse" value={formData.clientAddress} onChange={handleChange('clientAddress')} placeholder="Ex: RATOMA-KIPÉ" />
              </div>
            </Section>

            <Section title="Marchandise" icon={<Package size={18} />}>
              <div className="space-y-4">
                <InputField label="Description" value={formData.description} onChange={handleChange('description')} placeholder="Ex: OIGNONS" required />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InputField label="Code SH" value={formData.hsCode} onChange={handleChange('hsCode')} placeholder="07031000" />
                  <SelectField label="Emballage" value={formData.packaging} onChange={handleChange('packaging')} options={[
                    { value: 'Sac', label: 'Sac' },
                    { value: 'Carton', label: 'Carton' },
                    { value: 'Palette', label: 'Palette' },
                    { value: 'Vrac', label: 'Vrac' },
                  ]} />
                  <InputField label="Nombre colis" type="number" value={formData.packageCount} onChange={handleChange('packageCount')} placeholder="2280" />
                  <InputField label="Poids brut (kg)" type="number" value={formData.grossWeight} onChange={handleChange('grossWeight')} placeholder="57000" />
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* Step 2: Valeur & Transport */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <Section title="Valeur" icon={<DollarSign size={18} />}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InputField label="Valeur CIF" type="number" value={formData.cifValue} onChange={handleChange('cifValue')} placeholder="18240" />
                <SelectField label="Devise" value={formData.cifCurrency} onChange={handleChange('cifCurrency')} options={[
                  { value: 'USD', label: 'USD' },
                  { value: 'EUR', label: 'EUR' },
                  { value: 'GNF', label: 'GNF' },
                ]} />
              </div>
            </Section>

            <Section title="Transport maritime" icon={<Ship size={18} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="N° BL" value={formData.blNumber} onChange={handleChange('blNumber')} placeholder="MEDU09243710" />
                <InputField label="Navire" value={formData.vesselName} onChange={handleChange('vesselName')} placeholder="MSC BANU III" />
                <InputField label="N° Voyage" value={formData.voyageNumber} onChange={handleChange('voyageNumber')} placeholder="XA545A" />
                <InputField label="ETA" type="date" value={formData.eta} onChange={handleChange('eta')} />
                <InputField label="Port de chargement" value={formData.portOfLoading} onChange={handleChange('portOfLoading')} placeholder="ANTWERP" />
                <SelectField label="Port déchargement" value={formData.portOfDischarge} onChange={handleChange('portOfDischarge')} options={[
                  { value: 'CONAKRY', label: 'Conakry' },
                  { value: 'KAMSAR', label: 'Kamsar' },
                ]} />
              </div>
            </Section>
          </div>
        )}

        {/* Step 3: Conteneurs */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <Section 
              title={`Conteneurs (${formData.containers.length})`} 
              icon={<Package size={18} />}
              action={
                <button onClick={addContainer} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                  <Plus size={16} />
                  Ajouter
                </button>
              }
            >
              <div className="space-y-4">
                {formData.containers.map((container, index) => (
                  <div key={container.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-700">Conteneur {index + 1}</span>
                      {formData.containers.length > 1 && (
                        <button onClick={() => removeContainer(container.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <InputField label="N° Conteneur" value={container.number} onChange={handleContainerChange(container.id, 'number')} placeholder="SEGU9759487" small />
                      <SelectField label="Type" value={container.type} onChange={handleContainerChange(container.id, 'type')} options={[
                        { value: 'DRY_20', label: "20' Dry" },
                        { value: 'DRY_40', label: "40' Dry" },
                        { value: 'DRY_40HC', label: "40' HC" },
                        { value: 'REEFER_20', label: "20' Reefer" },
                        { value: 'REEFER_40', label: "40' Reefer" },
                        { value: 'REEFER_40HR', label: "40' HR Reefer" },
                      ]} small />
                      <InputField label="N° Scellé" value={container.sealNumber} onChange={handleContainerChange(container.id, 'sealNumber')} placeholder="HO329040" small />
                      <InputField label="Poids (kg)" type="number" value={container.grossWeight} onChange={handleContainerChange(container.id, 'grossWeight')} placeholder="28500" small />
                      <InputField label="Colis" type="number" value={container.packageCount} onChange={handleContainerChange(container.id, 'packageCount')} placeholder="1140" small />
                      {container.type.includes('REEFER') && (
                        <InputField label="Temp. (°C)" type="number" value={container.temperature} onChange={handleContainerChange(container.id, 'temperature')} placeholder="8" small />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* Step 4: Fournisseur & Douane */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <Section title="Fournisseur" icon={<MapPin size={18} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Nom fournisseur" value={formData.supplierName} onChange={handleChange('supplierName')} placeholder="J.P. BEEMSTERBOER" />
                <InputField label="Pays" value={formData.supplierCountry} onChange={handleChange('supplierCountry')} placeholder="NETHERLANDS" />
              </div>
            </Section>

            <Section title="Douane" icon={<FileText size={18} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectField label="Régime" value={formData.customsRegime} onChange={handleChange('customsRegime')} options={[
                  { value: 'IM4', label: 'IM4 - Mise à la consommation' },
                  { value: 'IM5', label: 'IM5 - Admission temporaire' },
                  { value: 'IM7', label: 'IM7 - Mise en entrepôt' },
                  { value: 'TR', label: 'TR - Transit' },
                ]} />
                <InputField label="N° DDI" value={formData.ddiNumber} onChange={handleChange('ddiNumber')} placeholder="50927" />
              </div>
            </Section>

            {/* Recap */}
            <Section title="Récapitulatif" icon={<FileText size={18} />}>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                <SummaryRow label="Client" value={formData.clientName || '-'} />
                <SummaryRow label="Marchandise" value={formData.description || '-'} />
                <SummaryRow label="Conteneurs" value={`${formData.containers.filter(c => c.number).length} TC`} />
                <SummaryRow label="BL" value={formData.blNumber || '-'} />
                <SummaryRow label="Navire" value={formData.vesselName || '-'} />
                <SummaryRow label="Valeur CIF" value={formData.cifValue ? `${formData.cifValue} ${formData.cifCurrency}` : '-'} highlight />
              </div>
            </Section>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 safe-bottom">
        <div className="max-w-3xl mx-auto flex gap-3">
          {step > 1 && (
            <button onClick={prevStep} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors">
              Précédent
            </button>
          )}
          
          {step < totalSteps ? (
            <button onClick={nextStep} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors">
              Suivant
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
              {isLoading ? 'Création...' : 'Créer le dossier'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Sub-components
const Section: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode; 
  action?: React.ReactNode 
}> = ({ title, icon, children, action }) => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
      <div className="flex items-center gap-2 text-slate-700">
        {icon}
        <span className="font-medium">{title}</span>
      </div>
      {action}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const InputField: React.FC<{
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  small?: boolean;
}> = ({ label, value, onChange, placeholder, type = 'text', required, small }) => (
  <div>
    <label className={`block text-slate-600 mb-1 ${small ? 'text-xs' : 'text-sm'}`}>
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full bg-white border border-slate-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${small ? 'py-2 text-sm' : 'py-2.5'}`}
    />
  </div>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  small?: boolean;
}> = ({ label, value, onChange, options, small }) => (
  <div>
    <label className={`block text-slate-600 mb-1 ${small ? 'text-xs' : 'text-sm'}`}>{label}</label>
    <select
      value={value}
      onChange={onChange}
      className={`w-full bg-white border border-slate-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${small ? 'py-2 text-sm' : 'py-2.5'}`}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const SummaryRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="flex justify-between">
    <span className="text-slate-500">{label}</span>
    <span className={`font-medium ${highlight ? 'text-blue-600' : 'text-slate-900'}`}>{value}</span>
  </div>
);

export default CreateShipmentForm;
