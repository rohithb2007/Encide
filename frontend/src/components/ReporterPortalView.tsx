import React, { useEffect, useState } from 'react';
import { FilePlus2, ShieldCheck } from 'lucide-react';
import type { IncidentInfo, IncidentReport } from '../types';
import { fetchReporterReports, setDemoActorContext, submitIncidentReport } from '../api/client';

interface ReporterPortalViewProps {
  incident: IncidentInfo;
  onIdentityActorChanged: (actor: string) => void;
}

export const ReporterPortalView: React.FC<ReporterPortalViewProps> = ({ incident, onIdentityActorChanged }) => {
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myReports, setMyReports] = useState<IncidentReport[]>([]);
  const [reporterIdentity, setReporterIdentity] = useState(() =>
    localStorage.getItem('mednet-demo-reporter-id') || 'Demo Reporter'
  );
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadReports = async () => {
      setLoadingReports(true);
      setDemoActorContext('REPORTER', reporterIdentity);
      try {
        const reports = await fetchReporterReports();
        if (!cancelled) setMyReports(reports);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not retrieve this reporter’s reports.');
      } finally {
        if (!cancelled) setLoadingReports(false);
      }
    };
    void loadReports();
    return () => { cancelled = true; };
  }, [reporterIdentity]);

  const updateReporterIdentity = (value: string) => {
    setReporterIdentity(value);
    localStorage.setItem('mednet-demo-reporter-id', value);
    onIdentityActorChanged(value);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!description.trim() || !location.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      setDemoActorContext('REPORTER', reporterIdentity);
      const report = await submitIncidentReport(incident.id, {
        source_type: 'citizen',
        source_identifier: reporterIdentity,
        location_text: location.trim(),
        description: description.trim()
      });
      setMyReports((existing) => [report, ...existing]);
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto grid w-full max-w-4xl gap-4 p-4 md:p-8">
      <section className="rounded-xl border border-emerald-900/60 bg-slate-900 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <FilePlus2 className="h-4 w-4 text-emerald-400" /> Submit an incident report
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Reports are unverified until reviewed. This demo retrieves reports matching your demo reporter identifier only; it is not an authenticated account.
        </p>
        <label className="mt-3 block text-xs text-slate-300">
          Demo reporter identifier
          <input value={reporterIdentity} onChange={(event) => updateReporterIdentity(event.target.value)}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2.5" />
        </label>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block text-xs text-slate-300">
            Incident location
            <input required value={location} onChange={(event) => setLocation(event.target.value)}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2.5" />
          </label>
          <label className="block text-xs text-slate-300">
            What did you observe?
            <textarea required rows={4} value={description} onChange={(event) => setDescription(event.target.value)}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2.5" />
          </label>
          {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
          <button disabled={submitting} className="rounded bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {submitting ? 'SUBMITTING…' : 'SUBMIT REPORT'}
          </button>
        </form>
      </section>
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-white">Reports submitted in this session</h3>
        {loadingReports ? <p className="mt-3 text-xs text-slate-500">Loading your reports…</p> : myReports.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">No submissions in this session.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {myReports.map((report) => (
              <article key={report.id} className="rounded border border-slate-800 bg-slate-950 p-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <strong className="text-white">{report.id}</strong>
                  <span className="rounded bg-amber-950 px-2 py-1 text-amber-300">{report.verification_status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-300">{report.location_text} · {report.description}</p>
                <p className="mt-1 text-[10px] text-slate-500">{new Date(report.reported_time).toLocaleString()}</p>
                {report.review_history?.map((entry, index) => (
                  <p key={`${report.id}-${index}`} className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                    <ShieldCheck className="h-3 w-3" /> Reviewed {entry.verification_status.toLowerCase()} by {entry.actor}: {entry.reason}
                  </p>
                ))}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};
