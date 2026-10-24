import React, { useEffect, useState } from 'react';
import { FileText, Download, Printer, RefreshCw } from 'lucide-react';
import { fetchUnifiedIncidentReport, getCsvExportUrl } from '../api/client';

export const UnifiedReportView: React.FC = () => {
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const data = await fetchUnifiedIncidentReport();
      setReportData(data);
    } catch (err) {
      console.error('Failed to load unified report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || !reportData) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center font-mono text-xs text-slate-400">
        <RefreshCw className="w-4 h-4 animate-spin mr-2 text-cyan-400" />
        GENERATING TRACEABLE INCIDENT REPORT FROM LIVE RECORDS...
      </div>
    );
  }

  const { incident, casualty_accounting, incoming_reports, conflicts, hospitals_status, ambulances_status, traffic_advisories, authority_alerts, audit_trail, generated_at } = reportData;

  return (
    <div className="flex-1 p-3 md:p-6 max-w-[1400px] w-full mx-auto space-y-6 font-sans print:p-0 print:bg-white print:text-black">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl print:hidden">
        <div>
          <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            UNIFIED INCIDENT OPERATIONS REPORT & AUDIT TRAIL
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Generated: {new Date(generated_at).toLocaleString()} • Continuous Multi-Agency Record
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            REFRESH
          </button>
          <a
            href={getCsvExportUrl()}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition-all shadow-md shadow-emerald-950/40"
          >
            <Download className="w-3.5 h-3.5" />
            EXPORT CSV
          </a>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold transition-all shadow-md shadow-cyan-950/40"
          >
            <Printer className="w-3.5 h-3.5" />
            PRINT / PDF
          </button>
        </div>
      </div>

      {/* Printable Document Paper */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl print:bg-white print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b border-slate-800 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                MED-NET AI • INCIDENT COMMANDER OPERATIONAL DOSSIER
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                {incident.name}
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Incident Ref: <strong className="text-white">{incident.id}</strong> • Location: {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)} • Status: {incident.status}
              </p>
            </div>
            <div className="text-right font-mono text-[10px] text-slate-400 hidden sm:block">
              <div>PROTOCOL: CODE RED MCI</div>
              <div>VERIFICATION: AUDITED LOGS</div>
            </div>
          </div>
        </div>

        {/* 1. Casualty Accounting Summary (Distinguishing Estimated vs Confirmed) */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold font-mono text-cyan-300 uppercase tracking-wider border-b border-slate-800 pb-1">
            1. CASUALTY ACCOUNTING & TRIAGE BREAKDOWN
          </h3>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center font-mono">
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Reported Uncertainty</div>
              <div className="text-xs font-bold text-amber-400 mt-1">{casualty_accounting.reported_uncertainty_range}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Identified in System</div>
              <div className="text-xl font-bold text-white mt-1">{casualty_accounting.total_patients_in_system}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Awaiting Triage</div>
              <div className="text-xl font-bold text-amber-400 mt-1">{casualty_accounting.awaiting_triage_or_routing}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">In Transit (EMS)</div>
              <div className="text-xl font-bold text-rose-400 mt-1">{casualty_accounting.in_transit}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Admitted Facility</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">{casualty_accounting.admitted_to_facility}</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
            <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300">
              Immediate (RED): <strong>{casualty_accounting.triage_breakdown.RED}</strong>
            </div>
            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
              Delayed (YELLOW): <strong>{casualty_accounting.triage_breakdown.YELLOW}</strong>
            </div>
            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              Minor (GREEN): <strong>{casualty_accounting.triage_breakdown.GREEN}</strong>
            </div>
            <div className="p-2 rounded bg-slate-800/80 border border-slate-700 text-slate-400">
              Expectant (BLACK): <strong>{casualty_accounting.triage_breakdown.BLACK}</strong>
            </div>
          </div>
        </div>

        {/* 2. Source-by-Source Intake Chronicle */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold font-mono text-cyan-300 uppercase tracking-wider border-b border-slate-800 pb-1">
            2. MULTI-SOURCE INCOMING INTAKE LOG & CONFLICTS
          </h3>
          {conflicts && conflicts.length > 0 && (
            <div className="bg-rose-950/20 border border-rose-900/60 rounded-lg p-3 space-y-1 text-xs font-mono">
              <div className="font-bold text-rose-400 text-[11px] uppercase">Detected Casualty & Location Discrepancies:</div>
              {conflicts.map((c: any, idx: number) => (
                <div key={idx} className="text-[11px] text-slate-300 font-sans">• {c.description}</div>
              ))}
            </div>
          )}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {incoming_reports.map((r: any) => (
              <div key={r.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="text-cyan-400 font-bold">{r.id} • SOURCE: {r.source_type.toUpperCase()}</span>
                  <span>{new Date(r.reported_time).toLocaleTimeString()}</span>
                </div>
                <div className="text-slate-200 font-sans text-xs">{r.description}</div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Reported Casualties: <strong className="text-rose-400">{r.estimated_casualties ?? 'Unspecified'}</strong></span>
                  <span className="text-amber-400">Verification: {r.verification_status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Hospital Capacity & Ambulance Fleet Telemetry */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <h3 className="text-xs font-bold font-mono text-cyan-300 uppercase tracking-wider">
              3. REGIONAL HOSPITAL ACCEPTANCE & AMBULANCE FLEET
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              Ambulances: <strong className="text-emerald-400">{ambulances_status?.available || 0}</strong> Free / {ambulances_status?.total || 0} Total
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 font-mono text-xs">
            {hospitals_status.map((h: any) => (
              <div key={h.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
                <div className="font-bold text-white truncate">{h.name}</div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Beds: <strong className="text-emerald-400">{h.available_beds}</strong> / {h.total_beds}</span>
                  <span>ICU: <strong className="text-cyan-400">{h.available_icu}</strong></span>
                </div>
                <div className="text-[9px] flex items-center justify-between">
                  <span className={h.is_accepting ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                    {h.is_accepting ? 'ACCEPTING' : 'DIVERTING'}
                  </span>
                  <span className="text-slate-500">{h.confirmation_status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Traffic & Authority Escalations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="text-xs font-bold font-mono text-cyan-300 uppercase tracking-wider border-b border-slate-800 pb-1">
              4. ACTIVE ROAD ADVISORIES
            </h3>
            {traffic_advisories.map((a: any) => (
              <div key={a.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono space-y-1">
                <div className="font-bold text-rose-400">{a.road_name}</div>
                <div className="text-[11px] text-slate-300 font-sans">{a.hazard_description}</div>
                <div className="text-[10px] text-amber-300">Detour: {a.suggested_detour}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold font-mono text-cyan-300 uppercase tracking-wider border-b border-slate-800 pb-1">
              5. AUTHORITY ALERTS
            </h3>
            {authority_alerts.slice(0, 4).map((alt: any) => (
              <div key={alt.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-[11px]">{alt.title}</span>
                  <span className="text-[10px] px-1 rounded bg-slate-800 text-cyan-400">{alt.status}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-sans">{alt.recommended_action}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Traceable Audit Trail */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold font-mono text-cyan-300 uppercase tracking-wider border-b border-slate-800 pb-1">
            6. INCIDENT COMMAND AUDIT LOGS (RECENT 15)
          </h3>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-48 overflow-y-auto space-y-1.5 font-mono text-[11px]">
            {audit_trail.slice(0, 15).map((log: any) => (
              <div key={log.id} className="flex items-center justify-between text-slate-400 border-b border-slate-900 pb-1">
                <span>{new Date(log.timestamp).toLocaleTimeString()} • <strong className="text-slate-200">{log.role}</strong></span>
                <span className="text-cyan-400 font-bold">{log.action}</span>
                <span className="text-slate-500 truncate max-w-xs">{JSON.stringify(log.details)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 text-center font-mono text-[10px] text-slate-500">
          MED-NET AI Intelligent Emergency Platform • Official Autonomous Decision Support System • All Actions Traceable
        </div>
      </div>
    </div>
  );
};
