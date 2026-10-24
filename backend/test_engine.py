"""
MED-NET AI: Comprehensive Backend Verification & Critical Scenario Test Suite
"""

import sys
from models import Hospital, Patient, PatientSeverity, HospitalStatus, PatientStatus
from assignment_engine import score_pair, optimize_assignments, haversine_distance_km
from predictive import time_to_saturation_minutes, calculate_saturation_alerts
from data_gen import seed_hospitals, generate_surge


def test_critical_routing_scenario():
    """
    CRITICAL TEST REQUIREMENT:
    Scenario:
    Hospital A = Nearest (1.2 km away) but FULL / 0 ICU beds / high load
    Hospital B = Farther (6.5 km away) with available ICU beds, trauma specialists, and capacity.
    A critical RED patient requiring ICU + Trauma Surgery MUST be routed to Hospital B, NOT Hospital A.
    """
    print("\n--- [TEST 1] CRITICAL SCENARIO: Full/No-ICU Nearest vs. Capable Farther Hospital ---")

    hosp_a_nearest_full = Hospital(
        id="HOSP-A-FULL",
        name="Hospital A (Nearest but Strained)",
        latitude=9.9820,
        longitude=76.2800,
        total_beds=50,
        available_beds=1,
        total_icu=10,
        available_icu=0,  # NO ICU BEDS!
        specialists=["General Surgery"],
        equipment=["CT Scanner"],
        blood_stock={"O_NEG": 2},
        current_load=0.98,
        status=HospitalStatus.CRITICAL
    )

    hosp_b_farther_capable = Hospital(
        id="HOSP-B-CAPABLE",
        name="Hospital B (Farther with Full Trauma ICU)",
        latitude=10.0350,
        longitude=76.2900,
        total_beds=100,
        available_beds=35,
        total_icu=25,
        available_icu=8,  # 8 ICU BEDS AVAILABLE!
        specialists=["Trauma Surgery", "Neurosurgery", "Cardiothoracic"],
        equipment=["Mechanical Ventilator", "CT Scanner", "ECMO", "Massive Transfusion Protocol"],
        blood_stock={"O_NEG": 25, "O_POS": 50},
        current_load=0.65,
        status=HospitalStatus.NORMAL
    )

    # Critical RED patient right near Hospital A
    patient_red = Patient(
        id="PAT-CRITICAL-01",
        severity=PatientSeverity.RED,
        latitude=9.9816,
        longitude=76.2999,
        required_specialist="Trauma Surgery",
        required_equipment="Mechanical Ventilator",
        blood_requirement="O_NEG",
        status=PatientStatus.WAITING,
        incident_id="INC-TEST"
    )

    dist_a = haversine_distance_km(patient_red.latitude, patient_red.longitude, hosp_a_nearest_full.latitude, hosp_a_nearest_full.longitude)
    dist_b = haversine_distance_km(patient_red.latitude, patient_red.longitude, hosp_b_farther_capable.latitude, hosp_b_farther_capable.longitude)

    print(f"  Distance to Hospital A: {dist_a} km (Available ICU: {hosp_a_nearest_full.available_icu})")
    print(f"  Distance to Hospital B: {dist_b} km (Available ICU: {hosp_b_farther_capable.available_icu})")

    score_a, breakdown_a = score_pair(patient_red, hosp_a_nearest_full)
    score_b, breakdown_b = score_pair(patient_red, hosp_b_farther_capable)

    print(f"  Score for Hospital A: {score_a} (ICU subscore: {breakdown_a.icu}, Specialist: {breakdown_a.specialist})")
    print(f"  Score for Hospital B: {score_b} (ICU subscore: {breakdown_b.icu}, Specialist: {breakdown_b.specialist})")

    assert score_b > score_a, f"FAIL: Capable hospital score ({score_b}) must exceed strained hospital score ({score_a})"

    # Run Hungarian batch solver
    response = optimize_assignments(
        patients=[patient_red],
        hospitals=[hosp_a_nearest_full, hosp_b_farther_capable]
    )

    assert len(response.assignments) == 1, "Must assign the patient"
    assigned_hosp_id = response.assignments[0].hospital_id
    print(f"  Hungarian Algorithm Assigned Destination: {assigned_hosp_id}")

    assert assigned_hosp_id == "HOSP-B-CAPABLE", (
        f"CRITICAL ERROR: Algorithm routed to {assigned_hosp_id} instead of capable HOSP-B-CAPABLE!"
    )
    print("  [PASS] Critical Test Passed: Patient successfully routed to capable Hospital B, bypassing nearest overloaded Hospital A.")


