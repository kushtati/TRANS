// src/pages/TemplateDesignerView.tsx
// ============================================
// Éditeur de template "Canva-style"
//
// - Upload d'un PDF vierge → fond du canvas
// - Drag & drop de champs (client_name, total_ttc …) sur le PDF
// - Sauvegarde des positions en points PDF → backend
// - Preview / Generate
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Upload, Save, Eye, Trash2, Plus, Loader2, FileText,
  ChevronDown, ChevronRight, Type, Star,
  Settings2, GripVertical, X, Check, AlertCircle,
  ZoomIn, ZoomOut, RotateCcw,
} from 'lucide-react';
import { api, getAccessToken } from '../lib/api';

// ===========================================================
// Types
// ===========================================================

interface TemplateField {
  id?: string;
  fieldKey: string;
  label: string;
  posX: number;
  posY: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  textAlign: string;
  color: string;
  maxWidth: number | null;
}

interface InvoiceTemplate {
  id: string;
  name: string;
  fileUrl: string;
  canvasWidth: number;
  canvasHeight: number;
  isDefault: boolean;
  fields: TemplateField[];
  createdAt: string;
  _count?: { fields: number };
}

interface FieldKeyCategory {
  category: string;
  keys: { key: string; label: string }[];
}

// Raw shape from the backend (flat array)
interface RawFieldKey {
  key: string;
  label: string;
  category: string;
}

/** Group flat field-key array into categories */
function groupFieldKeys(raw: RawFieldKey[]): FieldKeyCategory[] {
  const map = new Map<string, { key: string; label: string }[]>();
  for (const item of raw) {
    if (!map.has(item.category)) map.set(item.category, []);
    map.get(item.category)!.push({ key: item.key, label: item.label });
  }
  return Array.from(map.entries()).map(([category, keys]) => ({ category, keys }));
}

// ===========================================================
// Constants
// ===========================================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const DEFAULT_FIELD: Omit<TemplateField, 'fieldKey' | 'label'> = {
  posX: 100,
  posY: 400,
  fontSize: 10,
  fontFamily: 'Helvetica',
  fontWeight: 'normal',
  textAlign: 'left',
  color: '#000000',
  maxWidth: null,
};

const FONT_OPTIONS = ['Helvetica', 'Courier', 'TimesRoman'];
const FONT_SIZES = [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32];

// ===========================================================
// Component
// ===========================================================

