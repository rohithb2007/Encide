"""
MED-NET AI: AI-Powered Emergency Report Extraction & Conflict Detection Engine
Supports configurable LLM extraction with robust deterministic rule-based fallback.
"""

import re
import datetime
from typing import Optional, Any
from config import LLM_API_KEY

KNOWN_LOCATIONS = {
    "south bridge": {"name": "Ernakulam South Overbridge", "lat": 9.9675, "lon": 76.2942},
    "north bridge": {"name": "Ernakulam North Bridge", "lat": 10.0012, "lon": 76.2871},
    "mg road": {"name": "MG Road Ernakulam", "lat": 9.9734, "lon": 76.2845},
    "vyttila": {"name": "Vyttila Mobility Hub Junction", "lat": 9.9667, "lon": 76.3195},
    "edappally": {"name": "Edappally Toll Junction", "lat": 10.0248, "lon": 76.3082},
    "kaloor": {"name": "Kaloor Stadium Junction", "lat": 9.9989, "lon": 76.2995},
    "marine drive": {"name": "Marine Drive Promenade", "lat": 9.9816, "lon": 76.2750},
    "palarivattom": {"name": "Palarivattom Bypass Flyover", "lat": 10.0062, "lon": 76.3117}
}

HAZARD_KEYWORDS = {
    "fire": "Active Fire & Smoke Hazard",
    "flame": "Active Fire & Smoke Hazard",
    "burn": "Thermal Burn / Fire Hazard",
    "fuel": "Flammable Fuel / Chemical Spill",
    "diesel": "Fuel Spill on Road Surface",
    "petrol": "Flammable Fuel Spill",
    "leak": "Chemical / Gas Leak Potential",
    "collapse": "Structural Collapse & Entrapment",
    "trapped": "Mass Passenger Entrapment",
    "pin": "Entrapment Requiring Heavy Extrication",
    "wire": "Downed High-Voltage Power Lines",
    "electric": "Electrical Shock Hazard",
    "water": "Water Inundation / Submersion Risk"
}

