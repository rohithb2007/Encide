from types import SimpleNamespace

from fastapi.testclient import TestClient

from main import app
from websocket_manager import WebSocketManager


COORDINATOR = {"X-Demo-Role": "COORDINATOR", "X-Demo-Actor": "Test Coordinator"}


def _client() -> TestClient:
    client = TestClient(app, headers=COORDINATOR)
    assert client.post("/reset").status_code == 200
    return client


def _set_context(client: TestClient, role: str, actor: str, resource: str = "") -> None:
    client.headers.update({
        "X-Demo-Role": role,
        "X-Demo-Actor": actor,
        "X-Demo-Resource": resource,
    })


def test_operational_reads_and_mutations_require_permitted_demo_context():
    client = TestClient(app)
    assert client.get("/patients").status_code == 401
    assert client.get("/incidents").status_code == 401
    assert client.post("/reset").status_code == 401

    client.headers.update({"X-Demo-Role": "REPORTER", "X-Demo-Actor": "Reporter One"})
    assert client.get("/patients").status_code == 403
    assert client.post("/reset").status_code == 403


def test_authority_rest_reads_are_aggregate_only():
    client = _client()
    assert client.post("/surge?n=1").status_code == 200
    _set_context(client, "AUTHORITY", "Authority One")

    hospitals = client.get("/hospitals").json()
    ambulances = client.get("/ambulances").json()
    incident = client.get("/incidents").json()[0]
    assert hospitals and all("latitude" not in hospital and "longitude" not in hospital for hospital in hospitals)
    assert ambulances and all(set(unit) == {"status"} for unit in ambulances)
    assert "latitude" not in incident and "longitude" not in incident
    assert client.get("/patients").status_code == 403
    assert client.get("/metrics/efficiency").status_code == 200


def test_hospital_capacity_mutation_requires_bound_facility_context():
    client = _client()
    _set_context(client, "HOSPITAL", "Hospital One")
    directory = client.get("/hospitals").json()
    assert directory and all(set(hospital) == {"id", "name", "short_code"} for hospital in directory)
    assert client.post("/demo/hospital/bind", json={"hospital_id": "H001"}).status_code == 200
    scoped_hospitals = client.get("/hospitals").json()
    assert len(scoped_hospitals) == 1 and scoped_hospitals[0]["id"] == "H001"
    assert "latitude" in scoped_hospitals[0]

    _set_context(client, "HOSPITAL", "Hospital One", "H002")
    wrong_facility = client.put("/hospitals/H002/capacity", json={"available_beds": 5})
    assert wrong_facility.status_code == 403

    _set_context(client, "HOSPITAL", "Hospital One", "H001")
    valid_facility = client.put("/hospitals/H001/capacity", json={"available_beds": 5})
    assert valid_facility.status_code == 200


def test_ambulance_portal_roster_hides_other_unit_telemetry():
    client = _client()
    _set_context(client, "AMBULANCE", "Ambulance One")
    roster = client.get("/ambulances").json()
    assert roster and all(set(unit) == {"id", "unit_number"} for unit in roster)
    assert client.get("/hospitals").json() == []

    ambulance_id = roster[0]["id"]
    assert client.post("/demo/ambulance/bind", json={"ambulance_id": ambulance_id}).status_code == 200
    scoped_units = client.get("/ambulances").json()
    assert len(scoped_units) == 1 and scoped_units[0]["id"] == ambulance_id
    assert "current_latitude" in scoped_units[0]


