"""
MED-NET AI: Configuration & Environment Settings
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env if present
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8001"))

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "*"
]

LLM_API_KEY = os.getenv("LLM_API_KEY", "")
ROUTING_API_KEY = os.getenv("ROUTING_API_KEY", "")

# Default Regional Metro Epicenter (Ernakulam / Kochi, Kerala)
DEFAULT_INCIDENT_LAT = 9.9816
DEFAULT_INCIDENT_LON = 76.2999
DEFAULT_INCIDENT_NAME = "Ernakulam Central Transportation & Industrial Incident"
