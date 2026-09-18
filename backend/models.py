"""
MED-NET AI: Core Pydantic Domain Models & Enums
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
    ADMITTED = "ADMITTED"


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
    incident_id: str = "INC-2026-01"
    age: Optional[int] = None
    gender: str = "unknown"
    mechanism: Optional[str] = None
    vitals: Optional[dict[str, Any]] = None
    urgency_minutes: int = 60


class Ambulance(BaseModel):
    id: str
    unit_number: str
    status: str = "AVAILABLE"  # AVAILABLE, EN_ROUTE, ON_SCENE, TRANSPORTING
    current_latitude: float
    current_longitude: float
    assigned_patient_id: Optional[str] = None
    destination_hospital_id: Optional[str] = None


class ScoreBreakdown(BaseModel):
    specialist: float
    capacity: float
    distance: float
    load_balance: float
    resources: float
    icu: float = 1.0
    saturation_penalty: float = 0.0


class AssignmentItem(BaseModel):
    patient_id: str
    hospital_id: str
    score: float
    breakdown: ScoreBreakdown
    transit_distance_km: float
    estimated_transit_minutes: float


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