def test_hospital_alert_acknowledgement_does_not_accept_referral():
    client = _client()
    assert client.post("/surge?n=1").status_code == 200
    proposals = client.post("/recommendations/generate").json()["proposals"]
    assert proposals
    patient_id = proposals[0]["patient_id"]
    approved = client.post(f"/recommendations/{patient_id}/approve", json={})
    assert approved.status_code == 200
    hospital_id = approved.json()["patient"]["assigned_hospital_id"]

    _set_context(client, "HOSPITAL", "Hospital One")
    assert client.post("/demo/hospital/bind", json={"hospital_id": hospital_id}).status_code == 200
    _set_context(client, "HOSPITAL", "Hospital One", hospital_id)
    assert client.put(f"/hospitals/{hospital_id}/capacity", json={"available_beds": 0}).status_code == 200

    inbox = client.get(f"/hospitals/{hospital_id}/alerts").json()
    referral = next(item for item in inbox["referrals"] if item["patient_id"] == patient_id)
    assert referral["status"] == "PENDING"
    alert_id = inbox["incident_alert"]["id"]
    assert client.post(f"/hospitals/{hospital_id}/alerts/{alert_id}/ack").status_code == 200
    after_ack = client.get(f"/hospitals/{hospital_id}/alerts").json()
    assert next(item for item in after_ack["referrals"] if item["patient_id"] == patient_id)["status"] == "PENDING"

    response = client.post(
        f"/hospitals/{hospital_id}/referrals/{patient_id}/response",
        json={"response": "ACCEPTED"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ACCEPTED"


def test_rejected_referral_releases_reservation_and_ambulance():
    client = _client()
    client.post("/surge?n=1")
    proposal = client.post("/recommendations/generate").json()["proposals"][0]
    patient_id = proposal["patient_id"]
    approved = client.post(f"/recommendations/{patient_id}/approve", json={})
    assert approved.status_code == 200
    patient = approved.json()["patient"]
    hospital_id = patient["assigned_hospital_id"]
    ambulance_id = patient["assigned_ambulance_id"]

    _set_context(client, "HOSPITAL", "Rejecting Facility")
    assert client.post("/demo/hospital/bind", json={"hospital_id": hospital_id}).status_code == 200
    _set_context(client, "HOSPITAL", "Rejecting Facility", hospital_id)
    rejected = client.post(
        f"/hospitals/{hospital_id}/referrals/{patient_id}/response",
        json={"response": "REJECTED"},
    )
    assert rejected.status_code == 200

    _set_context(client, "COORDINATOR", "Test Coordinator")
    current_patient = next(item for item in client.get("/patients").json() if item["id"] == patient_id)
    current_ambulance = next(item for item in client.get("/ambulances").json() if item["id"] == ambulance_id)
    assert current_patient["status"] == "WAITING"
    assert current_patient["assigned_hospital_id"] is None
    assert current_patient["assigned_ambulance_id"] is None
    assert current_ambulance["status"] == "AVAILABLE"
    assert patient_id in {
        item["patient_id"] for item in client.post("/recommendations/generate").json()["proposals"]
    }


def test_reporter_history_is_limited_to_matching_demo_actor():
    client = _client()
    incident_id = client.get("/incidents").json()[0]["id"]
    for actor, description in (("Reporter One", "First report"), ("Reporter Two", "Second report")):
        _set_context(client, "REPORTER", actor)
        submitted = client.post(
            f"/incidents/{incident_id}/reports",
            json={"source_type": "citizen", "location_text": "Scene", "description": description},
        )
        assert submitted.status_code == 200

    _set_context(client, "REPORTER", "Reporter One")
    own_reports = client.get("/reporter/reports").json()
    assert len(own_reports) == 1
    assert own_reports[0]["source_identifier"] == "Reporter One"


def test_websocket_role_filters_remove_global_reports_and_patient_data():
    hospital_socket = SimpleNamespace(state=SimpleNamespace(
        demo_role="HOSPITAL", demo_actor="Hospital One", demo_resource="H001"
    ))
    message = {
        "event": "HOSPITAL_UPDATED",
        "hospital_id": "H001",
        "hospital": {"id": "H001", "name": "Hospital One", "latitude": 1.0},
        "hospitals": [
            {"id": "H001", "name": "Hospital One", "latitude": 1.0},
            {"id": "H002", "name": "Hospital Two", "latitude": 2.0},
        ],
        "reports": [{"id": "REP-1", "description": "Sensitive global report"}],
        "patients": [{"id": "PAT-1", "assigned_hospital_id": "H001"}],
    }
    hospital_payload = WebSocketManager.filter_for_connection(message, hospital_socket)
    assert hospital_payload is not None
    assert "reports" not in hospital_payload
    assert [item["id"] for item in hospital_payload["hospitals"]] == ["H001"]
    assert "latitude" not in hospital_payload["hospitals"][0]

    authority_socket = SimpleNamespace(state=SimpleNamespace(
        demo_role="AUTHORITY", demo_actor="Authority One", demo_resource=""
    ))
    authority_payload = WebSocketManager.filter_for_connection({
        "event": "INIT_STATE",
        "incident": {"name": "Incident", "latitude": 1.0, "longitude": 2.0},
        "patients": [{"id": "PAT-1"}],
        "reports": [{"id": "REP-1"}],
    }, authority_socket)
    assert authority_payload is not None
    assert "patients" not in authority_payload
    assert "reports" not in authority_payload
    assert "latitude" not in authority_payload["incident"]
