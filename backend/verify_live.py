"""
MED-NET AI: Live End-to-End API and Integration Verification Script
"""

import httpx

base = "http://127.0.0.1:8000"
client = httpx.Client(timeout=10.0)

print("===============================================================")
print(" [MED-NET AI] LIVE END-TO-END DEMO FLOW VERIFICATION")
print("===============================================================")

# 1. Health
health = client.get(f"{base}/health").json()
print("1. Health Check:", health)
assert health.get("status") == "ok"

# 2. Reset
client.post(f"{base}/reset")

# 3. Hospitals
hospitals = client.get(f"{base}/hospitals").json()
print(f"2. Initial Regional Hospitals: {len(hospitals)} facilities loaded")
assert len(hospitals) == 7

# 4. Surge
surge = client.post(f"{base}/surge?n=30").json()
print(f"3. Mass Casualty Surge Triggered: {len(surge)} casualties at epicenter")
assert len(surge) == 30

# 5. Assign
assign = client.post(f"{base}/assign").json()
assignments = assign.get("assignments", [])
summary = assign.get("summary", {})
print(f"4. Hungarian Algorithm Assignment: {len(assignments)} casualties routed")
print(f"   - Average Suitability Score: {summary.get('average_score')}")
print(f"   - Average Estimated Transit: {summary.get('average_transit_minutes')} mins")
assert len(assignments) == 30

# 6. Check first assigned patient XAI
first_pat_id = assignments[0]["patient_id"]
exp = client.get(f"{base}/explain/{first_pat_id}").json()
print(f"5. Explainable AI (XAI) for {first_pat_id}:")
print(f"   - Destination: {exp['hospital_name']}")
print(f"   - Score: {exp['score']}")
print(f"   - Justification: {exp['explanation']}")
print(f"   - EMS Protocol: {exp['handoff_summary']['dispatch_protocol']}")
assert len(exp["explanation"]) > 20

# 7. Predictive Alerts
alerts = client.get(f"{base}/alerts").json()
print(f"6. Predictive Saturation Alerts: {len(alerts)} alerts generated")
for a in alerts[:2]:
    print(f"   - {a['hospital_name']}: ~{a['minutes_to_saturation']} min to capacity ({a['severity']})")

# 8. Efficiency Metric
eff = client.get(f"{base}/metrics/efficiency").json()
print(f"7. Routing Efficiency Telemetry:")
print(f"   - Load Balance Improvement: +{eff.get('load_balance_improvement_pct')}%")
print(f"   - Diverted from Overloaded Facilities: {eff.get('naive_overloaded_casualties_prevented')} casualties")
assert eff.get("has_data") is True

# 9. Reset
reset = client.post(f"{base}/reset").json()
print(f"8. Reset Simulation: {reset['message']}")

print("\n===============================================================")
print(" ALL LIVE SIMULATION STEPS VERIFIED WITH 100% SUCCESS!")
print("===============================================================\n")
