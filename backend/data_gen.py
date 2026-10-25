"""
MED-NET AI: Realistic Hospital & Mass Casualty Surge Generator
"""

import random
from typing import Optional
from models import Hospital, Patient, Ambulance, PatientSeverity, HospitalStatus, PatientStatus

# Standard specialist catalog
ALL_SPECIALISTS = [
    "Trauma Surgery",
    "Neurosurgery",
    "Cardiothoracic",
    "Burn Care",
    "Orthopedics",
    "Pediatric Surgery",
    "General Surgery"
]

# Standard equipment catalog
ALL_EQUIPMENT = [
    "Mechanical Ventilator",
    "CT Scanner",
    "ECMO",
    "Dialysis",
    "Massive Transfusion Protocol",
    "Hyperbaric Chamber"
]


def calculate_hospital_status(load: float) -> HospitalStatus:
    if load >= 0.85:
        return HospitalStatus.CRITICAL
    elif load >= 0.65:
        return HospitalStatus.WARNING
    return HospitalStatus.NORMAL


def seed_hospitals() -> list[Hospital]:
    """
    Generates the 8 verified regional hospitals in Ernakulam/Kochi, Kerala
    with their exact physical coordinates, realistic capacities, and specialties.
    Hospital coordinates are fixed physical locations and NEVER randomized.
    """
    raw_hospitals = [
        {
            "id": "H001",
            "name": "Amrita Institute of Medical Sciences",
            "short_code": "AMRITA",
            "latitude": 10.0326403,
            "longitude": 76.2925041,
            "total_beds": 150,
            "available_beds": 38,
            "total_icu": 40,
            "available_icu": 9,
            "specialists": ["Trauma Surgery", "Neurosurgery", "Cardiothoracic", "Burn Care", "Orthopedics", "Pediatric Surgery", "General Surgery"],
            "equipment": ["Mechanical Ventilator", "CT Scanner", "ECMO", "Dialysis", "Massive Transfusion Protocol", "Hyperbaric Chamber"],
            "blood_stock": {"O_NEG": 35, "O_POS": 80, "A_POS": 48, "B_POS": 32, "AB_POS": 16},
            "trauma_level": "Level 1",
            "burn_center": True,
            "pediatric_capable": True
        },
        {
            "id": "H002",
            "name": "Aster Medcity",
            "short_code": "ASTER",
            "latitude": 10.0434755,
            "longitude": 76.2774460,
            "total_beds": 120,
            "available_beds": 42,
            "total_icu": 32,
            "available_icu": 11,
            "specialists": ["Trauma Surgery", "Neurosurgery", "Cardiothoracic", "Orthopedics", "General Surgery"],
            "equipment": ["Mechanical Ventilator", "CT Scanner", "ECMO", "Dialysis", "Massive Transfusion Protocol"],
            "blood_stock": {"O_NEG": 25, "O_POS": 60, "A_POS": 40, "B_POS": 22, "AB_POS": 12},
            "trauma_level": "Level 1",
            "burn_center": False,
            "pediatric_capable": True
        },
        {
            "id": "H003",
            "name": "Lourdes Hospital",
            "short_code": "LOURDES",
            "latitude": 10.0067464,
            "longitude": 76.2773992,
            "total_beds": 95,
            "available_beds": 32,
            "total_icu": 22,
            "available_icu": 7,
            "specialists": ["General Surgery", "Orthopedics", "Cardiothoracic", "Trauma Surgery"],
            "equipment": ["Mechanical Ventilator", "CT Scanner", "Dialysis", "Massive Transfusion Protocol"],
            "blood_stock": {"O_NEG": 18, "O_POS": 42, "A_POS": 35, "B_POS": 18, "AB_POS": 8},
            "trauma_level": "Level 2",
            "burn_center": False,
            "pediatric_capable": False
        },
        {
            "id": "H004",
            "name": "VPS Lakeshore Hospital",
            "short_code": "LAKESHORE",
            "latitude": 9.9189889,
            "longitude": 76.3192057,
            "total_beds": 110,
            "available_beds": 36,
            "total_icu": 28,
            "available_icu": 8,
            "specialists": ["Trauma Surgery", "Neurosurgery", "Cardiothoracic", "General Surgery", "Orthopedics"],
            "equipment": ["Mechanical Ventilator", "CT Scanner", "ECMO", "Dialysis", "Massive Transfusion Protocol"],
            "blood_stock": {"O_NEG": 22, "O_POS": 55, "A_POS": 38, "B_POS": 20, "AB_POS": 10},
            "trauma_level": "Level 1",
            "burn_center": False,
            "pediatric_capable": True
        },
        {
            "id": "H005",
            "name": "Lisie Hospital",
            "short_code": "LISIE",
            "latitude": 9.9880779,
            "longitude": 76.2881663,
            "total_beds": 105,
            "available_beds": 26,
            "total_icu": 24,
            "available_icu": 5,
            "specialists": ["Cardiothoracic", "Trauma Surgery", "General Surgery", "Orthopedics"],
            "equipment": ["Mechanical Ventilator", "CT Scanner", "ECMO", "Dialysis", "Massive Transfusion Protocol"],
            "blood_stock": {"O_NEG": 20, "O_POS": 50, "A_POS": 36, "B_POS": 24, "AB_POS": 10},
            "trauma_level": "Level 2",
            "burn_center": False,
            "pediatric_capable": False
        },
        {
            "id": "H006",
            "name": "General Hospital Ernakulam",
            "short_code": "GH-EKM",
            "latitude": 9.9720127,
            "longitude": 76.2810367,
            "total_beds": 85,
            "available_beds": 18,
            "total_icu": 16,
            "available_icu": 3,
            "specialists": ["General Surgery", "Orthopedics", "Trauma Surgery", "Burn Care"],
            "equipment": ["Mechanical Ventilator", "CT Scanner", "Massive Transfusion Protocol"],
            "blood_stock": {"O_NEG": 12, "O_POS": 30, "A_POS": 25, "B_POS": 15, "AB_POS": 6},
            "trauma_level": "Level 2",
            "burn_center": True,
            "pediatric_capable": False
        },
        {
            "id": "H007",
            "name": "Rajagiri Hospital",
            "short_code": "RAJAGIRI",
            "latitude": 10.0876574,
            "longitude": 76.3883381,
            "total_beds": 130,
            "available_beds": 48,
            "total_icu": 34,
            "available_icu": 14,
            "specialists": ["Trauma Surgery", "Neurosurgery", "Cardiothoracic", "Pediatric Surgery", "General Surgery"],
            "equipment": ["Mechanical Ventilator", "CT Scanner", "ECMO", "Dialysis", "Massive Transfusion Protocol", "Hyperbaric Chamber"],
            "blood_stock": {"O_NEG": 30, "O_POS": 70, "A_POS": 45, "B_POS": 28, "AB_POS": 14},
            "trauma_level": "Level 1",
            "burn_center": False,
            "pediatric_capable": True
        },
        {
            "id": "H008",
            "name": "Medical Trust Hospital",
            "short_code": "MED-TRUST",
            "latitude": 9.9648215,
            "longitude": 76.2873632,
            "total_beds": 95,
            "available_beds": 24,
            "total_icu": 20,
            "available_icu": 4,
            "specialists": ["Trauma Surgery", "Neurosurgery", "Cardiothoracic", "Orthopedics", "General Surgery"],
            "equipment": ["Mechanical Ventilator", "CT Scanner", "Dialysis", "Massive Transfusion Protocol"],
            "blood_stock": {"O_NEG": 16, "O_POS": 44, "A_POS": 32, "B_POS": 18, "AB_POS": 8},
            "trauma_level": "Level 1",
            "burn_center": False,
            "pediatric_capable": False
        }
    ]

    hospitals = []
    for data in raw_hospitals:
        load = (data["total_beds"] - data["available_beds"]) / data["total_beds"]
        status = calculate_hospital_status(load)
        hospitals.append(
            Hospital(
                id=data["id"],
                name=data["name"],
                short_code=data["short_code"],
                latitude=data["latitude"],
                longitude=data["longitude"],
                total_beds=data["total_beds"],
                available_beds=data["available_beds"],
                total_icu=data["total_icu"],
                available_icu=data["available_icu"],
                specialists=data["specialists"],
                equipment=data["equipment"],
                blood_stock=data["blood_stock"],
                current_load=round(load, 3),
                status=status,
                trauma_level=data["trauma_level"],
                burn_center=data["burn_center"],
                pediatric_capable=data["pediatric_capable"],
                is_accepting=True,
                last_updated="2026-09-16T11:00:00Z",
                data_source="STAFF_PORTAL",
                confirmation_status="CONFIRMED",
                incoming_patients_count=0,
                capacity_history=[
                    {
                        "timestamp": "2026-09-16T10:45:00Z",
                        "available_beds": data["available_beds"],
                        "available_icu": data["available_icu"],
                        "updated_by": "Shift Nursing Officer"
                    }
                ]
            )
        )
    return hospitals


