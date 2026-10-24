import React, { useMemo, useState } from 'react';
import { Activity, AlertTriangle, Building2, Clock3, MapPin, ShieldAlert } from 'lucide-react';
import type {
  AuditLogEntry,
  ConflictAlert,
  Hospital,
  IncidentInfo,
  IncidentReport,
  NearbyHospital,
  Patient,
  ReplanningResult
} from '../types';

interface IncidentIntelligencePanelProps {
  incident: IncidentInfo;
  reports: IncidentReport[];
  conflicts: ConflictAlert[];
  patients: Patient[];
  nearbyHospitals: NearbyHospital[];
  auditLogs: AuditLogEntry[];
  selectedPatient: Patient | null;
  replanningResult: ReplanningResult | null;
  replanningError: string | null;
  isCheckingReplanning: boolean;
  onCheckReplanning: () => void;
  onSelectHospital: (hospital: Hospital) => void;
}

type HospitalSort = 'distance' | 'capacity' | 'suitability';
type AvailabilityFilter = 'all' | 'accepting' | 'not-accepting';

const freshnessLabel = (status?: string) => {
  switch (status) {
    case 'CONFIRMED':
      return 'CONFIRMED';
    case 'RECENT_UNCONFIRMED':
      return 'RECENT · UNCONFIRMED';
    case 'STALE':
      return 'STALE';
    case 'UNKNOWN':
    default:
      return 'UNKNOWN';
  }
};

const hasPatientRequirements = (hospital: Hospital, patient: Patient) => {
  const specialistMatches =
    !patient.required_specialist ||
    patient.required_specialist === 'None' ||
    hospital.specialists.includes(patient.required_specialist);
  const equipmentMatches =
    !patient.required_equipment ||
    patient.required_equipment === 'None' ||
    hospital.equipment.includes(patient.required_equipment);
  const criticalCapacityMatches = patient.severity !== 'RED' || hospital.available_icu > 0;
  return specialistMatches && equipmentMatches && criticalCapacityMatches;
};

