/**
 * MED-NET AI: Frontend REST API Client
 * Comprehensive Multi-Agency Client for Command, Hospitals, EMS, Traffic & Reports
 */

import type {
  Hospital,
  NearbyHospital,
  Patient,
  Ambulance,
  AssignmentItem,
  ReplanningResult,
  SaturationAlert,
  ExplainResponse,
  RoutingEfficiencyData,
  IncidentInfo,
  IncidentReport,
  ConflictAlert,
  AuthorityAlert,
  TrafficAdvisory,
  AuditLogEntry,
  UserRole,
  HospitalAlertInbox,
  HospitalArrival,
  AmbulanceMission
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

let demoContext = { role: 'COORDINATOR' as UserRole, actor: 'Demo Coordinator', resourceId: '' };

export function setDemoActorContext(role: UserRole, actor: string, resourceId = ''): void {
  demoContext = { role, actor: actor.trim(), resourceId };
}

async function demoFetch(url: string, init: RequestInit = {}, resourceId = demoContext.resourceId): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('X-Demo-Role', demoContext.role);
  headers.set('X-Demo-Actor', demoContext.actor);
  if (resourceId) headers.set('X-Demo-Resource', resourceId);
  else headers.delete('X-Demo-Resource');
  return fetch(url, { ...init, headers });
}

async function responseError(res: Response, fallback: string): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string') {
      return body.detail;
    }
  } catch {
    // The server may return a non-JSON error response.
  }
  return fallback;
}

// Base Health
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

// Hospitals
export async function fetchHospitals(): Promise<Hospital[]> {
  const res = await demoFetch(`${API_BASE}/hospitals`);
  if (!res.ok) throw new Error('Failed to load regional hospitals');
  return res.json();
}

export async function bindDemoHospital(hospitalId: string): Promise<{ hospital_id: string; hospital_name: string; demo_only: boolean }> {
  const res = await demoFetch(`${API_BASE}/demo/hospital/bind`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hospital_id: hospitalId })
  });
  if (!res.ok) throw new Error(await responseError(res, 'Could not bind demo hospital identity'));
  return res.json();
}

export async function fetchDemoHospitalBinding(): Promise<{ hospital_id: string | null; hospital_name: string | null }> {
  const res = await demoFetch(`${API_BASE}/demo/hospital/binding`);
  if (!res.ok) throw new Error(await responseError(res, 'Could not load demo hospital binding'));
  return res.json();
}

export async function fetchHospitalAlerts(hospitalId: string): Promise<HospitalAlertInbox> {
  const res = await demoFetch(`${API_BASE}/hospitals/${hospitalId}/alerts`, {}, hospitalId);
  if (!res.ok) throw new Error(await responseError(res, 'Could not load facility alerts'));
  return res.json();
}

export async function fetchHospitalArrivals(hospitalId: string): Promise<HospitalArrival[]> {
  const res = await demoFetch(`${API_BASE}/hospitals/${hospitalId}/arrivals`, {}, hospitalId);
  if (!res.ok) throw new Error(await responseError(res, 'Could not load arrivals for this facility'));
  const body: { arrivals: HospitalArrival[] } = await res.json();
  return body.arrivals;
}

export async function acknowledgeHospitalAlert(hospitalId: string, alertId: string): Promise<void> {
  const res = await demoFetch(`${API_BASE}/hospitals/${hospitalId}/alerts/${alertId}/ack`, { method: 'POST' }, hospitalId);
  if (!res.ok) throw new Error(await responseError(res, 'Could not acknowledge incident alert'));
}

export async function fetchDemoAmbulanceBinding(): Promise<{ ambulance_id: string | null; unit_number: string | null }> {
  const res = await demoFetch(`${API_BASE}/demo/ambulance/binding`);
  if (!res.ok) throw new Error(await responseError(res, 'Could not load demo ambulance binding'));
  return res.json();
}

export async function respondToHospitalReferral(
  hospitalId: string, patientId: string, response: 'ACCEPTED' | 'REJECTED'
): Promise<void> {
  const res = await demoFetch(`${API_BASE}/hospitals/${hospitalId}/referrals/${patientId}/response`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response })
  }, hospitalId);
  if (!res.ok) throw new Error(await responseError(res, 'Could not respond to hospital referral'));
}

export async function bindDemoAmbulance(ambulanceId: string): Promise<void> {
  const res = await demoFetch(`${API_BASE}/demo/ambulance/bind`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ambulance_id: ambulanceId })
  });
  if (!res.ok) throw new Error(await responseError(res, 'Could not bind demo ambulance identity'));
}

