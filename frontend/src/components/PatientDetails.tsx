import React from 'react';
import { X } from 'lucide-react';
import type { Patient, Hospital } from '../types';

interface PatientDetailsProps {
  patient: Patient | null;
  assignedHospital?: Hospital | null;
  onClose: () => void;
}

export const PatientDetails: React.FC<PatientDetailsProps> = ({
  patient,
  assignedHospital,
  onClose,
}) => {
  if (!patient) return null;

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'RED':
        return 'bg-rose-950 text-rose-300 border-rose-600/50';
      case 'YELLOW':
        return 'bg-amber-950 text-amber-300 border-amber-600/50';
      case 'GREEN':
        return 'bg-emerald-950 text-emerald-300 border-emerald-600/50';
      default:
        return 'bg-slate-900 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-4 shadow-2xl backdrop-blur-md font-mono text-xs text-slate-300 flex flex-col gap-3 animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-tight">{patient.id}</h3>
            <span
              className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${getSeverityStyle(
                patient.severity
              )}`}
            >
              TRIAGE: {patient.severity}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            {patient.age ? `${patient.age} y/o ` : ''}
            {patient.gender ? `${patient.gender} • ` : ''}
            Status: <strong className="text-cyan-400">{patient.status}</strong>
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Assignment Destination */}
      <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
        <span className="text-[10px] text-slate-400 block mb-1">ROUTING DESTINATION</span>
        {assignedHospital ? (
          <div className="flex items-center justify-between">
            <span className="text-white font-bold text-xs">{assignedHospital.name}</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 border border-indigo-700 text-indigo-300 font-bold">
              {assignedHospital.short_code}
            </span>
          </div>
        ) : (
          <span className="text-amber-400 italic">Pending optimization assignment...</span>
        )}
      </div>

      {/* Vitals Panel */}
      {patient.vitals && (
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1 font-bold">
            FIELD PHYSIOLOGICAL VITALS
          </span>
          <div className="grid grid-cols-5 gap-1 text-center font-bold">
            <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
              <span className="text-[9px] text-slate-400 block">RR</span>
              <span className={patient.vitals.rr && patient.vitals.rr > 30 ? 'text-rose-400' : 'text-slate-200'}>
                {patient.vitals.rr || '--'}
              </span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
              <span className="text-[9px] text-slate-400 block">HR</span>
              <span className={patient.vitals.hr && patient.vitals.hr > 120 ? 'text-rose-400' : 'text-slate-200'}>
                {patient.vitals.hr || '--'}
              </span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
              <span className="text-[9px] text-slate-400 block">SBP</span>
              <span className={patient.vitals.sbp && patient.vitals.sbp < 90 ? 'text-rose-400' : 'text-slate-200'}>
                {patient.vitals.sbp || '--'}
              </span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
              <span className="text-[9px] text-slate-400 block">SPO2</span>
              <span className={patient.vitals.spo2 && patient.vitals.spo2 < 90 ? 'text-rose-400' : 'text-slate-200'}>
                {patient.vitals.spo2 ? `${patient.vitals.spo2}%` : '--'}
              </span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
              <span className="text-[9px] text-slate-400 block">GCS</span>
              <span className={patient.vitals.gcs && patient.vitals.gcs < 9 ? 'text-rose-400' : 'text-slate-200'}>
                {patient.vitals.gcs || '--'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Clinical Requirements */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-950 p-2 rounded border border-slate-800">
          <span className="text-[9px] text-slate-400 block">SPECIALIST NEEDED</span>
          <span className="text-white font-bold">{patient.required_specialist}</span>
        </div>
        <div className="bg-slate-950 p-2 rounded border border-slate-800">
          <span className="text-[9px] text-slate-400 block">EQUIPMENT NEEDED</span>
          <span className="text-amber-300 font-bold">{patient.required_equipment}</span>
        </div>
      </div>

      <div className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800">
        <span className="text-[10px] text-slate-400">BLOOD REQUIREMENT</span>
        <span className="font-bold text-rose-400">{patient.blood_requirement}</span>
      </div>
    </div>
  );
};
