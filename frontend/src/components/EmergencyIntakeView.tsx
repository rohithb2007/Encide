import React, { useState } from 'react';
import { Send, AlertTriangle, Sparkles, Mic, FileText, ShieldAlert } from 'lucide-react';
import type { IncidentReport, ConflictAlert, IncidentInfo } from '../types';
import { submitIncidentReport } from '../api/client';

interface EmergencyIntakeViewProps {
  incident: IncidentInfo;
  reports: IncidentReport[];
  conflicts: ConflictAlert[];
  onReportSubmitted: (newReport: IncidentReport) => void;
}

export const EmergencyIntakeView: React.FC<EmergencyIntakeViewProps> = ({
  incident,
  reports,
  conflicts,
  onReportSubmitted,
}) => {
  const [sourceType, setSourceType] = useState<string>('citizen');
  const [description, setDescription] = useState<string>('');
  const [locationText, setLocationText] = useState<string>('Ernakulam South Overbridge');
  const [estimatedCasualties, setEstimatedCasualties] = useState<string>('18');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCallSimulated, setIsCallSimulated] = useState<boolean>(false);

  // Quick Preset Samples for Hackathon Demonstration
  const loadPreset = (type: 'initial_bus' | 'conflicting_phone' | 'hazmat') => {
    if (type === 'initial_bus') {
      setSourceType('citizen');
      setLocationText('Ernakulam South Overbridge');
      setEstimatedCasualties('18');
      setDescription('KSRTC bus collided with cargo truck on South Bridge and rolled over. Approximately 15 to 20 passengers trapped inside and screaming. Fuel leaking on roadway.');
      setIsCallSimulated(false);
    } else if (type === 'conflicting_phone') {
      setSourceType('phone_operator');
      setLocationText('Ernakulam South Overbridge');
      setEstimatedCasualties('38');
      setDescription('112 Emergency Dispatch recording: Caller reports major passenger bus on South Bridge with active fire spreading. Caller estimates 35-40 severe burn and crush casualties.');
      setIsCallSimulated(true);
    } else if (type === 'hazmat') {
      setSourceType('field_responder');
      setLocationText('Ernakulam South Overbridge');
      setEstimatedCasualties('22');
      setDescription('First arriving Police PCR Unit: South Bridge completely blocked both directions. Tanker carrying chemical solvent ruptured. Immediate fire suppression and extrication teams required.');
      setIsCallSimulated(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        source_type: sourceType,
        location_text: locationText,
        description: description.trim(),
        estimated_casualties: estimatedCasualties ? parseInt(estimatedCasualties, 10) : null,
        is_simulated_call: isCallSimulated,
        raw_transcript: isCallSimulated ? description : null
      };
      const res = await submitIncidentReport(incident.id, payload);
      onReportSubmitted(res);
      setDescription('');
    } catch (err) {
      console.error('Failed to submit report:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 p-3 md:p-5 max-w-[1700px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 font-sans">
      {/* Left Column: Intake Submission & Presets (7 cols) */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        {/* Header Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                📥
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">EMERGENCY REPORT INTAKE & AI EXTRACTION</h2>
                <p className="text-xs text-slate-400">Multi-source citizen, telephone, and responder incident ingest engine</p>
              </div>
            </div>
            <div className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              MCI ID: <strong className="text-white">{incident.id}</strong>
            </div>
          </div>

          {/* Quick Demo Scenario Loaders */}
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Quick Presets:</span>
            <button
              type="button"
              onClick={() => loadPreset('initial_bus')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all font-mono text-[11px]"
            >
              1. Initial Bus Crash (18 Casualties)
            </button>
            <button
              type="button"
              onClick={() => loadPreset('conflicting_phone')}
              className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition-all font-mono text-[11px]"
            >
              2. Conflicting 112 Call (38 Casualties)
            </button>
            <button
              type="button"
              onClick={() => loadPreset('hazmat')}
              className="px-2.5 py-1 rounded bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 transition-all font-mono text-[11px]"
            >
              3. PCR Responder Report
            </button>
          </div>
        </div>

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Source Type</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="citizen">Citizen Bystander</option>
                <option value="phone_operator">112 Phone Call Operator</option>
                <option value="ambulance">Ambulance EMS Crew</option>
                <option value="field_responder">Police / Fire Responder</option>
                <option value="hospital">Hospital Triage Desk</option>
                <option value="authority">Emergency Authority</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Location Landmark</label>
              <input
                type="text"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder="e.g. Ernakulam South Bridge"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Est. Casualties (If Given)</label>
              <input
                type="number"
                value={estimatedCasualties}
                onChange={(e) => setEstimatedCasualties(e.target.value)}
                placeholder="e.g. 15"
                min="0"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-mono text-slate-400 uppercase flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                Raw Incident Description or Transcribed Emergency Call
              </label>
              <label className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCallSimulated}
                  onChange={(e) => setIsCallSimulated(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0"
                />
                <Mic className="w-3 h-3 text-rose-400" />
                Simulated 112 Voice Call
              </label>
            </div>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe observations, vehicle types, trapped victims, fire, hazards, road conditions..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-[10px] text-slate-500 font-mono">
              ⚡ Natural language fact extraction & conflict detection will execute automatically.
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !description.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all disabled:opacity-50 active:scale-95 shadow-md shadow-emerald-950/40"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'PROCESSING...' : 'SUBMIT EMERGENCY INTAKE'}
            </button>
          </div>
        </form>

        {/* Multi-Report Conflict Detector Warnings */}
        {conflicts.length > 0 && (
          <div className="bg-rose-950/30 border border-rose-500/40 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs font-mono uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
              MULTI-REPORT CONFLICT ALERTS DETECTED ({conflicts.length})
            </div>
            <div className="space-y-2">
              {conflicts.map((c, idx) => (
                <div key={idx} className="bg-slate-950/80 border border-rose-900/60 rounded-lg p-3 font-mono text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-rose-300 font-bold text-[11px]">{c.conflict_type.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase font-bold">
                      {c.severity}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] font-sans leading-relaxed">{c.description}</p>
                  <div className="text-[10px] text-slate-500">
                    Reports Involved: {c.reports_involved.join(' vs ')} • Cross-check field EMS verification.
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Column: AI Extraction Breakdown & Reports Feed (5 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Latest AI Extracted Card */}
        {reports.length > 0 && reports[0].extracted_data && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold font-mono text-xs uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                AI STRUCTURED REPORT EXTRACTION ({reports[0].id})
              </div>
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                {reports[0].verification_status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
                <div className="text-[10px] text-slate-500">CLASSIFIED INCIDENT</div>
                <div className="text-white font-bold text-[11px] mt-0.5">{reports[0].extracted_data.incident_type || 'Transport Accident'}</div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
                <div className="text-[10px] text-slate-500">ESTIMATED CASUALTIES</div>
                <div className="text-rose-400 font-bold text-[11px] mt-0.5">
                  {reports[0].extracted_data.estimated_casualties !== null ? `~${reports[0].extracted_data.estimated_casualties} victims` : 'Unknown'}
                </div>
              </div>
            </div>

            {reports[0].extracted_data.casualty_uncertainty_note && (
              <div className="bg-amber-950/20 border border-amber-800/40 rounded p-2 text-[11px] text-amber-300/90 font-mono">
                ℹ {reports[0].extracted_data.casualty_uncertainty_note}
              </div>
            )}

            {/* Observed Hazards */}
            <div>
              <div className="text-[10px] text-slate-400 font-mono uppercase mb-1">Observed Hazards</div>
              <div className="flex flex-wrap gap-1.5">
                {(reports[0].extracted_data.observed_hazards || []).map((h, i) => (
                  <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                    {h}
                  </span>
                ))}
              </div>
            </div>

            {/* Missing Information Alerts */}
            {reports[0].extracted_data.missing_details && reports[0].extracted_data.missing_details.length > 0 && (
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 font-mono uppercase font-bold">Missing or Uncertain Elements:</div>
                <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-0.5">
                  {reports[0].extracted_data.missing_details.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Ingest Feed Timeline */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col">
          <div className="font-bold text-white text-xs font-mono uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>INCOMING INTAKE LOG ({reports.length})</span>
            <span className="text-[10px] text-slate-500 font-normal">Real-Time Chronicle</span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[460px] pr-1">
            {reports.map((r) => (
              <div key={r.id} className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="font-bold text-cyan-400">{r.id} • {r.source_type.toUpperCase()}</span>
                  <span className="text-slate-500">{new Date(r.reported_time).toLocaleTimeString()}</span>
                </div>
                <p className="text-slate-200 text-xs leading-relaxed">{r.description}</p>
                <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-slate-900 text-slate-400">
                  <span>Loc: <strong className="text-white">{r.location_text}</strong></span>
                  <span>Est: <strong className="text-rose-400">{r.estimated_casualties ?? 'Unspecified'}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
