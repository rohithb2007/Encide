"""
MED-NET AI: Real-Time WebSocket Connection & Event Manager
"""

import json
from typing import Any
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    @staticmethod
    def _hospital_summary(hospital: dict[str, Any]) -> dict[str, Any]:
        allowed = {
            "id", "name", "short_code", "total_beds", "available_beds", "total_icu",
            "available_icu", "current_load", "status", "trauma_level", "is_accepting",
            "confirmation_status", "last_updated", "incoming_patients_count",
        }
        return {key: value for key, value in hospital.items() if key in allowed}

    @staticmethod
    def filter_for_connection(message: dict[str, Any], connection: WebSocket) -> dict[str, Any] | None:
        role = getattr(connection.state, "demo_role", "")
        actor = getattr(connection.state, "demo_actor", "")
        resource_id = getattr(connection.state, "demo_resource", "")
        if role == "COORDINATOR":
            return message

        filtered = {
            key: value for key, value in message.items()
            if key in {"event", "incident", "advisories", "advisory", "alert", "alerts", "hospital_id", "alert_id"}
        }
        if role not in {"COORDINATOR", "AMBULANCE"} and isinstance(filtered.get("incident"), dict):
            filtered["incident"] = {
                key: value for key, value in filtered["incident"].items()
                if key not in {"latitude", "longitude"}
            }
        if role in {"REPORTER", "FIELD_RESPONDER"}:
            own_reports = [
                report for report in message.get("reports", [])
                if report.get("source_identifier") == actor
            ]
            report = message.get("report")
            if report and report.get("source_identifier") == actor:
                filtered["report"] = report
            if own_reports:
                filtered["reports"] = own_reports
            if message.get("event") in {"REPORT_ADDED", "REPORT_REVIEWED"} and not own_reports and not (
                report and report.get("source_identifier") == actor
            ):
                return None
            return filtered

        if role == "DRIVER":
            return filtered

        if role == "HOSPITAL":
            if message.get("event") in {"INIT_STATE", "SIMULATION_RESET"}:
                patients = message.get("patients", [])
                filtered["patients"] = [
                    patient for patient in patients
                    if resource_id and patient.get("assigned_hospital_id") == resource_id
                ]
                filtered["hospitals"] = [
                    WebSocketManager._hospital_summary(hospital)
                    for hospital in message.get("hospitals", [])
                    if resource_id and hospital.get("id") == resource_id
                ]
                filtered["assignments"] = [
                    item for item in message.get("assignments", [])
                    if resource_id and item.get("hospital_id") == resource_id
                ]
                return filtered
            hospital_id = message.get("hospital_id")
            if hospital_id and hospital_id != resource_id:
                return None
            patient = message.get("patient")
            if patient and patient.get("assigned_hospital_id") != resource_id:
                return None
            if "patients" in message:
                filtered["patients"] = [
                    item for item in message["patients"] if item.get("assigned_hospital_id") == resource_id
                ]
            if "assignments" in message:
                filtered["assignments"] = [
                    item for item in message["assignments"] if item.get("hospital_id") == resource_id
                ]
            if "hospitals" in message:
                filtered["hospitals"] = [
                    WebSocketManager._hospital_summary(hospital) for hospital in message["hospitals"]
                    if hospital.get("id") == resource_id
                ]
            return filtered

        if role == "AMBULANCE":
            if message.get("event") in {"INIT_STATE", "SIMULATION_RESET"}:
                units = [unit for unit in message.get("ambulances", []) if unit.get("id") == resource_id]
                filtered["ambulances"] = units
                patient_ids = {unit.get("assigned_patient_id") for unit in units}
                filtered["patients"] = [
                    patient for patient in message.get("patients", []) if patient.get("id") in patient_ids
                ]
                destinations = {unit.get("destination_hospital_id") for unit in units}
                filtered["hospitals"] = [
                    hospital for hospital in message.get("hospitals", []) if hospital.get("id") in destinations
                ]
                return filtered
            ambulance = message.get("ambulance")
            if ambulance and ambulance.get("id") != resource_id:
                return None
            if "ambulances" in message:
                filtered["ambulances"] = [
                    item for item in message["ambulances"] if item.get("id") == resource_id
                ]
            patient = message.get("patient")
            if patient and patient.get("assigned_ambulance_id") != resource_id:
                return None
            if "assignment" in message:
                assignment = message["assignment"]
                if assignment.get("ambulance_id") != resource_id:
                    return None
                filtered["assignment"] = assignment
            if patient and patient.get("assigned_ambulance_id") == resource_id:
                filtered["patient"] = patient
            if message.get("hospital") and ambulance and message["hospital"].get("id") == ambulance.get("destination_hospital_id"):
                filtered["hospital"] = WebSocketManager._hospital_summary(message["hospital"])
            return filtered

        if role == "AUTHORITY":
            if "hospitals" in message:
                filtered["hospitals"] = [
                    WebSocketManager._hospital_summary(hospital) for hospital in message["hospitals"]
                ]
            if "ambulances" in message:
                filtered["ambulances"] = [{"status": unit.get("status")} for unit in message["ambulances"]]
            filtered.pop("patients", None)
            filtered.pop("assignments", None)
            filtered.pop("reports", None)
            if "authority_alerts" in message:
                filtered["authority_alerts"] = message["authority_alerts"]
            return filtered

        return None

    async def broadcast(self, message: dict[str, Any]):
        """Broadcasts a JSON-encoded payload to all connected clients."""
        disconnected = []
        for connection in self.active_connections:
            try:
                filtered = self.filter_for_connection(message, connection)
                if filtered is None:
                    continue
                payload_str = json.dumps(filtered)
                await connection.send_text(payload_str)
            except Exception:
                disconnected.append(connection)

        for dead_conn in disconnected:
            self.disconnect(dead_conn)


ws_manager = WebSocketManager()