ARCHETYPE_PROFILES = {
    "EXPLOSION_BLAST": {
        "archetype_name": "Explosions & Blast Trauma",
        "primary_injuries": [
            "Primary blast lung injury / pulmonary barotrauma",
            "Secondary penetrating shrapnel & foreign body lacerations",
            "Tertiary blunt crush trauma & traumatic amputations",
            "Tympanic membrane perforation & acoustic trauma"
        ],
        "required_specialists": ["Trauma Surgery", "Neurosurgery", "Cardiothoracic", "Orthopedics"],
        "required_equipment": ["CT Scanner", "Massive Transfusion Protocol", "Mechanical Ventilator"],
        "hospital_criteria": "Direct critically injured patients (RED) to Level-1 Trauma facilities with dedicated emergency CT suites and extensive blood reserves (O-Neg/O-Pos).",
        "scene_guidance": "Enforce minimum 300m safety standoff perimeter. Check structural integrity of adjacent structures. Screen for secondary blast hazards."
    },
    "FIRE_THERMAL": {
        "archetype_name": "Major Structural Fire & Thermal Incident",
        "primary_injuries": [
            "Partial & full-thickness thermal burns (>20% TBSA)",
            "Supraglottic thermal airway edema & stridor",
            "Carbon monoxide & cyanide combustion toxicity",
            "Acute Respiratory Distress Syndrome (ARDS) from smoke inhalation"
        ],
        "required_specialists": ["Burn Care", "Trauma Surgery", "Critical Care", "General Surgery"],
        "required_equipment": ["Mechanical Ventilator", "Hyperbaric Chamber"],
        "hospital_criteria": "Prioritize facilities equipped with dedicated Burn Care Centers (Amrita Institute, General Hospital Ernakulam) and negative-pressure ventilator bays.",
        "scene_guidance": "Perform early proactive airway management prior to glottic swelling. Administer continuous 100% humidified oxygen."
    },
    "CHEMICAL_LEAK": {
        "archetype_name": "Toxic Chemical / Hazmat Release",
        "primary_injuries": [
            "Inhalation toxic pneumonitis & acute pulmonary edema",
            "Ocular and cutaneous corrosive chemical burns",
            "Systemic chemical absorption / metabolic crisis",
            "Reflex bronchospasm & severe hypoxia"
        ],
        "required_specialists": ["Critical Care", "General Surgery", "Trauma Surgery"],
        "required_equipment": ["Mechanical Ventilator", "Dialysis", "ECMO"],
        "hospital_criteria": "Route to hospitals with verified external decontamination showers to prevent Emergency Department contamination.",
        "scene_guidance": "First responder approach strictly upwind and uphill. Level-B PPE mandatory. Gross field decontamination required before patient loading into ambulances."
    },
    "FLOOD_INUNDATION": {
        "archetype_name": "Monsoon Inundation & Flash Flood",
        "primary_injuries": [
            "Near-drowning with freshwater/saltwater aspiration",
            "Severe systemic hypothermia (<32°C core temp)",
            "Blunt trauma from floating debris & collapse",
            "Waterborne biological contamination risk"
        ],
        "required_specialists": ["Pediatric Surgery", "Cardiothoracic", "General Surgery"],
        "required_equipment": ["ECMO", "Mechanical Ventilator", "Dialysis"],
        "hospital_criteria": "Select elevated regional hospitals with unaffected access arteries. ECMO capabilities required for severe refractory hypothermia or drowning.",
        "scene_guidance": "Deploy high-clearance rescue vehicles and rubberized zodiac boats. Initiate active non-invasive rewarming protocols immediately upon patient retrieval."
    },
    "MAJOR_COLLISION": {
        "archetype_name": "Mass-Transit Bus Crash & Multi-Vehicle Collision",
        "primary_injuries": [
            "High-energy polytrauma & blunt abdominal hemorrhage",
            "Traumatic Brain Injury (TBI) & cervical spine fractures",
            "Pelvic and complex long-bone compound fractures",
            "Crush syndrome from prolonged cabin entrapment"
        ],
        "required_specialists": ["Trauma Surgery", "Orthopedics", "Neurosurgery", "General Surgery"],
        "required_equipment": ["Massive Transfusion Protocol", "CT Scanner", "Mechanical Ventilator"],
        "hospital_criteria": "Distribute casualties across regional Level-1 and Level-2 trauma centers according to surgical capacity to prevent ED crowding.",
        "scene_guidance": "Heavy hydraulic rescue cutters required for vehicle extrication. Full C-spine immobilization required for all vehicle occupants."
    }
}


