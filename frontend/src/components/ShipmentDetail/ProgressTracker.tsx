// src/components/ShipmentDetail/ProgressTracker.tsx

import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import type { ShipmentStatus } from '../../types';
import { statusLabels } from '../../utils/format';

interface ProgressTrackerProps {
  currentStatus: ShipmentStatus;
}

// Simplified major milestones for the progress bar
const MILESTONES: { status: ShipmentStatus; short: string }[] = [
  { status: 'PENDING', short: 'Réception' },
  { status: 'ARRIVED', short: 'Arrivée' },
  { status: 'DDI_OBTAINED', short: 'DDI' },
  { status: 'DECLARATION_FILED', short: 'Déclaration' },
  { status: 'CUSTOMS_PAID', short: 'Droits payés' },
  { status: 'BAE_ISSUED', short: 'BAE' },
  { status: 'DO_RELEASED', short: 'DO' },
  { status: 'EXIT_NOTE_ISSUED', short: 'Bon sortie' },
  { status: 'DELIVERED', short: 'Livré' },
];

const STATUS_ORDER: ShipmentStatus[] = [
  'DRAFT', 'PENDING', 'ARRIVED', 'DDI_OBTAINED',
  'DECLARATION_FILED', 'LIQUIDATION_ISSUED', 'CUSTOMS_PAID',
  'BAE_ISSUED', 'TERMINAL_PAID', 'DO_RELEASED',
  'EXIT_NOTE_ISSUED', 'IN_DELIVERY', 'DELIVERED',
  'INVOICED', 'CLOSED', 'ARCHIVED',
];

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ currentStatus }) => {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  // Calculate overall percentage
  const percent = Math.min(100, Math.round((currentIndex / (STATUS_ORDER.length - 1)) * 100));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      {/* Header with percentage */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-slate-500">Statut actuel</p>
          <p className="font-semibold text-slate-800">{statusLabels[currentStatus] || currentStatus}</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-blue-600">{percent}%</span>
        </div>
      </div>

      {/* Full progress bar */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Milestones */}
      <div className="flex overflow-x-auto gap-0 no-scrollbar">
        {MILESTONES.map((milestone, i) => {
          const milestoneIndex = STATUS_ORDER.indexOf(milestone.status);
          const isCompleted = currentIndex >= milestoneIndex;
          const isCurrent = currentStatus === milestone.status;

          return (
            <div
              key={milestone.status}
              className="flex flex-col items-center flex-shrink-0"
              style={{ width: `${100 / MILESTONES.length}%`, minWidth: '60px' }}
            >
              {/* Connector line + icon */}
              <div className="flex items-center w-full mb-1.5">
                {i > 0 && (
                  <div className={`h-0.5 flex-1 ${isCompleted ? 'bg-green-400' : 'bg-slate-200'}`} />
                )}
                <div className={`shrink-0 ${i > 0 ? '' : 'ml-auto'} ${i < MILESTONES.length - 1 ? '' : 'mr-auto'}`}>
                  {isCompleted ? (
                    <CheckCircle2
                      size={isCurrent ? 20 : 16}
                      className={`${isCurrent ? 'text-blue-600' : 'text-green-500'}`}
                    />
                  ) : (
                    <Circle size={16} className="text-slate-300" />
                  )}
                </div>
                {i < MILESTONES.length - 1 && (
                  <div className={`h-0.5 flex-1 ${currentIndex > milestoneIndex ? 'bg-green-400' : 'bg-slate-200'}`} />
                )}
              </div>

              {/* Label */}
              <span className={`text-[10px] text-center leading-tight ${
                isCurrent
                  ? 'text-blue-700 font-bold'
                  : isCompleted
                    ? 'text-green-600 font-medium'
                    : 'text-slate-400'
              }`}>
                {milestone.short}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