export async function fetchAmbulanceMission(ambulanceId: string): Promise<AmbulanceMission> {
  const res = await demoFetch(`${API_BASE}/ambulances/${ambulanceId}/mission`, {}, ambulanceId);
  if (!res.ok) throw new Error(await responseError(res, 'Could not load this unit mission'));
  return res.json();
}

export async function updateHospitalCapacity(hospitalId: string, payload: Record<string, any>): Promise<any> {
  const res = await demoFetch(`${API_BASE}/hospitals/${hospitalId}/capacity`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, hospitalId);
  if (!res.ok) throw new Error(await responseError(res, `Failed to update hospital ${hospitalId}`));
  return res.json();
}

// Patients
export async function fetchPatients(): Promise<Patient[]> {
  const res = await demoFetch(`${API_BASE}/patients`);
  if (!res.ok) throw new Error('Failed to load patients');
  return res.json();
}

export async function triggerSurge(n: number = 30): Promise<Patient[]> {
  const res = await demoFetch(`${API_BASE}/surge?n=${n}`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger mass casualty surge');
  return res.json();
}

// Ambulances
export async function fetchAmbulances(): Promise<Ambulance[]> {
  const res = await demoFetch(`${API_BASE}/ambulances`);
  if (!res.ok) throw new Error('Failed to load ambulances');
  return res.json();
}

export async function updateAmbulanceStatus(ambulanceId: string, payload: Record<string, any>): Promise<Ambulance> {
  const res = await demoFetch(`${API_BASE}/ambulances/${ambulanceId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, ambulanceId);
  if (!res.ok) throw new Error(await responseError(res, `Failed to update ambulance ${ambulanceId}`));
  return res.json();
}

export async function recordAmbulancePickup(ambulanceId: string): Promise<any> {
  const res = await demoFetch(`${API_BASE}/ambulances/${ambulanceId}/pickup`, { method: 'POST' }, ambulanceId);
  if (!res.ok) throw new Error(await responseError(res, `Failed to record casualty pickup for ${ambulanceId}`));
  return res.json();
}

export async function recordAmbulanceArrival(ambulanceId: string): Promise<any> {
  const res = await demoFetch(`${API_BASE}/ambulances/${ambulanceId}/arrival`, { method: 'POST' }, ambulanceId);
  if (!res.ok) throw new Error(await responseError(res, `Failed to record driver arrival for ${ambulanceId}`));
  return res.json();
}

export async function confirmHospitalReceipt(patientId: string, hospitalId: string, actor: string): Promise<any> {
  const res = await demoFetch(`${API_BASE}/patients/${patientId}/hospital-receipt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hospital_id: hospitalId, actor })
  }, hospitalId);
  if (!res.ok) throw new Error(await responseError(res, `Failed to confirm hospital receipt for ${patientId}`));
  return res.json();
}

export async function recordAmbulanceHandover(ambulanceId: string): Promise<any> {
  const res = await demoFetch(`${API_BASE}/ambulances/${ambulanceId}/handover`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to record clinical handover for ${ambulanceId}`);
  return res.json();
}

// Routing & Recommendations
export async function optimizeRouting(): Promise<{
  assignments: AssignmentItem[];
  unassigned_patient_ids: string[];
  summary: Record<string, any>;
}> {
  const res = await demoFetch(`${API_BASE}/assign`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to execute Hungarian routing assignment');
  return res.json();
}

export async function generateRecommendations(): Promise<{
  proposals: AssignmentItem[];
  unassigned_patient_ids: string[];
  summary: Record<string, any>;
}> {
  const res = await demoFetch(`${API_BASE}/recommendations/generate`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to generate recommendation proposals');
  return res.json();
}

export async function approveRecommendation(patientId: string, ambulanceId?: string): Promise<any> {
  const res = await demoFetch(`${API_BASE}/recommendations/${patientId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ambulance_id: ambulanceId })
  });
  if (!res.ok) throw new Error(`Failed to approve recommendation for ${patientId}`);
  return res.json();
}

export async function fetchSaturationAlerts(): Promise<SaturationAlert[]> {
  const res = await demoFetch(`${API_BASE}/alerts`);
  if (!res.ok) throw new Error('Failed to fetch saturation alerts');
  return res.json();
}

export async function fetchPatientExplanation(patientId: string): Promise<ExplainResponse> {
  const res = await demoFetch(`${API_BASE}/explain/${patientId}`);
  if (!res.ok) throw new Error(`Failed to fetch explanation for ${patientId}`);
  return res.json();
}

export async function fetchRoutingEfficiency(): Promise<RoutingEfficiencyData> {
  const res = await demoFetch(`${API_BASE}/metrics/efficiency`);
  if (!res.ok) throw new Error('Failed to calculate routing efficiency');
  return res.json();
}