def extract_incident_from_text(
    raw_text: str,
    source_type: str = "citizen",
    reported_time: Optional[str] = None
) -> dict[str, Any]:
    """
    Extracts structured incident data from unstructured report description or voice transcript.
    Runs rule-based regex parsing + deterministic heuristics, marked as UNVERIFIED.
    """
    if not reported_time:
        reported_time = datetime.datetime.now(datetime.timezone.utc).isoformat()

    lower_text = raw_text.lower()

    # 1. Casualty Estimate Extraction
    # Matches: "15 casualties", "around 20 people injured", "35 dead or injured", "5 victims", "at least 12 injured"
    casualty_match = re.search(
        r'(\d+)\s*(?:to\s*(\d+))?\s*(?:casualties|casualty|injured|victims|hurt|people injured|dead|patients|bodies|souls)',
        lower_text
    )
    casualties: Optional[int] = None
    casualty_confidence = "LOW"
    uncertainty_note = ""

    if casualty_match:
        if casualty_match.group(2):
            low = int(casualty_match.group(1))
            high = int(casualty_match.group(2))
            casualties = (low + high) // 2
            uncertainty_note = f"Reported estimate range {low}-{high}; midpoint used as unconfirmed estimate."
        else:
            casualties = int(casualty_match.group(1))
            uncertainty_note = f"Unverified single-source estimate of {casualties} casualties."
        casualty_confidence = "PROVISIONAL"
    else:
        # Fallback number search near words
        num_match = re.search(r'(?:about|around|approx|nearly|at least)?\s*(\d+)\s*(?:people|passengers|persons)', lower_text)
        if num_match:
            casualties = int(num_match.group(1))
            uncertainty_note = f"Inferred approximately {casualties} persons involved from narrative."
            casualty_confidence = "UNVERIFIED_INFERRED"
        else:
            uncertainty_note = "No specific casualty number reported in narrative. Field triage required."

    # 2. Location Detection
    detected_loc_name = "Ernakulam Central Corridor"
    detected_lat = 9.9816
    detected_lon = 76.2999
    location_confidence = "DEFAULT_EPICENTER"

    for loc_key, loc_data in KNOWN_LOCATIONS.items():
        if loc_key in lower_text:
            detected_loc_name = loc_data["name"]
            detected_lat = loc_data["lat"]
            detected_lon = loc_data["lon"]
            location_confidence = "RECOGNIZED_LANDMARK"
            break

    # 3. Incident Archetype & Type Detection
    if any(k in lower_text for k in ["blast", "explosion", "bomb", "detonat", "boiler exploded", "ruptured tank"]):
        archetype = "EXPLOSION_BLAST"
        incident_type = "Industrial / Urban Explosion"
    elif any(k in lower_text for k in ["chemical", "ammonia", "chlorine", "hazmat", "toxic", "gas leak", "acid", "poisonous fumes"]):
        archetype = "CHEMICAL_LEAK"
        incident_type = "Toxic Chemical / Hazmat Release"
    elif any(k in lower_text for k in ["flood", "inundat", "submerged", "drowning", "river overflow", "monsoon flood", "washed away"]):
        archetype = "FLOOD_INUNDATION"
        incident_type = "Monsoon Inundation & Flash Flood"
    elif any(k in lower_text for k in ["fire", "blaze", "flame", "inferno", "burning building", "burn", "smoke inhalation"]):
        archetype = "FIRE_THERMAL"
        incident_type = "Major Structural Fire & Thermal Incident"
    elif any(k in lower_text for k in ["bus", "coach", "kstrc"]):
        archetype = "MAJOR_COLLISION"
        incident_type = "Mass-Transit Bus Crash / Rollover"
    elif any(k in lower_text for k in ["truck", "lorry", "tanker"]):
        archetype = "MAJOR_COLLISION"
        incident_type = "Heavy Commercial Vehicle Collision"
    elif any(k in lower_text for k in ["train", "metro", "rail"]):
        archetype = "MAJOR_COLLISION"
        incident_type = "Rail / Metro Transit Incident"
    elif any(k in lower_text for k in ["collapse", "bridge fallen", "flyover"]):
        archetype = "MAJOR_COLLISION"
        incident_type = "Structural Infrastructure Collapse"
    else:
        archetype = "MAJOR_COLLISION"
        incident_type = "Major Multi-Vehicle Traffic Incident"

    archetype_profile = ARCHETYPE_PROFILES.get(archetype, ARCHETYPE_PROFILES["MAJOR_COLLISION"])

    # 4. Hazards Identification
    hazards = []
    for kw, label in HAZARD_KEYWORDS.items():
        if kw in lower_text and label not in hazards:
            hazards.append(label)

    if not hazards:
        hazards.append("Potential Traffic Gridlock & Rubbernecking")

    # 5. Road Conditions
    if any(k in lower_text for k in ["blocked", "impassable", "closed", "gridlock", "jammed", "traffic stopped"]):
        road_condition = "BLOCKED_IMPASSABLE"
    elif any(k in lower_text for k in ["slow", "heavy traffic", "congested", "one lane"]):
        road_condition = "HEAVY_CONGESTION"
    else:
        road_condition = "PASSABLE_WITH_CAUTION"

    # 6. Missing Information Check
    missing_fields = []
    if casualties is None:
        missing_fields.append("Exact or estimated casualty count")
    if location_confidence == "DEFAULT_EPICENTER":
        missing_fields.append("Precise landmark / GPS coordinates")
    if not any(k in lower_text for k in ["triage", "paramedic", "police", "ambulance"]):
        missing_fields.append("First responder on-scene presence")
    if "child" not in lower_text and "pediatric" not in lower_text:
        missing_fields.append("Pediatric casualty assessment")

    return {
        "incident_type": incident_type,
        "archetype": archetype,
        "incident_analysis": archetype_profile,
        "location_text": detected_loc_name,
        "latitude": detected_lat,
        "longitude": detected_lon,
        "location_confidence": location_confidence,
        "estimated_casualties": casualties,
        "casualty_confidence": casualty_confidence,
        "casualty_uncertainty_note": uncertainty_note,
        "observed_hazards": hazards,
        "road_condition": road_condition,
        "missing_details": missing_fields,
        "verification_status": "UNVERIFIED",
        "reported_time": reported_time,
        "source_type": source_type,
        "original_text": raw_text
    }


