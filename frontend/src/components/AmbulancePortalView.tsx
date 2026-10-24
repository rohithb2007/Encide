import React, { useCallback, useEffect, useState } from 'react';
import { Truck, MapPin, User, Building } from 'lucide-react';
import type { Ambulance, Hospital, Patient } from '../types';
import {
  bindDemoAmbulance, fetchAmbulanceMission, fetchDemoAmbulanceBinding,
  updateAmbulanceStatus, recordAmbulancePickup, recordAmbulanceArrival, setDemoActorContext
} from '../api/client';

interface AmbulancePortalViewProps {
  ambulances: Ambulance[];
  onIdentityActorChanged: (actor: string) => void;
  onAmbulanceUpdated: (amb: Ambulance) => void;
  onRefreshData: () => void;
}

export const AmbulancePortalView: React.FC<AmbulancePortalViewProps> = ({
  ambulances,
  onIdentityActorChanged,
  onAmbulanceUpdated,
  onRefreshData,
}) => {
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string>(ambulances[0]?.id || 'AMB-01');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [identityActor, setIdentityActor] = useState('Demo Ambulance Crew');
  const [typedUnitNumber, setTypedUnitNumber] = useState('');
  const [boundAmbulanceId, setBoundAmbulanceId] = useState<string | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [assignedPatient, setAssignedPatient] = useState<Patient | null>(null);
  const [destinationHospital, setDestinationHospital] = useState<Hospital | null>(null);

  const selectedAmbulance = ambulances.find((a) => a.id === selectedAmbulanceId) || ambulances[0];
  const unitConfirmed = Boolean(selectedAmbulance) &&
    typedUnitNumber.trim().toLocaleLowerCase() === selectedAmbulance.unit_number.trim().toLocaleLowerCase();
  const canOperateUnit = Boolean(selectedAmbulance) && selectedAmbulance.id === boundAmbulanceId;

  const refreshMission = useCallback(async (ambulanceId: string) => {
    try {
      setDemoActorContext('AMBULANCE', identityActor, ambulanceId);
      const mission = await fetchAmbulanceMission(ambulanceId);
      setAssignedPatient(mission.patient);
      setDestinationHospital(mission.destination);
    } catch (err) {
      setIdentityError(err instanceof Error ? err.message : 'Could not load this unit mission.');
    }
  }, [identityActor]);

  useEffect(() => {
    let cancelled = false;
    const loadBinding = async () => {
      try {
        setDemoActorContext('AMBULANCE', identityActor);
        const binding = await fetchDemoAmbulanceBinding();
        if (cancelled) return;
        if (!binding.ambulance_id) return;
        setBoundAmbulanceId(binding.ambulance_id);
        setSelectedAmbulanceId(binding.ambulance_id);
        void refreshMission(binding.ambulance_id);
      } catch (err) {
        if (!cancelled) setIdentityError(err instanceof Error ? err.message : 'Could not load demo unit binding.');
      }
    };
    void loadBinding();
    return () => { cancelled = true; };
  }, [identityActor, refreshMission]);

  const confirmDemoUnit = async () => {
    if (!selectedAmbulance || !unitConfirmed || !identityActor.trim()) {
      setIdentityError('Type the exact unit number before confirming this demo unit.');
      return;
    }
    setIdentityError(null);
    try {
      setDemoActorContext('AMBULANCE', identityActor);
      await bindDemoAmbulance(selectedAmbulance.id);
      setBoundAmbulanceId(selectedAmbulance.id);
      onIdentityActorChanged(identityActor);
      setTypedUnitNumber('');
      await refreshMission(selectedAmbulance.id);
      onRefreshData();
    } catch (err) {
      setIdentityError(err instanceof Error ? err.message : 'Could not confirm this demo unit.');
    }
  };

  const filteredAmbulances = ambulances.filter((a) => {
    if (filterStatus === 'ALL') return true;
    return a.status === filterStatus;
  });

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedAmbulance || !canOperateUnit) return;
    setActionLoading(true);
    setActionError(null);
    setDemoActorContext('AMBULANCE', identityActor, selectedAmbulance.id);
    try {
      const res = await updateAmbulanceStatus(selectedAmbulance.id, { status: newStatus });
      onAmbulanceUpdated(res);
      await refreshMission(selectedAmbulance.id);
      onRefreshData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to change ambulance status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePickup = async () => {
    if (!selectedAmbulance || !canOperateUnit) return;
    setActionLoading(true);
    setActionError(null);
    setDemoActorContext('AMBULANCE', identityActor, selectedAmbulance.id);
    try {
      await recordAmbulancePickup(selectedAmbulance.id);
      await refreshMission(selectedAmbulance.id);
      onRefreshData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to record patient pickup.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArrival = async () => {
    if (!selectedAmbulance || !canOperateUnit) return;
    setActionLoading(true);
    setActionError(null);
    setDemoActorContext('AMBULANCE', identityActor, selectedAmbulance.id);
    try {
      await recordAmbulanceArrival(selectedAmbulance.id);
      await refreshMission(selectedAmbulance.id);
      onRefreshData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to record driver-reported arrival.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
      case 'ASSIGNED':
      case 'EN_ROUTE_TO_SCENE':
      case 'ON_SCENE':
        return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
      case 'TRANSPORTING':
        return 'text-rose-400 bg-rose-500/20 border-rose-500/30';
      case 'AT_HOSPITAL':
        return 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  if (!selectedAmbulance) return null;

  return (
    <div className="flex-1 p-3 md:p-5 max-w-[1700px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 font-sans">
      {/* Left Column: Fleet List & Status Filter (5 cols) */}
      <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="font-bold text-white text-xs font-mono uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-400" />
            EMERGENCY RESPONSE FLEET ({ambulances.length})
          </div>
          <span className="text-xs text-slate-500 font-mono">EMS DISPATCH</span>
        </div>

        {!boundAmbulanceId ? (
          <p className="mb-3 text-xs text-slate-500">Unit roster identifiers only. Confirm one demo unit to view its status and telemetry.</p>
        ) : (
          <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
            {['ALL', 'AVAILABLE', 'ASSIGNED', 'TRANSPORTING'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2 py-1 rounded transition-all ${
                  filterStatus === st
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        )}

        {/* Fleet Cards */}
        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
          {filteredAmbulances.map((amb) => {
            const isSelected = amb.id === selectedAmbulance.id;
            return (
              <button
                key={amb.id}
                onClick={() => { setSelectedAmbulanceId(amb.id); setTypedUnitNumber(''); setIdentityError(null); }}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-slate-800/90 border-amber-500/60 shadow-md'
                    : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-white font-mono">{amb.unit_number}</span>
                  {boundAmbulanceId === amb.id && (
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded border uppercase font-bold ${getStatusColor(amb.status)}`}>
                      {amb.status.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                {boundAmbulanceId === amb.id && (
                  <div className="text-xs text-slate-400 font-mono flex items-center justify-between mt-1">
                    <span>GPS: {amb.current_latitude.toFixed(4)}, {amb.current_longitude.toFixed(4)}</span>
                    <span>{amb.assigned_patient_id ? `Assigned: ${amb.assigned_patient_id}` : 'Idle'}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Active Unit Telemetry & Dispatch Controls (7 cols) */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        {/* Selected Unit Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono">{selectedAmbulance.unit_number}</h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  ID: {selectedAmbulance.id}
                </span>
                {canOperateUnit && (
                  <span className={`text-xs font-mono px-2 py-0.5 rounded border font-bold uppercase ${getStatusColor(selectedAmbulance.status)}`}>
                    {selectedAmbulance.status.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              {canOperateUnit ? (
                <p className="text-xs text-slate-400 mt-1 font-mono flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  Coordinates: {selectedAmbulance.current_latitude.toFixed(5)}, {selectedAmbulance.current_longitude.toFixed(5)}
                </p>
              ) : <p className="mt-1 text-xs text-slate-500">Confirm this unit to access its operational telemetry.</p>}
            </div>
            <div className="text-xs font-mono text-slate-500">
              {canOperateUnit && `Telemetry Fresh: ${selectedAmbulance.last_status_update ? new Date(selectedAmbulance.last_status_update).toLocaleTimeString() : 'Unknown'}`}
            </div>
          </div>

          {/* Capabilities */}
          {canOperateUnit && <div className="mt-3">
            <span className="text-xs text-slate-500 font-mono uppercase mr-2 font-bold">Equipment Onboard:</span>
            <div className="inline-flex gap-1.5 flex-wrap">
              {selectedAmbulance.capabilities.map((cap, i) => (
                <span key={i} className="text-xs font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-800">
                  {cap}
                </span>
              ))}
            </div>
          </div>}
        </div>

        <section className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-300">Demo unit identity · not authentication</p>
          <p className="mt-1 text-xs text-slate-200">Selected unit: {selectedAmbulance.unit_number} ({selectedAmbulance.id})</p>
          <label className="mt-2 block text-sm text-slate-200">Demo crew identifier
            <input value={identityActor} onChange={(event) => {
              setIdentityActor(event.target.value);
              setBoundAmbulanceId(null);
              setAssignedPatient(null);
              setDestinationHospital(null);
            }}
              autoComplete="off"
              placeholder="Enter EMS crew identifier"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 text-sm text-white placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
          </label>
          {!boundAmbulanceId && <>
            <label className="mt-2 block text-sm text-slate-200">Type the exact unit number to confirm
              <input value={typedUnitNumber} onChange={(event) => setTypedUnitNumber(event.target.value)}
                placeholder={selectedAmbulance.unit_number}
                autoComplete="off"
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 text-sm text-white placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </label>
            <button type="button" disabled={!unitConfirmed || !identityActor.trim()} onClick={() => void confirmDemoUnit()}
              className="mt-2 rounded bg-amber-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
              CONFIRM THIS DEMO UNIT
            </button>
          </>}
          {boundAmbulanceId && <p className="mt-2 text-xs text-emerald-300">Mutations are enabled only for {ambulances.find((unit) => unit.id === boundAmbulanceId)?.unit_number || boundAmbulanceId}. Fleet list entries are read-only.</p>}
          {identityError && <p role="alert" className="mt-2 text-xs text-rose-300">{identityError}</p>}
        </section>

        {/* Mission Card (If Assigned) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="font-bold text-white text-xs font-mono uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-2">
            <span>ACTIVE TRANSPORT MISSION</span>
            <span className="text-xs text-amber-400 font-mono">
              {selectedAmbulance.assigned_patient_id ? 'MISSION IN PROGRESS' : 'AWAITING DISPATCH'}
            </span>
          </div>

          {selectedAmbulance.assigned_patient_id ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Patient Assigned */}
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
                <div className="text-xs font-mono text-slate-500 uppercase flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-rose-400" />
                  Assigned Casualty
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white font-mono">{selectedAmbulance.assigned_patient_id}</span>
                  {assignedPatient && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                      TAG: {assignedPatient.severity}
                    </span>
                  )}
                </div>
                {assignedPatient && (
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>Specialist Need: <strong className="text-white">{assignedPatient.required_specialist}</strong></div>
                    <div>Equipment: <strong className="text-white">{assignedPatient.required_equipment}</strong></div>
                  </div>
                )}
              </div>

              {/* Destination Hospital */}
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
                <div className="text-xs font-mono text-slate-500 uppercase flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-cyan-400" />
                  Receiving Trauma Center
                </div>
                <div className="text-sm font-bold text-white truncate">
                  {destinationHospital?.name || selectedAmbulance.destination_hospital_id || 'Not Specified'}
                </div>
                {destinationHospital && (
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>Trauma Tier: <strong className="text-cyan-300">{destinationHospital.trauma_level}</strong></div>
                    <div>Available ICU: <strong className="text-emerald-400">{destinationHospital.available_icu} beds</strong></div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-center text-xs text-slate-500 font-mono">
              Ambulance is currently stationary and available for dispatch.
            </div>
          )}

          {/* Action Buttons for Lifecycle Progression */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="text-xs font-mono text-slate-400 uppercase font-bold">Dispatch State Transitions:</div>
            {actionError && <p role="alert" className="rounded border border-rose-900 bg-rose-950/40 p-2 text-xs text-rose-300">{actionError}</p>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => handleStatusChange('EN_ROUTE_TO_SCENE')}
                disabled={!canOperateUnit || actionLoading || selectedAmbulance.status !== 'ASSIGNED'}
                className="px-2.5 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono text-xs transition-all disabled:opacity-50"
              >
                En Route Scene
              </button>
              <button
                onClick={() => handleStatusChange('ON_SCENE')}
                disabled={!canOperateUnit || actionLoading || selectedAmbulance.status !== 'EN_ROUTE_TO_SCENE'}
                className="px-2.5 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono text-xs transition-all disabled:opacity-50"
              >
                On Scene
              </button>
              <button
                onClick={handlePickup}
                disabled={!canOperateUnit || actionLoading || !selectedAmbulance.assigned_patient_id || selectedAmbulance.status !== 'ON_SCENE' || !assignedPatient || !assignedPatient.assigned_hospital_id}
                className="px-2.5 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-rose-950/40"
              >
                Record Pickup
              </button>
              <button
                onClick={handleArrival}
                disabled={!canOperateUnit || actionLoading || !selectedAmbulance.assigned_patient_id || selectedAmbulance.status !== 'TRANSPORTING' || Boolean(assignedPatient?.driver_reported_arrival_at)}
                className="px-2.5 py-1.5 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-mono text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-cyan-950/40"
              >
                Report Arrival
              </button>
            </div>
            {assignedPatient?.driver_reported_arrival_at && (
              <p role="status" className="text-xs text-cyan-300">
                Driver-reported arrival recorded at {new Date(assignedPatient.driver_reported_arrival_at).toLocaleString()}. Hospital staff must confirm receipt separately.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
