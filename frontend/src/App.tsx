import React, { useEffect, useState, useCallback } from 'react';
import { Header, type NavTab } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { IncidentControls } from './components/IncidentControls';
import { MapView } from './components/MapView';
import { HospitalDetails } from './components/HospitalDetails';
import { PatientDetails } from './components/PatientDetails';
import { AlertPanel } from './components/AlertPanel';
import { HandoffPanel } from './components/HandoffPanel';
import { HospitalLoadChart } from './components/HospitalLoadChart';
import { RoutingEfficiency } from './components/RoutingEfficiency';
import { CoordinatorApprovalPanel } from './components/CoordinatorApprovalPanel';
import { EmergencyIntakeView } from './components/EmergencyIntakeView';
import { HospitalPortalView } from './components/HospitalPortalView';
import { AmbulancePortalView } from './components/AmbulancePortalView';
import { AuthorityAlertsView } from './components/AuthorityAlertsView';
import { DriverGuidanceView } from './components/DriverGuidanceView';
import { UnifiedReportView } from './components/UnifiedReportView';
import { ScenarioRunnerView } from './components/ScenarioRunnerView';
import { IncomingReportsPanel } from './components/IncomingReportsPanel';
import { FieldResponderView } from './components/FieldResponderView';
import { ReporterPortalView } from './components/ReporterPortalView';
import { RegionalAuthorityView } from './components/RegionalAuthorityView';
import { CoordinatorOperationsView } from './components/CoordinatorOperationsView';

import type {
  Hospital,
  Patient,
  Ambulance,
  AssignmentItem,
  SaturationAlert,
  ExplainResponse,
  RoutingEfficiencyData,
  IncidentInfo,
  IncidentReport,
  ConflictAlert,
  AuthorityAlert,
  TrafficAdvisory,
  AuditLogEntry,
  NearbyHospital,
  ReplanningResult,
  UserRole
} from './types';

import {
  checkBackendHealth,
  fetchHospitals,
  fetchPatients,
  fetchAmbulances,
  triggerSurge,
  generateRecommendations,
  fetchSaturationAlerts,
  fetchPatientExplanation,
  fetchRoutingEfficiency,
  fetchIncidents,
  fetchIncidentReports,
  fetchConflicts,
  fetchAuthorityAlerts,
  fetchTrafficAdvisories,
  fetchNearbyHospitals,
  fetchAuditLogs,
  checkReplanning,
  resetSimulation,
  setDemoActorContext
} from './api/client';

import { useWebSocket } from './hooks/useWebSocket';
import { IncidentIntelligencePanel } from './components/IncidentIntelligencePanel';

const DEMO_ACTORS: Record<UserRole, string> = {
  COORDINATOR: 'Demo Coordinator',
  HOSPITAL: 'Demo Hospital Staff',
  AMBULANCE: 'Demo Ambulance Crew',
  REPORTER: 'Demo Reporter',
  DRIVER: 'Demo Public Driver',
  FIELD_RESPONDER: 'Demo Field Responder',
  AUTHORITY: 'Demo Authority',
};