export const TemplateDesignerView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  // --- State: template list ---
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate | null>(null);
  const [fieldKeys, setFieldKeys] = useState<FieldKeyCategory[]>([]);

  // --- State: designer ---
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [selectedFieldIdx, setSelectedFieldIdx] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // --- State: UI ---
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState('');
  const [showFieldPanel, setShowFieldPanel] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [mode, setMode] = useState<'list' | 'designer'>('list');

  // --- Refs ---
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);

  // ===========================================================
  // Load templates + field keys on mount
  // ===========================================================

  useEffect(() => {
    const load = async () => {
      try {
        const [tRes, fRes] = await Promise.all([
          api.get<InvoiceTemplate[]>('/templates'),
          api.get<RawFieldKey[]>('/templates/field-keys'),
        ]);
        setTemplates(tRes.data || []);
        setFieldKeys(groupFieldKeys(fRes.data || []));
      } catch (err: any) {
        setError(err.message || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ===========================================================
  // Render PDF as background when template is selected
  // ===========================================================

  useEffect(() => {
    if (!selectedTemplate) return;

    const renderPdf = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        
        // Set worker — use jsdelivr CDN which mirrors every npm package
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        // Fetch PDF via authenticated API route (avoids static file 404 on Railway)
        const token = getAccessToken();
        const pdfUrl = `${API_BASE}/templates/${selectedTemplate.id}/pdf`;

        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          httpHeaders: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 1 });
        const canvas = pdfCanvasRef.current;
        if (!canvas) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
      } catch (err) {
        console.error('PDF render error:', err);
      }
    };

    renderPdf();
  }, [selectedTemplate]);

  // ===========================================================
  // Upload new template
  // ===========================================================

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Seuls les fichiers PDF sont acceptés');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name.replace(/\.pdf$/i, ''));

      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/templates`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Erreur upload');

      const newTemplate = json.data as InvoiceTemplate;
      setTemplates(prev => [newTemplate, ...prev]);
      
      // Open the designer for this template
      await openDesigner(newTemplate.id);
    } catch (err: any) {
      setError(err.message || 'Erreur upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ===========================================================
  // Open designer for a template
  // ===========================================================

  const openDesigner = async (templateId: string) => {
    try {
      setLoading(true);
      const res = await api.get<InvoiceTemplate>(`/templates/${templateId}`);
      if (res.data) {
        setSelectedTemplate(res.data);
        setFields(res.data.fields || []);
        setSelectedFieldIdx(null);
        setMode('designer');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===========================================================
  // Save fields
  // ===========================================================

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    setError('');

    try {
      const res = await api.put<TemplateField[]>(`/templates/${selectedTemplate.id}/fields`, {
        fields: fields.map(f => ({
          fieldKey: f.fieldKey,
          label: f.label,
          posX: Math.round(f.posX * 100) / 100,
          posY: Math.round(f.posY * 100) / 100,
          fontSize: f.fontSize,
          fontFamily: f.fontFamily,
          fontWeight: f.fontWeight,
          textAlign: f.textAlign,
          color: f.color,
          maxWidth: f.maxWidth,
        })),
      });

      if (res.data) {
        setFields(res.data.map(f => ({ ...f })));
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // ===========================================================
  // Preview PDF
  // ===========================================================

  const handlePreview = async () => {
    if (!selectedTemplate) return;
    setPreviewing(true);

    try {
      // First save
      await handleSave();
      
      // Then download preview
      await api.downloadFile(`/templates/${selectedTemplate.id}/preview`, `preview-${selectedTemplate.name}.pdf`);
    } catch (err: any) {
      setError(err.message || 'Erreur preview');
    } finally {
      setPreviewing(false);
    }
  };
  
  // ===========================================================
  // Delete template
  // ===========================================================

  const handleDelete = async (templateId: string) => {
    if (!confirm('Supprimer ce template ?')) return;
    
    try {
      await api.delete(`/templates/${templateId}`);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
        setMode('list');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ===========================================================
  // Set default template
  // ===========================================================

  const handleSetDefault = async (templateId: string) => {
    try {
      await api.put(`/templates/${templateId}`, { isDefault: true });
      setTemplates(prev =>
        prev.map(t => ({ ...t, isDefault: t.id === templateId }))
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ===========================================================
  // Add a field to the canvas
  // ===========================================================

  const addField = (fieldKey: string, label: string) => {
    // Don't add duplicates
    if (fields.some(f => f.fieldKey === fieldKey)) {
      setError(`Le champ "${label}" est déjà ajouté`);
      setTimeout(() => setError(''), 2000);
      return;
    }

    const newField: TemplateField = {
      ...DEFAULT_FIELD,
      fieldKey,
      label,
      // Offset each new field slightly so they don't stack
      posY: DEFAULT_FIELD.posY - fields.length * 20,
    };

    setFields(prev => [...prev, newField]);
    setSelectedFieldIdx(fields.length); // Select the new one
  };

  // ===========================================================
  // Remove a field
  // ===========================================================

  const removeField = (idx: number) => {
    setFields(prev => prev.filter((_, i) => i !== idx));
    setSelectedFieldIdx(null);
  };

  // ===========================================================
  // Update a field property
  // ===========================================================

  const updateField = (idx: number, updates: Partial<TemplateField>) => {
    setFields(prev => prev.map((f, i) => i === idx ? { ...f, ...updates } : f));
  };

  // ===========================================================
  // Mouse handlers for dragging fields on canvas
  // ===========================================================

  // Convert pixel position to PDF points
  // In the canvas, Y=0 is top, but in PDF, Y=0 is bottom
  const pxToPdfY = useCallback((pxY: number): number => {
    if (!selectedTemplate) return pxY;
    return selectedTemplate.canvasHeight - (pxY / zoom);
  }, [selectedTemplate, zoom]);

  const pdfYToPx = useCallback((pdfY: number): number => {
    if (!selectedTemplate) return pdfY;
    return (selectedTemplate.canvasHeight - pdfY) * zoom;
  }, [selectedTemplate, zoom]);

  const pxToPdfX = useCallback((pxX: number): number => pxX / zoom, [zoom]);
  const pdfXToPx = useCallback((pdfX: number): number => pdfX * zoom, [zoom]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent, fieldIdx: number) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedFieldIdx(fieldIdx);
    setIsDragging(true);

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const field = fields[fieldIdx];
    const fieldPxX = pdfXToPx(field.posX);
    const fieldPxY = pdfYToPx(field.posY);

    setDragOffset({
      x: e.clientX - rect.left - fieldPxX,
      y: e.clientY - rect.top - fieldPxY,
    });
  }, [fields, pdfXToPx, pdfYToPx]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || selectedFieldIdx === null) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const pxX = e.clientX - rect.left - dragOffset.x;
    const pxY = e.clientY - rect.top - dragOffset.y;

    updateField(selectedFieldIdx, {
      posX: pxToPdfX(pxX),
      posY: pxToPdfY(pxY),
    });
  }, [isDragging, selectedFieldIdx, dragOffset, pxToPdfX, pxToPdfY]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ===========================================================
  // Touch handlers for mobile
  // ===========================================================

  const handleCanvasTouchStart = useCallback((e: React.TouchEvent, fieldIdx: number) => {
    e.stopPropagation();
    const touch = e.touches[0];
    setSelectedFieldIdx(fieldIdx);
    setIsDragging(true);

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const field = fields[fieldIdx];
    const fieldPxX = pdfXToPx(field.posX);
    const fieldPxY = pdfYToPx(field.posY);

    setDragOffset({
      x: touch.clientX - rect.left - fieldPxX,
      y: touch.clientY - rect.top - fieldPxY,
    });
  }, [fields, pdfXToPx, pdfYToPx]);

  const handleCanvasTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || selectedFieldIdx === null) return;
    e.preventDefault();

    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const pxX = touch.clientX - rect.left - dragOffset.x;
    const pxY = touch.clientY - rect.top - dragOffset.y;

    updateField(selectedFieldIdx, {
      posX: pxToPdfX(pxX),
      posY: pxToPdfY(pxY),
    });
  }, [isDragging, selectedFieldIdx, dragOffset, pxToPdfX, pxToPdfY]);

  // ===========================================================
  // Zoom
  // ===========================================================

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.1, 2));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 0.4));
  const handleZoomReset = () => setZoom(1);

  // ===========================================================
  // Selected field ref
  // ===========================================================

  const selectedField = selectedFieldIdx !== null ? fields[selectedFieldIdx] : null;

  // ===========================================================
  // Render: Loading
  // ===========================================================

  if (loading && mode === 'list') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  // ===========================================================
  // Render: Template List
  // ===========================================================

  if (mode === 'list') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-stone-200 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-stone-800">Templates de Facture</h1>
              <p className="text-sm text-stone-500">Uploadez un PDF et positionnez les champs dynamiques</p>
            </div>
          </div>
          <div>
            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? 'Upload...' : 'Nouveau template'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Template Cards */}
        {templates.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-stone-200">
            <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500 mb-1">Aucun template</p>
            <p className="text-sm text-stone-400">Uploadez un PDF pour commencer</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {templates.map(t => (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-stone-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openDesigner(t.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText size={20} className="text-amber-500" />
                    <div>
                      <h3 className="font-semibold text-stone-800">{t.name}</h3>
                      <p className="text-xs text-stone-400">
                        {t._count?.fields || 0} champs · {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  {t.isDefault && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 text-xs rounded-full font-medium">
                      <Star size={10} /> Par défaut
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
                  {!t.isDefault && (
                    <button onClick={() => handleSetDefault(t.id)}
                      className="text-xs text-stone-500 hover:text-amber-600 flex items-center gap-1">
                      <Star size={12} /> Définir par défaut
                    </button>
                  )}
                  <button onClick={() => handleDelete(t.id)}
                    className="text-xs text-stone-400 hover:text-red-500 flex items-center gap-1 ml-auto">
                    <Trash2 size={12} /> Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ===========================================================
  // Render: Designer Mode
  // ===========================================================

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-stone-100">
      {/* Top toolbar */}
      <div className="bg-white border-b border-stone-200 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => { setMode('list'); setSelectedTemplate(null); }}
            className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="font-semibold text-stone-800 text-sm">{selectedTemplate?.name}</h2>
            <p className="text-xs text-stone-400">{fields.length} champs positionnés</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-stone-100 rounded-lg px-2 py-1 mr-2">
            <button onClick={handleZoomOut} className="p-1 hover:bg-stone-200 rounded" title="Zoom -">
              <ZoomOut size={14} />
            </button>
            <span className="text-xs text-stone-600 min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={handleZoomIn} className="p-1 hover:bg-stone-200 rounded" title="Zoom +">
              <ZoomIn size={14} />
            </button>
            <button onClick={handleZoomReset} className="p-1 hover:bg-stone-200 rounded" title="Reset">
              <RotateCcw size={14} />
            </button>
          </div>

          <button onClick={() => setShowFieldPanel(p => !p)}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors" title="Panneau champs">
            <Settings2 size={16} />
          </button>

          <button onClick={handlePreview} disabled={previewing || fields.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors disabled:opacity-50">
            {previewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
            Aperçu
          </button>

          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Sauvegarder
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
          <AlertCircle size={14} /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* ============== Left: Field library panel ============== */}
        {showFieldPanel && (
          <div className="w-64 bg-white border-r border-stone-200 flex flex-col shrink-0 overflow-hidden">
            <div className="p-3 border-b border-stone-100">
              <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                <Type size={14} /> Champs disponibles
              </h3>
              <p className="text-xs text-stone-400 mt-1">Cliquez pour ajouter au template</p>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {fieldKeys.map(cat => (
                <div key={cat.category} className="mb-1">
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === cat.category ? null : cat.category)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 rounded transition-colors"
                  >
                    {expandedCategory === cat.category ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    {cat.category}
                    <span className="text-stone-400 ml-auto">{cat.keys.length}</span>
                  </button>

                  {expandedCategory === cat.category && (
                    <div className="ml-3 space-y-0.5">
                      {cat.keys.map(k => {
                        const isAdded = fields.some(f => f.fieldKey === k.key);
                        return (
                          <button
                            key={k.key}
                            onClick={() => !isAdded && addField(k.key, k.label)}
                            disabled={isAdded}
                            className={`w-full flex items-center gap-2 px-2 py-1 text-xs rounded transition-colors ${
                              isAdded
                                ? 'text-stone-400 bg-stone-50 cursor-not-allowed'
                                : 'text-stone-700 hover:bg-amber-50 hover:text-amber-700 cursor-pointer'
                            }`}
                          >
                            {isAdded ? <Check size={10} className="text-green-500" /> : <Plus size={10} />}
                            {k.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Active fields summary */}
            <div className="border-t border-stone-100 p-2 max-h-48 overflow-y-auto">
              <p className="text-xs font-semibold text-stone-500 px-2 mb-1">{fields.length} champs actifs</p>
              {fields.map((f, i) => (
                <div
                  key={f.fieldKey}
                  onClick={() => setSelectedFieldIdx(i)}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded cursor-pointer transition-colors ${
                    selectedFieldIdx === i ? 'bg-amber-50 text-amber-700' : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <GripVertical size={10} className="text-stone-300" />
                  <span className="truncate flex-1">{f.label}</span>
                  <button
                    onClick={e => { e.stopPropagation(); removeField(i); }}
                    className="p-0.5 hover:text-red-500 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============== Center: Canvas ============== */}
        <div className="flex-1 overflow-auto bg-stone-200 flex items-start justify-center p-6">
          <div
            ref={canvasRef}
            className="relative bg-white shadow-xl border border-stone-300"
            style={{
              width: selectedTemplate ? selectedTemplate.canvasWidth * zoom : 595,
              height: selectedTemplate ? selectedTemplate.canvasHeight * zoom : 842,
              cursor: isDragging ? 'grabbing' : 'default',
            }}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onTouchMove={handleCanvasTouchMove}
            onTouchEnd={handleCanvasMouseUp}
          >
            {/* PDF Background */}
            <canvas
              ref={pdfCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ imageRendering: 'auto' }}
            />

            {/* Field overlays */}
            {fields.map((field, idx) => {
              const pxX = pdfXToPx(field.posX);
              const pxY = pdfYToPx(field.posY);
              const isSelected = selectedFieldIdx === idx;

              return (
                <div
                  key={field.fieldKey}
                  className={`absolute group transition-shadow ${
                    isSelected
                      ? 'ring-2 ring-amber-500 ring-offset-1 z-20'
                      : 'hover:ring-2 hover:ring-blue-300 z-10'
                  }`}
                  style={{
                    left: pxX,
                    top: pxY,
                    fontSize: field.fontSize * zoom,
                    fontFamily: field.fontFamily === 'TimesRoman' ? 'Times New Roman' : field.fontFamily,
                    fontWeight: field.fontWeight,
                    color: field.color,
                    textAlign: field.textAlign as any,
                    maxWidth: field.maxWidth ? field.maxWidth * zoom : undefined,
                    cursor: isDragging && isSelected ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    whiteSpace: field.maxWidth ? 'normal' : 'nowrap',
                    padding: '1px 3px',
                    backgroundColor: isSelected ? 'rgba(251, 191, 36, 0.15)' : 'rgba(59, 130, 246, 0.08)',
                    borderRadius: '2px',
                  }}
                  onMouseDown={e => handleCanvasMouseDown(e, idx)}
                  onTouchStart={e => handleCanvasTouchStart(e, idx)}
                  onClick={() => setSelectedFieldIdx(idx)}
                >
                  {/* Label badge */}
                  <span
                    className={`absolute -top-4 left-0 px-1 py-0 text-[9px] font-medium rounded whitespace-nowrap ${
                      isSelected ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white opacity-0 group-hover:opacity-100'
                    } transition-opacity`}
                  >
                    {field.label}
                  </span>

                  {/* Field preview text */}
                  <span style={{ fontSize: field.fontSize * zoom }}>
                    {`{${field.fieldKey}}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ============== Right: Properties panel ============== */}
        {selectedField && (
          <div className="w-60 bg-white border-l border-stone-200 p-3 overflow-y-auto shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-stone-700">Propriétés</h3>
              <button onClick={() => setSelectedFieldIdx(null)} className="p-1 hover:bg-stone-100 rounded">
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Field name */}
              <div>
                <label className="text-xs font-medium text-stone-500 block mb-1">Champ</label>
                <p className="text-sm text-stone-800 font-mono bg-stone-50 px-2 py-1 rounded">{selectedField.fieldKey}</p>
              </div>

              {/* Position X */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-stone-500 block mb-1">X (pts)</label>
                  <input
                    type="number"
                    value={Math.round(selectedField.posX)}
                    onChange={e => updateField(selectedFieldIdx!, { posX: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-sm border border-stone-200 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-500 block mb-1">Y (pts)</label>
                  <input
                    type="number"
                    value={Math.round(selectedField.posY)}
                    onChange={e => updateField(selectedFieldIdx!, { posY: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-sm border border-stone-200 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className="text-xs font-medium text-stone-500 block mb-1">Taille police</label>
                <select
                  value={selectedField.fontSize}
                  onChange={e => updateField(selectedFieldIdx!, { fontSize: parseInt(e.target.value) })}
                  className="w-full px-2 py-1 text-sm border border-stone-200 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  {FONT_SIZES.map(s => <option key={s} value={s}>{s} pt</option>)}
                </select>
              </div>

              {/* Font Family */}
              <div>
                <label className="text-xs font-medium text-stone-500 block mb-1">Police</label>
                <select
                  value={selectedField.fontFamily}
                  onChange={e => updateField(selectedFieldIdx!, { fontFamily: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-stone-200 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              {/* Font Weight */}
              <div>
                <label className="text-xs font-medium text-stone-500 block mb-1">Graisse</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateField(selectedFieldIdx!, { fontWeight: 'normal' })}
                    className={`flex-1 py-1 text-xs rounded border transition-colors ${
                      selectedField.fontWeight === 'normal' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-stone-200 text-stone-500'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    onClick={() => updateField(selectedFieldIdx!, { fontWeight: 'bold' })}
                    className={`flex-1 py-1 text-xs rounded border font-bold transition-colors ${
                      selectedField.fontWeight === 'bold' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-stone-200 text-stone-500'
                    }`}
                  >
                    Gras
                  </button>
                </div>
              </div>

              {/* Text Align */}
              <div>
                <label className="text-xs font-medium text-stone-500 block mb-1">Alignement</label>
                <div className="flex gap-1">
                  {(['left', 'center', 'right'] as const).map(align => (
                    <button
                      key={align}
                      onClick={() => updateField(selectedFieldIdx!, { textAlign: align })}
                      className={`flex-1 py-1 text-xs rounded border transition-colors ${
                        selectedField.textAlign === align ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-stone-200 text-stone-500'
                      }`}
                    >
                      {align === 'left' ? 'Gauche' : align === 'center' ? 'Centre' : 'Droite'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="text-xs font-medium text-stone-500 block mb-1">Couleur</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedField.color}
                    onChange={e => updateField(selectedFieldIdx!, { color: e.target.value })}
                    className="w-8 h-8 rounded border border-stone-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={selectedField.color}
                    onChange={e => {
                      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                        updateField(selectedFieldIdx!, { color: e.target.value });
                      }
                    }}
                    className="flex-1 px-2 py-1 text-sm border border-stone-200 rounded font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    placeholder="#000000"
                  />
                </div>
              </div>

              {/* Max Width */}
              <div>
                <label className="text-xs font-medium text-stone-500 block mb-1">Largeur max (pts)</label>
                <input
                  type="number"
                  value={selectedField.maxWidth ?? ''}
                  onChange={e => updateField(selectedFieldIdx!, {
                    maxWidth: e.target.value ? parseFloat(e.target.value) : null,
                  })}
                  placeholder="Auto"
                  className="w-full px-2 py-1 text-sm border border-stone-200 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Delete */}
              <button
                onClick={() => removeField(selectedFieldIdx!)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors mt-4"
              >
                <Trash2 size={12} /> Supprimer ce champ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateDesignerView;
