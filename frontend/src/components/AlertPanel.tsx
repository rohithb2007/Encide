import React from 'react';
import { Flame, Clock } from 'lucide-react';
import type { SaturationAlert } from '../types';

interface AlertPanelProps {
  alerts: SaturationAlert[];
  onSelectHospital?: (hospitalId: string) => void;
}

export const AlertPanel: React.FC<AlertPanelProps> = ({ alerts, onSelectHospital }) => {
  if (!alerts.length) {
    return (
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 font-mono text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span className="font-bold">PREDICTIVE SATURATION MONITOR</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          All regional facilities within normal operational reserve horizons. No saturation alerts active.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/95 border border-rose-800/60 rounded-xl p-3 shadow-xl font-mono text-xs animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-rose-400">
          <Flame className="w-4 h-4 animate-pulse text-rose-500" />
          <span className="font-bold tracking-wider text-[11px]">
            PREDICTIVE SATURATION WARNINGS ({alerts.length})
          </span>
        </div>
        <span className="text-[9px] bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-700/50 uppercase">
          PRIORITY DISPATCH OVERRIDE
        </span>
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.hospital_id}
            onClick={() => onSelectHospital?.(alert.hospital_id)}
            className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
              alert.severity === 'critical'
                ? 'bg-gradient-to-r from-rose-950/80 to-slate-950 border-rose-600/70 hover:border-rose-400 text-rose-200'
                : 'bg-gradient-to-r from-amber-950/70 to-slate-950 border-amber-600/60 hover:border-amber-400 text-amber-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">{alert.hospital_name}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/40 border border-current">
                ~{alert.minutes_to_saturation} MIN TO CAPACITY
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] mt-1.5 text-slate-400">
              <span>Current Load: <strong className="text-white">{Math.round(alert.current_load * 100)}%</strong></span>
              <span>Available Beds: <strong className="text-white">{alert.available_beds}</strong></span>
              <span className="text-cyan-400 underline hover:text-cyan-300">View Details →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
