"""
MED-NET AI: Predictive Saturation & Capacity Warning Engine
"""

from typing import Optional
from models import Hospital, Patient, PatientStatus, SaturationAlert


def time_to_saturation_minutes(
    hospital: Hospital,
    incoming_rate_per_hour: float = 8.0,
    active_assigned_count: int = 0
) -> float:
    """
    Estimates minutes until a hospital reaches 100% bed saturation
    based on current available beds, incoming assigned patients, and sector influx rate.
    """
    remaining_effective_beds = max(0, hospital.available_beds - active_assigned_count)
    if remaining_effective_beds <= 0:
        return 0.0

    # Dynamic influx rate based on hospital size and regional emergency demand
    effective_rate = max(1.0, incoming_rate_per_hour * (hospital.total_beds / 80.0))
    # Hours to saturation = remaining / rate; in minutes = hours * 60
    minutes = (remaining_effective_beds / effective_rate) * 60.0
    return round(minutes, 1)


def calculate_saturation_alerts(
    hospitals: list[Hospital],
    patients: list[Patient]
) -> list[SaturationAlert]:
    """
    Generates regional saturation warnings when hospitals are projected
    to reach capacity within critical operational horizons (< 45 mins)
    or when their current load crosses alert thresholds.
    """
    alerts: list[SaturationAlert] = []

    # Count patients assigned to each hospital who have not yet been admitted
    incoming_counts: dict[str, int] = {}
    for p in patients:
        if p.status == PatientStatus.ASSIGNED and p.assigned_hospital_id:
            incoming_counts[p.assigned_hospital_id] = incoming_counts.get(p.assigned_hospital_id, 0) + 1

    for h in hospitals:
        assigned_count = incoming_counts.get(h.id, 0)
        est_minutes = time_to_saturation_minutes(h, active_assigned_count=assigned_count)

        # Trigger alert if load >= 0.75 OR time to saturation <= 35 minutes
        if h.current_load >= 0.85 or est_minutes <= 18.0:
            alerts.append(
                SaturationAlert(
                    hospital_id=h.id,
                    hospital_name=h.name,
                    minutes_to_saturation=est_minutes,
                    severity="critical",
                    current_load=round(h.current_load, 2),
                    available_beds=h.available_beds
                )
            )
        elif h.current_load >= 0.70 or est_minutes <= 40.0:
            alerts.append(
                SaturationAlert(
                    hospital_id=h.id,
                    hospital_name=h.name,
                    minutes_to_saturation=est_minutes,
                    severity="warning",
                    current_load=round(h.current_load, 2),
                    available_beds=h.available_beds
                )
            )

    # Sort alerts by urgency (lowest minutes to saturation first)
    alerts.sort(key=lambda a: a.minutes_to_saturation)
    return alerts


def get_saturation_penalty(hospital: Hospital, active_assigned: int = 0) -> float:
    """
    Returns a normalized penalty (0.0 to 1.0) to feed into the assignment engine
    to dynamically steer future casualty batches away from facilities trending to overload.
    """
    effective_beds = max(0, hospital.available_beds - active_assigned)
    if effective_beds == 0 or hospital.current_load >= 0.95:
        return 1.0

    if hospital.current_load >= 0.85:
        return 0.75
    elif hospital.current_load >= 0.75:
        return 0.40
    elif hospital.current_load >= 0.65:
        return 0.20
    return 0.0
