import React, { useState } from 'react';
import { Compass, Navigation, Shield, Plus, Trash2 } from 'lucide-react';
import type { IncidentInfo, IncidentReport, TrafficAdvisory, UserRole } from '../types';
import { publishTrafficAdvisory, setDemoActorContext, submitIncidentReport, withdrawTrafficAdvisory } from '../api/client';

interface DriverGuidanceViewProps {
  advisories: TrafficAdvisory[];
  incident: IncidentInfo;
  currentUserRole: UserRole;
  onAdvisoryUpdated: () => void;
  onReportSubmitted: (report: IncidentReport) => void;
}

export const DriverGuidanceView: React.FC<DriverGuidanceViewProps> = ({
  advisories,
  incident,
  currentUserRole,
  onAdvisoryUpdated,
  onReportSubmitted,
}) => {
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [roadName, setRoadName] = useState<string>('');
  const [hazardDesc, setHazardDesc] = useState<string>('');
  const [detourDesc, setDetourDesc] = useState<string>('');
  const [status, setStatus] = useState<'CONFIRMED_CLOSED' | 'REPORTED_BLOCKED' | 'CONGESTED'>('CONFIRMED_CLOSED');
  const [startLatitude, setStartLatitude] = useState('');
  const [startLongitude, setStartLongitude] = useState('');
  const [endLatitude, setEndLatitude] = useState('');
  const [endLongitude, setEndLongitude] = useState('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [reportLocation, setReportLocation] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);

  const canPublish = currentUserRole === 'COORDINATOR';

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    const coordinates = [startLatitude, startLongitude, endLatitude, endLongitude].map(Number);
    if (!roadName.trim() || coordinates.some((value) => !Number.isFinite(value)) ||
      coordinates[0] < -90 || coordinates[0] > 90 || coordinates[2] < -90 || coordinates[2] > 90 ||
      coordinates[1] < -180 || coordinates[1] > 180 || coordinates[3] < -180 || coordinates[3] > 180) return;

    setIsSubmitting(true);
    try {
      await publishTrafficAdvisory({
        road_name: roadName.trim(),
        hazard_description: hazardDesc.trim(),
        suggested_detour: detourDesc.trim(),
        status: status,
        start_coordinates: [coordinates[0], coordinates[1]],
        end_coordinates: [coordinates[2], coordinates[3]],
        published_by: 'Incident Commander / Traffic Control Liaison'
      });
      setShowPublishModal(false);
      setRoadName('');
      setHazardDesc('');
      setDetourDesc('');
      setStartLatitude('');
      setStartLongitude('');
      setEndLatitude('');
      setEndLongitude('');
      onAdvisoryUpdated();
    } catch (err) {
      console.error('Failed to publish advisory:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async (advId: string) => {
    try {
      await withdrawTrafficAdvisory(advId);
      onAdvisoryUpdated();
    } catch (err) {
      console.error('Failed to withdraw advisory:', err);
    }
  };

  const handleIncidentReport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reportLocation.trim() || !reportDescription.trim()) return;
    setIsSubmitting(true);
    setReportFeedback(null);
    try {
      setDemoActorContext(currentUserRole, currentUserRole === 'COORDINATOR' ? 'Demo Coordinator' : 'Demo Public Driver');
      const report = await submitIncidentReport(incident.id, {
        source_type: 'public_driver',
        source_identifier: 'Demo driver session',
        location_text: reportLocation.trim(),
        description: reportDescription.trim()
      });
      onReportSubmitted(report);
      setReportLocation('');
      setReportDescription('');
      setReportFeedback(`Report ${report.id} submitted for review.`);
    } catch (err) {
      setReportFeedback(err instanceof Error ? err.message : 'Could not submit the scene report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 p-3 md:p-5 max-w-[1700px] w-full mx-auto space-y-4 font-sans">
      {/* Driver Caution Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold">
            <Compass className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">PUBLIC DRIVER & TRAFFIC GUIDANCE PORTAL</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ACTIVE CORRIDOR ADVISORY
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Preserve emergency vehicle transit routes. Follow authorized detour guidance to prevent gridlock.
            </p>
          </div>
        </div>

        {!canPublish && (
          <section className="rounded-xl border border-indigo-900/50 bg-slate-900 p-4">
            <h3 className="text-xs font-bold uppercase text-white">Report a road or scene hazard</h3>
            <p className="mt-1 text-[10px] text-slate-400">Reports are unverified until reviewed. This public view does not access patient or ambulance records.</p>
            <form onSubmit={handleIncidentReport} className="mt-3 grid gap-2 md:grid-cols-2">
              <label className="text-[10px] text-slate-400">Location
                <input required value={reportLocation} onChange={(event) => setReportLocation(event.target.value)}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 text-xs text-white" />
              </label>
              <label className="text-[10px] text-slate-400">Observation
                <input required value={reportDescription} onChange={(event) => setReportDescription(event.target.value)}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 text-xs text-white" />
              </label>
              <div className="flex items-center gap-3 md:col-span-2">
                <button disabled={isSubmitting} className="rounded bg-indigo-700 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">
                  {isSubmitting ? 'SENDING…' : 'SUBMIT SCENE REPORT'}
                </button>
                {reportFeedback && <p role="status" className="text-xs text-cyan-200">{reportFeedback}</p>}
              </div>
            </form>
          </section>
        )}

        {canPublish && (
          <button
            onClick={() => setShowPublishModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            PUBLISH TRAFFIC ADVISORY
          </button>
        )}
      </div>

      {/* Public Disclaimer Notice */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg px-3.5 py-2 text-[11px] font-mono text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          Public Privacy Protection: All sensitive casualty, patient, and clinical data is strictly withheld from this feed.
        </span>
        <span className="text-slate-500 hidden sm:inline">Simulated Traffic Coordination Feed</span>
      </div>

      {/* Active Advisories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {advisories.filter((a) => a.is_published).map((adv) => (
          <div key={adv.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-rose-400 font-bold text-sm">⛔</span>
                <span className="font-bold text-white text-xs font-mono">{adv.road_name}</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                adv.status === 'CONFIRMED_CLOSED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {adv.status.replace(/_/g, ' ')}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">{adv.hazard_description}</p>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono space-y-1">
              <div className="text-emerald-400 font-bold text-[11px] flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5" />
                RECOMMENDED ALTERNATIVE ROUTE:
              </div>
              <div className="text-slate-200 text-xs font-sans">{adv.suggested_detour}</div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
              <span>Published: {new Date(adv.published_at).toLocaleTimeString()} by {adv.published_by}</span>
              {canPublish && (
                <button
                  onClick={() => handleWithdraw(adv.id)}
                  className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-mono text-[11px] transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                  WITHDRAW
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Publish Advisory Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-xs font-mono uppercase tracking-wider">
                PUBLISH PUBLIC TRAFFIC ADVISORY
              </h3>
              <button onClick={() => setShowPublishModal(false)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handlePublish} className="space-y-3 font-sans">
                <p className="text-[10px] text-amber-300">Enter observed approximate coordinates. Values are not independently verified.</p>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Affected Road Segment</label>
                <input
                  type="text"
                  value={roadName}
                  onChange={(e) => setRoadName(e.target.value)}
                  placeholder="e.g. MG Road between Jos Junction and South Overbridge"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Status Type</label>
                <select
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="CONFIRMED_CLOSED">CONFIRMED CLOSED (Official Authority Directive)</option>
                  <option value="REPORTED_BLOCKED">REPORTED BLOCKED (Field Telemetry)</option>
                  <option value="CONGESTED">HEAVY CONGESTION / EXPECT DELAYS</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Hazard / Incident Context</label>
                <textarea
                  rows={2}
                  value={hazardDesc}
                  onChange={(e) => setHazardDesc(e.target.value)}
                  placeholder="e.g. Hazardous chemical wash and emergency transport corridor."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Recommended Detour</label>
                <textarea
                  rows={2}
                  value={detourDesc}
                  onChange={(e) => setDetourDesc(e.target.value)}
                  placeholder="e.g. Divert via Kaloor-Kadavanthra bypass road."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <fieldset className="grid grid-cols-2 gap-2">
                <legend className="mb-1 text-[11px] font-mono uppercase text-slate-400">Road segment coordinates</legend>
                <label className="text-[10px] text-slate-400">Start latitude
                  <input required type="number" min="-90" max="90" step="any" value={startLatitude} onChange={(e) => setStartLatitude(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-800 bg-slate-950 p-2 text-xs text-white" />
                </label>
                <label className="text-[10px] text-slate-400">Start longitude
                  <input required type="number" min="-180" max="180" step="any" value={startLongitude} onChange={(e) => setStartLongitude(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-800 bg-slate-950 p-2 text-xs text-white" />
                </label>
                <label className="text-[10px] text-slate-400">End latitude
                  <input required type="number" min="-90" max="90" step="any" value={endLatitude} onChange={(e) => setEndLatitude(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-800 bg-slate-950 p-2 text-xs text-white" />
                </label>
                <label className="text-[10px] text-slate-400">End longitude
                  <input required type="number" min="-180" max="180" step="any" value={endLongitude} onChange={(e) => setEndLongitude(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-800 bg-slate-950 p-2 text-xs text-white" />
                </label>
              </fieldset>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 font-mono text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !roadName.trim() || [startLatitude, startLongitude, endLatitude, endLongitude].some((value) => value.trim() === '')}
                  className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'PUBLISHING...' : 'BROADCAST ADVISORY'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
