"""
MED-NET AI: Core Pydantic Domain Models & Enums
Extended for Comprehensive Multi-Agency Emergency Coordination
"""

from enum import Enum
from typing import Optional, Any
from pydantic import BaseModel, Field


class PatientSeverity(str, Enum):
    RED = "RED"       # Immediate: Critical life threat, salvageable with rapid care
    YELLOW = "YELLOW" # Delayed: Serious, hemodynamically stable for temporary delay
    GREEN = "GREEN"   # Minor: Walking wounded, superficial injuries
    BLACK = "BLACK"   # Expectant / Deceased


class HospitalStatus(str, Enum):
    NORMAL = "NORMAL"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class PatientStatus(str, Enum):
    WAITING = "WAITING"
    ASSIGNED = "ASSIGNED"
    EN_ROUTE = "EN_ROUTE"
    ADMITTED = "ADMITTED"


class AmbulanceStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    ASSIGNED = "ASSIGNED"
    EN_ROUTE_TO_SCENE = "EN_ROUTE_TO_SCENE"
    ON_SCENE = "ON_SCENE"
    TRANSPORTING = "TRANSPORTING"
    AT_HOSPITAL = "AT_HOSPITAL"
    UNAVAILABLE = "UNAVAILABLE"


class DataFreshness(str, Enum):
    CONFIRMED = "CONFIRMED"                     # < 15 mins ago, staff confirmed
    RECENT_UNCONFIRMED = "RECENT_UNCONFIRMED"   # 15 - 45 mins ago
    STALE = "STALE"                             # > 45 mins ago
    UNKNOWN = "UNKNOWN"