def seed_ambulances() -> list[Ambulance]:
    """Generates emergency response units stationed throughout the Ernakulam sector."""
    units = []
    base_lat, base_lon = 9.9816, 76.2999
    capabilities_list = [
        ["ALS", "Mechanical Ventilator", "Massive Transfusion Protocol"],
        ["ALS", "Pediatric Capable", "Defibrillator"],
        ["BLS", "Spinal Immobilization", "Oxygen"],
        ["ALS", "ECMO Mobile", "Ventilator"],
        ["ALS", "Bariatric Transport", "Oxygen"],
        ["BLS", "Basic Triage Kit", "AED"],
        ["ALS", "Trauma Surgical Kit", "Ventilator"],
        ["ALS", "Burn Specialized", "Oxygen"],
        ["BLS", "Rapid Transport", "AED"],
        ["ALS", "Critical Care Transport", "Ventilator"]
    ]
    for i in range(1, 11):
        lat = base_lat + random.uniform(-0.04, 0.04)
        lon = base_lon + random.uniform(-0.04, 0.04)
        units.append(
            Ambulance(
                id=f"AMB-{i:02d}",
                unit_number=f"EMS-EKM-{i:02d}",
                status="AVAILABLE",
                current_latitude=round(max(9.85, min(10.15, lat)), 5),
                current_longitude=round(max(76.15, min(76.45, lon)), 5),
                capabilities=capabilities_list[i - 1],
                transport_progress_pct=0,
                last_status_update="2026-09-16T11:00:00Z"
            )
        )
    return units


