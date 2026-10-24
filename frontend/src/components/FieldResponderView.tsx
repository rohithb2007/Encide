import React, { useState } from 'react';
import { ClipboardPlus, MapPin, TriangleAlert } from 'lucide-react';
import type { IncidentInfo, IncidentReport } from '../types';
import { setDemoActorContext, submitIncidentReport } from '../api/client';

interface FieldResponderViewProps {
  incident: IncidentInfo;
  onIdentityActorChanged: (actor: string) => void;
  onReportSubmitted: (report: IncidentReport) => void;
}

export const FieldResponderView: React.FC<FieldResponderViewProps> = ({ incident, onIdentityActorChanged, onReportSubmitted }) => {
  const [identifier, setIdentifier] = useState('Demo Field Responder');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [casualties, setCasualties] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!location.trim() || !description.trim()) return;
    setSubmitting(true);
    setMessage(null);
    try {
      setDemoActorContext('FIELD_RESPONDER', identifier.trim() || 'Field unit');
      const report = await submitIncidentReport(incident.id, {
        source_type: 'field_responder',
        source_identifier: identifier.trim() || 'Field unit',
        location_text: location.trim(),
        description: description.trim(),
        estimated_casualties: casualties ? Number(casualties) : null
      });
      onReportSubmitted(report);
      setDescription('');
      setMessage(`Report ${report.id} submitted for coordinator review (${report.verification_status}).`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Responder report failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-4 p-4 md:grid-cols-5 md:p-8">
      <section className="rounded-xl border border-amber-900/50 bg-slate-900 p-5 md:col-span-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <ClipboardPlus className="h-4 w-4 text-amber-400" /> Field responder report
        </h2>
        <p className="mt-1 text-xs text-slate-400">{incident.name} · Reported observations remain unverified until reviewed.</p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block text-xs text-slate-300">Unit / identifier
            <input value={identifier} onChange={(event) => {
              setIdentifier(event.target.value);
              onIdentityActorChanged(event.target.value);
            }}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2.5" />
          </label>
          <label className="block text-xs text-slate-300">Scene location
            <input required value={location} onChange={(event) => setLocation(event.target.value)}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2.5" />
          </label>
          <label className="block text-xs text-slate-300">Estimated casualties, if known
            <input type="number" min="0" value={casualties} onChange={(event) => setCasualties(event.target.value)}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2.5" />
          </label>
          <label className="block text-xs text-slate-300">Observations, hazards, uncertainty, or resource request
            <textarea required rows={5} value={description} onChange={(event) => setDescription(event.target.value)}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2.5" />
          </label>
          {message && <p role="status" className="text-xs text-cyan-200">{message}</p>}
          <button disabled={submitting} className="rounded bg-amber-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {submitting ? 'SUBMITTING…' : 'SEND TO INCIDENT COMMAND'}
          </button>
        </form>
      </section>
      <aside className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-5 md:col-span-2">
        <h3 className="text-xs font-bold uppercase text-white">Scene context</h3>
        <p className="flex gap-2 text-xs text-slate-300"><MapPin className="h-4 w-4 shrink-0 text-cyan-400" />{incident.name}</p>
        {incident.hazards?.length ? incident.hazards.map((hazard) => (
          <p key={hazard} className="flex gap-2 text-xs text-amber-200"><TriangleAlert className="h-4 w-4 shrink-0" />{hazard}</p>
        )) : <p className="text-xs text-slate-500">No hazards recorded.</p>}
        <div className="border-t border-slate-800 pt-3 text-xs text-slate-300">No patient-level roster is shown in this responder report view.</div>
        <p className="text-[10px] text-slate-500">Resource requests are recorded in the report and require coordinator review; this interface does not dispatch units.</p>
      </aside>
    </main>
  );
};
