"""
MED-NET AI: Multi-Variable Disaster Optimization Engine
Powered by SciPy's Hungarian Algorithm (Linear Sum Assignment)
"""

import math
import numpy as np
from scipy.optimize import linear_sum_assignment
from typing import Optional

from models import (
    Patient,
    Hospital,
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


def score_pair(
    patient: Patient,
    hospital: Hospital,
    saturation_penalty: float = 0.0
) -> tuple[float, ScoreBreakdown]:
    """
    Evaluates suitability score (0.0 to 1.0, higher is better) for a patient-hospital pair.
    Evaluates:
    - Specialist match
    - Hospital bed capacity
    - Travel distance (Haversine)
    - Regional load balance
    - Equipment and blood resource match
    - ICU requirement and availability
    - Predictive saturation penalty
    - Acuity-specific weighting (RED vs. YELLOW vs. GREEN vs. BLACK)
    """
    # 1. Travel Distance Score (normalized, 0-25 km domain)
    dist_km = haversine_distance_km(patient.latitude, patient.longitude, hospital.latitude, hospital.longitude)
    dist_score = max(0.05, 1.0 - (dist_km / 25.0))

    # 2. General Capacity Score
    if hospital.total_beds > 0:
        cap_ratio = hospital.available_beds / hospital.total_beds
    else:
        cap_ratio = 0.0
    cap_score = min(1.0, max(0.0, cap_ratio))

    # 3. Load Balance Score (inverse of current load)
    load_score = max(0.0, 1.0 - hospital.current_load)

    # 4. Specialist Match Score
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

    # 5. Equipment & Blood Resource Match Score
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

    # 6. ICU Requirement & Availability Score
    if patient.severity == PatientSeverity.RED:
        if hospital.available_icu > 0:
            icu_score = min(1.0, hospital.available_icu / max(1, hospital.total_icu * 0.3))
        else:
            icu_score = 0.02  # Drastic penalty if hospital has NO available ICU bed for RED patient
    else:
        icu_score = 1.0

    # 7. Severity-Differentiated Weighting
    if patient.severity == PatientSeverity.RED:
        # Life threat: ICU, specialists, resources and survival outweigh pure travel distance
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
        # Serious but stable: Balanced clinical match and capacity
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
        # Minor: Maximize load balance and general bed capacity
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

    # Apply predictive saturation penalty
    final_score = max(0.01, raw_score - (saturation_penalty * 0.30))

    breakdown = ScoreBreakdown(
        specialist=round(spec_score, 3),
        capacity=round(cap_score, 3),
        distance=round(dist_score, 3),
        load_balance=round(load_score, 3),
        resources=round(resource_score, 3),
        icu=round(icu_score, 3),
        saturation_penalty=round(saturation_penalty, 3)
    )

    return round(final_score, 4), breakdown


def optimize_assignments(
    patients: list[Patient],
    hospitals: list[Hospital],
    enable_predictive_penalty: bool = True
) -> AssignResponse:
    """
    Executes regional batch casualty distribution using the Hungarian Algorithm
    (Scipy linear_sum_assignment).

    - Expands hospital capacity into discrete bed slots.
    - Builds a global cost matrix (N patients × M hospital slots).
    - Minimizes total global routing cost while strictly obeying:
        * Bed capacity limits
        * ICU requirements for RED patients
        * Specialist requirements
        * Load balancing across the entire regional trauma network
    """
    waiting_patients = [p for p in patients if p.status == PatientStatus.WAITING]
    if not waiting_patients:
        return AssignResponse(assignments=[], unassigned_patient_ids=[], summary={"message": "No waiting patients"})

    # Compute predictive saturation penalties for each hospital
    sat_penalties = {}
    for h in hospitals:
        sat_penalties[h.id] = get_saturation_penalty(h) if enable_predictive_penalty else 0.0

    # Expand hospitals into available capacity slots
    # Each slot represents 1 available bed at hospital h.
    # We cap slots at available_beds.
    slot_to_hospital_map: list[Hospital] = []
    for h in hospitals:
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

    # Populate cost matrix: Cost = 100.0 * (1.0 - score)
    # Lower cost is better in linear_sum_assignment.
    for i, p in enumerate(waiting_patients):
        for j in range(num_slots):
            h = slot_to_hospital_map[j]
            score, _ = score_pair(p, h, saturation_penalty=sat_penalties.get(h.id, 0.0))

            # Prohibitive cost if hospital has 0 available beds
            if h.available_beds <= 0:
                cost = 1e6
            # Severe cost if RED patient needs ICU and hospital has 0 ICU beds
            elif p.severity == PatientSeverity.RED and h.available_icu <= 0:
                cost = 1e5
            else:
                cost = 100.0 * (1.0 - score)

            cost_matrix[i, j] = cost

    # Virtual overflow dummy columns have high cost (1e7) so real beds are always prioritized
    for j in range(num_slots, total_cols):
        cost_matrix[:, j] = 1e7

    # Run Hungarian Algorithm
    row_ind, col_ind = linear_sum_assignment(cost_matrix)

    assignments: list[AssignmentItem] = []
    unassigned: list[str] = []

    # Track how many patients are assigned to each hospital in this batch
    hosp_assigned_counts: dict[str, int] = {}
    hosp_icu_assigned_counts: dict[str, int] = {}

    for r, c in zip(row_ind, col_ind):
        p = waiting_patients[r]
        cost = cost_matrix[r, c]

        # If matched to a dummy slot or cost exceeds threshold, patient cannot be safely assigned
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
                # If no ICU left, skip or mark unassigned
                unassigned.append(p.id)
                continue
            hosp_icu_assigned_counts[assigned_hosp.id] = current_icu + 1

        hosp_assigned_counts[assigned_hosp.id] = current_assigned + 1

        # Re-calculate score and breakdown for record
        score, breakdown = score_pair(
            p,
            assigned_hosp,
            saturation_penalty=sat_penalties.get(assigned_hosp.id, 0.0)
        )
        dist_km = haversine_distance_km(p.latitude, p.longitude, assigned_hosp.latitude, assigned_hosp.longitude)
        eta_mins = estimate_transit_time_minutes(dist_km, is_emergency=(p.severity in [PatientSeverity.RED, PatientSeverity.YELLOW]))

        assignments.append(
            AssignmentItem(
                patient_id=p.id,
                hospital_id=assigned_hosp.id,
                score=score,
                breakdown=breakdown,
                transit_distance_km=dist_km,
                estimated_transit_minutes=eta_mins
            )
        )

    summary = {
        "total_waiting": num_patients,
        "total_assigned": len(assignments),
        "total_unassigned": len(unassigned),
        "average_score": round(float(np.mean([a.score for a in assignments])), 3) if assignments else 0.0,
        "average_transit_minutes": round(float(np.mean([a.estimated_transit_minutes for a in assignments])), 1) if assignments else 0.0,
    }

    return AssignResponse(
        assignments=assignments,
        unassigned_patient_ids=unassigned,
        summary=summary
    )
