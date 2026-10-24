import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Bed, Activity, CheckCircle, AlertOctagon, Clock, ShieldCheck, Save, Search, BellRing } from 'lucide-react';
import type { Hospital } from '../types';
import type { HospitalAlertInbox, HospitalArrival } from '../types';
import {
  acknowledgeHospitalAlert, bindDemoHospital, confirmHospitalReceipt,
  fetchDemoHospitalBinding, fetchHospitalAlerts, fetchHospitalArrivals, respondToHospitalReferral,
  setDemoActorContext, updateHospitalCapacity
} from '../api/client';

interface HospitalPortalViewProps {
  hospitals: Hospital[];
  refreshToken: number;
  onIdentityActorChanged: (actor: string) => void;
  onHospitalUpdated: (updatedHospital: Hospital) => void;
  onRefreshData: () => Promise<void>;
}

export const HospitalPortalView: React.FC<HospitalPortalViewProps> = ({ hospitals, refreshToken, onIdentityActorChanged, onHospitalUpdated, onRefreshData }) => {
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(hospitals[0]?.id || 'H001');
  const selectedHospital = hospitals.find((h) => h.id === selectedHospitalId) || hospitals[0];

  const [searchTerm, setSearchTerm] = useState('');
  const [typedHospitalName, setTypedHospitalName] = useState('');
  const [boundHospitalId, setBoundHospitalId] = useState<string | null>(null);
  const [identityActor, setIdentityActor] = useState('Demo Hospital Staff');
  const [alertInbox, setAlertInbox] = useState<HospitalAlertInbox | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [busyAlertAction, setBusyAlertAction] = useState<string | null>(null);
  const [availableBeds, setAvailableBeds] = useState<number>(selectedHospital?.available_beds ?? 0);
  const [availableIcu, setAvailableIcu] = useState<number>(selectedHospital?.available_icu ?? 0);
  const [isAccepting, setIsAccepting] = useState<boolean>(selectedHospital?.is_accepting ?? true);
  const [updatedBy, setUpdatedBy] = useState<string>('Charge Nurse / Triage Officer');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [receiptLoadingId, setReceiptLoadingId] = useState<string | null>(null);
  const [hospitalArrivals, setHospitalArrivals] = useState<HospitalArrival[]>([]);
  const [capacityError, setCapacityError] = useState<string | null>(null);

  const nameConfirmed = Boolean(selectedHospital) &&
    typedHospitalName.trim().toLocaleLowerCase() === selectedHospital.name.trim().toLocaleLowerCase();
  const canEditSelectedHospital = Boolean(selectedHospital) &&
    boundHospitalId === selectedHospital.id && nameConfirmed;
  const filteredHospitals = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();
    return hospitals.filter((hospital) => !query ||
      hospital.name.toLocaleLowerCase().includes(query) ||
      hospital.short_code.toLocaleLowerCase().includes(query));
  }, [hospitals, searchTerm]);

  const refreshHospitalAlerts = useCallback(async (hospitalId: string) => {
    setAlertsLoading(true);
    setAlertError(null);
    try {
      setDemoActorContext('HOSPITAL', identityActor, hospitalId);
      const [inbox, arrivals] = await Promise.all([
        fetchHospitalAlerts(hospitalId),
        fetchHospitalArrivals(hospitalId),
      ]);
      setAlertInbox(inbox);
      setHospitalArrivals(arrivals);
    } catch (err) {
      setAlertError(err instanceof Error ? err.message : 'Could not load hospital alerts.');
    } finally {
      setAlertsLoading(false);
    }
  }, [identityActor]);

  useEffect(() => {
    let cancelled = false;
    const loadBinding = async () => {
      try {
        setDemoActorContext('HOSPITAL', identityActor);
        const binding = await fetchDemoHospitalBinding();
        if (cancelled) return;
        if (!binding.hospital_id) return;
        setBoundHospitalId(binding.hospital_id);
        setSelectedHospitalId(binding.hospital_id);
        setTypedHospitalName('');
        setAvailableBeds(hospitals.find((hospital) => hospital.id === binding.hospital_id)?.available_beds ?? 0);
        setAvailableIcu(hospitals.find((hospital) => hospital.id === binding.hospital_id)?.available_icu ?? 0);
        void refreshHospitalAlerts(binding.hospital_id);
      } catch (err) {
        if (!cancelled) setIdentityError(err instanceof Error ? err.message : 'Could not load demo facility identity.');
      }
    };
    void loadBinding();
    return () => { cancelled = true; };
  }, [hospitals, identityActor, refreshHospitalAlerts]);

  useEffect(() => {
    if (boundHospitalId && selectedHospitalId === boundHospitalId) {
      void refreshHospitalAlerts(boundHospitalId);
    }
  }, [refreshToken, boundHospitalId, selectedHospitalId, refreshHospitalAlerts]);

  // Sync state when selection changes
  const handleSelect = (h: Hospital) => {
    setSelectedHospitalId(h.id);
    setTypedHospitalName('');
    setIdentityError(null);
    setAlertInbox(null);
    setAvailableBeds(h.available_beds);
    setAvailableIcu(h.available_icu);
    setIsAccepting(h.is_accepting !== false);
    setFeedbackMsg(null);
    if (boundHospitalId === h.id) void refreshHospitalAlerts(h.id);
  };

  const handleBindHospital = async () => {
    if (!selectedHospital || !nameConfirmed) {
      setIdentityError('Type the selected hospital’s exact name before confirming this demo facility.');
      return;
    }
    setIdentityError(null);
    try {
      setDemoActorContext('HOSPITAL', identityActor);
      const binding = await bindDemoHospital(selectedHospital.id);
      setBoundHospitalId(binding.hospital_id);
      onIdentityActorChanged(identityActor);
      setTypedHospitalName('');
      await onRefreshData();
      await refreshHospitalAlerts(binding.hospital_id);
    } catch (err) {
      setIdentityError(err instanceof Error ? err.message : 'Could not bind this demo staff identity.');
    }
  };

  const requireFacilityConfirmation = (): boolean => {
    if (boundHospitalId !== selectedHospital?.id) {
      setIdentityError('This demo staff identity is bound to a different facility. Select that facility to make updates.');
      return false;
    }
    if (!nameConfirmed) {
      setIdentityError('Type the exact hospital name to confirm this specific update.');
      return false;
    }
    setIdentityError(null);
    return true;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHospital) return;
    if (!requireFacilityConfirmation()) return;
    if (!Number.isInteger(availableBeds) || availableBeds < 0 || availableBeds > selectedHospital.total_beds) {
      setCapacityError(`Available beds must be an integer between 0 and ${selectedHospital.total_beds}.`);
      return;
    }
    if (!Number.isInteger(availableIcu) || availableIcu < 0 || availableIcu > selectedHospital.total_icu) {
      setCapacityError(`Available ICU beds must be an integer between 0 and ${selectedHospital.total_icu}.`);
      return;
    }

    setIsSaving(true);
    setFeedbackMsg(null);
    setCapacityError(null);
    try {
      const payload = {
        available_beds: availableBeds,
        available_icu: availableIcu,
        is_accepting: isAccepting,
        updated_by: updatedBy,
        data_source: 'STAFF_PORTAL'
      };
      setDemoActorContext('HOSPITAL', identityActor, selectedHospital.id);
      const res = await updateHospitalCapacity(selectedHospital.id, payload);
      onHospitalUpdated(res.hospital);
      setFeedbackMsg('Capacity & acceptance status successfully updated. Real-time broadcast sent.');
      setTypedHospitalName('');
      await refreshHospitalAlerts(selectedHospital.id);
    } catch (err) {
      console.error('Failed to update hospital:', err);
      setCapacityError(err instanceof Error ? err.message : 'Failed to update hospital capacity.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmReceipt = async (patientId: string) => {
    if (!selectedHospital || !requireFacilityConfirmation()) return;
    setReceiptLoadingId(patientId);
    setCapacityError(null);
    try {
      setDemoActorContext('HOSPITAL', identityActor, selectedHospital.id);
      await confirmHospitalReceipt(patientId, selectedHospital.id, identityActor);
      setTypedHospitalName('');
      await refreshHospitalAlerts(selectedHospital.id);
      await onRefreshData();
    } catch (err) {
      setCapacityError(err instanceof Error ? err.message : 'Hospital receipt confirmation failed.');
    } finally {
      setReceiptLoadingId(null);
    }
  };

  const handleAcknowledgeIncident = async () => {
    if (!selectedHospital || !alertInbox || !requireFacilityConfirmation()) return;
    setBusyAlertAction(alertInbox.incident_alert.id);
    try {
      setDemoActorContext('HOSPITAL', identityActor, selectedHospital.id);
      await acknowledgeHospitalAlert(selectedHospital.id, alertInbox.incident_alert.id);
      setTypedHospitalName('');
      await refreshHospitalAlerts(selectedHospital.id);
    } catch (err) {
      setAlertError(err instanceof Error ? err.message : 'Could not acknowledge the incident update.');
    } finally {
      setBusyAlertAction(null);
    }
  };

  const handleReferralResponse = async (patientId: string, response: 'ACCEPTED' | 'REJECTED') => {
    if (!selectedHospital || !requireFacilityConfirmation()) return;
    setBusyAlertAction(patientId);
    setAlertError(null);
    try {
      setDemoActorContext('HOSPITAL', identityActor, selectedHospital.id);
      await respondToHospitalReferral(selectedHospital.id, patientId, response);
      setTypedHospitalName('');
      await refreshHospitalAlerts(selectedHospital.id);
      await onRefreshData();
    } catch (err) {
      setAlertError(err instanceof Error ? err.message : 'Could not respond to referral.');
    } finally {
      setBusyAlertAction(null);
    }
  };

  // Helper for freshness badge
  const getFreshnessBadge = (h: Hospital) => {
    const status = h.confirmation_status || 'UNKNOWN';
    if (status === 'UNKNOWN') {
      return <span className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-xs text-slate-400">CAPACITY FRESHNESS UNKNOWN</span>;
    }
    if (status === 'CONFIRMED') {
      return (
        <span className="flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          CURRENT & CONFIRMED (&lt;15m)
        </span>
      );
    } else if (status === 'RECENT_UNCONFIRMED') {
      return (
        <span className="flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <Clock className="w-3 h-3 text-amber-400" />
          RECENT (15-45m)
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
        <AlertOctagon className="w-3 h-3 text-rose-400" />
        STALE / UNCONFIRMED (&gt;45m)
      </span>
    );
  };

  if (!selectedHospital) return null;

  return (
    <div className="flex-1 p-3 md:p-5 max-w-[1700px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 font-sans">
      {/* Left List of Regional Hospitals (4 cols) */}
      <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="font-bold text-white text-xs font-mono uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cyan-400" />
            REGIONAL TRAUMA FACILITIES ({hospitals.length})
          </div>
          <span className="text-xs text-slate-500 font-mono">STAFF PORTAL</span>
        </div>

        <label className="mb-3 block text-sm uppercase text-slate-300">
          Search hospitals by name or code
          <span className="relative mt-1 block">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)}
              autoComplete="off"
              placeholder="Search by facility name or code"
              className="w-full rounded border border-slate-700 bg-slate-950 py-2 pl-8 pr-2 text-sm text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
          </span>
        </label>

        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
          {filteredHospitals.map((h) => {
            const isSelected = h.id === selectedHospital.id;
            let loadColor = 'text-emerald-400';
            if (h.current_load >= 0.85) loadColor = 'text-rose-400';
            else if (h.current_load >= 0.65) loadColor = 'text-amber-400';

            return (
              <button
                key={h.id}
                onClick={() => handleSelect(h)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-slate-800/90 border-cyan-500/60 shadow-md'
                    : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-white font-mono">{h.short_code}</span>
                  {boundHospitalId === h.id && <span className="text-xs text-slate-400 font-mono">{h.trauma_level}</span>}
                </div>
                <div className="text-xs text-slate-300 font-medium truncate mb-1.5">{h.name}</div>
                {boundHospitalId === h.id ? (
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Beds: <strong className={loadColor}>{h.available_beds}</strong>/{h.total_beds}</span>
                    <span>ICU: <strong className="text-cyan-400">{h.available_icu}</strong></span>
                    <span className={h.is_accepting === true ? 'text-emerald-400' : h.is_accepting === false ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                      {h.is_accepting === true ? 'ACCEPTING' : h.is_accepting === false ? 'NOT ACCEPTING' : 'UNKNOWN'}
                    </span>
                  </div>
                ) : <p className="text-xs text-slate-500">Facility details available after demo identity binding.</p>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Hospital Details & Live Capacity Update Form (8 cols) */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        {/* Selected Hospital Overview Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{selectedHospital.name}</h2>
                {selectedHospital.trauma_level && <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                  {selectedHospital.trauma_level}
                </span>}
                {boundHospitalId === selectedHospital.id && selectedHospital.burn_center && (
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    BURN CENTER
                  </span>
                )}
              </div>
              {boundHospitalId === selectedHospital.id && typeof selectedHospital.latitude === 'number' && (
                <p className="text-xs text-slate-400 mt-0.5">
                  Facility coordinates: {selectedHospital.latitude.toFixed(5)}, {selectedHospital.longitude.toFixed(5)}
                </p>
              )}
            </div>
            {boundHospitalId === selectedHospital.id && <div>{getFreshnessBadge(selectedHospital)}</div>}
          </div>

          {/* Telemetry Summary Cards */}
          {boundHospitalId === selectedHospital.id ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-xs font-mono text-slate-500 uppercase">Available Beds</div>
                <div className="text-xl font-bold text-white mt-1">
                  {selectedHospital.available_beds} <span className="text-xs text-slate-500 font-normal">/ {selectedHospital.total_beds}</span>
                </div>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-xs font-mono text-slate-500 uppercase">Available ICU</div>
                <div className="text-xl font-bold text-cyan-400 mt-1">
                  {selectedHospital.available_icu} <span className="text-xs text-slate-500 font-normal">/ {selectedHospital.total_icu}</span>
                </div>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-xs font-mono text-slate-500 uppercase">Network Load</div>
                <div className="text-xl font-bold text-amber-400 mt-1">
                  {Math.round(selectedHospital.current_load * 100)}%
                </div>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-xs font-mono text-slate-500 uppercase">Incoming Patients</div>
                <div className="text-xl font-bold text-indigo-400 mt-1">
                  {selectedHospital.incoming_patients_count ?? 'Unknown'}
                </div>
              </div>
            </div>
          ) : <p className="mt-4 text-xs text-slate-500">Confirm a demo facility identity to access facility-specific capacity and operations.</p>}
        </div>

        <section className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-300">Demo facility identity · not authentication</p>
          <p className="mt-1 text-xs text-slate-200">Selected facility: <strong>{selectedHospital.name}</strong> ({selectedHospital.short_code})</p>
          {boundHospitalId === selectedHospital.id && <p className="mt-1 text-xs text-slate-400">Reported now: {selectedHospital.available_beds}/{selectedHospital.total_beds} beds · {selectedHospital.available_icu}/{selectedHospital.total_icu} ICU · {selectedHospital.is_accepting === true ? 'accepting' : selectedHospital.is_accepting === false ? 'not accepting' : 'acceptance unknown'}</p>}
          <label className="mt-3 block text-sm text-slate-200">
            Demo staff identifier
            <input value={identityActor} onChange={(event) => {
              setIdentityActor(event.target.value);
              setBoundHospitalId(null);
              setAlertInbox(null);
              setHospitalArrivals([]);
            }}
              autoComplete="off"
              placeholder="Enter staff identifier"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 text-sm text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
          </label>
          {!boundHospitalId && (
            <button type="button" disabled={!nameConfirmed || !identityActor.trim()} onClick={() => void handleBindHospital()}
              className="mt-3 rounded bg-amber-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
              CONFIRM THIS DEMO FACILITY
            </button>
          )}
          {boundHospitalId && <p className="mt-2 text-xs text-emerald-300">Demo staff identity is bound to {hospitals.find((item) => item.id === boundHospitalId)?.name || boundHospitalId}.</p>}
          <label className="mt-3 block text-sm font-semibold text-white">
            Type the exact hospital name to confirm
            <input value={typedHospitalName} onChange={(event) => { setTypedHospitalName(event.target.value); setIdentityError(null); }}
              aria-invalid={Boolean(typedHospitalName) && !nameConfirmed}
              placeholder={selectedHospital.name}
              autoComplete="off"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2.5 text-sm text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
          </label>
          {typedHospitalName && !nameConfirmed && <p className="mt-1 text-xs text-rose-300">Name does not match the selected facility. Check the spelling.</p>}
          {identityError && <p role="alert" className="mt-2 text-xs text-rose-300">{identityError}</p>}
        </section>

        <section className="rounded-xl border border-amber-900/50 bg-slate-900 p-4 shadow-xl">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white">
            <BellRing className="h-4 w-4 text-amber-400" /> Hospital Alerts & Incoming Referrals
          </h3>
          <p className="mt-1 text-xs text-slate-400">Facility-specific incident updates and referrals. Acknowledging an alert does not accept a referral.</p>
          {alertsLoading && <p className="mt-2 text-xs text-slate-400">Loading facility alerts…</p>}
          {alertError && <p role="alert" className="mt-2 text-xs text-rose-300">{alertError}</p>}
          {boundHospitalId !== selectedHospital.id ? (
            <p className="mt-2 text-xs text-slate-500">Confirm and bind this facility to load its alerts. Regional facilities remain read-only context.</p>
          ) : alertInbox && (
            <div className="mt-3 space-y-3">
              <article className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-xs text-white">{alertInbox.incident_alert.incident_type} · {alertInbox.incident_alert.status}</strong>
                  <span className="text-xs text-slate-500">{alertInbox.incident_alert.timestamp ? new Date(alertInbox.incident_alert.timestamp).toLocaleString() : 'Timestamp unavailable'}</span>
                </div>
                <p className="mt-1 text-xs text-slate-300">{alertInbox.incident_alert.location} · {alertInbox.incident_alert.incident_id}</p>
                <p className="mt-1 text-xs text-slate-300">Estimated: {alertInbox.incident_alert.estimated_casualties} · Confirmed: {alertInbox.incident_alert.confirmed_casualties}</p>
                <p className="mt-1 text-xs text-amber-200">Hazards: {alertInbox.incident_alert.hazards.join(', ') || 'None recorded'}</p>
                {alertInbox.incident_alert.updates.map((update) => (
                  <div key={update.report_id} className="mt-2 border-t border-slate-800 pt-2">
                    <p className="text-xs text-cyan-200">{update.report_id} · {update.source} · {update.verification_status} · {new Date(update.reported_time).toLocaleString()}</p>
                    <p className="mt-1 text-xs text-slate-300">{update.summary}</p>
                    <p className="mt-1 text-xs text-slate-500">Unknown / missing: {update.missing_or_uncertain.join(', ') || 'None specified'}</p>
                  </div>
                ))}
                {alertInbox.incident_alert.urgency_minutes != null && <p className="mt-1 text-xs text-rose-300">Urgency: {alertInbox.incident_alert.urgency_minutes} minutes</p>}
                <button type="button" disabled={!canEditSelectedHospital || alertInbox.incident_alert.status === 'ACKNOWLEDGED' || busyAlertAction === alertInbox.incident_alert.id}
                  onClick={() => void handleAcknowledgeIncident()}
                  className="mt-2 rounded border border-cyan-800 px-2.5 py-1.5 text-xs font-bold text-cyan-200 disabled:opacity-40">
                  {busyAlertAction === alertInbox.incident_alert.id ? 'UPDATING…' : alertInbox.incident_alert.status === 'ACKNOWLEDGED' ? 'ACKNOWLEDGED' : 'ACKNOWLEDGE INCIDENT ALERT'}
                </button>
              </article>
              <div>
                <h4 className="text-xs font-bold uppercase text-white">Incoming referrals ({alertInbox.referrals.length})</h4>
                {alertInbox.referrals.length === 0 ? <p className="mt-1 text-xs text-slate-500">No referrals directed to this facility.</p> :
                  alertInbox.referrals.map((referral) => (
                    <article key={referral.patient_id} className="mt-2 rounded-lg border border-slate-800 bg-slate-950 p-3">
                      <p className="text-xs font-bold text-white">{referral.patient_id} · {referral.severity} · {referral.status}</p>
                      <p className="mt-1 text-xs text-slate-300">Incident {referral.incident_id} · patient state {referral.patient_status}</p>
                      <p className="mt-1 text-xs text-slate-300">Specialist: {referral.required_specialist} · Equipment: {referral.required_equipment}</p>
                      {referral.urgency_minutes != null && <p className="mt-1 text-xs text-rose-300">Recorded urgency: {referral.urgency_minutes} minutes</p>}
                      {referral.status === 'PENDING' && <div className="mt-2 flex gap-2">
                        <button type="button" disabled={!canEditSelectedHospital || Boolean(busyAlertAction)} onClick={() => void handleReferralResponse(referral.patient_id, 'ACCEPTED')}
                          className="rounded bg-emerald-800 px-2 py-1.5 text-xs font-bold text-white disabled:opacity-40">ACCEPT REFERRAL</button>
                        <button type="button" disabled={!canEditSelectedHospital || Boolean(busyAlertAction)} onClick={() => void handleReferralResponse(referral.patient_id, 'REJECTED')}
                          className="rounded bg-rose-900 px-2 py-1.5 text-xs font-bold text-white disabled:opacity-40">REJECT REFERRAL</button>
                      </div>}
                    </article>
                  ))}
              </div>
            </div>
          )}
        </section>

        {/* Live Capacity Update Portal Form */}
        {boundHospitalId === selectedHospital.id && <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="font-bold text-white text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              UPDATE ACTIVE CAPACITY & CASUALTY ACCEPTANCE
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Last Updated: {selectedHospital.last_updated ? new Date(selectedHospital.last_updated).toLocaleTimeString() : 'Unknown'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-mono text-slate-300 uppercase mb-1">
                Available Acute Beds (Max: {selectedHospital.total_beds})
              </label>
              <div className="relative">
                <input
                  type="number"
                  disabled={!canEditSelectedHospital}
                  value={availableBeds}
                  onChange={(e) => setAvailableBeds(e.target.value === '' ? Number.NaN : Number(e.target.value))}
                  min="0"
                  max={selectedHospital.total_beds}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono font-bold"
                />
                <Bed className="w-4 h-4 text-slate-600 absolute right-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-mono text-slate-300 uppercase mb-1">
                Available ICU Beds (Max: {selectedHospital.total_icu})
              </label>
              <div className="relative">
                <input
                  type="number"
                  disabled={!canEditSelectedHospital}
                  value={availableIcu}
                  onChange={(e) => setAvailableIcu(e.target.value === '' ? Number.NaN : Number(e.target.value))}
                  min="0"
                  max={selectedHospital.total_icu}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-cyan-400 focus:outline-none focus:border-cyan-500 font-mono font-bold"
                />
                <Activity className="w-4 h-4 text-slate-600 absolute right-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Acceptance Status</label>
              <button
                type="button"
                disabled={!canEditSelectedHospital}
                onClick={() => setIsAccepting(!isAccepting)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-mono font-bold border transition-all ${
                  isAccepting
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                }`}
              >
                {isAccepting ? '✓ ACCEPTING CASUALTIES' : '⛔ FULL / DIVERT PATIENTS'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-mono text-slate-300 uppercase mb-1">Staff Member Submitting</label>
              <input
                type="text"
                value={updatedBy}
                onChange={(e) => setUpdatedBy(e.target.value)}
                autoComplete="off"
                placeholder="e.g. Charge Nurse"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isSaving || !canEditSelectedHospital}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition-all disabled:opacity-50 active:scale-95 shadow-md shadow-cyan-950/40"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'UPDATING...' : 'SAVE & BROADCAST CAPACITY'}
              </button>
            </div>
          </div>

          {feedbackMsg && (
            <div className="p-2.5 rounded bg-cyan-950/40 border border-cyan-800/50 text-cyan-300 text-xs font-mono flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
              {feedbackMsg}
            </div>
          )}
          {capacityError && <p role="alert" className="rounded border border-rose-900 bg-rose-950/40 p-2 text-xs text-rose-300">{capacityError}</p>}
        </form>}

        <section className="rounded-xl border border-cyan-900/50 bg-slate-900 p-4 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-wide text-white">Arrivals awaiting hospital receipt confirmation</h3>
          <p className="mt-1 text-xs text-slate-400">Driver-reported arrival is not hospital confirmation.</p>
          {hospitalArrivals.length === 0 ? <p className="mt-2 text-xs text-slate-500">No driver-reported arrivals are pending receipt.</p> : (
            <div className="mt-3 space-y-2">
              {hospitalArrivals.map((patient) => (
                <div key={patient.patient_id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 bg-slate-950 p-2.5">
                  <div className="text-xs text-slate-200">
                    {patient.patient_id} · {patient.severity} · incident {patient.incident_id} · driver reported arrival {new Date(patient.arrival_at).toLocaleString()}
                  </div>
                  <button type="button" disabled={!canEditSelectedHospital || receiptLoadingId === patient.patient_id}
                    onClick={() => handleConfirmReceipt(patient.patient_id)}
                    className="rounded bg-cyan-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                    {receiptLoadingId === patient.patient_id ? 'CONFIRMING…' : 'CONFIRM HOSPITAL RECEIPT'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Capacity Update History Log */}
        {selectedHospital.capacity_history && selectedHospital.capacity_history.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="font-bold text-white text-xs font-mono uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              CAPACITY CHANGE AUDIT LOG
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {selectedHospital.capacity_history.map((item, idx) => (
                <div key={idx} className="bg-slate-950 p-2 rounded text-xs font-mono text-slate-400 flex items-center justify-between border border-slate-800/80">
                  <span>{new Date(item.timestamp).toLocaleTimeString()} • By: <strong className="text-slate-200">{item.updated_by}</strong></span>
                  <span>Beds: <strong className="text-emerald-400">{item.available_beds}</strong>, ICU: <strong className="text-cyan-400">{item.available_icu}</strong></span>
                  <span className={item.is_accepting !== false ? 'text-emerald-400' : 'text-rose-400'}>
                    {item.is_accepting !== false ? 'Accepting' : 'Diverting'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
