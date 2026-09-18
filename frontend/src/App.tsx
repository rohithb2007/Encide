import React, { useEffect, useState, useCallback } from 'react';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { IncidentControls } from './components/IncidentControls';
import { MapView } from './components/MapView';
import { HospitalDetails } from './components/HospitalDetails';
import { PatientDetails } from './components/PatientDetails';
import { AlertPanel } from './components/AlertPanel';
import { HandoffPanel } from './components/HandoffPanel';
import { HospitalLoadChart } from './components/HospitalLoadChart';
import { RoutingEfficiency } from './components/RoutingEfficiency';

import type {
  Hospital,
  Patient,
  AssignmentItem,
  SaturationAlert,
  ExplainResponse,
  RoutingEfficiencyData,
  IncidentInfo
} from './types';

import {
  checkBackendHealth,
  fetchHospitals,
  fetchPatients,
  triggerSurge,
  optimizeRouting,
  fetchSaturationAlerts,
  fetchPatientExplanation,
  fetchRoutingEfficiency,
  resetSimulation
} from './api/client';

import { useWebSocket } from './hooks/useWebSocket';

export const App: React.FC = () => {
  // Connection state
  const [backendConnected, setBackendConnected] = useState<boolean>(false);

  // Core Simulation Data
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [alerts, setAlerts] = useState<SaturationAlert[]>([]);
  const [efficiencyData, setEfficiencyData] = useState<RoutingEfficiencyData | null>(null);

  // Selected Entities for Inspection
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedExplanation, setSelectedExplanation] = useState<ExplainResponse | null>(null);
  const [isExplaining, setIsExplaining] = useState<boolean>(false);

  // Action Loading States
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Incident Info
  const [incident, setIncident] = useState<IncidentInfo>({
    id: 'INC-2026-EKM-01',
    name: 'Ernakulam Central Transportation & Industrial Incident',
    latitude: 9.9816,
    longitude: 76.2999,
    timestamp: new Date().toISOString(),
    status: 'ACTIVE_SURGE'
  });

  // Refresh Alerts & Efficiency metrics helper
  const refreshAuxiliaryData = useCallback(async () => {
    try {
      const [newAlerts, newEfficiency] = await Promise.all([
        fetchSaturationAlerts().catch(() => []),
        fetchRoutingEfficiency().catch(() => ({ has_data: false }))
      ]);
      setAlerts(newAlerts);
      setEfficiencyData(newEfficiency);
    } catch {
      // Graceful fallback
    }
  }, []);

  // Initial Data Fetch & Health Check
  const loadInitialData = useCallback(async () => {
    const isHealthy = await checkBackendHealth();
    setBackendConnected(isHealthy);

    if (isHealthy) {
      try {
        const [hospList, patList] = await Promise.all([
          fetchHospitals(),
          fetchPatients()
        ]);
        setHospitals(hospList);
        setPatients(patList);
        await refreshAuxiliaryData();
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    }
  }, [refreshAuxiliaryData]);

  useEffect(() => {
    loadInitialData();

    // Periodic health poll every 10s
    const healthInterval = setInterval(async () => {
      const isHealthy = await checkBackendHealth();
      setBackendConnected(isHealthy);
    }, 10000);

    return () => clearInterval(healthInterval);
  }, [loadInitialData]);

  // Real-Time WebSocket Handlers
  const handleInitialState = useCallback((data: any) => {
    if (data.hospitals) setHospitals(data.hospitals);
    if (data.patients) setPatients(data.patients);
    if (data.assignments) setAssignments(data.assignments);
    if (data.incident) setIncident(data.incident);
    refreshAuxiliaryData();
  }, [refreshAuxiliaryData]);

  const handleSurgeTriggered = useCallback((data: any) => {
    if (data.patients) setPatients(data.patients);
    if (data.hospitals) setHospitals(data.hospitals);
    if (data.incident) setIncident(data.incident);
    refreshAuxiliaryData();
  }, [refreshAuxiliaryData]);

  const handleAssignmentCompleted = useCallback((data: any) => {
    if (data.assignments) setAssignments(data.assignments);
    if (data.patients) setPatients(data.patients);
    if (data.hospitals) setHospitals(data.hospitals);
    refreshAuxiliaryData();
  }, [refreshAuxiliaryData]);

  const handleSimulationReset = useCallback((data: any) => {
    if (data.hospitals) setHospitals(data.hospitals);
    setPatients([]);
    setAssignments([]);
    setSelectedPatient(null);
    setSelectedExplanation(null);
    refreshAuxiliaryData();
  }, [refreshAuxiliaryData]);

  const { isConnected: wsConnected } = useWebSocket({
    onInitialState: handleInitialState,
    onSurgeTriggered: handleSurgeTriggered,
    onAssignmentCompleted: handleAssignmentCompleted,
    onSimulationReset: handleSimulationReset,
  });

  // Action: Trigger Surge
  const handleTriggerSurge = async (count: number) => {
    setIsTriggering(true);
    try {
      const newPatients = await triggerSurge(count);
      setPatients(newPatients);
      await refreshAuxiliaryData();
    } catch (err) {
      console.error('Failed to trigger surge:', err);
    } finally {
      setIsTriggering(false);
    }
  };

  // Action: Optimize Patient Routing
  const handleOptimizeRouting = async () => {
    setIsOptimizing(true);
    try {
      const res = await optimizeRouting();
      setAssignments(res.assignments);
      // Reload updated hospitals & patients
      const [hospList, patList] = await Promise.all([
        fetchHospitals(),
        fetchPatients()
      ]);
      setHospitals(hospList);
      setPatients(patList);
      await refreshAuxiliaryData();
    } catch (err) {
      console.error('Failed to optimize routing:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Action: Reset Simulation
  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetSimulation();
      const hospList = await fetchHospitals();
      setHospitals(hospList);
      setPatients([]);
      setAssignments([]);
      setSelectedHospital(null);
      setSelectedPatient(null);
      setSelectedExplanation(null);
      setEfficiencyData(null);
      setAlerts([]);
    } catch (err) {
      console.error('Failed to reset simulation:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // Action: Select Patient & Fetch XAI Explanation
  const handleSelectPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    setSelectedHospital(null);

    // If patient is assigned, load Explainable AI justification
    if (patient.assigned_hospital_id && patient.status === 'ASSIGNED') {
      setIsExplaining(true);
      try {
        const exp = await fetchPatientExplanation(patient.id);
        setSelectedExplanation(exp);
      } catch (err) {
        console.error('Error fetching patient explanation:', err);
        setSelectedExplanation(null);
      } finally {
        setIsExplaining(false);
      }
    } else {
      setSelectedExplanation(null);
    }
  };

  // Action: Select Hospital
  const handleSelectHospital = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setSelectedPatient(null);
    setSelectedExplanation(null);
  };

  const handleSelectHospitalById = (hospitalId: string) => {
    const found = hospitals.find((h) => h.id === hospitalId);
    if (found) handleSelectHospital(found);
  };

  const waitingCount = patients.filter((p) => p.status === 'WAITING').length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header
        backendConnected={backendConnected}
        wsConnected={wsConnected}
        onReset={handleReset}
        isResetting={isResetting}
      />

      {/* Top Vital Statistics Banner */}
      <StatsCards patients={patients} hospitals={hospitals} />

      {/* Main Command Center Layout */}
      <main className="flex-1 p-3 md:p-4 grid grid-cols-1 xl:grid-cols-12 gap-3.5 max-w-[1800px] w-full mx-auto">
        {/* Left / Center: Controls, Tactical Map, and Telemetry (8 cols on XL) */}
        <div className="xl:col-span-8 flex flex-col gap-3.5">
          {/* Dispatch Event Controls */}
          <IncidentControls
            onTriggerSurge={handleTriggerSurge}
            onOptimize={handleOptimizeRouting}
            isTriggering={isTriggering}
            isOptimizing={isOptimizing}
            waitingCount={waitingCount}
            incident={incident}
          />

          {/* Interactive Tactical Map */}
          <div className="flex-1 min-h-[500px]">
            <MapView
              hospitals={hospitals}
              patients={patients}
              assignments={assignments}
              incident={incident}
              selectedHospitalId={selectedHospital?.id}
              selectedPatientId={selectedPatient?.id}
              onSelectHospital={handleSelectHospital}
              onSelectPatient={handleSelectPatient}
            />
          </div>

          {/* Bottom Telemetry Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            <RoutingEfficiency data={efficiencyData} />
            <HospitalLoadChart
              hospitals={hospitals}
              onSelectHospital={handleSelectHospital}
            />
          </div>
        </div>

        {/* Right Sidebar: Dynamic Inspection Cards & Alerts (4 cols on XL) */}
        <div className="xl:col-span-4 flex flex-col gap-3.5 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
          {/* Predictive Saturation Alerts */}
          <AlertPanel
            alerts={alerts}
            onSelectHospital={handleSelectHospitalById}
          />

          {/* Selected Hospital Inspection Card */}
          {selectedHospital && (
            <HospitalDetails
              hospital={selectedHospital}
              onClose={() => setSelectedHospital(null)}
            />
          )}

          {/* Selected Casualty Card */}
          {selectedPatient && (
            <PatientDetails
              patient={selectedPatient}
              assignedHospital={hospitals.find((h) => h.id === selectedPatient.assigned_hospital_id)}
              onClose={() => {
                setSelectedPatient(null);
                setSelectedExplanation(null);
              }}
            />
          )}

          {/* Explainable AI (XAI) Justification & EMS Handoff Panel */}
          {selectedPatient && selectedPatient.status === 'ASSIGNED' && (
            <HandoffPanel
              explanation={selectedExplanation}
              isLoading={isExplaining}
            />
          )}

          {/* Instructions Guide when nothing is selected */}
          {!selectedHospital && !selectedPatient && (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 font-mono text-xs text-slate-400 space-y-2">
              <div className="font-bold text-white tracking-wider text-[11px] border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                COMMAND OPERATIONAL MANUAL
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                1. Click <strong className="text-rose-400">TRIGGER MASS CASUALTY SURGE</strong> to simulate disaster casualties around the epicenter.
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                2. Click <strong className="text-cyan-400">OPTIMIZE PATIENT ROUTING</strong> to execute the Hungarian bipartite algorithm, distributing patients across the regional network.
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                3. Click any <strong className="text-white">Hospital marker</strong> to inspect real-time bed, ICU, surgical staff, and blood bank reserves.
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                4. Click any <strong className="text-amber-400">Casualty pin</strong> to inspect the physiological vitals and view the <strong className="text-indigo-400">Explainable AI (WHY THIS HOSPITAL?)</strong> factor breakdown and EMS handoff summary.
              </p>
              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500">
                MED-NET AI • Regional Disaster Command Platform
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
