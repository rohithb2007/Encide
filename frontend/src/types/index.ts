export type PatientSeverity = 'RED' | 'YELLOW' | 'GREEN' | 'BLACK';
export type HospitalStatus = 'NORMAL' | 'WARNING' | 'CRITICAL';
export type PatientStatus = 'WAITING' | 'ASSIGNED' | 'ADMITTED';

export interface Hospital {
  id: string;
  name: string;
  short_code: string;
  latitude: number;
  longitude: number;
  total_beds: number;
  available_beds: number;
  total_icu: number;
  available_icu: number;
  specialists: string[];
  equipment: string[];
  blood_stock: Record<string, number>;
  current_load: number;
  status: HospitalStatus;
  trauma_level: string;
  burn_center: boolean;
  pediatric_capable: boolean;
}

export interface Patient {
  id: string;
  severity: PatientSeverity;
  latitude: number;
  longitude: number;
  required_specialist: string;
  required_equipment: string;
  blood_requirement: string;
  status: PatientStatus;
  assigned_hospital_id?: string | null;
  incident_id: string;
  age?: number;
  gender?: string;
  mechanism?: string;
  vitals?: {
    rr?: number;
    hr?: number;
    sbp?: number;
    spo2?: number;
    gcs?: number;
  };
  urgency_minutes: number;
}

export interface ScoreBreakdown {
  specialist: number;
  capacity: number;
  distance: number;
  load_balance: number;
  resources: number;
  icu: number;
  saturation_penalty: number;
}

export interface AssignmentItem {
  patient_id: string;
  hospital_id: string;
  score: number;
  breakdown: ScoreBreakdown;
  transit_distance_km: number;
  estimated_transit_minutes: number;
}

export interface SaturationAlert {
  hospital_id: string;
  hospital_name: string;
  minutes_to_saturation: number;
  severity: 'warning' | 'critical';
  current_load: number;
  available_beds: number;
}

export interface ExplainResponse {
  patient_id: string;
  hospital_id: string;
  hospital_name: string;
  score: number;
  breakdown: ScoreBreakdown;
  explanation: string;
  handoff_summary: {
    casualty_id: string;
    triage_severity: string;
    mechanism_of_injury: string;
    vital_signs: Record<string, any>;
    destination_hospital: string;
    destination_trauma_tier: string;
    estimated_transit_eta_minutes: number;
    transit_distance_km: number;
    required_specialist: string;
    required_equipment: string;
    blood_type_required: string;
    urgency_window_minutes: number;
    dispatch_protocol: string;
  };
}

export interface RoutingEfficiencyData {
  has_data: boolean;
  load_balance_improvement_pct?: number;
  naive_overloaded_casualties_prevented?: number;
  regional_load_variance_mednet?: number;
  regional_load_variance_naive?: number;
  total_casualties_evaluated?: number;
  distribution?: {
    mednet: Record<string, number>;
    naive: Record<string, number>;
  };
  message?: string;
}

export interface IncidentInfo {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  status: string;
}