def seed_initial_reports() -> list[dict]:
    """Generates initial realistic intake reports for demonstration."""
    return [
        {
            "id": "REP-001",
            "incident_id": "INC-2026-EKM-01",
            "reported_time": "2026-09-16T10:58:12Z",
            "source_type": "citizen",
            "location_text": "Ernakulam South Overbridge",
            "latitude": 9.9675,
            "longitude": 76.2942,
            "description": "Multi-axle passenger bus rolled over after collision with cargo truck near South Bridge. Heavy damage, approximately 15 to 20 passengers injured, passengers trapped inside. Fuel leak noticed.",
            "estimated_casualties": 18,
            "observed_hazards": ["Flammable Fuel / Chemical Spill", "Mass Passenger Entrapment"],
            "road_conditions": "BLOCKED_IMPASSABLE",
            "notes": "Passersby attempting initial assistance. Heavy traffic backing up.",
            "verification_status": "UNVERIFIED",
            "is_simulated_call": False,
            "extracted_data": {
                "incident_type": "Mass-Transit Bus Crash / Rollover",
                "location_text": "Ernakulam South Overbridge",
                "estimated_casualties": 18,
                "casualty_uncertainty_note": "Reported estimate range 15-20; midpoint 18 used as unconfirmed estimate.",
                "observed_hazards": ["Flammable Fuel / Chemical Spill", "Mass Passenger Entrapment"],
                "road_condition": "BLOCKED_IMPASSABLE",
                "missing_details": ["Exact count by triage category", "First responder on-scene confirmation"]
            }
        }
    ]