class AlertPriority(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class AlertStatus(str, Enum):
    NEW = "NEW"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"


class Hospital(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    total_beds: int
    available_beds: int
    total_icu: int
    available_icu: int
    specialists: list[str] = Field(default_factory=list)
    equipment: list[str] = Field(default_factory=list)
    blood_stock: dict[str, int] = Field(default_factory=dict)
    current_load: float = 0.0
    status: HospitalStatus = HospitalStatus.NORMAL
    trauma_level: str = "Level 1"
    burn_center: bool = False
    pediatric_capable: bool = False
    short_code: str = ""
    # Extended fields
    is_accepting: bool = True
    last_updated: str = "2026-09-16T11:00:00Z"
    data_source: str = "STAFF_PORTAL"  # STAFF_PORTAL, API, TELEMETRY, UNCONFIRMED_CALL
    confirmation_status: str = "CONFIRMED"  # CONFIRMED, RECENT_UNCONFIRMED, STALE, UNKNOWN
    incoming_patients_count: int = 0
    capacity_history: list[dict[str, Any]] = Field(default_factory=list)


class Patient(BaseModel):
    id: str
    severity: PatientSeverity
    latitude: float
    longitude: float
    required_specialist: str
    required_equipment: str
    blood_requirement: str = "NONE"
    status: PatientStatus = PatientStatus.WAITING
    assigned_hospital_id: Optional[str] = None
    assigned_ambulance_id: Optional[str] = None
    incident_id: str = "INC-2026-EKM-01"
    age: Optional[int] = None
    gender: str = "unknown"
    mechanism: Optional[str] = None
    vitals: Optional[dict[str, Any]] = None
    urgency_minutes: int = 60
    triage_notes: Optional[str] = None
    arrival_time: Optional[str] = None
    driver_reported_arrival_at: Optional[str] = None
    hospital_receipt_confirmed_at: Optional[str] = None
    hospital_receipt_confirmed_by: Optional[str] = None


class Ambulance(BaseModel):
    id: str
    unit_number: str
    status: str = "AVAILABLE"  # AVAILABLE, ASSIGNED, EN_ROUTE_TO_SCENE, ON_SCENE, TRANSPORTING, AT_HOSPITAL, UNAVAILABLE
    current_latitude: float
    current_longitude: float
    assigned_patient_id: Optional[str] = None
    destination_hospital_id: Optional[str] = None
    assigned_incident_id: Optional[str] = None
    capabilities: list[str] = Field(default_factory=lambda: ["ALS", "Ventilator"])
    last_status_update: str = "2026-09-16T11:00:00Z"
    transport_progress_pct: int = 0
    eta_minutes: Optional[float] = None


class ScoreBreakdown(BaseModel):
    specialist: float
    capacity: float
    distance: float
    load_balance: float
    resources: float
    icu: float = 1.0
    saturation_penalty: float = 0.0
    access_conditions: float = 1.0


class AssignmentItem(BaseModel):
    patient_id: str
    hospital_id: str
    score: float
    breakdown: ScoreBreakdown
    transit_distance_km: float
    estimated_transit_minutes: float
    # Extended coordination fields
    ambulance_id: Optional[str] = None
    approval_status: str = "APPROVED"  # PENDING_APPROVAL, APPROVED, REJECTED, OVERRIDDEN
    suitability_reasons: list[str] = Field(default_factory=list)
    resource_constraints: list[str] = Field(default_factory=list)
    alternative_options: list[dict[str, Any]] = Field(default_factory=list)
    data_freshness: str = "CURRENT"
    hospital_response_status: str = "PENDING"
    hospital_response_at: Optional[str] = None
    hospital_response_by: Optional[str] = None


class AssignResponse(BaseModel):
    assignments: list[AssignmentItem]
    unassigned_patient_ids: list[str] = Field(default_factory=list)
    summary: dict[str, Any] = Field(default_factory=dict)


class SaturationAlert(BaseModel):
    hospital_id: str
    hospital_name: str
    minutes_to_saturation: float
    severity: str  # "warning" | "critical"
    current_load: float
    available_beds: int


class ExplainResponse(BaseModel):
    patient_id: str
    hospital_id: str
    hospital_name: str
    score: float
    breakdown: ScoreBreakdown
    explanation: str
    handoff_summary: dict[str, Any]


class IncidentReport(BaseModel):
    id: str
    incident_id: str = "INC-2026-EKM-01"
    reported_time: str
    source_type: str  # citizen, phone_operator, ambulance, hospital, field_responder, authority
    source_identifier: Optional[str] = None
    location_text: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: str
    estimated_casualties: Optional[int] = None
    observed_hazards: list[str] = Field(default_factory=list)
    road_conditions: str = "Clear"
    notes: str = ""
    verification_status: str = "UNVERIFIED"  # UNVERIFIED, CONFIRMED, CONFLICTING, REJECTED
    is_simulated_call: bool = False
    raw_transcript: Optional[str] = None
    extracted_data: Optional[dict[str, Any]] = None
    review_history: list[dict[str, Any]] = Field(default_factory=list)


class Incident(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    timestamp: str
    status: str
    incident_type: str = "Major Transportation Accident"
    estimated_casualties_range: str = "15-25 (Unverified)"
    confirmed_patients_identified: int = 0
    hazards: list[str] = Field(default_factory=list)
    reports_count: int = 0


class AuthorityAlert(BaseModel):
    id: str
    incident_id: str = "INC-2026-EKM-01"
    priority: AlertPriority = AlertPriority.HIGH
    alert_type: str  # MAJOR_INCIDENT, CRITICAL_HAZARD, NO_DESTINATION, SHORTAGE, SATURATION, BLOCKED_ROUTE, REPLAN_REQUIRED
    title: str
    description: str
    trigger: str
    source: str
    timestamp: str
    recipient_role: str  # POLICE, FIRE_RESCUE, EMS_DISPATCH, TRAFFIC_AUTHORITY, HEALTH_DIRECTORATE
    recommended_action: str
    status: AlertStatus = AlertStatus.NEW
    history: list[dict[str, Any]] = Field(default_factory=list)
    is_simulated_external: bool = True


class TrafficAdvisory(BaseModel):
    id: str
    road_name: str
    status: str = "REPORTED_BLOCKED"  # OPEN, REPORTED_BLOCKED, CONFIRMED_CLOSED, CONGESTED
    hazard_description: str
    suggested_detour: str
    start_coordinates: list[float]  # [lat, lon]
    end_coordinates: list[float]    # [lat, lon]
    published_by: str = "Emergency Operations Coordinator"
    published_at: str
    is_published: bool = True
    verification_level: str = "CONFIRMED"  # REPORTED, CONFIRMED


class AuditLogEntry(BaseModel):
    id: str
    timestamp: str
    role: str
    action: str
    details: dict[str, Any]


class ConflictAlert(BaseModel):
    conflict_type: str  # CASUALTY_ESTIMATE_MISMATCH, LOCATION_MISMATCH, HAZARD_DISCREPANCY
    severity: str
    description: str
    reports_involved: list[str]
    detected_at: str
