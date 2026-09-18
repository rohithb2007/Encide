# MED-NET AI: Dynamic Disaster Casualty Routing & Regional Hospital Load-Balancing AI Platform

[![Platform](https://img.shields.io/badge/Platform-MED--NET%20AI-rose?style=for-the-badge&logo=mednet)](https://github.com/)
[![Optimization](https://img.shields.io/badge/Algorithm-Hungarian%20(Linear%20Sum%20Assignment)-indigo?style=for-the-badge)](https://scipy.org/)
[![Standards](https://img.shields.io/badge/Standards-HL7%20FHIR%20R4%20MCI-cyan?style=for-the-badge)](https://hl7.org/fhir/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue?style=for-the-badge)](LICENSE)

---

## 🚨 Executive Summary

During a mass casualty incident (MCI) or regional disaster, standard emergency logistics often fail because emergency response units instinctively transport casualties to the nearest hospital. This causes **secondary collapse**: the nearest facility is rapidly overwhelmed within minutes, resulting in zero available ICU beds and critical surgery delays, while nearby regional hospitals sit with available trauma bays, surgical teams, ventilators, and blood inventory.

**MED-NET AI** is a resilient emergency-response command platform that dynamically balances casualty routing across an entire regional healthcare network. Rather than relying on simple nearest-neighbor heuristics, MED-NET AI solves a multi-variable global bipartite matching problem using the **Hungarian Algorithm** (`scipy.optimize.linear_sum_assignment`), balancing:
1. **Patient Acuity (START Triage)**: Immediate (RED), Delayed (YELLOW), Minor (GREEN), Expectant (BLACK)
2. **Specialized Surgical Coverage**: Trauma, Neurosurgery, Cardiothoracic, Burn Care, Pediatric Surgery
3. **Critical Resource Alignment**: Mechanical Ventilators, CT Scanners, ECMO, Universal O-neg Blood
4. **ICU & General Bed Reserve Capacity**: Preserving critical resuscitation reserves
5. **Predictive Capacity Saturation**: Forecasting minutes-to-saturation to avert secondary facility collapse
6. **Travel Distance & Real-Time Transit Speeds**: Urban emergency response transit time modeling

---

## 🏛 System Architecture

```mermaid
flowchart TB
    subgraph Field[Disaster Field & Triage Scene]
        C1["Casualty Triaged (START Acuity)"]
        Epicenter["MCI Epicenter"]
        EMS["Emergency Response Units (EMS)"]
    end

    subgraph Backend[MED-NET AI Regional Engine (Python FastAPI)]
        DataGen["Surge & Regional Seed Generator"]
        SatEngine["Predictive Saturation Forecaster"]
        Hungarian["Hungarian Optimization Engine (SciPy)"]
        XAI["Explainability & Handoff Synthesizer"]
        WS["WebSocket Telemetry Bus"]
    end

    subgraph HospitalNetwork[Regional Healthcare Facilities]
        H1["Level 1 Trauma Center (High ICU/Burn)"]
        H2["Academic Medical Center (Neurosurgery)"]
        H3["Pediatric Trauma Pavilion"]
        H4["Regional Level 2 Hospital"]
        H5["Community Acute Care"]
    end

    subgraph CommandUI[Tactical Command Dashboard (React + Leaflet)]
        Map["Tactical Incident Map"]
        Gauges["Regional Bed Occupancy Gauges"]
        Alerts["Predictive Saturation Badges"]
        Handoff["EMS Patient Handoff Summary"]
        EffMetric["Routing Efficiency Telemetry"]
    end

    Field -->|Live Casualty Stream| DataGen
    HospitalNetwork -->|Capacity Telemetry| SatEngine
    DataGen --> Hungarian
    SatEngine -->|Saturation Penalty| Hungarian
    Hungarian -->|Bipartite Assignments| XAI
    Hungarian --> WS
    WS --> CommandUI
    XAI --> CommandUI
```

---

## ⚡ Quick Start

### Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js 18+ & npm 9+

### 1. Launch Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
*Backend runs at:* `http://localhost:8000` (API documentation at `http://localhost:8000/docs`)

### 2. Launch Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs at:* `http://localhost:5173`

### 3. Verify Reference TypeScript & FHIR Schemas (Optional)
```bash
npm test
# Runs 50/50 test suite validating FHIR R4 disaster profiles, Zod schemas, converters, and mesh sync envelopes
```

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
