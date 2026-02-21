// src/components/CreateShipmentForm.tsx
import React, { useState, useRef } from 'react';
import { ArrowLeft, Save, Ship, User, Package, FileText, MapPin, DollarSign, Plus, Trash2, Loader2, AlertCircle, Upload, CheckCircle2, Sparkles, Eye } from 'lucide-react';
import { api, ApiError, getAccessToken } from '../lib/api';
import type { ContainerType, CustomsRegime } from '../types';

interface CreateShipmentFormProps { onSuccess: () => void; onCancel: () => void; }
interface ContainerInput { id: string; number: string; type: ContainerType; sealNumber: string; grossWeight: string; packageCount: string; temperature: string; }
interface FormData { clientName: string; clientNif: string; clientPhone: string; clientAddress: string; description: string; hsCode: string; packaging: string; packageCount: string; grossWeight: string; cifValue: string; cifCurrency: string; blNumber: string; vesselName: string; voyageNumber: string; portOfLoading: string; portOfDischarge: string; eta: string; supplierName: string; supplierCountry: string; customsRegime: CustomsRegime; ddiNumber: string; containers: ContainerInput[]; }

const initC: ContainerInput = { id: crypto.randomUUID(), number: '', type: 'DRY_40HC', sealNumber: '', grossWeight: '', packageCount: '', temperature: '' };
const initForm: FormData = { clientName: '', clientNif: '', clientPhone: '', clientAddress: '', description: '', hsCode: '', packaging: 'Sac', packageCount: '', grossWeight: '', cifValue: '', cifCurrency: 'USD', blNumber: '', vesselName: '', voyageNumber: '', portOfLoading: '', portOfDischarge: 'CONAKRY', eta: '', supplierName: '', supplierCountry: '', customsRegime: 'IM4', ddiNumber: '', containers: [{ ...initC }] };

type FilledFields = Set<string>;

