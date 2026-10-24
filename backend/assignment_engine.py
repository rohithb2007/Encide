"""
MED-NET AI: Multi-Variable Disaster Optimization Engine
Powered by SciPy's Hungarian Algorithm (Linear Sum Assignment)
Enhanced with Multi-Agency Constraints, Ambulance Matching & Feasibility Explanations
"""

import math
import numpy as np
from scipy.optimize import linear_sum_assignment
from typing import Optional, Any

from models import (
    Patient,
    Hospital,
    Ambulance,
    ScoreBreakdown,
    AssignmentItem,
    AssignResponse,
    PatientSeverity,
    PatientStatus,
    HospitalStatus
)
from predictive import get_saturation_penalty


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates the great-circle distance between two geographic points in kilometers."""
    R = 6371.0  # Earth's mean radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


def estimate_transit_time_minutes(dist_km: float, is_emergency: bool = True) -> float:
    """
    Estimates emergency ambulance transit time.
    Emergency response avg speed: 45 km/h in urban core with siren clearance + 2 min dispatch buffer.
    """
    speed_kmh = 45.0 if is_emergency else 30.0
    transit_mins = (dist_km / speed_kmh) * 60.0 + 2.0
    return round(max(2.0, transit_mins), 1)


def check_route_access(
    patient_lat: float,
    patient_lon: float,
    hosp_lat: float,
    hosp_lon: float,
    road_advisories: Optional[list[Any]] = None
) -> tuple[float, float, list[str]]:
    """
    Evaluates whether the route between patient and hospital crosses an impassable road or bridge closure.
    Returns: (access_score [0.0 - 1.0], detour_km, list of warnings)
    """
    if not road_advisories:
        return 1.0, 0.0, []

    access_score = 1.0
    detour_km = 0.0
    warnings = []

    for adv in road_advisories:
        status = getattr(adv, 'status', None) or (adv.get('status') if isinstance(adv, dict) else '')
        if status not in ['CONFIRMED_CLOSED', 'BLOCKED_IMPASSABLE', 'BLOCKED']:
            continue

        road_name = getattr(adv, 'road_name', None) or (adv.get('road_name') if isinstance(adv, dict) else 'Corridor')
        start_coords = getattr(adv, 'start_coordinates', None) or (adv.get('start_coordinates') if isinstance(adv, dict) else [9.9690, 76.2920])
        end_coords = getattr(adv, 'end_coordinates', None) or (adv.get('end_coordinates') if isinstance(adv, dict) else [9.9660, 76.2965])

        closure_lat = (start_coords[0] + end_coords[0]) / 2.0
        
        # Check if corridor lies between patient and hospital
        if (patient_lat < closure_lat and hosp_lat > closure_lat) or (patient_lat > closure_lat and hosp_lat < closure_lat):
            access_score = min(access_score, 0.40)
            detour_km += 3.8
            warnings.append(f"Road closure on {road_name} requires detour via Kundannoor (+3.8 km / +10 min).")
        elif haversine_distance_km(patient_lat, patient_lon, closure_lat, (start_coords[1] + end_coords[1]) / 2.0) < 1.0:
            detour_km += 2.2
            access_score = min(access_score, 0.65)
            warnings.append(f"Incident epicenter directly borders closed {road_name}. Egress detour active.")

    return access_score, detour_km, warnings


def score_pair(
    patient: Patient,
    hospital: Hospital,
    saturation_penalty: float = 0.0,
    road_advisories: Optional[list[Any]] = None
) -> tuple[float, ScoreBreakdown]:
    """
    Evaluates suitability score (0.0 to 1.0, higher is better) for a patient-hospital pair.
    Enforces hard acceptance check: if hospital.is_accepting is False, score drops to 0.01.
    """
    # Hard constraint: hospital acceptance status
    if hasattr(hospital, 'is_accepting') and not hospital.is_accepting:
        breakdown = ScoreBreakdown(
            specialist=0.0,
            capacity=0.0,
            distance=0.0,
            load_balance=0.0,
            resources=0.0,
            icu=0.0,
            saturation_penalty=1.0,
            access_conditions=0.0
        )
        return 0.001, breakdown

    # 1. Road Access Conditions & Detour
    access_score, detour_km, _ = check_route_access(
        patient.latitude, patient.longitude,
        hospital.latitude, hospital.longitude,
        road_advisories
    )

    # 2. Travel Distance Score (normalized, 0-25 km domain)
    base_dist = haversine_distance_km(patient.latitude, patient.longitude, hospital.latitude, hospital.longitude)
    effective_dist = base_dist + detour_km
    dist_score = max(0.05, 1.0 - (effective_dist / 25.0))

    # 3. General Capacity Score
    if hospital.total_beds > 0:
        cap_ratio = hospital.available_beds / hospital.total_beds
    else:
        cap_ratio = 0.0
    cap_score = min(1.0, max(0.0, cap_ratio))

    # 4. Load Balance Score (inverse of current load)
    load_score = max(0.0, 1.0 - hospital.current_load)

    # 5. Specialist Match Score
    if not patient.required_specialist or patient.required_specialist == "None":
        spec_score = 1.0
    elif patient.required_specialist in hospital.specialists:
        spec_score = 1.0
    else:
        # Penalties depending on severity
        if patient.severity == PatientSeverity.RED:
            spec_score = 0.05  # Severe penalty for critical patients lacking surgeon
        elif patient.severity == PatientSeverity.YELLOW:
            spec_score = 0.35
        else:
            spec_score = 0.80  # Green walking wounded can be seen by general staff

    # 6. Equipment & Blood Resource Match Score
    if patient.required_equipment and patient.required_equipment != "None":
        equip_score = 1.0 if patient.required_equipment in hospital.equipment else 0.15
    else:
        equip_score = 1.0

    if patient.blood_requirement and patient.blood_requirement != "NONE":
        blood_units = hospital.blood_stock.get(patient.blood_requirement, 0)
        blood_score = 1.0 if blood_units >= 6 else (0.5 if blood_units > 0 else 0.1)
    else:
        blood_score = 1.0

    resource_score = (equip_score * 0.6) + (blood_score * 0.4)

    # 7. Specialized Facility Capabilities
    facility_bonus = 1.0
    if patient.required_specialist == "Burn Care" and getattr(hospital, "burn_center", False):
        facility_bonus = 1.25
    if getattr(patient, "age", 30) is not None and getattr(patient, "age", 30) < 16 and getattr(hospital, "pediatric_capable", False):
        facility_bonus *= 1.15

    # 8. ICU Requirement & Availability Score
    if patient.severity == PatientSeverity.RED:
        if hospital.available_icu > 0:
            icu_score = min(1.0, hospital.available_icu / max(1, hospital.total_icu * 0.3))
        else:
            icu_score = 0.02  # Drastic penalty if hospital has NO available ICU bed for RED patient
    else:
        icu_score = 1.0

    # 9. Severity-Differentiated Weighting
    if patient.severity == PatientSeverity.RED:
        w_icu = 0.25
        w_spec = 0.25
        w_res = 0.20
        w_dist = 0.15
        w_load = 0.15
        raw_score = (
            w_icu * icu_score +
            w_spec * spec_score +
            w_res * resource_score +
            w_dist * dist_score +
            w_load * load_score
        )
    elif patient.severity == PatientSeverity.YELLOW:
        w_spec = 0.25
        w_cap = 0.25
        w_dist = 0.25
        w_load = 0.15
        w_res = 0.10
        raw_score = (
            w_spec * spec_score +
            w_cap * cap_score +
            w_dist * dist_score +
            w_load * load_score +
            w_res * resource_score
        )
    elif patient.severity == PatientSeverity.GREEN:
        w_cap = 0.35
        w_load = 0.35
        w_dist = 0.25
        w_spec = 0.05
        raw_score = (
            w_cap * cap_score +
            w_load * load_score +
            w_dist * dist_score +
            w_spec * spec_score
        )
    else:  # BLACK
        w_dist = 0.60
        w_cap = 0.40
        raw_score = (w_dist * dist_score + w_cap * cap_score)

    # Incorporate access score and facility bonus
    raw_score = min(1.0, raw_score * access_score * facility_bonus)
    final_score = max(0.01, raw_score - (saturation_penalty * 0.30))

    breakdown = ScoreBreakdown(
        specialist=round(spec_score, 3),
        capacity=round(cap_score, 3),
        distance=round(dist_score, 3),
        load_balance=round(load_score, 3),
        resources=round(resource_score, 3),
        icu=round(icu_score, 3),
        saturation_penalty=round(saturation_penalty, 3),
        access_conditions=round(access_score, 3)
    )

    return round(final_score, 4), breakdown


def build_suitability_reasons(
    patient: Patient,
    hospital: Hospital,
    dist_km: float,
    access_warnings: Optional[list[str]] = None
) -> list[str]:
    """Generates human-readable clinical justifications for this assignment."""
    reasons = []
    if patient.severity == PatientSeverity.RED:
        if hospital.available_icu > 0:
            reasons.append(f"Guaranteed ICU Reserve: {hospital.available_icu} critical care beds open")
        if patient.required_specialist in hospital.specialists:
            reasons.append(f"Immediate on-site {patient.required_specialist} surgical team ready")
        if patient.blood_requirement != "NONE":
            units = hospital.blood_stock.get(patient.blood_requirement, 0)
            reasons.append(f"Emergency blood bank reserves: {units} units {patient.blood_requirement}")
        if getattr(hospital, 'trauma_level', None):
            reasons.append(f"{hospital.trauma_level} Verified Emergency Center")
    elif patient.severity == PatientSeverity.YELLOW:
        if patient.required_specialist in hospital.specialists:
            reasons.append(f"Coverage for required {patient.required_specialist}")
        reasons.append(f"Acute bed buffer: {hospital.available_beds} beds free ({int((1-hospital.current_load)*100)}% headroom)")
    else:
        reasons.append(f"Optimal regional load balancing ({hospital.available_beds} available beds)")

    # Facility-specific checks
    if patient.required_specialist == "Burn Care" and getattr(hospital, "burn_center", False):
        reasons.append("Certified Specialized Burn Center with isolated laminar-flow ICU")
    if getattr(patient, "age", 30) is not None and getattr(patient, "age", 30) < 16 and getattr(hospital, "pediatric_capable", False):
        reasons.append(f"Certified Pediatric Emergency Capability (Age: {patient.age})")
    if patient.required_equipment and patient.required_equipment in hospital.equipment:
        reasons.append(f"On-site operational {patient.required_equipment}")

    reasons.append(f"Transit Proximity: {dist_km} km ({estimate_transit_time_minutes(dist_km)} min ETA)")

    if access_warnings:
        reasons.extend(access_warnings)

    return reasons


def find_alternative_hospitals(
    patient: Patient,
    assigned_hospital_id: str,
    all_hospitals: list[Hospital],
    top_k: int = 2,
    road_advisories: Optional[list[Any]] = None
) -> list[dict[str, Any]]:
    """Calculates feasible alternative hospital options with their score, access status, and delta."""
    candidates = []
    for h in all_hospitals:
        if h.id == assigned_hospital_id:
            continue
        if hasattr(h, 'is_accepting') and not h.is_accepting:
            continue
        if h.available_beds <= 0:
            continue
        if patient.severity == PatientSeverity.RED and h.available_icu <= 0:
            continue

        score, breakdown = score_pair(patient, h, road_advisories=road_advisories)
        dist_km = haversine_distance_km(patient.latitude, patient.longitude, h.latitude, h.longitude)
        eta_mins = estimate_transit_time_minutes(dist_km)

        candidates.append({
            "hospital_id": h.id,
            "hospital_name": h.name,
            "score": round(score, 3),
            "distance_km": dist_km,
            "eta_minutes": eta_mins,
            "available_beds": h.available_beds,
            "available_icu": h.available_icu,
            "access_score": breakdown.access_conditions
        })

    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates[:top_k]


def optimize_assignments(
    patients: list[Patient],
    hospitals: list[Hospital],
    enable_predictive_penalty: bool = True,
    ambulances: Optional[list[Ambulance]] = None,
    road_advisories: Optional[list[Any]] = None
) -> AssignResponse:
    """
    Executes regional batch casualty distribution using the Hungarian Algorithm
    (Scipy linear_sum_assignment) with ambulance pairing, road access conditions, and alternative options.
    """
    waiting_patients = [p for p in patients if p.status == PatientStatus.WAITING]
    if not waiting_patients:
        return AssignResponse(assignments=[], unassigned_patient_ids=[], summary={"message": "No waiting patients"})

    # Filter out hospitals that have stopped accepting patients
    active_hospitals = [
        h for h in hospitals
        if getattr(h, 'is_accepting', True) and h.available_beds > 0
    ]

    if not active_hospitals:
        return AssignResponse(
            assignments=[],
            unassigned_patient_ids=[p.id for p in waiting_patients],
            summary={"message": "No hospitals currently accepting incoming casualties"}
        )

    # Compute predictive saturation penalties for each hospital
    sat_penalties = {}
    for h in active_hospitals:
        sat_penalties[h.id] = get_saturation_penalty(h) if enable_predictive_penalty else 0.0

    # Expand hospitals into available capacity slots
    slot_to_hospital_map: list[Hospital] = []
    for h in active_hospitals:
        slots_count = max(0, h.available_beds)
        for _ in range(slots_count):
            slot_to_hospital_map.append(h)

    num_patients = len(waiting_patients)
    num_slots = len(slot_to_hospital_map)

    if num_slots == 0:
        return AssignResponse(
            assignments=[],
            unassigned_patient_ids=[p.id for p in waiting_patients],
            summary={"message": "Regional hospital capacity exhausted: 0 beds available"}
        )

    # Pad slot columns with dummy virtual overflow slots if patients exceed physical beds
    total_cols = max(num_patients, num_slots)
    cost_matrix = np.full((num_patients, total_cols), 1e6, dtype=np.float64)

    for i, p in enumerate(waiting_patients):
        for j in range(num_slots):
            h = slot_to_hospital_map[j]
            score, _ = score_pair(p, h, saturation_penalty=sat_penalties.get(h.id, 0.0), road_advisories=road_advisories)

            if h.available_beds <= 0:
                cost = 1e6
            elif p.severity == PatientSeverity.RED and h.available_icu <= 0:
                cost = 1e5
            else:
                cost = 100.0 * (1.0 - score)

            cost_matrix[i, j] = cost

    for j in range(num_slots, total_cols):
        cost_matrix[:, j] = 1e7

    # Run Hungarian Algorithm
    row_ind, col_ind = linear_sum_assignment(cost_matrix)

    assignments: list[AssignmentItem] = []
    unassigned: list[str] = []

    hosp_assigned_counts: dict[str, int] = {}
    hosp_icu_assigned_counts: dict[str, int] = {}

    # Pool of available ambulances
    available_ambs = []
    if ambulances:
        available_ambs = [a for a in ambulances if a.status in ["AVAILABLE", "UNASSIGNED"]]

    used_amb_ids: set[str] = set()

    for r, c in zip(row_ind, col_ind):
        p = waiting_patients[r]
        cost = cost_matrix[r, c]

        if c >= num_slots or cost >= 50000:
            unassigned.append(p.id)
            continue

        assigned_hosp = slot_to_hospital_map[c]

        # Check that we haven't exceeded available beds
        current_assigned = hosp_assigned_counts.get(assigned_hosp.id, 0)
        if current_assigned >= assigned_hosp.available_beds:
            unassigned.append(p.id)
            continue

        # Check ICU capacity for RED patients
        if p.severity == PatientSeverity.RED:
            current_icu = hosp_icu_assigned_counts.get(assigned_hosp.id, 0)
            if current_icu >= assigned_hosp.available_icu:
                unassigned.append(p.id)
                continue
            hosp_icu_assigned_counts[assigned_hosp.id] = current_icu + 1

        hosp_assigned_counts[assigned_hosp.id] = current_assigned + 1

        # Calculate score and metrics with road advisories
        score, breakdown = score_pair(
            p,
            assigned_hosp,
            saturation_penalty=sat_penalties.get(assigned_hosp.id, 0.0),
            road_advisories=road_advisories
        )
        base_dist = haversine_distance_km(p.latitude, p.longitude, assigned_hosp.latitude, assigned_hosp.longitude)
        _, detour_km, access_warnings = check_route_access(p.latitude, p.longitude, assigned_hosp.latitude, assigned_hosp.longitude, road_advisories)
        effective_dist = round(base_dist + detour_km, 2)
        eta_mins = estimate_transit_time_minutes(effective_dist, is_emergency=(p.severity in [PatientSeverity.RED, PatientSeverity.YELLOW]))

        # Find closest available ambulance for this patient
        matched_amb_id: Optional[str] = None
        if available_ambs:
            eligible_ambs = [a for a in available_ambs if a.id not in used_amb_ids]
            if eligible_ambs:
                nearest_amb = min(
                    eligible_ambs,
                    key=lambda a: haversine_distance_km(p.latitude, p.longitude, a.current_latitude, a.current_longitude)
                )
                matched_amb_id = nearest_amb.id
                used_amb_ids.add(nearest_amb.id)

        # Build justifications & alternatives
        reasons = build_suitability_reasons(p, assigned_hosp, effective_dist, access_warnings=access_warnings)
        alternatives = find_alternative_hospitals(p, assigned_hosp.id, hospitals, road_advisories=road_advisories)

        constraints = []
        if getattr(assigned_hosp, 'confirmation_status', 'CONFIRMED') == 'STALE':
            constraints.append("Warning: Hospital capacity data older than 45 min.")
        if assigned_hosp.available_beds <= 5:
            constraints.append(f"Near-capacity alert: only {assigned_hosp.available_beds} beds remaining.")
        if access_warnings:
            constraints.extend(access_warnings)

        assignments.append(
            AssignmentItem(
                patient_id=p.id,
                hospital_id=assigned_hosp.id,
                score=score,
                breakdown=breakdown,
                transit_distance_km=effective_dist,
                estimated_transit_minutes=eta_mins,
                ambulance_id=matched_amb_id,
                approval_status="PENDING_APPROVAL",
                suitability_reasons=reasons,
                resource_constraints=constraints,
                alternative_options=alternatives,
                data_freshness=getattr(assigned_hosp, 'confirmation_status', 'CURRENT')
            )
        )

    summary = {
        "total_waiting": num_patients,
        "total_assigned": len(assignments),
        "total_unassigned": len(unassigned),
        "average_score": round(float(np.mean([a.score for a in assignments])), 3) if assignments else 0.0,
        "average_transit_minutes": round(float(np.mean([a.estimated_transit_minutes for a in assignments])), 1) if assignments else 0.0,
        "ambulances_allocated": len(used_amb_ids)
    }

    return AssignResponse(
        assignments=assignments,
        unassigned_patient_ids=unassigned,
        summary=summary
    )
