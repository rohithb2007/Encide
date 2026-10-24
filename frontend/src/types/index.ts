export type PatientSeverity = 'RED' | 'YELLOW' | 'GREEN' | 'BLACK';
export type HospitalStatus = 'NORMAL' | 'WARNING' | 'CRITICAL';
export type PatientStatus = 'WAITING' | 'ASSIGNED' | 'EN_ROUTE' | 'ADMITTED';

export type UserRole =
  | 'COORDINATOR'
  | 'HOSPITAL'
  | 'AMBULANCE'
  | 'REPORTER'
  | 'DRIVER'
  | 'FIELD_RESPONDER'
  | 'AUTHORITY';

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
  is_accepting?: boolean;
  last_updated?: string;
  data_source?: string;
  confirmation_status?: string;
  incoming_patients_count?: number;
  capacity_history?: Array<{
    timestamp: string;
    available_beds: number;
    available_icu: number;
    is_accepting?: boolean;
    updated_by: string;
  }>;
}

export interface HospitalIncidentAlert {
  id: string;
  kind: 'INCIDENT';
  incident_id: string;
  incident_type: string;
  location: string;
  timestamp?: string | null;
  estimated_casualties: string;
  confirmed_casualties: number;
  hazards: string[];
  updates: Array<{
    report_id: string;
    reported_time: string;
    source: string;
    verification_status: string;
    summary: string;
    missing_or_uncertain: string[];
  }>;
  status: 'NEW' | 'ACKNOWLEDGED' | 'UPDATED' | 'ACTION_REQUIRED' | 'RESOLVED';
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  urgency_minutes?: number | null;
}

export interface HospitalReferral {
  id: string;
  kind: 'REFERRAL';
  incident_id: string;
  patient_id: string;
  severity: PatientSeverity;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  patient_status: PatientStatus;
  created_at?: string | null;
  required_specialist: string;
  required_equipment: string;
  urgency_minutes?: number | null;
  destination_hospital_id: string;
  acknowledged: boolean;
}

export interface HospitalAlertInbox {
  hospital_id: string;
  incident_alert: HospitalIncidentAlert;
  referrals: HospitalReferral[];
}

export interface HospitalArrival {
  patient_id: string;
  severity: PatientSeverity;
  arrival_at: string;
  incident_id: string;
}

export interface AmbulanceMission {
  ambulance: Ambulance;
  patient: Patient | null;
  destination: Hospital | null;
}

export interface NearbyHospital {
  hospital: Hospital;
  distance_km: number;
  estimated_transit_minutes: number;
  occupied_beds: number | null;
  route_warnings: string[];
  route_source?: 'APPROXIMATE_NO_ROAD_GEOMETRY';
}

export interface ReplanAlternative {
  hospital_id: string;
  hospital_name: string;
  score: number;
  distance_km: number;
  eta_minutes: number;
  available_beds: number;
  available_icu: number;
  access_score: number;
}

export interface ReplanProposal {
  patient_id: string;
  severity: PatientSeverity;
  current_hospital_id: string;
  current_hospital_name: string;
  reason: string;
  proposed_alternative: ReplanAlternative | null;
  detected_at: string;
}

export interface ReplanningResult {
  status: string;
  invalidated_plans_detected: number;
  replan_proposals: ReplanProposal[];
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
  assigned_ambulance_id?: string | null;
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
  triage_notes?: string;
  arrival_time?: string;
  driver_reported_arrival_at?: string | null;
  hospital_receipt_confirmed_at?: string | null;
  hospital_receipt_confirmed_by?: string | null;
}

export interface Ambulance {
  id: string;
  unit_number: string;
  status: string; // AVAILABLE, ASSIGNED, EN_ROUTE_TO_SCENE, ON_SCENE, TRANSPORTING, AT_HOSPITAL, UNAVAILABLE
  current_latitude: number;
  current_longitude: number;
  assigned_patient_id?: string | null;
  destination_hospital_id?: string | null;
  capabilities: string[];
  transport_progress_pct?: number;
  last_status_update?: string;
  eta_minutes?: number;
}

export interface ScoreBreakdown {
  specialist: number;
  capacity: number;
  distance: number;
  load_balance: number;
  resources: number;
  icu: number;
  saturation_penalty: number;
  access_conditions?: number;
}

export interface AssignmentItem {
  patient_id: string;
  hospital_id: string;
  score: number;
  breakdown: ScoreBreakdown;
  transit_distance_km: number;
  estimated_transit_minutes: number;
  ambulance_id?: string | null;
  approval_status?: string; // PENDING_APPROVAL, APPROVED, REJECTED, OVERRIDDEN
  suitability_reasons?: string[];
  resource_constraints?: string[];
  alternative_options?: Array<{
    hospital_id: string;
    hospital_name: string;
    score: number;
    distance_km: number;
    eta_minutes: number;
    available_beds: number;
    available_icu: number;
  }>;
  data_freshness?: string;
  route_source?: 'OSRM_ROAD_ROUTE' | 'APPROXIMATE_NO_ROAD_GEOMETRY' | 'ROUTE_UNAVAILABLE';
  route_geometry?: Array<{ latitude: number; longitude: number }> | null;
  route_error?: string | null;
  route_replanned?: boolean;
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
  incident_type?: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  status: string;
  estimated_casualties_range?: string;
  confirmed_patients_identified?: number;
  hazards?: string[];
  reports_count?: number;
}

export interface IncidentReport {
  id: string;
  incident_id: string;
  reported_time: string;
  source_type: string;
  source_identifier?: string | null;
  location_text: string;
  latitude?: number | null;
  longitude?: number | null;
  description: string;
  estimated_casualties?: number | null;
  observed_hazards: string[];
  road_conditions: string;
  notes?: string;
  verification_status: string;
  is_simulated_call?: boolean;
  raw_transcript?: string | null;
  extracted_data?: {
    incident_type?: string;
    location_text?: string;
    estimated_casualties?: number | null;
    casualty_uncertainty_note?: string;
    observed_hazards?: string[];
    road_condition?: string;
    missing_details?: string[];
  };
  review_history?: Array<{
    timestamp: string;
    actor: string;
    previous_status: string;
    verification_status: string;
    reason: string;
  }>;
}

export interface ConflictAlert {
  conflict_type: string;
  severity: string;
  description: string;
  reports_involved: string[];
  detected_at: string;
}

export interface AuthorityAlert {
  id: string;
  incident_id: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  alert_type: string;
  title: string;
  description: string;
  trigger: string;
  source: string;
  timestamp: string;
  recipient_role: string;
  recommended_action: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED';
  history?: Array<{
    timestamp: string;
    action: string;
    actor: string;
    note?: string;
  }>;
  is_simulated_external?: boolean;
}

export interface TrafficAdvisory {
  id: string;
  road_name: string;
  status: 'OPEN' | 'REPORTED_BLOCKED' | 'CONFIRMED_CLOSED' | 'CONGESTED';
  hazard_description: string;
  suggested_detour: string;
  start_coordinates: [number, number];
  end_coordinates: [number, number];
  published_by: string;
  published_at: string;
  is_published: boolean;
  verification_level: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  role: string;
  action: string;
  details: Record<string, any>;
}