// Incidents & Intake
export async function fetchIncidents(): Promise<IncidentInfo[]> {
  const res = await demoFetch(`${API_BASE}/incidents`);
  if (!res.ok) throw new Error('Failed to fetch incidents');
  return res.json();
}

export async function fetchNearbyHospitals(incidentId: string): Promise<NearbyHospital[]> {
  const res = await demoFetch(`${API_BASE}/incidents/${incidentId}/nearby-hospitals`);
  if (!res.ok) throw new Error(`Failed to fetch nearby hospitals for incident ${incidentId}`);
  return res.json();
}

export async function fetchIncidentReports(incidentId: string): Promise<IncidentReport[]> {
  const res = await demoFetch(`${API_BASE}/incidents/${incidentId}/reports`);
  if (!res.ok) throw new Error(`Failed to fetch reports for incident ${incidentId}`);
  return res.json();
}

export async function fetchReporterReports(): Promise<IncidentReport[]> {
  const res = await demoFetch(`${API_BASE}/reporter/reports`);
  if (!res.ok) throw new Error(await responseError(res, 'Could not load reports for this demo reporter'));
  return res.json();
}

export async function submitIncidentReport(incidentId: string, payload: Record<string, any>): Promise<IncidentReport> {
  const res = await demoFetch(`${API_BASE}/incidents/${incidentId}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await responseError(res, 'Failed to submit incident report'));
  return res.json();
}

export async function reviewIncidentReport(
  reportId: string,
  verificationStatus: 'CONFIRMED' | 'CONFLICTING' | 'REJECTED',
  actor: string,
  reason: string
): Promise<IncidentReport> {
  const res = await demoFetch(`${API_BASE}/reports/${reportId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verification_status: verificationStatus, actor, reason })
  });
  if (!res.ok) throw new Error(await responseError(res, `Failed to review incident report ${reportId}`));
  return res.json();
}

export async function extractAiReport(text: string, sourceType: string = 'citizen'): Promise<any> {
  const res = await demoFetch(`${API_BASE}/ai/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, source_type: sourceType })
  });
  if (!res.ok) throw new Error('Failed to extract report via AI');
  return res.json();
}

export async function fetchConflicts(): Promise<ConflictAlert[]> {
  const res = await demoFetch(`${API_BASE}/conflicts`);
  if (!res.ok) throw new Error('Failed to fetch conflict alerts');
  return res.json();
}

// Public Driver Guidance & Advisories
export async function fetchTrafficAdvisories(): Promise<TrafficAdvisory[]> {
  const res = await demoFetch(`${API_BASE}/advisories`);
  if (!res.ok) throw new Error('Failed to fetch traffic advisories');
  return res.json();
}

export async function publishTrafficAdvisory(payload: Record<string, any>): Promise<TrafficAdvisory> {
  const res = await demoFetch(`${API_BASE}/advisories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to publish advisory');
  return res.json();
}

export async function withdrawTrafficAdvisory(advisoryId: string): Promise<any> {
  const res = await demoFetch(`${API_BASE}/advisories/${advisoryId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to withdraw advisory ${advisoryId}`);
  return res.json();
}

// Authority Alerts
export async function fetchAuthorityAlerts(): Promise<AuthorityAlert[]> {
  const res = await demoFetch(`${API_BASE}/authority-alerts`);
  if (!res.ok) throw new Error('Failed to fetch authority alerts');
  return res.json();
}

export async function updateAuthorityAlertAction(alertId: string, action: string, note?: string): Promise<AuthorityAlert> {
  const res = await demoFetch(`${API_BASE}/authority-alerts/${alertId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, note, actor: 'Operations Commander' })
  });
  if (!res.ok) throw new Error(`Failed to update alert ${alertId}`);
  return res.json();
}

// Continuous Replanning
export async function checkReplanning(): Promise<ReplanningResult> {
  const res = await demoFetch(`${API_BASE}/replanning/check`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to execute replanning check');
  return res.json();
}

// Reports & Audit Logs
export async function fetchUnifiedIncidentReport(): Promise<any> {
  const res = await demoFetch(`${API_BASE}/reports/incident`);
  if (!res.ok) throw new Error('Failed to generate unified incident report');
  return res.json();
}

export function getCsvExportUrl(): string {
  return `${API_BASE}/reports/export/csv`;
}

export async function fetchAuditLogs(): Promise<AuditLogEntry[]> {
  const res = await demoFetch(`${API_BASE}/audit-logs`);
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
}

// Interactive Scenario Runner
export async function runScenarioStep(stepId: number): Promise<any> {
  const res = await demoFetch(`${API_BASE}/scenario/step/${stepId}`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to execute scenario step ${stepId}`);
  return res.json();
}

export async function resetSimulation(): Promise<void> {
  const res = await demoFetch(`${API_BASE}/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset simulation');
}
