import React, { useState } from 'react';
import { Check, CircleAlert, FileClock } from 'lucide-react';
import type { IncidentReport } from '../types';
import { reviewIncidentReport } from '../api/client';

interface IncomingReportsPanelProps {
  reports: IncidentReport[];
  onReviewed: (report: IncidentReport) => void;
}

export const IncomingReportsPanel: React.FC<IncomingReportsPanelProps> = ({ reports, onReviewed }) => {
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyReport, setBusyReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = reports.filter((report) => report.verification_status === 'UNVERIFIED');

  const review = async (report: IncidentReport, status: 'CONFIRMED' | 'CONFLICTING' | 'REJECTED') => {
    const reason = reasons[report.id]?.trim();
    if (!reason) {
      setError(`Add a review reason for ${report.id} before recording a decision.`);
      return;
    }
    setBusyReport(report.id);
    setError(null);
    try {
      onReviewed(await reviewIncidentReport(report.id, status, 'Demo Coordinator', reason));
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not review report ${report.id}`);
    } finally {
      setBusyReport(null);
    }
  };

  return (
    <details open={pending.length > 0} className="rounded-xl border border-amber-900/50 bg-slate-900 p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
          <FileClock className="h-4 w-4 text-amber-400" /> Incoming reports
          <span className="rounded bg-amber-950 px-2 py-0.5 text-[10px] text-amber-300">{pending.length} awaiting review</span>
        </span>
        <span className="text-[10px] text-slate-500">{reports.length} recorded</span>
      </summary>
      <div className="mt-3 space-y-2">
        {error && <p role="alert" className="rounded border border-rose-900 bg-rose-950/40 p-2 text-[10px] text-rose-300">{error}</p>}
        {reports.length === 0 ? <p className="text-xs text-slate-500">No incoming reports recorded.</p> : reports.map((report) => (
          <article key={report.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[10px]">
                <strong className="text-cyan-300">{report.id}</strong>
                <span className="text-slate-300">{report.source_type} · {report.source_identifier || 'source not identified'}</span>
                <span className="text-slate-500">{new Date(report.reported_time).toLocaleString()}</span>
              </div>
              <span className={`rounded px-2 py-0.5 text-[9px] font-bold ${
                report.verification_status === 'CONFIRMED' ? 'bg-emerald-950 text-emerald-300' :
                  report.verification_status === 'UNVERIFIED' ? 'bg-amber-950 text-amber-300' :
                    'bg-rose-950 text-rose-300'
              }`}>{report.verification_status}</span>
            </div>
            <p className="mt-1 text-xs text-slate-200">{report.description}</p>
            <p className="mt-1 text-[10px] text-slate-400">
              {report.location_text} · estimate: {report.estimated_casualties ?? 'Unknown'} · incident: {report.incident_id}
            </p>
            {report.extracted_data && (
              <p className="mt-1 text-[10px] text-cyan-200">
                Extracted: {report.extracted_data.incident_type || 'type unavailable'} ·
                {` ${report.extracted_data.estimated_casualties ?? 'casualty count unknown'} · `}
                {(report.extracted_data.observed_hazards ?? []).join(', ') || 'no extracted hazards'}
              </p>
            )}
            {report.review_history?.map((entry, index) => (
              <p key={`${report.id}-review-${index}`} className="mt-1 text-[10px] text-slate-400">
                {entry.previous_status} → {entry.verification_status} · {entry.actor} · {entry.reason}
              </p>
            ))}
            {report.verification_status === 'UNVERIFIED' && (
              <div className="mt-2 space-y-2">
                <label className="block text-[10px] text-slate-400">
                  Review reason (required)
                  <input value={reasons[report.id] ?? ''} onChange={(event) => setReasons((existing) => ({ ...existing, [report.id]: event.target.value }))}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white" />
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button disabled={busyReport === report.id} onClick={() => review(report, 'CONFIRMED')}
                    className="flex items-center gap-1 rounded bg-emerald-800 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50">
                    <Check className="h-3 w-3" /> Confirm
                  </button>
                  <button disabled={busyReport === report.id} onClick={() => review(report, 'CONFLICTING')}
                    className="flex items-center gap-1 rounded bg-amber-800 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50">
                    <CircleAlert className="h-3 w-3" /> Dispute
                  </button>
                  <button disabled={busyReport === report.id} onClick={() => review(report, 'REJECTED')}
                    className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-300 disabled:opacity-50">Reject</button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </details>
  );
};
