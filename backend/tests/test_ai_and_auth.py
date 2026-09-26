import os
import sys
import pytest
import numpy as np

# Add backend to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config import settings
from app.database.database import SessionLocal, Base, engine
from app.database.models import User, Incident, IncidentForwarding
from app.api.auth import get_password_hash, verify_password, seed_default_users
from app.ai.fire_detector import FireSmokeDetector
from app.ai.person_vehicle_detector import PersonVehicleDetector
from app.ai.alert_state_machine import AlertStateMachine

@pytest.fixture(scope="module")
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_default_users(db)
    yield db
    db.close()

def test_user_authentication_and_roles(setup_db):
    db = setup_db
    admin = db.query(User).filter(User.username == "admin").first()
    assert admin is not None
    assert admin.role == "admin"
    assert verify_password("admin123", admin.hashed_password)

    police = db.query(User).filter(User.username == "police").first()
    assert police is not None
    assert police.role == "police"

    fire = db.query(User).filter(User.username == "fireservice").first()
    assert fire is not None
    assert fire.role == "fireservice"

    ambulance = db.query(User).filter(User.username == "ambulance").first()
    assert ambulance is not None
    assert ambulance.role == "ambulance"

def test_fire_model_loading():
    detector = FireSmokeDetector(settings.FIRE_MODEL_PATH)
    assert detector.is_loaded is True
    assert detector.model is not None
    # Classes should be Smoke and Fire
    names = detector.model.names
    assert any("fire" in str(v).lower() for v in names.values())
    assert any("smoke" in str(v).lower() for v in names.values())

def test_strict_false_positive_filtering():
    """
    CRITICAL TEST: Ensure that person/vehicle detections NEVER trigger a fire alert,
    and single-frame or low-confidence candidate detections are rejected by the AlertStateMachine.
    """
    sm = AlertStateMachine()

    # Case 1: Low-confidence fire detection below threshold 0.75 -> REJECTED
    raw_events_low_conf = [{
        "event_type": "FIRE_DETECTED",
        "confidence": 0.45,
        "bbox": [10, 10, 50, 50],
        "source_model": "Fire/Smoke Model"
    }]
    confirmed = sm.evaluate_candidates("CAM-01", raw_events_low_conf)
    assert len(confirmed) == 0
    assert sm.debug_logs[0]["status"] == "REJECTED"

    # Case 2: Person detected -> NEVER fire alert
    raw_events_person = [{
        "event_type": "PERSON_DETECTED",
        "confidence": 0.95,
        "bbox": [20, 20, 100, 200],
        "source_model": "YOLO Person Detector"
    }]
    confirmed = sm.evaluate_candidates("CAM-01", raw_events_person)
    assert not any(e["event_type"] == "FIRE_DETECTED" for e in confirmed)

    # Case 3: High-confidence fire detection requiring 3 consecutive frames
    raw_events_fire = [{
        "event_type": "FIRE_DETECTED",
        "confidence": 0.92,
        "bbox": [50, 50, 120, 120],
        "source_model": "Fire/Smoke Model"
    }]
    # Frame 1 -> Validating (1/3)
    c1 = sm.evaluate_candidates("CAM-02", raw_events_fire)
    assert len(c1) == 0

    # Frame 2 -> Validating (2/3)
    c2 = sm.evaluate_candidates("CAM-02", raw_events_fire)
    assert len(c2) == 0

    # Frame 3 -> CONFIRMED
    c3 = sm.evaluate_candidates("CAM-02", raw_events_fire)
    assert len(c3) == 1
    assert c3[0]["event_type"] == "FIRE_DETECTED"
    assert c3[0]["state"] == "CONFIRMED"
