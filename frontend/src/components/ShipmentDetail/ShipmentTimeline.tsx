// src/components/ShipmentDetail/ShipmentTimeline.tsx

import React from 'react';
import { Clock, CheckCircle2, Circle } from 'lucide-react';
import type { Shipment } from '../../types';

interface ShipmentTimelineProps {
  shipment: Shipment;
}

const statusOrder = [
  'DRAFT', 'PENDING', 'ARRIVED', 'DDI_OBTAINED', 'DECLARATION_FILED',
  'LIQUIDATION_ISSUED', 'CUSTOMS_PAID', 'BAE_ISSUED', 'TERMINAL_PAID',
  'DO_RELEASED', 'EXIT_NOTE_ISSUED', 'IN_DELIVERY', 'DELIVERED',
  'INVOICED', 'CLOSED', 'ARCHIVED'
];

const timelineSteps = [
  { status: 'PENDING', label: 'Dossier créé' },
  { status: 'ARRIVED', label: 'Navire arrivé' },
  { status: 'DDI_OBTAINED', label: 'DDI obtenue' },
  { status: 'DECLARATION_FILED', label: 'Déclaration déposée' },
  { status: 'LIQUIDATION_ISSUED', label: 'Liquidation émise' },
  { status: 'CUSTOMS_PAID', label: 'Droits payés' },
  { status: 'BAE_ISSUED', label: 'BAE émis' },
  { status: 'TERMINAL_PAID', label: 'Terminal payé' },
  { status: 'DO_RELEASED', label: 'DO libéré' },
  { status: 'EXIT_NOTE_ISSUED', label: 'Bon de sortie émis' },
  { status: 'IN_DELIVERY', label: 'En cours de livraison' },
  { status: 'DELIVERED', label: 'Livré au client' },
  { status: 'INVOICED', label: 'Facturé' },
  { status: 'CLOSED', label: 'Dossier clôturé' },
];

export const ShipmentTimeline: React.FC<ShipmentTimelineProps> = ({ shipment }) => {
  const currentStatusIndex = statusOrder.indexOf(shipment.status);
  
  const getStepStatus = (stepStatus: string): 'completed' | 'current' | 'pending' => {
    const stepIndex = statusOrder.indexOf(stepStatus);
    if (stepIndex < currentStatusIndex) return 'completed';
    if (stepIndex === currentStatusIndex) return 'current';
    return 'pending';
  };

  const progressPercentage = Math.round((currentStatusIndex / (statusOrder.length - 1)) * 100);

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Progression</span>
          <span className="text-sm font-semibold text-blue-600">{progressPercentage}%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Timeline Steps */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="font-medium text-slate-900 mb-4">Étapes</h3>
        
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

          <div className="space-y-4">
            {timelineSteps.map((step) => {
              const status = getStepStatus(step.status);

              return (
                <div key={step.status} className="relative flex items-start gap-4 pl-10">
                  <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    status === 'completed' ? 'bg-green-100' :
                    status === 'current' ? 'bg-blue-100 ring-4 ring-blue-50' :
                    'bg-slate-100'
                  }`}>
                    {status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : status === 'current' ? (
                      <Circle className="w-5 h-5 text-blue-600 fill-blue-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${
                        status === 'completed' ? 'text-slate-700' :
                        status === 'current' ? 'text-blue-600' :
                        'text-slate-400'
                      }`}>
                        {step.label}
                      </span>
                      {status === 'current' && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-xs font-medium">
                          En cours
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Activity Log */}
      {shipment.timeline && shipment.timeline.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-medium text-slate-900 mb-4">Journal d'activité</h3>
          
          <div className="space-y-3">
            {shipment.timeline
              .slice()
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {event.userName ? (
                      <span className="text-blue-600 font-medium text-sm">
                        {event.userName.charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <Clock size={16} className="text-blue-600" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{event.action}</p>
                    {event.description && (
                      <p className="text-sm text-slate-600 mt-0.5">{event.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span>
                        {new Date(event.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {event.userName && (
                        <>
                          <span>•</span>
                          <span>{event.userName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="text-center text-sm text-slate-500 py-4">
        Dossier créé le {new Date(shipment.createdAt).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })}
      </div>
    </div>
  );
};

export default ShipmentTimeline;
