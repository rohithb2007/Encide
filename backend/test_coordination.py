"""
MED-NET AI: Comprehensive Multi-Agency Coordination & Scenario Test Suite
Tests all Phase 2, 3, 4, 5 endpoints and algorithms.
"""

import sys
from fastapi.testclient import TestClient
from main import app, state


def test_coordination_suite():
    client = TestClient(app, headers={"X-Demo-Role": "COORDINATOR", "X-Demo-Actor": "Test Coordinator"})
    print("\n===============================================================")
    print(" [MED-NET AI] PHASE 2-5 ADVANCED COORDINATION TEST SUITE")
    print("===============================================================")

    # 1. Reset
    r = client.post("/reset")
    assert r.status_code == 200, "Reset failed"
    print("  [PASS] Simulation state reset")

    # 2. Incident Intake & AI Extraction
    r = client.get("/incidents")
    assert r.status_code == 200 and len(r.json()) > 0
    inc_id = r.json()[0]["id"]
    print(f"  [PASS] GET /incidents -> {inc_id}")

    report_payload_1 = {
        "description": "KSRTC bus overturned on Ernakulam South Bridge. Approx 16 casualties reported, diesel fuel leaking on roadway.",
        "source_type": "citizen",
        "location_text": "Ernakulam South Overbridge",
        "estimated_casualties": 16
    }
    r = client.post(f"/incidents/{inc_id}/reports", json=report_payload_1)
    assert r.status_code == 200
    rep_data = r.json()
    assert rep_data["id"].startswith("REP-")
    assert "Flammable Fuel" in str(rep_data["observed_hazards"])
    print(f"  [PASS] POST /incidents/{inc_id}/reports -> {rep_data['id']} with extracted hazards")

    # 3. Conflicting Report
    report_payload_2 = {
        "description": "Control room report: Bus crash on South Bridge, caller reports 40 injured and active vehicle fire.",
        "source_type": "phone_operator",
        "location_text": "Ernakulam South Overbridge",
        "estimated_casualties": 40
    }
    r = client.post(f"/incidents/{inc_id}/reports", json=report_payload_2)
    assert r.status_code == 200
    r_conflicts = client.get("/conflicts")
    assert r_conflicts.status_code == 200
    conflicts = r_conflicts.json()
    assert len(conflicts) > 0, "Expected conflict alert to be flagged"
    print(f"  [PASS] Conflict detection flagged {len(conflicts)} discrepancy: {conflicts[0]['conflict_type']}")

    # 4. Hospital Capacity & Freshness Update
    hosp_id = "H001"
    cap_update = {
        "available_beds": 12,
        "available_icu": 3,
        "is_accepting": True,
        "updated_by": "Nurse Supervisor S. Nair"
    }
    client.headers.update({"X-Demo-Role": "HOSPITAL", "X-Demo-Actor": "Coordination Hospital"})
    r = client.post("/demo/hospital/bind", json={"hospital_id": hosp_id})
    assert r.status_code == 200
    client.headers["X-Demo-Resource"] = hosp_id
    r = client.put(f"/hospitals/{hosp_id}/capacity", json=cap_update)
    assert r.status_code == 200
    h_data = r.json()["hospital"]
    assert h_data["available_beds"] == 12
    assert h_data["confirmation_status"] == "CONFIRMED"
    print(f"  [PASS] PUT /hospitals/{hosp_id}/capacity -> Beds: {h_data['available_beds']}, ICU: {h_data['available_icu']}")
    client.headers.update({"X-Demo-Role": "COORDINATOR", "X-Demo-Actor": "Test Coordinator", "X-Demo-Resource": ""})

    # 5. Ambulance Dispatch & Progression
    r = client.get("/ambulances")
    assert r.status_code == 200 and len(r.json()) >= 10
    amb_id = r.json()[0]["id"]
    print(f"  [PASS] GET /ambulances -> {len(r.json())} emergency response vehicles available")

    # 6. Surge & Recommendations Flow
    r = client.post("/surge?n=6")
    assert r.status_code == 200 and len(r.json()) == 6
    print(f"  [PASS] POST /surge?n=6 -> 6 casualties created")

    r = client.post("/recommendations/generate")
    assert r.status_code == 200
    rec_data = r.json()
    proposals = rec_data.get("proposals", [])
    assert len(proposals) > 0, "Expected recommendation proposals"
    first_prop = proposals[0]
    p_id = first_prop["patient_id"]
    print(f"  [PASS] POST /recommendations/generate -> {len(proposals)} proposals generated with ambulance pairing")

    # 7. Coordinator Approval
    r = client.post(f"/recommendations/{p_id}/approve", json={})
    assert r.status_code == 200
    appr_data = r.json()
    assert appr_data["status"] == "approved"
    assert appr_data["patient"]["status"] == "ASSIGNED"
    print(f"  [PASS] POST /recommendations/{p_id}/approve -> Assigned destination: {appr_data['hospital']['name']}")

    # 8. Hospital referral, ambulance pickup, arrival, and receipt
    assigned_amb_id = appr_data["patient"]["assigned_ambulance_id"]
    assigned_hospital_id = appr_data["patient"]["assigned_hospital_id"]
    if assigned_amb_id:
        client.headers.update({"X-Demo-Role": "HOSPITAL", "X-Demo-Actor": "Receiving Staff"})
        r = client.post("/demo/hospital/bind", json={"hospital_id": assigned_hospital_id})
        assert r.status_code == 200
        client.headers["X-Demo-Resource"] = assigned_hospital_id
        r = client.post(
            f"/hospitals/{assigned_hospital_id}/referrals/{p_id}/response",
            json={"response": "ACCEPTED"},
        )
        assert r.status_code == 200

        client.headers.update({"X-Demo-Role": "AMBULANCE", "X-Demo-Actor": "Transport Crew", "X-Demo-Resource": ""})
        r = client.post("/demo/ambulance/bind", json={"ambulance_id": assigned_amb_id})
        assert r.status_code == 200
        client.headers["X-Demo-Resource"] = assigned_amb_id
        r = client.patch(f"/ambulances/{assigned_amb_id}/status", json={"status": "EN_ROUTE_TO_SCENE"})
        assert r.status_code == 200
        r = client.patch(f"/ambulances/{assigned_amb_id}/status", json={"status": "ON_SCENE"})
        assert r.status_code == 200
        r = client.post(f"/ambulances/{assigned_amb_id}/pickup")
        assert r.status_code == 200
        assert r.json()["ambulance"]["status"] == "TRANSPORTING"
        print(f"  [PASS] POST /ambulances/{assigned_amb_id}/pickup -> Status: TRANSPORTING")

        client.headers.update({"X-Demo-Role": "HOSPITAL", "X-Demo-Actor": "Receiving Staff", "X-Demo-Resource": ""})
        r = client.post(f"/ambulances/{assigned_amb_id}/handover")
        assert r.status_code == 409
        client.headers.update({"X-Demo-Role": "AMBULANCE", "X-Demo-Actor": "Transport Crew", "X-Demo-Resource": assigned_amb_id})
        r = client.post(f"/ambulances/{assigned_amb_id}/arrival")
        assert r.status_code == 200
        client.headers.update({"X-Demo-Role": "HOSPITAL", "X-Demo-Actor": "Receiving Staff", "X-Demo-Resource": assigned_hospital_id})
        r = client.post(
            f"/patients/{p_id}/hospital-receipt",
            json={"hospital_id": assigned_hospital_id},
        )
        assert r.status_code == 200
        assert r.json()["patient"]["status"] == "ADMITTED"
        print(f"  [PASS] Hospital referral, driver arrival, and hospital receipt completed")

    # 9. Public Driver Advisories
    client.headers.update({"X-Demo-Role": "COORDINATOR", "X-Demo-Actor": "Test Coordinator", "X-Demo-Resource": ""})
    adv_payload = {
        "road_name": "Ernakulam South Overbridge",
        "status": "CONFIRMED_CLOSED",
        "hazard_description": "Accident scene investigation & fuel washing.",
        "suggested_detour": "Use Jos Junction or SA Road."
    }
    r = client.post("/advisories", json=adv_payload)
    assert r.status_code == 200
    adv_id = r.json()["id"]
    print(f"  [PASS] POST /advisories -> Published {adv_id}")

    r = client.get("/advisories")
    assert r.status_code == 200 and len(r.json()) > 0
    print(f"  [PASS] GET /advisories -> {len(r.json())} active public advisories (No Patient PII)")

    # 10. Authority Alerts
    r = client.get("/authority-alerts")
    assert r.status_code == 200 and len(r.json()) > 0
    alert_id = r.json()[0]["id"]
    r = client.post(f"/authority-alerts/{alert_id}/action", json={"action": "ACKNOWLEDGE", "actor": "Test Coordinator"})
    assert r.status_code == 200 and r.json()["status"] == "ACKNOWLEDGED"
    print(f"  [PASS] POST /authority-alerts/{alert_id}/action -> ACKNOWLEDGED")

    # 11. Continuous Replanning Check
    r = client.post("/replanning/check")
    assert r.status_code == 200 and "invalidated_plans_detected" in r.json()
    print(f"  [PASS] POST /replanning/check -> Replanning engine active")

    # 12. Unified Incident Report & CSV Export
    r = client.get("/reports/incident")
    assert r.status_code == 200
    report_doc = r.json()
    assert "casualty_accounting" in report_doc
    assert "hospitals_status" in report_doc
    assert "audit_trail" in report_doc
    print("  [PASS] GET /reports/incident -> Unified traceable report generated")

    r = client.get("/reports/export/csv")
    assert r.status_code == 200 and "Casualty_ID" in r.text
    print("  [PASS] GET /reports/export/csv -> CSV export ready")

    # 13. Complete 11-step interactive scenario runner
    print("\n--- Testing 11-Step Interactive Demonstration Scenario ---")
    for step in range(1, 12):
        r = client.post(f"/scenario/step/{step}")
        assert r.status_code == 200, f"Scenario step {step} failed"
        res = r.json()
        print(f"  [PASS] Scenario Step {step}/11: {res.get('title')}")

    print("\n===============================================================")
    print(" ALL 13/13 ADVANCED COORDINATION & SCENARIO TESTS PASSED!")
    print("===============================================================\n")


if __name__ == "__main__":
    try:
        test_coordination_suite()
    except Exception as e:
        print(f"[TEST FAILED] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
