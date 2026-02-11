// src/components/ShipmentDetail/NextSteps.tsx

import React, { useState, useEffect } from 'react';
import { ArrowRight, FileText, CreditCard, Truck, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';

interface NextStep {
  label: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  documentNeeded?: string;
}

interface NextStepsProps {
  shipmentId: string;
  onNavigateToDocuments: () => void;
  onNavigateToFinance: () => void;
}

const priorityStyles = {
  high: 'bg-red-50 border-red-200 text-red-800',
  medium: 'bg-amber-50 border-amber-200 text-amber-800',
  low: 'bg-blue-50 border-blue-200 text-blue-800',
};

const priorityLabels = {
  high: 'Urgent',
  medium: 'Important',
  low: 'À faire',
};

const actionIcons: Record<string, React.ReactNode> = {
  add_document: <FileText size={16} />,
  pay_expenses: <CreditCard size={16} />,
  update_delivery: <Truck size={16} />,
  invoice: <FileText size={16} />,
};

export const NextSteps: React.FC<NextStepsProps> = ({
  shipmentId,
  onNavigateToDocuments,
  onNavigateToFinance,
}) => {
  const [steps, setSteps] = useState<NextStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSteps();
  }, [shipmentId]);

  const loadSteps = async () => {
    try {
      const res = await api.get<{ steps: NextStep[] }>(`/shipments/${shipmentId}/next-steps`);
      if (res.data?.steps) {
        setSteps(res.data.steps);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (step: NextStep) => {
    if (step.action === 'add_document') {
      onNavigateToDocuments();
    } else if (step.action === 'pay_expenses') {
      onNavigateToFinance();
    } else if (step.action === 'update_delivery' || step.action === 'invoice') {
      onNavigateToDocuments();
    }
  };

  if (isLoading) return null;
  if (steps.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle2 size={20} className="text-green-600 shrink-0" />
        <p className="text-sm text-green-800 font-medium">Toutes les étapes sont complétées pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
        <ArrowRight size={16} className="text-blue-600" />
        <span className="font-medium text-blue-800 text-sm">Prochaines étapes ({steps.length})</span>
      </div>
      <div className="divide-y divide-slate-100">
        {steps.map((step, i) => (
          <button
            key={i}
            onClick={() => handleAction(step)}
            className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
              {actionIcons[step.action] || <ArrowRight size={16} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">{step.label}</p>
              {step.documentNeeded && (
                <p className="text-xs text-slate-400">Document : {step.documentNeeded}</p>
              )}
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${priorityStyles[step.priority]}`}>
              {priorityLabels[step.priority]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