def seed_initial_advisories() -> list[dict]:
    """Generates initial public traffic advisories."""
    return [
        {
            "id": "ADV-001",
            "road_name": "Ernakulam South Overbridge (Both Directions)",
            "status": "CONFIRMED_CLOSED",
            "hazard_description": "Major multi-vehicle accident with active emergency response and hazardous fuel spill. Preserving emergency vehicle corridor.",
            "suggested_detour": "Use Subhash Chandra Bose Road or MG Road via Jos Junction. Divert heavy vehicles to NH-66 bypass.",
            "start_coordinates": [9.9690, 76.2920],
            "end_coordinates": [9.9660, 76.2965],
            "published_by": "Emergency Operations Coordinator",
            "published_at": "2026-09-16T11:02:00Z",
            "is_published": True,
            "verification_level": "CONFIRMED"
        }
    ]


def seed_initial_alerts() -> list[dict]:
    """Generates initial authority alerts."""
    return [
        {
            "id": "ALT-001",
            "incident_id": "INC-2026-EKM-01",
            "priority": "CRITICAL",
            "alert_type": "MAJOR_INCIDENT",
            "title": "Mass-Casualty Incident Declared (Code Red)",
            "description": "Major bus rollover with multiple trapped casualties at Ernakulam South Bridge. Initial casualty estimate: 15-20.",
            "trigger": "Multi-Source Intake Verification",
            "source": "MED-NET Central Intake",
            "timestamp": "2026-09-16T11:01:00Z",
            "recipient_role": "POLICE",
            "recommended_action": "Establish 500m cordon around South Bridge, clear green corridor for ambulances along MG Road and SA Road.",
            "status": "ACKNOWLEDGED",
            "is_simulated_external": True,
            "history": [
                {"timestamp": "2026-09-16T11:01:00Z", "action": "ALERT_TRIGGERED", "actor": "MED-NET AI"},
                {"timestamp": "2026-09-16T11:03:00Z", "action": "ACKNOWLEDGED", "actor": "Ernakulam Traffic Police HQ"}
            ]
        },
        {
            "id": "ALT-002",
            "incident_id": "INC-2026-EKM-01",
            "priority": "HIGH",
            "alert_type": "CRITICAL_HAZARD",
            "title": "Fuel Spill & Hydraulic Extrication Required",
            "description": "Diesel fuel on roadway and passengers pinned under vehicle chassis. Fire suppression and heavy hydraulic cutters requested.",
            "trigger": "Hazard Extraction from First Responder Intake",
            "source": "Field Emergency Report",
            "timestamp": "2026-09-16T11:02:30Z",
            "recipient_role": "FIRE_RESCUE",
            "recommended_action": "Dispatch 2x Fire Tender units and Heavy Rescue Tender from Gandhinagar Fire Station.",
            "status": "NEW",
            "is_simulated_external": True,
            "history": [
                {"timestamp": "2026-09-16T11:02:30Z", "action": "ALERT_TRIGGERED", "actor": "MED-NET AI"}
            ]
        }
    ]


