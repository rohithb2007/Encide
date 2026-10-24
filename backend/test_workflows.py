"""Focused verification for report review, capacity guards, and ambulance receipt flow."""

from fastapi.testclient import TestClient
from main import app


def _client() -> TestClient:
    client = TestClient(app, headers={"X-Demo-Role": "COORDINATOR", "X-Demo-Actor": "Test Coordinator"})
    assert client.post("/reset").status_code == 200
    return client


def test_report_review_requires_reason_and_preserves_audit_history():
    client = _client()
    incident_id = client.get("/incidents").json()[0]["id"]
    report = client.post(
        f"/incidents/{incident_id}/reports",
        json={"source_type": "phone_operator", "location_text": "Scene", "description": "Smoke reported"},
    )
    assert report.status_code == 200
    report_id = report.json()["id"]

    invalid_review = client.post(
        f"/reports/{report_id}/review",
        json={"verification_status": "CONFIRMED", "reason": ""},
    )
    assert invalid_review.status_code == 422
    assert invalid_review.json()["detail"] == "reason is required"

    reviewed = client.post(
        f"/reports/{report_id}/review",
        json={"verification_status": "CONFLICTING", "reason": "Awaiting cross-check"},
    )
    assert reviewed.status_code == 200
    data = reviewed.json()
    assert data["verification_status"] == "CONFLICTING"
    assert data["review_history"][0]["previous_status"] == "UNVERIFIED"
    assert data["review_history"][0]["reason"] == "Awaiting cross-check"
    assert any(entry["action"] == "REPORT_REVIEWED" for entry in client.get("/audit-logs").json())


def test_capacity_values_outside_facility_limits_are_rejected():
    client = _client()
    initial = next(hospital for hospital in client.get("/hospitals").json() if hospital["id"] == "H001")
    client.headers.update({"X-Demo-Role": "HOSPITAL", "X-Demo-Actor": "Capacity Tester"})
    assert client.post("/demo/hospital/bind", json={"hospital_id": "H001"}).status_code == 200
    client.headers["X-Demo-Resource"] = "H001"

    for payload in (
        {"available_beds": initial["total_beds"] + 1, "available_icu": 0, "is_accepting": True, "updated_by": "Staff"},
        {"available_beds": 0, "available_icu": -1, "is_accepting": True, "updated_by": "Staff"},
    ):
        response = client.put("/hospitals/H001/capacity", json=payload)
        assert response.status_code == 422

    current = next(hospital for hospital in client.get("/hospitals").json() if hospital["id"] == "H001")
    assert current["available_beds"] == initial["available_beds"]
    assert current["available_icu"] == initial["available_icu"]


def test_driver_arrival_and_hospital_receipt_are_separate_transitions():
    client = _client()
    assert client.post("/surge?n=1").status_code == 200
    proposals = client.post("/recommendations/generate").json()["proposals"]
    assert proposals
    patient_id = proposals[0]["patient_id"]
    approved = client.post(f"/recommendations/{patient_id}/approve", json={})
    assert approved.status_code == 200
    patient = approved.json()["patient"]
    ambulance_id = patient["assigned_ambulance_id"]
    hospital_id = patient["assigned_hospital_id"]
    assert ambulance_id and hospital_id

    duplicate_approval = client.post(f"/recommendations/{patient_id}/approve", json={})
    assert duplicate_approval.status_code == 409
    client.headers.update({"X-Demo-Role": "HOSPITAL", "X-Demo-Actor": "Receiving Staff"})
    assert client.post("/demo/hospital/bind", json={"hospital_id": hospital_id}).status_code == 200
    client.headers["X-Demo-Resource"] = hospital_id
    referral_response = client.post(
        f"/hospitals/{hospital_id}/referrals/{patient_id}/response",
        json={"response": "ACCEPTED"},
    )
    assert referral_response.status_code == 200

    client.headers.update({"X-Demo-Role": "AMBULANCE", "X-Demo-Actor": "Transport Crew"})
    assert client.post("/demo/ambulance/bind", json={"ambulance_id": ambulance_id}).status_code == 200
    client.headers["X-Demo-Resource"] = ambulance_id
    invalid_transition = client.patch(f"/ambulances/{ambulance_id}/status", json={"status": "AT_HOSPITAL"})
    assert invalid_transition.status_code == 409
    premature_pickup = client.post(f"/ambulances/{ambulance_id}/pickup")
    assert premature_pickup.status_code == 409
    for status in ("EN_ROUTE_TO_SCENE", "ON_SCENE"):
        assert client.patch(f"/ambulances/{ambulance_id}/status", json={"status": status}).status_code == 200
    pickup = client.post(f"/ambulances/{ambulance_id}/pickup")
    assert pickup.status_code == 200

    client.headers.update({"X-Demo-Role": "HOSPITAL", "X-Demo-Actor": "Receiving Staff"})
    client.headers["X-Demo-Resource"] = hospital_id
    premature_receipt = client.post(
        f"/patients/{patient_id}/hospital-receipt",
        json={"hospital_id": hospital_id, "actor": "Receiving staff"},
    )
    assert premature_receipt.status_code == 409

    client.headers.update({"X-Demo-Role": "AMBULANCE", "X-Demo-Actor": "Transport Crew"})
    client.headers["X-Demo-Resource"] = ambulance_id
    arrival = client.post(f"/ambulances/{ambulance_id}/arrival")
    assert arrival.status_code == 200
    assert arrival.json()["patient"]["driver_reported_arrival_at"]
    assert arrival.json()["patient"]["hospital_receipt_confirmed_at"] is None
    assert arrival.json()["ambulance"]["status"] == "AT_HOSPITAL"

    client.headers.update({"X-Demo-Role": "HOSPITAL", "X-Demo-Actor": "Receiving Staff"})
    client.headers["X-Demo-Resource"] = hospital_id
    receipt = client.post(
        f"/patients/{patient_id}/hospital-receipt",
        json={"hospital_id": hospital_id, "actor": "Receiving staff"},
    )
    assert receipt.status_code == 200
    assert receipt.json()["patient"]["hospital_receipt_confirmed_at"]
    client.headers.update({"X-Demo-Role": "AMBULANCE", "X-Demo-Actor": "Transport Crew"})
    client.headers["X-Demo-Resource"] = ambulance_id
    released_ambulance = next(unit for unit in client.get("/ambulances").json() if unit["id"] == ambulance_id)
    assert released_ambulance["status"] == "AVAILABLE"


if __name__ == "__main__":
    for test in (
        test_report_review_requires_reason_and_preserves_audit_history,
        test_capacity_values_outside_facility_limits_are_rejected,
        test_driver_arrival_and_hospital_receipt_are_separate_transitions,
    ):
        test()
    print("All focused workflow tests passed.")