export const IncidentIntelligencePanel: React.FC<IncidentIntelligencePanelProps> = ({
  incident,
  reports,
  conflicts,
  patients,
  nearbyHospitals,
  auditLogs,
  selectedPatient,
  replanningResult,
  replanningError,
  isCheckingReplanning,
  onCheckReplanning,
  onSelectHospital
}) => {
  const [sortBy, setSortBy] = useState<HospitalSort>('distance');
  const [availability, setAvailability] = useState<AvailabilityFilter>('all');

  const sortedHospitals = useMemo(() => {
    const filtered = nearbyHospitals.filter(({ hospital }) => {
      if (availability === 'accepting') return hospital.is_accepting === true;
      if (availability === 'not-accepting') return hospital.is_accepting === false;
      return true;
    });
    const validFreeBeds = (hospital: Hospital) =>
      Number.isInteger(hospital.available_beds) &&
      Number.isInteger(hospital.total_beds) &&
      hospital.available_beds >= 0 &&
      hospital.available_beds <= hospital.total_beds
        ? hospital.available_beds
        : -1;
    return [...filtered].sort((a, b) => {
      if (sortBy === 'capacity') {
        return validFreeBeds(b.hospital) - validFreeBeds(a.hospital);
      }
      if (sortBy === 'suitability' && selectedPatient) {
        const aMatches = hasPatientRequirements(a.hospital, selectedPatient);
        const bMatches = hasPatientRequirements(b.hospital, selectedPatient);
        if (aMatches !== bMatches) return Number(bMatches) - Number(aMatches);
      }
      return a.distance_km - b.distance_km;
    });
  }, [availability, nearbyHospitals, selectedPatient, sortBy]);

  const missingDetails = Array.from(new Set(
    reports.flatMap((report) => report.extracted_data?.missing_details ?? [])
  ));
  const identifiedCritical = patients.filter((patient) => patient.severity === 'RED').length;
  const latestReport = [...reports].sort(
    (a, b) => new Date(b.reported_time).getTime() - new Date(a.reported_time).getTime()
  )[0];

  return (
    <div className="flex flex-col gap-3.5">
      <section className="bg-slate-900/90 border border-cyan-900/60 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">AI-assisted incident picture</h2>
          </div>
          <span className="text-[9px] font-mono text-slate-400">EVIDENCE-BASED · NOT A CONFIRMATION</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
            <span className="block text-[9px] text-slate-500 uppercase">Incident</span>
            <strong className="text-slate-100">{incident.incident_type || 'Not available'}</strong>
          </div>
          <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
            <span className="block text-[9px] text-slate-500 uppercase">Operational status</span>
            <strong className="text-amber-300">{incident.status || 'Unknown'}</strong>
          </div>
          <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
            <span className="block text-[9px] text-slate-500 uppercase">Estimated casualties</span>
            <strong className="text-amber-200">{incident.estimated_casualties_range || 'Not available'}</strong>
          </div>
          <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
            <span className="block text-[9px] text-slate-500 uppercase">Confirmed count recorded</span>
            <strong className="text-white">{incident.confirmed_patients_identified ?? 'Unknown'}</strong>
            <span className="ml-1 text-[9px] text-slate-500">· {identifiedCritical} RED triage records in system</span>
          </div>
        </div>
        <div className="flex items-start gap-2 text-xs text-slate-300">
          <MapPin className="w-3.5 h-3.5 mt-0.5 text-cyan-400 shrink-0" />
          <span>
            {incident.name || 'Incident location'} · {Number.isFinite(incident.latitude) && Number.isFinite(incident.longitude)
              ? `${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)}`
              : 'Location unavailable'}
          </span>
        </div>
        <div>
          <span className="block mb-1 text-[9px] uppercase text-slate-500">Reported hazards</span>
          {incident.hazards?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {incident.hazards.map((hazard) => (
                <span key={hazard} className="px-2 py-1 rounded border border-amber-900/70 bg-amber-950/40 text-xs text-amber-200">{hazard}</span>
              ))}
            </div>
          ) : <span className="text-xs text-slate-500">No hazards recorded</span>}
        </div>
        <div className="flex flex-wrap gap-2 text-[9px]">
          <span className="rounded bg-slate-950 border border-slate-800 px-2 py-1 text-slate-300">
            Reports: {reports.length} · structured extraction present: {reports.filter((report) => report.extracted_data).length}
          </span>
          <span className="rounded bg-slate-950 border border-slate-800 px-2 py-1 text-slate-500">
            Extraction provider: Not recorded
          </span>
          {latestReport && (
            <span className="rounded bg-slate-950 border border-slate-800 px-2 py-1 text-slate-400">
              Latest report: {new Date(latestReport.reported_time).toLocaleString()}
            </span>
          )}
          <span className={`rounded border px-2 py-1 ${conflicts.length ? 'border-rose-900 bg-rose-950/40 text-rose-300' : 'border-emerald-900 bg-emerald-950/30 text-emerald-300'}`}>
            {conflicts.length ? `${conflicts.length} conflicting evidence item(s)` : 'No active conflicts recorded'}
          </span>
        </div>
        {(conflicts.length > 0 || missingDetails.length > 0) && (
          <div className="space-y-1 border-t border-slate-800 pt-2">
            <span className="text-[9px] uppercase tracking-wider text-amber-300">Information gaps & evidence review</span>
            {conflicts.map((conflict, index) => (
              <p key={`${conflict.detected_at}-${index}`} className="text-xs text-rose-200">
                CONFLICTING · {conflict.description}
              </p>
            ))}
            {missingDetails.map((detail) => (
              <p key={detail} className="text-xs text-amber-200">UNVERIFIED / MISSING · {detail}</p>
            ))}
          </div>
        )}
        {conflicts.length === 0 && missingDetails.length === 0 && (
          <p className="border-t border-slate-800 pt-2 text-[9px] text-slate-500">
            No active conflicts or extraction-reported information gaps are recorded. Absence of a recorded gap is not confirmation.
          </p>
        )}
        {reports.length > 0 && (
          <div className="space-y-1 border-t border-slate-800 pt-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-400">Recorded report evidence</span>
            {reports.slice(0, 3).map((report) => (
              <div key={report.id} className="rounded bg-slate-950 px-2 py-1.5 text-[9px] text-slate-300">
                <div className="flex flex-wrap justify-between gap-x-2">
                  <strong>{report.source_type} · {report.verification_status}</strong>
                  <span className="text-slate-500">{new Date(report.reported_time).toLocaleString()}</span>
                </div>
                <div className="mt-0.5 text-slate-400">
                  {report.location_text || 'Location not recorded'} ·
                  {report.estimated_casualties == null ? ' casualty estimate not recorded' : ` reported estimate: ${report.estimated_casualties}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Nearby hospital network</h2>
            <span className="text-[9px] text-slate-500">incident-relative estimates</span>
          </div>
          <div className="flex gap-1.5">
            <label className="sr-only" htmlFor="hospital-sort">Sort hospitals</label>
            <select id="hospital-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value as HospitalSort)}
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200">
              <option value="distance">Sort: distance</option>
              <option value="capacity">Sort: free beds</option>
              <option value="suitability" disabled={!selectedPatient}>Sort: requirement match</option>
            </select>
            <label className="sr-only" htmlFor="hospital-availability">Filter hospitals</label>
            <select id="hospital-availability" value={availability} onChange={(event) => setAvailability(event.target.value as AvailabilityFilter)}
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200">
              <option value="all">All states</option>
              <option value="accepting">Accepting</option>
              <option value="not-accepting">Not accepting</option>
            </select>
          </div>
        </div>
        {selectedPatient && (
          <p className="text-xs text-cyan-200">
            Capability indicators refer to selected casualty {selectedPatient.id} ({selectedPatient.severity}); they are not a new allocation recommendation.
          </p>
        )}
        {nearbyHospitals.length === 0 ? (
          <p className="text-xs text-slate-400">Nearby hospital information is unavailable. Verify the incident location and backend connection.</p>
        ) : (
          <div className="max-h-[470px] space-y-2 overflow-y-auto pr-1">
            {sortedHospitals.map(({ hospital, distance_km, estimated_transit_minutes, occupied_beds, route_warnings }) => {
              const freeBedsValid = Number.isInteger(hospital.available_beds) &&
                Number.isInteger(hospital.total_beds) &&
                hospital.available_beds >= 0 &&
                hospital.available_beds <= hospital.total_beds;
              const state = hospital.is_accepting === false ? 'NOT ACCEPTING' :
                hospital.is_accepting !== true || !freeBedsValid || hospital.confirmation_status === 'UNKNOWN'
                  ? 'UNKNOWN' : hospital.available_beds === 0 ? 'FULL' :
                    hospital.status === 'WARNING' || hospital.status === 'CRITICAL' ? 'LIMITED' : 'AVAILABLE';
              const requirementMatch = selectedPatient ? hasPatientRequirements(hospital, selectedPatient) : null;
              return (
                <button key={hospital.id} type="button" onClick={() => onSelectHospital(hospital)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-left hover:border-cyan-700/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <strong className="text-xs text-white">{hospital.name}</strong>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-slate-400">
                        <span>{distance_km.toFixed(1)} km · ~{estimated_transit_minutes.toFixed(0)} min estimated</span>
                        <span>{occupied_beds === null ? 'Occupied: Unknown' : `Occupied: ${occupied_beds}`}</span>
                        <span>Free: {freeBedsValid ? hospital.available_beds : 'Unknown'} / {Number.isInteger(hospital.total_beds) ? hospital.total_beds : 'Unknown'} beds</span>
                        <span>ICU: {Number.isInteger(hospital.available_icu) ? `${hospital.available_icu} available` : 'Unknown'}</span>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-bold ${
                      state === 'AVAILABLE' ? 'border-emerald-800 bg-emerald-950/50 text-emerald-300' :
                      state === 'LIMITED' ? 'border-amber-800 bg-amber-950/50 text-amber-300' :
                      state === 'FULL' || state === 'NOT ACCEPTING' ? 'border-rose-800 bg-rose-950/50 text-rose-300' :
                      'border-slate-700 bg-slate-900 text-slate-400'
                    }`}>{state}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {hospital.specialists.length
                      ? hospital.specialists.map((specialist) => <span key={specialist} className="rounded bg-slate-900 px-1.5 py-0.5 text-[8px] text-slate-300">{specialist}</span>)
                      : <span className="text-[9px] text-slate-500">Specialists: Not available</span>}
                    {requirementMatch !== null && (
                      <span className={`rounded px-1.5 py-0.5 text-[8px] ${requirementMatch ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'}`}>
                        Requirement presence: {requirementMatch ? 'MATCH' : 'GAP'}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 text-[8px] text-slate-500">
                    <span>Updated: {hospital.last_updated ? new Date(hospital.last_updated).toLocaleString() : 'Not available'}</span>
                    <span>Freshness: {freshnessLabel(hospital.confirmation_status)}</span>
                    <span>Source: {hospital.data_source || 'Not available'}</span>
                  </div>
                  {route_warnings.length > 0 && route_warnings.map((warning, warningIndex) => (
                    <div key={`${hospital.id}-${warningIndex}-${warning}`} className="mt-1 flex items-start gap-1 text-[9px] text-amber-300">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {warning}
                    </div>
                  ))}
                  {hospital.status === 'WARNING' || hospital.status === 'CRITICAL' ? (
                    <div className="mt-1 flex items-center gap-1 text-[9px] text-amber-300">
                      <AlertTriangle className="h-3 w-3" /> Capacity warning: {hospital.status}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-slate-900/90 border border-amber-900/50 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Continuous replanning check</h2>
          </div>
          <button type="button" onClick={onCheckReplanning} disabled={isCheckingReplanning}
            className="rounded border border-amber-700/70 bg-amber-950/50 px-2.5 py-1.5 text-[9px] font-bold text-amber-200 hover:bg-amber-900/60 disabled:opacity-50">
            {isCheckingReplanning ? 'CHECKING...' : 'CHECK ASSIGNMENTS'}
          </button>
        </div>
        <p className="text-[9px] text-slate-400">
          Runs the backend disruption check. Proposed alternatives are review-only; this check does not change approved assignments.
        </p>
        {replanningError && (
          <p role="alert" className="rounded border border-rose-900 bg-rose-950/40 p-2 text-xs text-rose-300">
            Replanning check failed: {replanningError}
          </p>
        )}
        {replanningResult && (
          replanningResult.replan_proposals.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-bold text-amber-200">
                {replanningResult.invalidated_plans_detected} invalidated plan(s) need coordinator review.
              </p>
              {replanningResult.replan_proposals.map((proposal) => (
                <div key={`${proposal.patient_id}-${proposal.detected_at}`} className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <strong className="text-white">{proposal.patient_id}</strong>
                    <span className="rounded bg-rose-950/60 px-1.5 py-0.5 text-rose-300">{proposal.severity}</span>
                    <span className="text-slate-400">Current: {proposal.current_hospital_name || 'Not available'}</span>
                  </div>
                  <p className="mt-1 text-xs text-amber-200">{proposal.reason}</p>
                  {proposal.proposed_alternative ? (
                    <p className="mt-1 text-[9px] text-cyan-200">
                      Backend alternative: {proposal.proposed_alternative.hospital_name} ·
                      {` ${proposal.proposed_alternative.distance_km} km / ${proposal.proposed_alternative.eta_minutes} min estimated · `}
                      {proposal.proposed_alternative.available_beds} beds · {proposal.proposed_alternative.available_icu} ICU
                    </p>
                  ) : (
                    <p className="mt-1 text-[9px] text-rose-300">No feasible alternative was returned by the backend.</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-emerald-300">Check complete · no invalidated assigned plans detected in this run.</p>
          )
        )}
        {!replanningResult && !replanningError && (
          <p className="text-xs text-slate-500">No replanning check has been run in this view.</p>
        )}
      </section>

      <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        <div className="mb-2 flex items-center gap-2 border-b border-slate-800 pb-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">Recorded operational events</h2>
          <span className="text-[9px] text-slate-500">backend audit log</span>
        </div>
        {auditLogs.length === 0 ? (
          <p className="text-xs text-slate-500">No audit events are currently available.</p>
        ) : (
          <div className="space-y-2">
            {auditLogs.slice(0, 6).map((entry) => (
              <div key={entry.id} className="flex gap-2 text-xs">
                <Clock3 className="mt-0.5 h-3 w-3 shrink-0 text-slate-500" />
                <div>
                  <strong className="text-slate-200">{entry.action.replaceAll('_', ' ')}</strong>
                  <span className="text-slate-400"> · {entry.role}</span>
                  <div className="text-[9px] text-slate-500">{new Date(entry.timestamp).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
