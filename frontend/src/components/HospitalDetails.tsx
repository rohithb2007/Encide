import React from 'react';
import { X, Bed, HeartPulse, Stethoscope, Droplet, Wrench } from 'lucide-react';
import type { Hospital } from '../types';

interface HospitalDetailsProps {
  hospital: Hospital | null;
  onClose: () => void;
}

export const HospitalDetails: React.FC<HospitalDetailsProps> = ({ hospital, onClose }) => {
  if (!hospital) return null;

  const loadPct = Math.round(hospital.current_load * 100);

  const getLoadBadgeColor = (load: number) => {
    if (load >= 0.85) return 'bg-rose-950 text-rose-300 border-rose-600/40';
    if (load >= 0.65) return 'bg-amber-950 text-amber-300 border-amber-600/40';
    return 'bg-emerald-950 text-emerald-300 border-emerald-600/40';
  };

  const getProgressBarColor = (load: number) => {
    if (load >= 0.85) return 'bg-rose-500';
    if (load >= 0.65) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-4 shadow-2xl backdrop-blur-md font-mono text-xs text-slate-300 flex flex-col gap-3.5 animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-tight">{hospital.name}</h3>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold ${getLoadBadgeColor(
                hospital.current_load
              )}`}
            >
              {hospital.status}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            {hospital.trauma_level} Trauma Center • Short Code: {hospital.short_code}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Bed & ICU Telemetry */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Bed className="w-3.5 h-3.5 text-cyan-400" />
              GENERAL BEDS
            </span>
            <span className="font-bold text-white">
              {hospital.available_beds} / {hospital.total_beds}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getProgressBarColor(hospital.current_load)}`}
              style={{ width: `${loadPct}%` }}
            />
          </div>
          <span className="text-[9px] text-slate-500 mt-1 block">
            {loadPct}% Occupancy ({hospital.total_beds - hospital.available_beds} Occupied)
          </span>
        </div>

        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
              ICU CAPACITY
            </span>
            <span className="font-bold text-rose-300">
              {hospital.available_icu} / {hospital.total_icu}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-rose-500 transition-all duration-500"
              style={{
                width: `${
                  hospital.total_icu
                    ? Math.round(
                        ((hospital.total_icu - hospital.available_icu) / hospital.total_icu) * 100
                      )
                    : 0
                }%`,
              }}
            />
          </div>
          <span className="text-[9px] text-slate-500 mt-1 block">
            {hospital.available_icu > 0 ? 'CRITICAL RESUS ACTIVE' : 'NO ICU BEDS AVAILABLE'}
          </span>
        </div>
      </div>

      {/* Specialists */}
      <div>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5 font-bold">
          <Stethoscope className="w-3 h-3 text-indigo-400" />
          STAFFED SURGICAL SPECIALISTS
        </span>
        <div className="flex flex-wrap gap-1">
          {hospital.specialists.map((spec) => (
            <span
              key={spec}
              className="text-[10px] bg-slate-800/90 text-slate-300 px-2 py-0.5 rounded border border-slate-700"
            >
              {spec}
            </span>
          ))}
        </div>
      </div>

      {/* Equipment */}
      <div>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5 font-bold">
          <Wrench className="w-3 h-3 text-amber-400" />
          OPERATIONAL CRITICAL EQUIPMENT
        </span>
        <div className="flex flex-wrap gap-1">
          {hospital.equipment.map((eq) => (
            <span
              key={eq}
              className="text-[10px] bg-amber-950/40 text-amber-300 px-2 py-0.5 rounded border border-amber-800/40"
            >
              {eq}
            </span>
          ))}
        </div>
      </div>

      {/* Blood Bank */}
      <div>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5 font-bold">
          <Droplet className="w-3 h-3 text-rose-500" />
          BLOOD BANK TELEMETRY (UNITS)
        </span>
        <div className="grid grid-cols-5 gap-1 text-center font-bold">
          {Object.entries(hospital.blood_stock).map(([type, units]) => (
            <div key={type} className="bg-slate-950 p-1 rounded border border-slate-800">
              <span className="text-[9px] text-slate-400 block">{type.replace('_', ' ')}</span>
              <span className={units < 10 ? 'text-rose-400' : 'text-emerald-400'}>{units}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