def generate_patient(
    index: int,
    incident_lat: float = 9.9816,
    incident_lon: float = 76.2999,
    incident_id: str = "INC-2026-EKM-01"
) -> Patient:
    """
    Generates a realistic field casualty in Ernakulam/Kochi with START triage acuity,
    injury mechanisms, vital signs, and specialist/resource requirements.
    Casualties share the reported incident location until an individual field
    position is recorded. They are not unrelated cases scattered across the city.
    """
    # Realistic START Triage Acuity distribution:
    # ~20% RED (Immediate), ~35% YELLOW (Delayed), ~35% GREEN (Minor), ~10% BLACK (Expectant)
    roll = random.random()
    if roll < 0.20:
        severity = PatientSeverity.RED
        urgency_mins = random.randint(15, 45)
        spec = random.choice(["Trauma Surgery", "Neurosurgery", "Cardiothoracic", "Burn Care", "Pediatric Surgery"])
        equip = random.choice(["Mechanical Ventilator", "Massive Transfusion Protocol", "ECMO", "CT Scanner"])
        blood = random.choice(["O_NEG", "O_NEG", "O_POS"])
        mechanism = random.choice(["blast_primary", "penetrating_trauma", "thermal_burn", "chemical_cbrn"])
        vitals = {
            "rr": random.randint(32, 48),
            "hr": random.randint(125, 160),
            "sbp": random.randint(70, 88),
            "spo2": random.randint(82, 89),
            "gcs": random.randint(6, 10)
        }
    elif roll < 0.55:
        severity = PatientSeverity.YELLOW
        urgency_mins = random.randint(60, 180)
        spec = random.choice(["Orthopedics", "General Surgery", "Trauma Surgery"])
        equip = random.choice(["CT Scanner", "None", "None"])
        blood = random.choice(["NONE", "NONE", "O_POS"])
        mechanism = random.choice(["blunt_trauma", "blast_secondary", "blast_tertiary"])
        vitals = {
            "rr": random.randint(20, 26),
            "hr": random.randint(90, 115),
            "sbp": random.randint(105, 130),
            "spo2": random.randint(93, 97),
            "gcs": random.randint(13, 15)
        }
    elif roll < 0.90:
        severity = PatientSeverity.GREEN
        urgency_mins = random.randint(240, 480)
        spec = "General Surgery"
        equip = "None"
        blood = "NONE"
        mechanism = random.choice(["blast_secondary", "blunt_trauma"])
        vitals = {
            "rr": random.randint(14, 20),
            "hr": random.randint(70, 90),
            "sbp": random.randint(115, 135),
            "spo2": random.randint(97, 100),
            "gcs": 15
        }
    else:
        severity = PatientSeverity.BLACK
        urgency_mins = 0
        spec = "General Surgery"
        equip = "None"
        blood = "NONE"
        mechanism = "blast_primary"
        vitals = {"rr": 0, "hr": 0, "sbp": 0, "spo2": 0, "gcs": 3}

    lat, lon = incident_lat, incident_lon

    age = random.choice([
        random.randint(4, 12),   # Pediatric
        random.randint(18, 50),  # Adult
        random.randint(18, 50),
        random.randint(55, 78)   # Geriatric
    ])

    return Patient(
        id=f"PAT-{index:03d}",
        severity=severity,
        latitude=round(lat, 5),
        longitude=round(lon, 5),
        required_specialist=spec,
        required_equipment=equip,
        blood_requirement=blood,
        status=PatientStatus.WAITING,
        assigned_hospital_id=None,
        incident_id=incident_id,
        age=age,
        gender=random.choice(["male", "female"]),
        mechanism=mechanism,
        vitals=vitals,
        urgency_minutes=urgency_mins
    )


def generate_surge(
    n: int = 30,
    incident_lat: float = 9.9816,
    incident_lon: float = 76.2999,
    incident_id: str = "INC-2026-EKM-01"
) -> list[Patient]:
    """Generates a batch of n patients for a mass casualty incident in Ernakulam."""
    return [
        generate_patient(i + 1, incident_lat, incident_lon, incident_id)
        for i in range(n)
    ]
