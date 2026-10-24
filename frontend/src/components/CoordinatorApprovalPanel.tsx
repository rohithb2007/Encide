import React, { useState } from 'react';
import { ShieldCheck, Check, Building, Truck } from 'lucide-react';
import type { AssignmentItem, Patient, Hospital, Ambulance } from '../types';
import { approveRecommendation } from '../api/client';

interface CoordinatorApprovalPanelProps {
  proposals: AssignmentItem[];
  patients: Patient[];
  hospitals: Hospital[];
  ambulances: Ambulance[];
  onApproved: () => void;
}

export const CoordinatorApprovalPanel: React.FC<CoordinatorApprovalPanelProps> = ({
  proposals,
  patients,
  hospitals,
  ambulances,
  onApproved,
}) => {
  const [approvingPatientId, setApprovingPatientId] = useState<string | null>(null);

  const pendingProposals = proposals.filter((p) => p.approval_status === 'PENDING_APPROVAL');

  if (pendingProposals.length === 0) return null;

  const handleApprove = async (patientId: string, ambId?: string | null) => {
    setApprovingPatientId(patientId);
    try {
      await approveRecommendation(patientId, ambId || undefined);
      onApproved();
    } catch (err) {
      console.error('Failed to approve recommendation:', err);
    } finally {
      setApprovingPatientId(null);
    }
  };

  const handleApproveAll = async () => {
    for (const prop of pendingProposals) {
      await handleApprove(prop.patient_id, prop.ambulance_id);
    }
  };

  return (
    <div className="bg-slate-900 border border-indigo-500/40 rounded-xl p-4 shadow-2xl space-y-3 font-sans animate-fadeIn">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
            COORDINATOR APPROVAL QUEUE ({pendingProposals.length} PENDING)
          </h3>
        </div>

        <button
          onClick={handleApproveAll}
          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[11px] font-bold transition-all shadow-md active:scale-95"
        >
          APPROVE ALL PROPOSALS
        </button>
      </div>

      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {pendingProposals.map((prop) => {
          const patient = patients.find((p) => p.id === prop.patient_id);
          const hospital = hospitals.find((h) => h.id === prop.hospital_id);
          const ambulance = ambulances.find((a) => a.id === prop.ambulance_id);
          const isApproving = approvingPatientId === prop.patient_id;

          let tagColor = 'bg-slate-800 text-slate-300';
          if (patient?.severity === 'RED') tagColor = 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
          else if (patient?.severity === 'YELLOW') tagColor = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';

          return (
            <div key={prop.patient_id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between font-mono">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{prop.patient_id}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${tagColor}`}>
                    {patient?.severity}
                  </span>
                  <span className="text-slate-400 text-[10px]">ETA: {prop.estimated_transit_minutes}m ({prop.transit_distance_km}km)</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded border border-amber-800/70 bg-amber-950/50 text-amber-300">
                    {prop.approval_status || 'STATUS UNAVAILABLE'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                    Suitability: {(prop.score * 100).toFixed(0)}%
                  </span>
                  <button
                    onClick={() => handleApprove(prop.patient_id, prop.ambulance_id)}
                    disabled={isApproving}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold transition-all disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" />
                    APPROVE
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/80 px-2 py-1 rounded">
                  <Building className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Hospital: <strong className="text-white">{hospital?.name || prop.hospital_id}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/80 px-2 py-1 rounded">
                  <Truck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ambulance: <strong className="text-white">{ambulance?.unit_number || prop.ambulance_id || 'Nearest Available'}</strong></span>
                </div>
              </div>

              {/* Justification reasons */}
              {prop.suitability_reasons && prop.suitability_reasons.length > 0 && (
                <div className="text-[10px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-900">
                  <div className="font-bold text-slate-500 font-mono uppercase">Backend suitability reasons:</div>
                  <div className="text-slate-300 font-sans">{prop.suitability_reasons.join(' • ')}</div>
                </div>
              )}

              {prop.resource_constraints && prop.resource_constraints.length > 0 && (
                <div className="text-[10px] text-amber-200">
                  Constraints: {prop.resource_constraints.join(' · ')}
                </div>
              )}

              {prop.alternative_options && prop.alternative_options.length > 0 && (
                <details className="border-t border-slate-900 pt-1">
                  <summary className="cursor-pointer text-[10px] font-bold text-cyan-300">
                    Backend alternatives ({prop.alternative_options.length})
                  </summary>
                  <div className="mt-1 space-y-1">
                    {prop.alternative_options.map((option) => (
                      <div key={option.hospital_id} className="text-[10px] text-slate-300">
                        {option.hospital_name} · {option.distance_km} km / {option.eta_minutes} min ·
                        {` ${option.available_beds} beds, ${option.available_icu} ICU`}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
