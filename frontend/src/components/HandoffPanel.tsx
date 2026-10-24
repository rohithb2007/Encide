import React from 'react';
import { Sparkles, FileText } from 'lucide-react';
import type { ExplainResponse } from '../types';

interface HandoffPanelProps {
  explanation: ExplainResponse | null;
  isLoading?: boolean;
}

export const HandoffPanel: React.FC<HandoffPanelProps> = ({ explanation, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-400 flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
        <span>Synthesizing Explainable AI (XAI) clinical justification...</span>
      </div>
    );
  }

  if (!explanation) return null;

  const { score, breakdown, explanation: explanationText, handoff_summary } = explanation;

  const scoreBars = [
    { label: 'Specialist Match', value: breakdown.specialist, color: 'bg-indigo-500' },
    { label: 'ICU Readiness', value: breakdown.icu, color: 'bg-rose-500' },
    { label: 'Resource Match', value: breakdown.resources, color: 'bg-amber-500' },
    { label: 'Distance Proximity', value: breakdown.distance, color: 'bg-cyan-500' },
    { label: 'Load Balance', value: breakdown.load_balance, color: 'bg-emerald-500' },
  ];

  return (
    <div className="bg-slate-900/95 border border-indigo-500/40 rounded-xl p-4 shadow-2xl font-mono text-xs text-slate-300 flex flex-col gap-3.5 animate-in fade-in duration-300">
      {/* Section 1: Why This Hospital? */}
      <div className="border-b border-slate-800 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              WHY THIS HOSPITAL?
            </h4>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-indigo-950 border border-indigo-700 text-indigo-300 font-bold">
            MATCH SCORE: {(score * 100).toFixed(0)}%
          </span>
        </div>

        {/* Narrative Explanation */}
        <p className="text-xs leading-relaxed text-slate-300 bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 italic">
          "{explanationText}"
        </p>

        {/* Score Breakdown Bars */}
        <div className="mt-3 space-y-1.5">
          <span className="text-xs text-slate-400 font-bold block mb-1">
            SCORE FACTOR BREAKDOWN
          </span>
          {scoreBars.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs">
              <span className="w-28 text-slate-400 truncate">{item.label}</span>
              <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full ${item.color} transition-all duration-500`}
                  style={{ width: `${Math.round(item.value * 100)}%` }}
                />
              </div>
              <span className="w-9 text-right font-bold text-slate-200">
                {Math.round(item.value * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Structured Patient Handoff */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              EMS PATIENT HANDOFF SUMMARY
            </h4>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 uppercase font-bold">
            {handoff_summary.dispatch_protocol}
          </span>
        </div>

        <div className="bg-slate-950/90 rounded-lg p-3 border border-slate-800 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-500 block">DESTINATION</span>
            <span className="font-bold text-white text-xs">
              {handoff_summary.destination_hospital}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">TRAUMA TIER</span>
            <span className="font-bold text-cyan-300">
              {handoff_summary.destination_trauma_tier}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">ESTIMATED ETA</span>
            <span className="font-bold text-amber-300 text-xs">
              ~{handoff_summary.estimated_transit_eta_minutes} MIN ({handoff_summary.transit_distance_km} KM)
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">REQUIRED SPECIALIST</span>
            <span className="font-bold text-indigo-300">
              {handoff_summary.required_specialist}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">CRITICAL EQUIPMENT</span>
            <span className="font-bold text-slate-200">
              {handoff_summary.required_equipment}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">BLOOD TYPE / UNITS</span>
            <span className="font-bold text-rose-400">
              {handoff_summary.blood_type_required}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
