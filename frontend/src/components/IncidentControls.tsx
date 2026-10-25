import React, { useState } from 'react';
import { Siren, Zap } from 'lucide-react';
import type { IncidentInfo } from '../types';

interface IncidentControlsProps {
  onTriggerSurge: (count: number) => void;
  onOptimize: () => void;
  isTriggering?: boolean;
  isOptimizing?: boolean;
  waitingCount: number;
  incident?: IncidentInfo;
}

export const IncidentControls: React.FC<IncidentControlsProps> = ({
  onTriggerSurge,
  onOptimize,
  isTriggering = false,
  isOptimizing = false,
  waitingCount,
  incident,
}) => {
  const [casualtyCount, setCasualtyCount] = useState<number>(30);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-xl font-mono">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <span className="text-xs font-bold tracking-wider text-slate-200">
            INCIDENT COMMAND DISPATCH
          </span>
        </div>
        {incident && (
          <span className="text-[10px] text-slate-400 truncate max-w-[200px]" title={incident.name}>
            {incident.name}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Trigger Surge Button */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>SURGE SCALE</span>
            <div className="flex gap-1">
              {[15, 30, 50].map((num) => (
                <button
                  key={num}
                  onClick={() => setCasualtyCount(num)}
                  className={`px-1.5 py-0.5 rounded text-[10px] transition-all ${
                    casualtyCount === num
                      ? 'bg-rose-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  +{num}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onTriggerSurge(casualtyCount)}
            disabled={isTriggering || isOptimizing}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600 hover:from-rose-600 hover:to-amber-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-rose-950/50 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Siren className={`w-4 h-4 ${isTriggering ? 'animate-bounce' : ''}`} />
            <span>TRIGGER MASS CASUALTY SURGE</span>
          </button>
        </div>

        {/* Optimize Routing Button */}
        <div className="flex flex-col justify-end">
          <button
            onClick={onOptimize}
            disabled={isOptimizing || isTriggering || waitingCount === 0}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold tracking-wide shadow-lg transition-all active:scale-[0.98] ${
              waitingCount > 0
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-indigo-950/60 ring-2 ring-indigo-400/50 animate-pulse'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Zap className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : ''}`} />
            <span>
              OPTIMIZE CASUALTY EVACUATION {waitingCount > 0 ? `(${waitingCount})` : ''}
            </span>
          </button>
          <span className="text-[9px] text-slate-400 mt-1 text-center">
            Allocate scene casualties to receiving hospitals
          </span>
        </div>
      </div>
    </div>
  );
};