def test_hungarian_batch_distribution():
    """Tests Hungarian algorithm batch optimization with 25 casualties across 7 hospitals."""
    print("\n--- [TEST 2] Hungarian Algorithm Batch Optimization & Capacity Constraints ---")
    hospitals = seed_hospitals()
    patients = generate_surge(n=25)

    initial_total_beds = sum(h.available_beds for h in hospitals)
    print(f"  Generated {len(patients)} casualties across {len(hospitals)} regional hospitals with {initial_total_beds} total beds.")

    response = optimize_assignments(patients=patients, hospitals=hospitals)

    print(f"  Assigned: {len(response.assignments)}/{len(patients)} (Unassigned: {len(response.unassigned_patient_ids)})")
    print(f"  Average Assignment Score: {response.summary.get('average_score')}")
    print(f"  Average Estimated Transit: {response.summary.get('average_transit_minutes')} minutes")

    assert len(response.assignments) > 0, "Should successfully generate assignments"
    assert response.summary.get("average_score", 0) > 0.4, "Average suitability score should be reasonable"

    # Verify score breakdowns
    for a in response.assignments:
        assert a.breakdown.specialist >= 0.0
        assert a.breakdown.distance >= 0.0
        assert a.breakdown.load_balance >= 0.0

    print("  [PASS] Hungarian Batch Distribution verified.")


def test_predictive_saturation():
    """Tests predictive saturation calculation and alert generation."""
    print("\n--- [TEST 3] Predictive Saturation Alerts & Horizons ---")
    hospitals = seed_hospitals()

    # Artificially strain hospital 1
    hospitals[0].available_beds = 2
    hospitals[0].current_load = 0.96

    patients = generate_surge(n=10)
    alerts = calculate_saturation_alerts(hospitals, patients)

    print(f"  Generated {len(alerts)} saturation alert(s).")
    for alert in alerts:
        print(f"  Alert: {alert.hospital_name} | {alert.minutes_to_saturation} min to saturation | Level: {alert.severity}")

    assert len(alerts) >= 1, "Must generate saturation alert for strained hospital"
    assert alerts[0].hospital_id == hospitals[0].id, "Strained hospital should be primary alert"
    assert alerts[0].severity == "critical", "Should be critical severity"
    print("  [PASS] Predictive saturation alerts verified.")


def test_fastapi_endpoints():
    """Tests FastAPI endpoints using TestClient."""
    print("\n--- [TEST 4] FastAPI REST Endpoints Integration ---")
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app, headers={"X-Demo-Role": "COORDINATOR", "X-Demo-Actor": "Engine Test Coordinator"})

    # 1. Health
    r = client.get("/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}, "Health check failed"
    print("  [PASS] GET /health -> status: ok")

    # 2. Reset
    r = client.post("/reset")
    assert r.status_code == 200, "Reset failed"
    print("  [PASS] POST /reset -> success")

    # 3. Hospitals
    r = client.get("/hospitals")
    assert r.status_code == 200
    hospitals = r.json()
    assert len(hospitals) >= 6, f"Expected >= 6 hospitals, got {len(hospitals)}"
    print(f"  [PASS] GET /hospitals -> {len(hospitals)} hospitals returned")

    # 4. Patients (initially empty)
    r = client.get("/patients")
    assert r.status_code == 200 and len(r.json()) == 0
    print("  [PASS] GET /patients -> initially 0 patients")

    # 5. Surge
    r = client.post("/surge?n=20")
    assert r.status_code == 200
    patients = r.json()
    assert len(patients) == 20
    print(f"  [PASS] POST /surge?n=20 -> {len(patients)} casualties generated")

    # 6. Assign
    r = client.post("/assign")
    assert r.status_code == 200
    assign_data = r.json()
    assignments = assign_data.get("assignments", [])
    assert len(assignments) > 0, "No assignments generated"
    print(f"  [PASS] POST /assign -> {len(assignments)} casualties routed")

    # 7. Explain
    first_patient_id = assignments[0]["patient_id"]
    r = client.get(f"/explain/{first_patient_id}")
    assert r.status_code == 200
    explanation = r.json()
    assert "explanation" in explanation and len(explanation["explanation"]) > 20
    assert "handoff_summary" in explanation
    print(f"  [PASS] GET /explain/{first_patient_id} -> XAI justification generated")

    # 8. Alerts
    r = client.get("/alerts")
    assert r.status_code == 200
    print(f"  [PASS] GET /alerts -> status 200")

    # 9. Routing Efficiency
    r = client.get("/metrics/efficiency")
    assert r.status_code == 200
    eff = r.json()
    assert eff.get("has_data") is True
    print(f"  [PASS] GET /metrics/efficiency -> Load Balance Gain: +{eff.get('load_balance_improvement_pct')}%")

    print("  [PASS] All FastAPI endpoints verified successfully.")


if __name__ == "__main__":
    print("===============================================================")
    print(" [MED-NET AI] BACKEND ENGINE & ALGORITHM VERIFICATION SUITE")
    print("===============================================================")
    try:
        test_critical_routing_scenario()
        test_hungarian_batch_distribution()
        test_predictive_saturation()
        test_fastapi_endpoints()
        print("\n===============================================================")
        print(" ALL 4/4 BACKEND VERIFICATION SUITES PASSED SUCCESSFULLY!")
        print("===============================================================\n")
    except Exception as e:
        print(f"\n[TEST FAILED] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