export const App: React.FC = () => {
  // Navigation & Role State
  const [currentUserRole, setCurrentRole] = useState<UserRole>('COORDINATOR');
  const [currentDemoActor, setCurrentDemoActor] = useState(DEMO_ACTORS.COORDINATOR);
  const [activeTab, setActiveTab] = useState<NavTab>('OVERVIEW');

  // Connection state
  const [backendConnected, setBackendConnected] = useState<boolean>(false);

  // Core Simulation & Coordination Data
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [, setAssignments] = useState<AssignmentItem[]>([]);
  const [recommendations, setRecommendations] = useState<AssignmentItem[]>([]);
  const [alerts, setAlerts] = useState<SaturationAlert[]>([]);
  const [authorityAlerts, setAuthorityAlerts] = useState<AuthorityAlert[]>([]);
  const [advisories, setAdvisories] = useState<TrafficAdvisory[]>([]);
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [conflicts, setConflicts] = useState<ConflictAlert[]>([]);
  const [efficiencyData, setEfficiencyData] = useState<RoutingEfficiencyData | null>(null);
  const [nearbyHospitals, setNearbyHospitals] = useState<NearbyHospital[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [replanningResult, setReplanningResult] = useState<ReplanningResult | null>(null);
  const [replanningError, setReplanningError] = useState<string | null>(null);

  // Incident Info
  const [incident, setIncident] = useState<IncidentInfo>({
    id: 'INC-2026-EKM-01',
    name: 'Incident location unavailable',
    latitude: Number.NaN,
    longitude: Number.NaN,
    timestamp: new Date().toISOString(),
    status: 'CONNECTING',
    estimated_casualties_range: 'Not available'
  });

  // Selected Entities for Inspection
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedAmbulance, setSelectedAmbulance] = useState<Ambulance | null>(null);
  const [selectedExplanation, setSelectedExplanation] = useState<ExplainResponse | null>(null);
  const [isExplaining, setIsExplaining] = useState<boolean>(false);

  // Action Loading States
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isCheckingReplanning, setIsCheckingReplanning] = useState<boolean>(false);
  const [hospitalLiveRevision, setHospitalLiveRevision] = useState(0);

  // Role Switching logic with sensible defaults
  const handleSelectRole = (role: UserRole) => {
    setCurrentRole(role);
    setCurrentDemoActor(DEMO_ACTORS[role]);
    setDemoActorContext(role, DEMO_ACTORS[role]);
    if (role === 'HOSPITAL') setActiveTab('HOSPITALS');
    else if (role === 'AMBULANCE') setActiveTab('AMBULANCES');
    else if (role === 'REPORTER') setActiveTab('INTAKE');
    else if (role === 'DRIVER') setActiveTab('DRIVER');
    else if (role === 'FIELD_RESPONDER') setActiveTab('INTAKE');
    else if (role === 'AUTHORITY') setActiveTab('ALERTS');
    else if (role === 'COORDINATOR') setActiveTab('OVERVIEW');
  };

  const handleDemoActorChanged = (actor: string) => {
    setCurrentDemoActor(actor);
    setDemoActorContext(currentUserRole, actor);
  };

  // Refresh auxiliary metrics helper
  const refreshAuxiliaryData = useCallback(async () => {
    if (currentUserRole !== 'COORDINATOR') {
      if (currentUserRole === 'DRIVER' || currentUserRole === 'AUTHORITY') {
        setAdvisories(await fetchTrafficAdvisories().catch(() => []));
      }
      if (currentUserRole === 'AUTHORITY') {
        setAuthorityAlerts(await fetchAuthorityAlerts().catch(() => []));
      }
      return;
    }
    try {
      const [newAlerts, newEff, newAuthAlerts, newAdv, newConflicts, newNearbyHospitals, newAuditLogs] = await Promise.all([
        fetchSaturationAlerts().catch(() => []),
        fetchRoutingEfficiency().catch(() => ({ has_data: false })),
        fetchAuthorityAlerts().catch(() => []),
        fetchTrafficAdvisories().catch(() => []),
        fetchConflicts().catch(() => []),
        fetchNearbyHospitals(incident.id).catch(() => []),
        fetchAuditLogs().catch(() => [])
      ]);
      setAlerts(newAlerts);
      setEfficiencyData(newEff);
      setAuthorityAlerts(newAuthAlerts);
      setAdvisories(newAdv);
      setConflicts(newConflicts);
      setNearbyHospitals(newNearbyHospitals);
      setAuditLogs(newAuditLogs);
    } catch {
      // Graceful fallback
    }
  }, [currentUserRole, incident.id]);

  // Initial Data Fetch & Health Check
  const loadInitialData = useCallback(async () => {
    const isHealthy = await checkBackendHealth();
    setBackendConnected(isHealthy);

    if (isHealthy) {
      try {
        const canReadHospitals = ['COORDINATOR', 'HOSPITAL', 'AMBULANCE', 'AUTHORITY'].includes(currentUserRole);
        const canReadAmbulances = ['COORDINATOR', 'AMBULANCE', 'AUTHORITY'].includes(currentUserRole);
        const [hospList, patList, ambList, incList, repList] = await Promise.all([
          canReadHospitals ? fetchHospitals() : Promise.resolve([]),
          currentUserRole === 'COORDINATOR' ? fetchPatients() : Promise.resolve([]),
          canReadAmbulances ? fetchAmbulances() : Promise.resolve([]),
          fetchIncidents().catch(() => []),
          currentUserRole === 'COORDINATOR'
            ? fetchIncidentReports(incident.id).catch(() => [])
            : Promise.resolve([])
        ]);
        setHospitals(hospList);
        setPatients(patList);
        setAmbulances(ambList);
        if (incList.length > 0) setIncident(incList[0]);
        setReports(repList);
        await refreshAuxiliaryData();
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    }
  }, [currentUserRole, incident.id, refreshAuxiliaryData]);

  useEffect(() => {
    loadInitialData();
    const healthInterval = setInterval(async () => {
      const isHealthy = await checkBackendHealth();
      setBackendConnected(isHealthy);
    }, 10000);
    return () => clearInterval(healthInterval);
  }, [loadInitialData]);

  // Real-Time WebSocket Handlers
  const handleInitialState = useCallback((data: any) => {
    const mergeById = <T extends { id: string }>(current: T[], incoming: T[]): T[] => {
      const merged = new Map(current.map((item) => [item.id, item]));
      incoming.forEach((item) => merged.set(item.id, { ...merged.get(item.id), ...item }));
      return Array.from(merged.values());
    };
    if (data.hospitals) {
      setHospitals((current) => currentUserRole === 'COORDINATOR'
        ? data.hospitals
        : mergeById(current, data.hospitals));
    }
    if (data.patients && currentUserRole === 'COORDINATOR') setPatients(data.patients);
    if (data.assignments && currentUserRole === 'COORDINATOR') setAssignments(data.assignments);
    if (data.ambulances) {
      setAmbulances((current) => currentUserRole === 'COORDINATOR'
        ? data.ambulances
        : mergeById(current, data.ambulances));
    }
    if (data.reports) setReports(data.reports);
    if (data.advisories) setAdvisories(data.advisories);
    if (data.authority_alerts) setAuthorityAlerts(data.authority_alerts);
    if (data.incident) setIncident(data.incident);
    refreshAuxiliaryData();
  }, [currentUserRole, refreshAuxiliaryData]);

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
    if (data.ambulances) setAmbulances(data.ambulances);
    refreshAuxiliaryData();
  }, [refreshAuxiliaryData]);

  const handleReportAdded = useCallback((data: any) => {
    if (data.reports) setReports(data.reports);
    else if (data.report) setReports((prev) => [data.report, ...prev.filter((report) => report.id !== data.report.id)]);
    if (data.conflicts) setConflicts(data.conflicts);
    if (data.incident) setIncident(data.incident);
    setHospitalLiveRevision((revision) => revision + 1);
    refreshAuxiliaryData();
  }, [refreshAuxiliaryData]);

  const handleHospitalUpdated = useCallback((data: any) => {
    if (data.hospitals) setHospitals(data.hospitals);
    else if (data.hospital) {
      setHospitals((prev) => prev.map((h) => (h.id === data.hospital.id ? data.hospital : h)));
    }
    setHospitalLiveRevision((revision) => revision + 1);
    refreshAuxiliaryData();
  }, [refreshAuxiliaryData]);

  const handleAmbulanceUpdated = useCallback((data: any) => {
    if (data.ambulances) setAmbulances(data.ambulances);
    else if (data.ambulance) {
      setAmbulances((prev) => prev.map((a) => (a.id === data.ambulance.id ? data.ambulance : a)));
    }
    if (data.patients) setPatients(data.patients);
    if (data.hospitals) setHospitals(data.hospitals);
    setHospitalLiveRevision((revision) => revision + 1);
    refreshAuxiliaryData();
  }, [refreshAuxiliaryData]);

  const handleSimulationReset = useCallback((data: any) => {
    if (data.hospitals) setHospitals(data.hospitals);
    if (data.ambulances) setAmbulances(data.ambulances);
    if (data.reports) setReports(data.reports);
    if (data.advisories) setAdvisories(data.advisories);
    if (data.alerts) setAuthorityAlerts(data.alerts);
    setPatients([]);
    setAssignments([]);
    setRecommendations([]);
    setReplanningResult(null);
    setReplanningError(null);
    setSelectedPatient(null);
    setSelectedExplanation(null);
    setSelectedAmbulance(null);
    refreshAuxiliaryData();
  }, [refreshAuxiliaryData]);

  const { isConnected: wsConnected } = useWebSocket({
    onInitialState: handleInitialState,
    onSurgeTriggered: handleSurgeTriggered,
    onAssignmentCompleted: handleAssignmentCompleted,
    onReportAdded: handleReportAdded,
    onHospitalUpdated: handleHospitalUpdated,
    onAmbulanceUpdated: handleAmbulanceUpdated,
    onSimulationReset: handleSimulationReset,
  }, currentUserRole, currentDemoActor);

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

  // Action: Optimize Patient Routing (Generates Feasible Recommendations)
  const handleOptimizeRouting = async () => {
    setIsOptimizing(true);
    try {
      const res = await generateRecommendations();
      setRecommendations(res.proposals);
      const [hospList, patList, ambList] = await Promise.all([
        fetchHospitals(),
        fetchPatients(),
        fetchAmbulances()
      ]);
      setHospitals(hospList);
      setPatients(patList);
      setAmbulances(ambList);
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
      await loadInitialData();
      setReplanningResult(null);
      setReplanningError(null);
      setSelectedHospital(null);
      setSelectedPatient(null);
      setSelectedExplanation(null);
      setSelectedAmbulance(null);
      setRecommendations([]);
      setEfficiencyData(null);
      setAlerts([]);
    } catch (err) {
      console.error('Failed to reset simulation:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleScenarioReset = async () => {
    setReplanningResult(null);
    setReplanningError(null);
    await loadInitialData();
  };

  const handleCheckReplanning = async () => {
    setIsCheckingReplanning(true);
    setReplanningError(null);
    try {
      const result = await checkReplanning();
      setReplanningResult(result);
      await refreshAuxiliaryData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Replanning check failed';
      setReplanningError(message);
      console.error('Failed to check for invalidated assignments:', err);
    } finally {
      setIsCheckingReplanning(false);
    }
  };

  // Action: Select Patient & Fetch XAI Explanation
  const handleSelectPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    setSelectedHospital(null);
    setSelectedAmbulance(null);

    if (patient.assigned_hospital_id && patient.status !== 'WAITING') {
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
    setSelectedAmbulance(null);
    setSelectedExplanation(null);
  };

  const handleSelectHospitalById = (hospitalId: string) => {
    const found = hospitals.find((h) => h.id === hospitalId);
    if (found) handleSelectHospital(found);
  };

  // Action: Select Ambulance
  const handleSelectAmbulance = (ambulance: Ambulance) => {
    setSelectedAmbulance(ambulance);
  };

  // Scenario Callback Handler
  const handleScenarioStepCompleted = async (_step: number) => {
    await loadInitialData();
  };

  const waitingCount = patients.filter((p) => p.status === 'WAITING').length;
  const activeAlertsCount = authorityAlerts.filter((a) => a.status === 'NEW').length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header with Brand, Role Selector, Navigation Tabs & Telemetry */}
      <Header
        backendConnected={backendConnected}
        wsConnected={wsConnected}
        incident={incident}
        onReset={handleReset}
        isResetting={isResetting}
        currentRole={currentUserRole}
        onSelectRole={handleSelectRole}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        alertsCount={activeAlertsCount}
        showCoordinatorNavigation={currentUserRole === 'COORDINATOR'}
        showReset={currentUserRole === 'COORDINATOR'}
      />

      {/* Main Dynamic View Switching Based on Tab & Permitted Roles */}
      {currentUserRole === 'REPORTER' && <ReporterPortalView incident={incident} onIdentityActorChanged={handleDemoActorChanged} />}

      {currentUserRole === 'FIELD_RESPONDER' && (
        <FieldResponderView incident={incident} onIdentityActorChanged={handleDemoActorChanged} onReportSubmitted={(report) => {
          setReports((previous) => [report, ...previous.filter((item) => item.id !== report.id)]);
          void loadInitialData();
        }} />
      )}

      {currentUserRole === 'AUTHORITY' && (
        <RegionalAuthorityView incident={incident} hospitals={hospitals} ambulances={ambulances}
          alerts={authorityAlerts} advisories={advisories} />
      )}

      {(currentUserRole === 'COORDINATOR' && activeTab === 'INTAKE') && (
        <>
        <EmergencyIntakeView
          incident={incident}
          reports={reports}
          conflicts={conflicts}
          onReportSubmitted={(rep) => {
            setReports((prev) => [rep, ...prev]);
            loadInitialData();
          }}
        />
        <div className="mx-auto w-full max-w-[1700px] px-3 pb-4 md:px-5">
          <IncomingReportsPanel reports={reports} onReviewed={(reviewed) => {
            setReports((previous) => previous.map((report) => report.id === reviewed.id ? reviewed : report));
            void refreshAuxiliaryData();
          }} />
        </div>
        </>
      )}

      {currentUserRole === 'HOSPITAL' && (
        <HospitalPortalView
          hospitals={hospitals}
          refreshToken={hospitalLiveRevision}
          onIdentityActorChanged={handleDemoActorChanged}
          onRefreshData={loadInitialData}
          onHospitalUpdated={(updatedHosp) => {
            setHospitals((prev) => prev.map((h) => (h.id === updatedHosp.id ? updatedHosp : h)));
            loadInitialData();
          }}
        />
      )}

      {currentUserRole === 'AMBULANCE' && (
        <AmbulancePortalView
          ambulances={ambulances}
          onIdentityActorChanged={handleDemoActorChanged}
          onAmbulanceUpdated={(updatedAmb) => {
            setAmbulances((prev) => prev.map((a) => (a.id === updatedAmb.id ? updatedAmb : a)));
          }}
          onRefreshData={loadInitialData}
        />
      )}

      {currentUserRole === 'COORDINATOR' && (activeTab === 'HOSPITALS' || activeTab === 'AMBULANCES') && (
        <CoordinatorOperationsView mode={activeTab} hospitals={hospitals} ambulances={ambulances} patients={patients} />
      )}

      {currentUserRole === 'COORDINATOR' && activeTab === 'ALERTS' && (
        <AuthorityAlertsView
          alerts={authorityAlerts}
          onAlertUpdated={(_updatedAlert) => {
            loadInitialData();
          }}
        />
      )}

      {(currentUserRole === 'DRIVER' || (currentUserRole === 'COORDINATOR' && activeTab === 'DRIVER')) && (
        <DriverGuidanceView
          advisories={advisories}
          incident={incident}
          currentUserRole={currentUserRole}
          onAdvisoryUpdated={loadInitialData}
          onReportSubmitted={(report) => {
            setReports((previous) => [report, ...previous.filter((item) => item.id !== report.id)]);
            void loadInitialData();
          }}
        />
      )}

      {currentUserRole === 'COORDINATOR' && activeTab === 'REPORTS' && <UnifiedReportView />}

      {currentUserRole === 'COORDINATOR' && activeTab === 'OVERVIEW' && (
        <div className="flex-1 flex flex-col space-y-3.5 max-w-[1850px] w-full mx-auto p-3 md:p-4">
          {/* 11-Step Interactive Demonstration Scenario Bar */}
          <ScenarioRunnerView
            onScenarioStepCompleted={handleScenarioStepCompleted}
            onResetCompleted={handleScenarioReset}
          />

          {/* Top Vital Statistics Banner */}
          <StatsCards
            patients={patients}
            hospitals={hospitals}
            ambulances={ambulances}
            warningCount={alerts.length + activeAlertsCount}
          />

          {/* Coordinator Approval Queue Bar (Visible when proposals exist) */}
          {recommendations.length > 0 && currentUserRole === 'COORDINATOR' && (
            <CoordinatorApprovalPanel
              proposals={recommendations}
              patients={patients}
              hospitals={hospitals}
              ambulances={ambulances}
              onApproved={async () => {
                setRecommendations([]);
                await loadInitialData();
              }}
            />
          )}

          {/* Main Command Center Layout */}
          <main className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 w-full">
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

              {/* Interactive Tactical Map with Ambulances, Road Closures & Layer Toggles */}
              <div className="flex-1 min-h-[500px]">
                <MapView
                  hospitals={hospitals}
                  patients={patients}
                  nearbyHospitals={nearbyHospitals}
                  ambulances={ambulances}
                  advisories={advisories}
                  incident={incident}
                  selectedHospitalId={selectedHospital?.id}
                  selectedPatientId={selectedPatient?.id}
                  selectedAmbulanceId={selectedAmbulance?.id}
                  onSelectHospital={handleSelectHospital}
                  onSelectPatient={handleSelectPatient}
                  onSelectAmbulance={handleSelectAmbulance}
                />
              </div>

              {/* Bottom Telemetry Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                <RoutingEfficiency data={efficiencyData} />
                <HospitalLoadChart hospitals={hospitals} onSelectHospital={handleSelectHospital} />
              </div>
            </div>

            {/* Right Sidebar: Dynamic Inspection Cards & Alerts (4 cols on XL) */}
            <div className="xl:col-span-4 flex flex-col gap-3.5 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
              <IncidentIntelligencePanel
                incident={incident}
                reports={reports}
                conflicts={conflicts}
                patients={patients}
                nearbyHospitals={nearbyHospitals}
                auditLogs={auditLogs}
                selectedPatient={selectedPatient}
                replanningResult={replanningResult}
                replanningError={replanningError}
                isCheckingReplanning={isCheckingReplanning}
                onCheckReplanning={handleCheckReplanning}
                onSelectHospital={handleSelectHospital}
              />

              {/* Predictive Saturation Alerts */}
              <AlertPanel alerts={alerts} onSelectHospital={handleSelectHospitalById} />

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
              {selectedPatient && selectedPatient.status !== 'WAITING' && (
                <HandoffPanel explanation={selectedExplanation} isLoading={isExplaining} />
              )}

              {/* Instructions Guide when nothing is selected */}
              {!selectedHospital && !selectedPatient && (
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 font-mono text-xs text-slate-400 space-y-2">
                  <div className="font-bold text-white tracking-wider text-[11px] border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    COMMAND OPERATIONAL MANUAL
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    1. Use the <strong className="text-indigo-400">11-Step Interactive Scenario</strong> banner above to execute the complete Bus Crash demonstration.
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    2. Switch between roles (<strong className="text-rose-400">Coordinator</strong>, <strong className="text-cyan-400">Hospital</strong>, <strong className="text-amber-400">Ambulance</strong>, <strong className="text-emerald-400">Reporter</strong>, <strong className="text-indigo-400">Driver</strong>) to test role-specific portals.
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    3. Click <strong className="text-cyan-400">OPTIMIZE PATIENT ROUTING</strong> to generate feasible allocation proposals with ambulance pairing and coordinator approvals.
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    4. Click any <strong className="text-white">Hospital marker</strong> or <strong className="text-amber-400">Ambulance</strong> to inspect real-time bed, ICU, surgical staff, and transport missions.
                  </p>
                  <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500">
                    MED-NET AI • Multi-Agency Regional Emergency Platform
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  );
};

export default App;