export const CreateShipmentForm: React.FC<CreateShipmentFormProps> = ({ onSuccess, onCancel }) => {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState('');
  const [blFile, setBlFile] = useState<File | null>(null);
  const [blFileUrl, setBlFileUrl] = useState('');
  const [filledFields, setFilledFields] = useState<FilledFields>(new Set());
  const [extractionMessage, setExtractionMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const totalSteps = 4;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError('Fichier trop lourd (max 5 Mo)'); return; }
    setBlFile(f); setError(''); setExtractionMessage('');
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setBlFile(f); setError(''); } };

  const handleExtractBL = async () => {
    if (!blFile) { setError('Sélectionnez un fichier BL'); return; }
    setIsExtracting(true); setError(''); setExtractionMessage('');
    try {
      const fd = new window.FormData(); fd.append('file', blFile);
      const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const url = `${base}/ai/extract-bl`;

      // Build headers with Bearer token (cookies blocked on mobile Safari)
      const headers: Record<string, string> = {};
      const token = getAccessToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Retry logic (max 2 retries on 502/503/504/network error)
      let resp: Response | null = null;
      const delays = [2000, 4000];
      for (let attempt = 0; attempt <= 2; attempt++) {
        try {
          if (attempt > 0) {
            setExtractionMessage(`Nouvelle tentative (${attempt}/2)...`);
            await new Promise(r => setTimeout(r, delays[attempt - 1]));
            const retryFd = new window.FormData();
            retryFd.append('file', blFile);
            resp = await fetch(url, { method: 'POST', headers, credentials: 'include', body: retryFd });
          } else {
            resp = await fetch(url, { method: 'POST', headers, credentials: 'include', body: fd });
          }
          if (resp.ok || (resp.status < 500 && resp.status !== 0)) break;
          if (attempt < 2 && [502, 503, 504].includes(resp.status)) continue;
          break;
        } catch (netErr) {
          if (attempt >= 2) throw netErr;
        }
      }

      if (!resp) throw new Error('Erreur réseau');
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.message || 'Erreur extraction');
      const { extracted, fileUrl, message } = result.data;
      if (fileUrl) setBlFileUrl(fileUrl);
      if (extracted) {
        applyExtracted(extracted);
        setExtractionMessage(message || 'Données extraites avec succès !');
        setTimeout(() => setStep(1), 800);
      } else {
        setExtractionMessage(message || 'Remplissez les champs manuellement.');
        setStep(1);
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur extraction'); }
    finally { setIsExtracting(false); }
  };

  const applyExtracted = (data: Record<string, any>) => {
    const filled = new Set<string>();
    setFormData(prev => {
      const u = { ...prev };
      // Map all string fields from extraction to form fields
      const sm: Record<string, keyof FormData> = {
        blNumber:'blNumber', clientName:'clientName', clientNif:'clientNif', clientPhone:'clientPhone',
        clientAddress:'clientAddress', description:'description', hsCode:'hsCode', packaging:'packaging',
        vesselName:'vesselName', voyageNumber:'voyageNumber', portOfLoading:'portOfLoading',
        supplierName:'supplierName', supplierCountry:'supplierCountry', cifCurrency:'cifCurrency',
        ddiNumber:'ddiNumber'
      };
      for (const [k, fk] of Object.entries(sm)) { const v = data[k]; if (v && typeof v === 'string' && v.trim()) { (u as any)[fk] = v.trim(); filled.add(fk); } }
      // Port of discharge: only apply if valid value
      if (data.portOfDischarge && typeof data.portOfDischarge === 'string') {
        const pd = data.portOfDischarge.toUpperCase().trim();
        if (pd.includes('CONAKRY')) { u.portOfDischarge = 'CONAKRY'; filled.add('portOfDischarge'); }
        else if (pd.includes('KAMSAR')) { u.portOfDischarge = 'KAMSAR'; filled.add('portOfDischarge'); }
      }
      // ETA date
      if (data.eta && typeof data.eta === 'string' && data.eta.match(/^\d{4}-\d{2}-\d{2}/)) {
        u.eta = data.eta.substring(0, 10); filled.add('eta');
      }
      // Customs regime
      if (data.customsRegime && ['IM4','IM5','IM7','TR'].includes(data.customsRegime)) {
        u.customsRegime = data.customsRegime as any; filled.add('customsRegime');
      }
      // Numeric fields
      if (data.packageCount > 0) { u.packageCount = String(Math.round(data.packageCount)); filled.add('packageCount'); }
      if (data.grossWeight > 0) { u.grossWeight = String(Math.round(data.grossWeight * 100) / 100); filled.add('grossWeight'); }
      if (data.cifValue > 0) { u.cifValue = String(Math.round(data.cifValue * 100) / 100); filled.add('cifValue'); }
      // Containers
      if (data.containers?.length > 0) {
        u.containers = data.containers.map((c: any) => ({
          id: crypto.randomUUID(),
          number: c.number || '',
          type: (['DRY_20','DRY_40','DRY_40HC','REEFER_20','REEFER_40','REEFER_40HR'].includes(c.type) ? c.type : 'DRY_40HC') as ContainerType,
          sealNumber: c.sealNumber || '',
          grossWeight: c.grossWeight ? String(Math.round(c.grossWeight * 100) / 100) : '',
          packageCount: c.packageCount ? String(Math.round(c.packageCount)) : '',
          temperature: ''
        }));
        filled.add('containers');
      }
      // If total grossWeight not set but containers have weights, calculate total
      if (!filled.has('grossWeight') && filled.has('containers')) {
        const totalW = u.containers.reduce((s, c) => s + (parseFloat(c.grossWeight) || 0), 0);
        if (totalW > 0) { u.grossWeight = String(Math.round(totalW * 100) / 100); filled.add('grossWeight'); }
      }
      // If total packageCount not set but containers have counts, calculate total
      if (!filled.has('packageCount') && filled.has('containers')) {
        const totalP = u.containers.reduce((s, c) => s + (parseInt(c.packageCount) || 0), 0);
        if (totalP > 0) { u.packageCount = String(totalP); filled.add('packageCount'); }
      }
      return u;
    });
    setFilledFields(filled);
  };

  const skip = () => { setStep(1); };
  const hc = (f: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setFormData(p => ({ ...p, [f]: e.target.value })); setError(''); };
  const hcc = (cid: string, f: keyof ContainerInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setFormData(p => ({ ...p, containers: p.containers.map(c => c.id === cid ? { ...c, [f]: e.target.value } : c) })); };
  const addC = () => setFormData(p => ({ ...p, containers: [...p.containers, { ...initC, id: crypto.randomUUID() }] }));
  const rmC = (cid: string) => { if (formData.containers.length <= 1) return; setFormData(p => ({ ...p, containers: p.containers.filter(c => c.id !== cid) })); };

  const validate = (): boolean => {
    if (step === 1) {
      if (!formData.clientName.trim()) { setError('Nom du client requis'); return false; }
      if (!formData.description.trim()) { setError('Description requise'); return false; }
    }
    return true;
  };
  const next = () => { if (validate()) setStep(s => Math.min(s + 1, totalSteps)); };
  const prev = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setIsLoading(true); setError('');
    try {
      const p: Record<string, any> = {
        clientName: formData.clientName.trim(), clientNif: formData.clientNif.trim()||undefined, clientPhone: formData.clientPhone.trim()||undefined, clientAddress: formData.clientAddress.trim()||undefined,
        description: formData.description.trim(), hsCode: formData.hsCode.trim()||undefined, packaging: formData.packaging||undefined,
        packageCount: formData.packageCount ? parseInt(formData.packageCount) : undefined, grossWeight: formData.grossWeight ? parseFloat(formData.grossWeight) : undefined,
        cifValue: formData.cifValue ? parseFloat(formData.cifValue) : undefined, cifCurrency: formData.cifCurrency,
        blNumber: formData.blNumber.trim()||undefined, vesselName: formData.vesselName.trim()||undefined, voyageNumber: formData.voyageNumber.trim()||undefined,
        portOfLoading: formData.portOfLoading.trim()||undefined, portOfDischarge: formData.portOfDischarge, eta: formData.eta||undefined,
        supplierName: formData.supplierName.trim()||undefined, supplierCountry: formData.supplierCountry.trim()||undefined,
        customsRegime: formData.customsRegime, ddiNumber: formData.ddiNumber.trim()||undefined,
        containers: formData.containers.filter(c => c.number.trim()).map(c => ({ number: c.number.trim(), type: c.type, sealNumber: c.sealNumber.trim()||undefined, grossWeight: c.grossWeight ? parseFloat(c.grossWeight) : undefined, packageCount: c.packageCount ? parseInt(c.packageCount) : undefined, temperature: c.temperature ? parseFloat(c.temperature) : undefined })),
      };
      const res = await api.post<{ shipment: { id: string } }>('/shipments', p);
      if (blFileUrl && res.data?.shipment?.id) { try { await api.post(`/shipments/${res.data.shipment.id}/documents`, { type: 'BL', name: blFile?.name || 'BL', url: blFileUrl }); } catch {} }
      onSuccess();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Erreur création'); }
    finally { setIsLoading(false); }
  };

  const hl = (f: string) => filledFields.has(f);

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} /></button>
          <div className="flex-1">
            <h1 className="font-semibold text-slate-900">Nouveau dossier</h1>
            <p className="text-xs text-slate-500">{step === 0 ? 'Téléchargez le BL pour remplir automatiquement' : `Étape ${step}/${totalSteps}`}</p>
          </div>
          {filledFields.size > 0 && <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-lg"><Sparkles size={14} className="text-green-600" /><span className="text-xs text-green-700 font-medium">{filledFields.size} auto</span></div>}
        </div>
        {step > 0 && <div className="max-w-3xl mx-auto px-4 pb-3"><div className="flex gap-1">{Array.from({ length: totalSteps }).map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i < step ? 'bg-blue-500' : 'bg-slate-200'}`} />)}</div></div>}
      </div>

      {error && <div className="max-w-3xl mx-auto px-4 mt-4"><div className="p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm"><AlertCircle size={18} />{error}</div></div>}

      <div className="max-w-3xl mx-auto px-4 py-6">
        {step === 0 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Upload size={28} className="text-blue-600" /></div>
              <h2 className="text-xl font-bold text-slate-900">Téléchargez le connaissement (BL)</h2>
              <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">L'IA analyse votre BL et remplit automatiquement : client, marchandise, navire, conteneurs...</p>
            </div>
            <div className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer ${blFile ? 'border-green-300 bg-green-50/50' : 'border-slate-300 hover:border-blue-400'}`} onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => !blFile && fileRef.current?.click()}>
              {blFile ? (
                <div className="space-y-2"><div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto"><CheckCircle2 size={24} className="text-green-600" /></div><p className="font-medium text-slate-800">{blFile.name}</p><p className="text-xs text-slate-500">{(blFile.size/1024).toFixed(0)} Ko</p><button onClick={e => { e.stopPropagation(); setBlFile(null); if(fileRef.current) fileRef.current.value=''; }} className="text-xs text-red-500">Changer</button></div>
              ) : (
                <div className="space-y-2"><FileText size={40} className="text-slate-300 mx-auto" /><p className="font-medium text-slate-600">Glissez le BL ici ou cliquez</p><p className="text-xs text-slate-400">PDF, JPG, PNG — max 15 Mo</p></div>
              )}
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileSelect} className="hidden" />
            </div>
            {extractionMessage && <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3"><Sparkles size={18} className="text-green-600 shrink-0 mt-0.5" /><div><p className="text-sm font-medium text-green-800">{extractionMessage}</p>{filledFields.size > 0 && <p className="text-xs text-green-600 mt-1">{filledFields.size} champs remplis</p>}</div></div>}
            <div className="flex gap-3">
              <button onClick={skip} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-xl text-sm">Remplir manuellement</button>
              <button onClick={handleExtractBL} disabled={!blFile || isExtracting} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                {isExtracting ? <><Loader2 size={18} className="animate-spin" />Analyse...</> : <><Sparkles size={18} />Extraire les données</>}
              </button>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 mb-3">L'IA extrait automatiquement :</p>
              <div className="grid grid-cols-2 gap-2">
                {['N° BL','Client','Marchandise','Navire','Voyage','Port','Fournisseur','Poids','Colis','Conteneurs','Type TC','Scellés'].map(i => <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600"><CheckCircle2 size={12} className="text-green-500" />{i}</div>)}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <Sec title="Client" icon={<User size={18} />}><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Inp label="Nom du client" value={formData.clientName} onChange={hc('clientName')} placeholder="ALPHA TRADING SARL" required highlight={hl('clientName')} />
              <Inp label="NIF" value={formData.clientNif} onChange={hc('clientNif')} placeholder="123456789" />
              <Inp label="Téléphone" value={formData.clientPhone} onChange={hc('clientPhone')} placeholder="+224 621 00 00 00" />
              <Inp label="Adresse" value={formData.clientAddress} onChange={hc('clientAddress')} placeholder="Kaloum, Conakry" highlight={hl('clientAddress')} />
            </div></Sec>
            <Sec title="Marchandise" icon={<Package size={18} />}><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><Inp label="Description" value={formData.description} onChange={hc('description')} placeholder="Riz brisé 25kg x 1000 sacs" required highlight={hl('description')} /></div>
              <Inp label="Code SH" value={formData.hsCode} onChange={hc('hsCode')} placeholder="1006.30" highlight={hl('hsCode')} />
              <Inp label="Emballage" value={formData.packaging} onChange={hc('packaging')} placeholder="Sac" highlight={hl('packaging')} />
              <Inp label="Colis" type="number" value={formData.packageCount} onChange={hc('packageCount')} placeholder="1000" highlight={hl('packageCount')} />
              <Inp label="Poids brut (kg)" type="number" value={formData.grossWeight} onChange={hc('grossWeight')} placeholder="25000" highlight={hl('grossWeight')} />
            </div></Sec>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <Sec title="Valeur" icon={<DollarSign size={18} />}><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Inp label="Valeur CIF" type="number" value={formData.cifValue} onChange={hc('cifValue')} placeholder="50000" highlight={hl('cifValue')} />
              <Sel label="Devise" value={formData.cifCurrency} onChange={hc('cifCurrency')} options={[{value:'USD',label:'USD ($)'},{value:'EUR',label:'EUR (€)'},{value:'GNF',label:'GNF'},{value:'GBP',label:'GBP (£)'},{value:'CNY',label:'CNY (¥)'}]} />
            </div></Sec>
            <Sec title="Transport maritime" icon={<Ship size={18} />}><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Inp label="N° BL" value={formData.blNumber} onChange={hc('blNumber')} placeholder="MEDU09243710" highlight={hl('blNumber')} />
              <Inp label="Navire" value={formData.vesselName} onChange={hc('vesselName')} placeholder="MSC BANU III" highlight={hl('vesselName')} />
              <Inp label="N° Voyage" value={formData.voyageNumber} onChange={hc('voyageNumber')} placeholder="XA545A" highlight={hl('voyageNumber')} />
              <Inp label="ETA" type="date" value={formData.eta} onChange={hc('eta')} />
              <Inp label="Port chargement" value={formData.portOfLoading} onChange={hc('portOfLoading')} placeholder="ANTWERP" highlight={hl('portOfLoading')} />
              <Sel label="Port déchargement" value={formData.portOfDischarge} onChange={hc('portOfDischarge')} options={[{value:'CONAKRY',label:'Conakry'},{value:'KAMSAR',label:'Kamsar'}]} />
            </div></Sec>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            {hl('containers') && <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-sm text-green-700"><Sparkles size={16} /><span>Conteneurs extraits du BL — vérifiez</span></div>}
            <Sec title={`Conteneurs (${formData.containers.length})`} icon={<Package size={18} />} action={<button onClick={addC} className="flex items-center gap-1 text-sm text-blue-600"><Plus size={16} />Ajouter</button>}>
              <div className="space-y-4">{formData.containers.map((c, i) => (
                <div key={c.id} className={`p-4 rounded-xl border ${hl('containers') ? 'bg-green-50/30 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-3"><span className="text-sm font-medium text-slate-700">TC {i+1}</span>{formData.containers.length > 1 && <button onClick={() => rmC(c.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16} /></button>}</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Inp label="N° Conteneur" value={c.number} onChange={hcc(c.id,'number')} placeholder="SEGU9759487" small />
                    <Sel label="Type" value={c.type} onChange={hcc(c.id,'type')} options={[{value:'DRY_20',label:"20' Dry"},{value:'DRY_40',label:"40' Dry"},{value:'DRY_40HC',label:"40' HC"},{value:'REEFER_20',label:"20' Reefer"},{value:'REEFER_40',label:"40' Reefer"},{value:'REEFER_40HR',label:"40' HR Reefer"}]} small />
                    <Inp label="Scellé" value={c.sealNumber} onChange={hcc(c.id,'sealNumber')} placeholder="HO329040" small />
                    <Inp label="Poids (kg)" type="number" value={c.grossWeight} onChange={hcc(c.id,'grossWeight')} placeholder="28500" small />
                    <Inp label="Colis" type="number" value={c.packageCount} onChange={hcc(c.id,'packageCount')} placeholder="1140" small />
                    {c.type.includes('REEFER') && <Inp label="Temp °C" type="number" value={c.temperature} onChange={hcc(c.id,'temperature')} placeholder="8" small />}
                  </div>
                </div>
              ))}</div>
            </Sec>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <Sec title="Fournisseur" icon={<MapPin size={18} />}><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Inp label="Fournisseur" value={formData.supplierName} onChange={hc('supplierName')} placeholder="J.P. BEEMSTERBOER" highlight={hl('supplierName')} />
              <Inp label="Pays" value={formData.supplierCountry} onChange={hc('supplierCountry')} placeholder="NETHERLANDS" highlight={hl('supplierCountry')} />
            </div></Sec>
            <Sec title="Douane" icon={<FileText size={18} />}><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Sel label="Régime" value={formData.customsRegime} onChange={hc('customsRegime')} options={[{value:'IM4',label:'IM4 - Mise à la consommation'},{value:'IM5',label:'IM5 - Admission temporaire'},{value:'IM7',label:'IM7 - Mise en entrepôt'},{value:'TR',label:'TR - Transit'}]} />
              <Inp label="N° DDI" value={formData.ddiNumber} onChange={hc('ddiNumber')} placeholder="50927" />
            </div></Sec>
            <Sec title="Récapitulatif" icon={<Eye size={18} />}>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                <Sum label="Client" value={formData.clientName||'-'} filled={hl('clientName')} />
                <Sum label="Marchandise" value={formData.description||'-'} filled={hl('description')} />
                <Sum label="BL" value={formData.blNumber||'-'} filled={hl('blNumber')} />
                <Sum label="Navire" value={formData.vesselName||'-'} filled={hl('vesselName')} />
                <Sum label="Conteneurs" value={`${formData.containers.filter(c=>c.number).length} TC`} filled={hl('containers')} />
                <Sum label="Fournisseur" value={formData.supplierName||'-'} filled={hl('supplierName')} />
                <Sum label="CIF" value={formData.cifValue ? `${formData.cifValue} ${formData.cifCurrency}` : '-'} filled={hl('cifValue')} />
                {blFile && <Sum label="BL attaché" value={`✅ ${blFile.name}`} filled />}
              </div>
            </Sec>
          </div>
        )}
      </div>

      {step > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 pb-6 safe-bottom z-50" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}>
          <div className="max-w-3xl mx-auto flex gap-3">
            {step > 1 && <button onClick={prev} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl">Précédent</button>}
            {step < totalSteps ? (
              <button onClick={next} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl">Suivant</button>
            ) : (
              <button onClick={handleSubmit} disabled={isLoading} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl disabled:opacity-60 flex items-center justify-center gap-2">
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}{isLoading ? 'Création...' : 'Créer le dossier'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Sec: React.FC<{title:string;icon:React.ReactNode;children:React.ReactNode;action?:React.ReactNode}> = ({title,icon,children,action}) => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between"><div className="flex items-center gap-2 text-slate-700">{icon}<span className="font-medium">{title}</span></div>{action}</div>
    <div className="p-4">{children}</div>
  </div>
);

const Inp: React.FC<{label:string;value:string;onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void;placeholder?:string;type?:string;required?:boolean;small?:boolean;highlight?:boolean}> = ({label,value,onChange,placeholder,type='text',required,small,highlight}) => (
  <div>
    <label className={`block text-slate-600 mb-1 ${small?'text-xs':'text-sm'}`}>{label}{required && <span className="text-red-500"> *</span>}{highlight && <span className="ml-1 text-green-500 text-xs">✨ auto</span>}</label>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} className={`w-full bg-white border border-slate-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${small?'py-2 text-sm':'py-2.5'} ${highlight?'ring-2 ring-green-300 bg-green-50/30 border-green-300':''}`} />
  </div>
);

const Sel: React.FC<{label:string;value:string;onChange:(e:React.ChangeEvent<HTMLSelectElement>)=>void;options:{value:string;label:string}[];small?:boolean}> = ({label,value,onChange,options,small}) => (
  <div>
    <label className={`block text-slate-600 mb-1 ${small?'text-xs':'text-sm'}`}>{label}</label>
    <select value={value} onChange={onChange} className={`w-full bg-white border border-slate-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${small?'py-2 text-sm':'py-2.5'}`}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
  </div>
);

const Sum: React.FC<{label:string;value:string;filled?:boolean}> = ({label,value,filled}) => (
  <div className="flex justify-between"><span className="text-slate-500">{label}</span><span className={`font-medium ${filled?'text-green-700':'text-slate-900'}`}>{filled&&'✨ '}{value}</span></div>
);

export default CreateShipmentForm;
