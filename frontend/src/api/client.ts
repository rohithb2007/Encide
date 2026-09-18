/**
 * MED-NET AI: Frontend REST API Client
 */

import type {
  Hospital,
  Patient,
  AssignmentItem,
  SaturationAlert,
  ExplainResponse,
  RoutingEfficiencyData
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

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

export async function fetchHospitals(): Promise<Hospital[]> {
  const res = await fetch(`${API_BASE}/hospitals`);
  if (!res.ok) throw new Error('Failed to load regional hospitals');
  return res.json();
}

export async function fetchPatients(): Promise<Patient[]> {
  const res = await fetch(`${API_BASE}/patients`);
  if (!res.ok) throw new Error('Failed to load patients');
  return res.json();
}

export async function triggerSurge(n: number = 30): Promise<Patient[]> {
  const res = await fetch(`${API_BASE}/surge?n=${n}`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger mass casualty surge');
  return res.json();
}

export async function optimizeRouting(): Promise<{
  assignments: AssignmentItem[];
  unassigned_patient_ids: string[];
  summary: Record<string, any>;
}> {
  const res = await fetch(`${API_BASE}/assign`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to execute Hungarian routing assignment');
  return res.json();
}

export async function fetchSaturationAlerts(): Promise<SaturationAlert[]> {
  const res = await fetch(`${API_BASE}/alerts`);
  if (!res.ok) throw new Error('Failed to fetch saturation alerts');
  return res.json();
}

export async function fetchPatientExplanation(patientId: string): Promise<ExplainResponse> {
  const res = await fetch(`${API_BASE}/explain/${patientId}`);
  if (!res.ok) throw new Error(`Failed to fetch explanation for ${patientId}`);
  return res.json();
}

export async function fetchRoutingEfficiency(): Promise<RoutingEfficiencyData> {
  const res = await fetch(`${API_BASE}/metrics/efficiency`);
  if (!res.ok) throw new Error('Failed to calculate routing efficiency');
  return res.json();
}

export async function resetSimulation(): Promise<void> {
  const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset simulation');
}
