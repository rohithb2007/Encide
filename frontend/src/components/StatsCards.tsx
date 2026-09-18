import React from 'react';
import { Users, Clock, CheckCircle2, BedDouble } from 'lucide-react';
import type { Patient, Hospital } from '../types';

interface StatsCardsProps {
  patients: Patient[];
  hospitals: Hospital[];
}

export const StatsCards: React.FC<StatsCardsProps> = ({ patients, hospitals }) => {
  const total = patients.length;
  const waiting = patients.filter((p) => p.status === 'WAITING').length;
  const assigned = patients.filter((p) => p.status === 'ASSIGNED').length;
  const admitted = patients.filter((p) => p.status === 'ADMITTED').length;

  const redCount = patients.filter((p) => p.severity === 'RED').length;
  const yellowCount = patients.filter((p) => p.severity === 'YELLOW').length;
  const greenCount = patients.filter((p) => p.severity === 'GREEN').length;
  const blackCount = patients.filter((p) => p.severity === 'BLACK').length;

  const totalAvailBeds = hospitals.reduce((acc, h) => acc + h.available_beds, 0);
  const totalAvailICU = hospitals.reduce((acc, h) => acc + h.available_icu, 0);
  const avgLoadPct = hospitals.length
    ? Math.round(
        (hospitals.reduce((acc, h) => acc + h.current_load, 0) / hospitals.length) * 100
      )
    : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 px-4 py-2 bg-slate-900/60 border-b border-slate-800 text-xs font-mono">
      {/* Total Casualties */}
      <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-slate-400 text-[10px] uppercase tracking-wider block">CASUALTIES</span>
          <span className="text-xl font-bold text-white leading-none mt-1 block">{total}</span>
        </div>
        <div className="w-8 h-8 rounded bg-indigo-950/80 border border-indigo-700/40 flex items-center justify-center text-indigo-400">
          <Users className="w-4 h-4" />
        </div>
      </div>

      {/* Waiting */}
      <div className="bg-slate-950/80 p-2.5 rounded-lg border border-amber-900/30 flex items-center justify-between">
        <div>
          <span className="text-amber-400 text-[10px] uppercase tracking-wider block">WAITING</span>
          <span className="text-xl font-bold text-amber-300 leading-none mt-1 block">{waiting}</span>
        </div>
        <div className="w-8 h-8 rounded bg-amber-950/80 border border-amber-700/40 flex items-center justify-center text-amber-400">
          <Clock className="w-4 h-4" />
        </div>
      </div>

      {/* Assigned */}
      <div className="bg-slate-950/80 p-2.5 rounded-lg border border-emerald-900/30 flex items-center justify-between">
        <div>
          <span className="text-emerald-400 text-[10px] uppercase tracking-wider block">ASSIGNED</span>
          <span className="text-xl font-bold text-emerald-300 leading-none mt-1 block">{assigned}</span>
        </div>
        <div className="w-8 h-8 rounded bg-emerald-950/80 border border-emerald-700/40 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
        </div>
      </div>

      {/* Admitted */}
      <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-slate-400 text-[10px] uppercase tracking-wider block">ADMITTED</span>
          <span className="text-xl font-bold text-slate-300 leading-none mt-1 block">{admitted}</span>
        </div>
        <div className="w-8 h-8 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400">
          <BedDouble className="w-4 h-4" />
        </div>
      </div>

      {/* Triage Severity Breakdown */}
      <div className="col-span-2 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
        <span className="text-slate-400 text-[10px] uppercase tracking-wider block">
          START TRIAGE ACUITY
        </span>
        <div className="grid grid-cols-4 gap-1.5 mt-1 text-center font-bold">
          <div className="bg-rose-950/80 border border-rose-600/40 text-rose-300 py-0.5 rounded">
            <span className="text-[9px] block font-normal text-rose-400">RED</span>
            {redCount}
          </div>
          <div className="bg-amber-950/80 border border-amber-600/40 text-amber-300 py-0.5 rounded">
            <span className="text-[9px] block font-normal text-amber-400">YEL</span>
            {yellowCount}
          </div>
          <div className="bg-emerald-950/80 border border-emerald-600/40 text-emerald-300 py-0.5 rounded">
            <span className="text-[9px] block font-normal text-emerald-400">GRN</span>
            {greenCount}
          </div>
          <div className="bg-slate-900 border border-slate-700 text-slate-400 py-0.5 rounded">
            <span className="text-[9px] block font-normal text-slate-500">BLK</span>
            {blackCount}
          </div>
        </div>
      </div>

      {/* Regional Capacity */}
      <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-slate-400 text-[10px] uppercase tracking-wider block">REGIONAL BEDS</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-white leading-none">{totalAvailBeds}</span>
            <span className="text-[10px] text-cyan-400">({totalAvailICU} ICU)</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[9px] text-slate-500 block">AVG LOAD</span>
          <span
            className={`text-xs font-bold ${
              avgLoadPct > 80 ? 'text-rose-400' : avgLoadPct > 60 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {avgLoadPct}%
          </span>
        </div>
      </div>
    </div>
  );
};
