# MED-NET AI: Intelligent Emergency Coordination Platform

[![Platform](https://img.shields.io/badge/Platform-MED--NET%20AI-rose?style=for-the-badge&logo=mednet)](https://github.com/)
[![Optimization](https://img.shields.io/badge/Algorithm-Hungarian%20(Linear%20Sum%20Assignment)-indigo?style=for-the-badge)](https://scipy.org/)
[![Standards](https://img.shields.io/badge/Standards-HL7%20FHIR%20R4%20MCI-cyan?style=for-the-badge)](https://hl7.org/fhir/)
[![Multi--Agency](https://img.shields.io/badge/Coordination-EMS%20%7C%20Police%20%7C%20Fire%20%7C%20Public-emerald?style=for-the-badge)](https://github.com/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue?style=for-the-badge)](LICENSE)

---

## 🚨 Executive Summary

During a mass casualty incident (MCI) or regional disaster, standard emergency logistics often fail because emergency response units instinctively transport casualties to the nearest hospital. This causes **secondary collapse**: the nearest facility is rapidly overwhelmed within minutes, resulting in zero available ICU beds and critical surgery delays, while nearby regional hospitals sit with available trauma bays, surgical teams, ventilators, and blood inventory.

**MED-NET AI** is a unified emergency coordination platform connecting:
1. **Emergency Intake & Citizens**: Ingests citizen, 112 phone operator, and field responder reports; extracts structured incident facts via AI, and detects multi-report casualty discrepancies.
2. **Hospitals & Clinicians**: Real-time hospital portal to adjust bed/ICU capacity, toggle acceptance, view freshness indicators, and log audit history.
3. **Ambulance Coordination**: Live fleet tracking with state transitions (`AVAILABLE`, `ASSIGNED`, `EN_ROUTE_TO_SCENE`, `ON_SCENE`, `TRANSPORTING`, `AT_HOSPITAL`), pickup verification, and hospital handover.
4. **Emergency Authorities**: Prioritized alerts for Police, Fire & Rescue, Traffic Police, and Health Directorate with acknowledgment workflows.
5. **Public Driver Guidance**: Privacy-safe traffic advisories with affected road closures and detours to keep emergency access routes clear (no patient PII).
6. **Continuous Replanning**: Autonomous change-detection engine that flags disrupted assignments (e.g. facility closure or route blockage) and proposes alternatives for coordinator approval.
7. **Unified Operational Reporting**: Comprehensive multi-agency incident reports with audit trails, casualty accounting (uncertainty range vs confirmed counts), and CSV export.

---

## ⚡ Quick Start & Verification

### Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js 18+ & npm 9+

### 1. Launch Backend API (Port 8001 / 8000)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```
*Backend runs at:* `http://localhost:8001` (Interactive Swagger docs at `http://localhost:8001/docs`)

### 2. Launch Tactical Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs at:* `http://localhost:5173`

### 3. Run All Test Suites
```bash
# 1. Backend Engine & Routing Algorithm Tests (4/4 Suites)
cd backend && py test_engine.py

# 2. Advanced Multi-Agency Coordination & Scenario Tests (13/13 Suites)
cd backend && py test_coordination.py

# 3. Frontend Production Build & TypeScript Typecheck
cd frontend && npm run build

# 4. HL7 FHIR R4 & Zod Schema Validation (52/52 Tests)
cd .. && npm test
```

---

## 🎮 11-Step Interactive Demonstration Scenario (Bus Crash at South Bridge)

The platform includes a 1-click step-by-step interactive scenario runner on the Command Dashboard:
1. **Initial Bus Crash Report**: Citizen submits report of bus rollover at Ernakulam South Bridge (~18 casualties).
2. **AI Fact Extraction**: AI extracts location, hazard labels (fuel leak, entrapment), and labels casualty count as `UNVERIFIED`.
3. **Conflicting Phone Report**: 112 call operator reports 38 casualties and fire. Multi-report variance conflict alert triggered.
4. **Hospital Readiness Review**: Inspect regional bed headroom, ICU reserves, and data freshness badges across 8 facilities.
5. **Feasible Allocations**: Hungarian optimization pairs casualties with capable trauma centers and available ambulances.
6. **Coordinator Approvals**: Coordinator reviews clinical justifications, distance ETAs, and approves proposed assignments.
7. **Escalations & Advisories**: Authority alerts dispatched to Police/Fire and public driver advisory published for South Bridge.
8. **Capacity Disruption Injected**: Amrita Hospital ICU reaches 0 capacity and marks status to `NOT ACCEPTING`.
9. **Continuous Monitoring & Replanning**: Replanning engine flags affected casualties and proposes alternative capable trauma centers.
10. **Reroute to Alternatives**: Coordinator approves rerouting to Aster Medcity and Lakeshore Hospital without chaos.
11. **Unified Operational Report**: Generates complete incident dossier with casualty accounting, audit logs, and CSV download.

---

## 🧮 Mathematical Optimization Engine

MED-NET AI models disaster casualty distribution as a **global minimum-cost bipartite matching problem** solved in polynomial time $O((P+C)^3)$ via the Kuhn-Munkres (Hungarian) algorithm:

$$\min \sum_{i=1}^{N} \sum_{j=1}^{M} C_{i,j} \cdot X_{i,j}$$

Subject to:
$$\sum_{j=1}^{M} X_{i,j} \le 1 \quad \forall i \in \{1, \dots, N\} \quad \text{(each patient matched to at most 1 slot)}$$
$$\sum_{i=1}^{N} X_{i,j} \le 1 \quad \forall j \in \{1, \dots, M\} \quad \text{(each hospital slot receives at most 1 patient)}$$
$$X_{i,j} \in \{0, 1\}$$

Where each hospital $H_k$ is expanded into $B_k = \text{available\_beds}$ discrete capacity slots.

### Multi-Factor Pair Scoring Function $S(p, h)$
$$S(p, h) = w_{\text{icu}} S_{\text{icu}} + w_{\text{spec}} S_{\text{spec}} + w_{\text{res}} S_{\text{res}} + w_{\text{dist}} S_{\text{dist}} + w_{\text{load}} S_{\text{load}} - \lambda P_{\text{sat}}$$

- **RED Patients (Immediate)**: Prioritize ICU guarantee ($w_{\text{icu}} = 0.25$), Surgical Specialists ($w_{\text{spec}} = 0.25$), and Blood/Equipment ($w_{\text{res}} = 0.20$).
- **GREEN Patients (Minor)**: Prioritize General Bed Reserves ($w_{\text{cap}} = 0.35$) and Load Balance ($w_{\text{load}} = 0.35$) to keep Level 1 Trauma bays clear.

Cost in the Hungarian cost matrix is defined as:
$$C_{i,j} = 100 \cdot (1.0 - S(p_i, h_j))$$
*Hard constraint enforcement: If a hospital has 0 available ICU beds, $C_{i,j} = 100,000$ for RED patients.*

---

## ⏱ 3-Minute Hackathon Demo Script

1. **Baseline Network Inspection (0:00 - 0:45)**
   - Open `http://localhost:5173`.
   - Show the connection indicator: `BACKEND CONNECTED` & `MESH SYNC: LIVE`.
   - Review the regional map: 7 hospitals displaying live bed and ICU capacities.
   - Click **Metro Central Trauma Center** to inspect the bed occupancy, staffed surgical specialists, equipment, and blood stock.

2. **Trigger Mass Casualty Surge (0:45 - 1:30)**
   - Click **TRIGGER MASS CASUALTY SURGE (+30)**.
   - A cluster of color-coded casualty pins appears around the disaster ground zero.
   - Point out the START Triage counters: RED, YELLOW, GREEN, and BLACK.
   - Emphasize that all 30 casualties are currently in `WAITING` status.

3. **Execute Hungarian Optimization (1:30 - 2:15)**
   - Click **OPTIMIZE PATIENT ROUTING**.
   - Dynamic color-coded assignment vectors connect each patient to their optimal destination hospital.
   - Hospital loads update instantly via WebSocket broadcast.
   - Point out the **Predictive Saturation Warning**: facilities trending toward capacity show dynamic warnings (e.g. `~14 MIN TO CAPACITY`).

4. **Explainable AI (XAI) & EMS Handoff (2:15 - 2:45)**
   - Click an assigned **RED patient marker**.
   - Review **WHY THIS HOSPITAL?**:
     - See the itemized factor breakdown bars (Specialist, ICU, Distance, Load Balance, Resources).
     - Read the clinical narrative justifying why the patient bypassed the nearest saturated facility for a farther capable trauma center.
   - Review the **EMS Patient Handoff Summary** showing transport code, ETA, destination trauma tier, and blood requirement.

5. **Routing Efficiency & Reset (2:45 - 3:00)**
   - Point out the **ROUTING EFFICIENCY METRIC**:
     - `+38.5% REGIONAL LOAD BALANCE GAIN`
     - Number of casualties diverted from overloaded hospitals.
   - Click **RESET SIMULATION** to restore the network to initial calm status.

---

## 📡 Available API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | System health check (`{"status": "ok"}`) |
| `GET` | `/hospitals` | Telemetry for all monitored regional hospitals |
| `GET` | `/patients` | Active disaster casualties in memory |
| `POST` | `/surge?n=30` | Generates $n$ disaster casualties around incident |
| `POST` | `/assign` | Runs Hungarian Algorithm batch optimization |
| `GET` | `/alerts` | Predictive capacity saturation warnings |
| `GET` | `/explain/{patient_id}` | XAI routing explanation & EMS handoff summary |
| `GET` | `/metrics/efficiency` | Load variance comparison vs. naive routing |
| `POST` | `/reset` | Restores hospitals and clears simulation state |
| `WS` | `/ws` | Real-time WebSocket event & telemetry bus |

---

## 🛡 Medical Logistics Disclaimer & Ethics

This software is an emergency logistics research prototype developed for hackathon demonstration. It simulates mass casualty incident (MCI) transport routing and bed load-balancing under severe disaster constraints. It is **not** an autonomous medical decision-maker and does not provide clinical diagnosis or patient triage. All dispatch orders require human Incident Commander verification.