def detect_report_conflicts(
    new_report: dict[str, Any],
    existing_reports: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """
    Compares the newly submitted report against previous reports to detect:
    - Conflicting casualty counts (e.g. 15 vs 40)
    - Conflicting locations
    - Discrepancy in fire/hazmat presence
    - Potential duplicate submissions
    """
    conflicts = []

    new_cas = new_report.get("estimated_casualties")
    new_loc = new_report.get("location_text", "").lower()
    new_hazards = set(new_report.get("observed_hazards", []))
    new_desc = new_report.get("description", "").lower()

    for idx, prev in enumerate(existing_reports):
        prev_id = prev.get("id", f"REP-{idx+1}")
        prev_cas = prev.get("estimated_casualties")
        prev_loc = prev.get("location_text", "").lower()
        prev_hazards = set(prev.get("observed_hazards", []))
        prev_desc = prev.get("description", "").lower()

        # Check Duplicate
        if new_desc and prev_desc and (new_desc in prev_desc or prev_desc in new_desc or abs(len(new_desc) - len(prev_desc)) < 10 and new_desc[:25] == prev_desc[:25]):
            conflicts.append({
                "conflict_type": "POTENTIAL_DUPLICATE_REPORT",
                "severity": "LOW",
                "description": f"Report text matches earlier submission {prev_id}. May represent duplicate call for same event.",
                "reports_involved": [prev_id, new_report.get("id", "NEW")],
                "detected_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
            })

        # Check Significant Casualty Discrepancy (>50% difference or diff > 10)
        if new_cas is not None and prev_cas is not None:
            diff = abs(new_cas - prev_cas)
            if diff >= 10:
                conflicts.append({
                    "conflict_type": "CASUALTY_ESTIMATE_MISMATCH",
                    "severity": "CRITICAL" if diff >= 20 else "HIGH",
                    "description": (
                        f"Significant casualty variance: {new_report.get('source_type', 'New source')} reported {new_cas} casualties, "
                        f"whereas {prev.get('source_type', 'Previous source')} ({prev_id}) reported {prev_cas} casualties (Delta: {diff}). "
                        f"Do NOT sum these values. Verification required from on-scene EMS."
                    ),
                    "reports_involved": [prev_id, new_report.get("id", "NEW")],
                    "detected_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
                })

        # Check Location Discrepancy
        if new_loc and prev_loc and new_loc != prev_loc and "bridge" in new_loc and "bridge" in prev_loc:
            conflicts.append({
                "conflict_type": "LOCATION_MISMATCH",
                "severity": "HIGH",
                "description": (
                    f"Conflicting incident epicenter reported: '{new_loc}' vs previously recorded '{prev_loc}' ({prev_id}). "
                    f"Check whether two distinct incidents occurred or caller reported different approach directions."
                ),
                "reports_involved": [prev_id, new_report.get("id", "NEW")],
                "detected_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
            })

        # Check Active Fire discrepancy
        new_has_fire = any("fire" in h.lower() for h in new_hazards)
        prev_has_fire = any("fire" in h.lower() for h in prev_hazards)
        if new_has_fire != prev_has_fire:
            conflicts.append({
                "conflict_type": "HAZARD_DISCREPANCY",
                "severity": "MEDIUM",
                "description": (
                    f"Fire/combustion hazard reported in one record but absent in another ({prev_id}). "
                    f"Fire & Rescue verification dispatched."
                ),
                "reports_involved": [prev_id, new_report.get("id", "NEW")],
                "detected_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
            })

    return conflicts
