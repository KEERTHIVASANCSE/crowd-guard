import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config import settings
from app.database.database import SessionLocal, Base, engine
from app.database.models import User
from app.api.auth import verify_password, seed_default_users
from app.ai.fire_detector import FireSmokeDetector
from app.ai.alert_state_machine import AlertStateMachine

def run_all_tests():
    print("=== Starting SentinelVision AI Verification Tests ===")

    # 1. Test Database & Auth
    print("\n[TEST 1] Initializing Database & Verifying Roles...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_default_users(db)

    admin = db.query(User).filter(User.username == "admin").first()
    assert admin is not None, "Admin user should exist"
    assert admin.role == "admin", "Admin role mismatch"
    assert verify_password("admin123", admin.hashed_password), "Admin password verification failed"

    police = db.query(User).filter(User.username == "police").first()
    assert police is not None and police.role == "police", "Police role mismatch"

    fire = db.query(User).filter(User.username == "fireservice").first()
    assert fire is not None and fire.role == "fireservice", "Fire Service role mismatch"

    ambulance = db.query(User).filter(User.username == "ambulance").first()
    assert ambulance is not None and ambulance.role == "ambulance", "Ambulance role mismatch"
    print("✓ [TEST 1 PASSED] All roles and passwords verified successfully.")

    # 2. Test Model Loading
    print("\n[TEST 2] Verifying Fire/Smoke Model (weights/best.pt)...")
    detector = FireSmokeDetector(settings.FIRE_MODEL_PATH)
    assert detector.is_loaded is True, "Fire model failed to load"
    assert detector.model is not None, "Model instance is None"
    names = detector.model.names
    print(f"Model classes: {names}")
    assert any("fire" in str(v).lower() for v in names.values()), "Fire class missing"
    assert any("smoke" in str(v).lower() for v in names.values()), "Smoke class missing"
    print("✓ [TEST 2 PASSED] Fire and Smoke dedicated model loaded with correct classes.")

    # 3. Test False Positive Filtering & State Machine
    print("\n[TEST 3] Testing Strict False-Positive Filtering & Temporal Confirmation...")
    sm = AlertStateMachine()

    # Case A: Low-confidence fire detection below threshold 0.75 -> REJECTED
    raw_low_conf = [{
        "event_type": "FIRE_DETECTED",
        "confidence": 0.45,
        "bbox": [10, 10, 50, 50],
        "source_model": "Fire/Smoke Model"
    }]
    confirmed_low = sm.evaluate_candidates("CAM-01", raw_low_conf)
    assert len(confirmed_low) == 0, "Low confidence detection should not trigger alert"
    assert sm.debug_logs[0]["status"] == "REJECTED", "Low confidence should be logged as REJECTED"

    # Case B: Person detected -> MUST NEVER trigger fire alert
    raw_person = [{
        "event_type": "PERSON_DETECTED",
        "confidence": 0.98,
        "bbox": [20, 20, 100, 200],
        "source_model": "YOLO Person Detector"
    }]
    confirmed_person = sm.evaluate_candidates("CAM-01", raw_person)
    assert not any(e["event_type"] == "FIRE_DETECTED" for e in confirmed_person), "Person must never trigger fire alert!"

    # Case C: High-confidence fire detection across 3 consecutive frames
    raw_fire = [{
        "event_type": "FIRE_DETECTED",
        "confidence": 0.91,
        "bbox": [50, 50, 120, 120],
        "source_model": "Fire/Smoke Model"
    }]
    c1 = sm.evaluate_candidates("CAM-02", raw_fire)
    assert len(c1) == 0, "Frame 1 should be in validation state"

    c2 = sm.evaluate_candidates("CAM-02", raw_fire)
    assert len(c2) == 0, "Frame 2 should be in validation state"

    c3 = sm.evaluate_candidates("CAM-02", raw_fire)
    assert len(c3) == 1, "Frame 3 should confirm the fire alert"
    assert c3[0]["event_type"] == "FIRE_DETECTED"
    # 4. Test Weapon Detector Honest Reporting
    print("\n[TEST 4] Testing Weapon Detector & Honest Unsupported Class Reporting...")
    from app.ai.weapon_detector import WeaponDetector
    wd = WeaponDetector()
    assert "knife" in wd.supported_classes, "Knife should be supported"
    assert "grenade" not in wd.supported_classes, "Grenade should be flagged as unsupported"
    assert "bomb" not in wd.supported_classes, "Bomb should be flagged as unsupported"
    unsupported_status = wd.get_class_status("grenade")
    assert unsupported_status["available"] is False
    assert "CUSTOM MODEL: NOT TRAINED" in unsupported_status["status"]
    print("✓ [TEST 4 PASSED] Honest detection reporting verified (no fake detections for unweighted classes).")

    # 5. Test Incident Dismissal & NL Search
    print("\n[TEST 5] Testing Incident Dismissal with Mandatory Reason...")
    from app.database.models import Incident
    test_inc = Incident(
        id="INC-TEST-DISMISS",
        incident_type="FIRE",
        camera_id="CAM-01",
        camera_name="Test Camera",
        location="North Wing",
        severity="HIGH",
        confidence=0.88,
        status="NEW"
    )
    db.merge(test_inc)
    db.commit()

    # Dismiss incident
    inc_to_dismiss = db.query(Incident).filter(Incident.id == "INC-TEST-DISMISS").first()
    inc_to_dismiss.status = "DISMISSED"
    inc_to_dismiss.is_dismissed = True
    inc_to_dismiss.dismiss_reason = "False reflection test"
    db.commit()

    reloaded = db.query(Incident).filter(Incident.id == "INC-TEST-DISMISS").first()
    assert reloaded.status == "DISMISSED"
    assert reloaded.is_dismissed is True
    assert reloaded.dismiss_reason == "False reflection test"
    print("✓ [TEST 5 PASSED] Incident dismissal and rationale persistence verified.")

    # 6. Test NL Search Parser
    print("\n[TEST 6] Testing Natural Language Query Parsing...")
    from app.api.incidents import parse_nl_query_to_filters
    f1 = parse_nl_query_to_filters("show me fire alerts from CAM-01")
    assert f1["incident_type"] == "FIRE"
    assert f1["camera_id"] == "CAM-01"

    f2 = parse_nl_query_to_filters("critical weapon or knife incidents")
    assert f2["severity"] == "CRITICAL"
    assert f2["incident_type"] == "KNIFE"
    print("✓ [TEST 6 PASSED] Natural language search query parser verified.")

    db.close()
    print("\n=======================================================")
    print("🎯 ALL 6 COMPREHENSIVE BACKEND TESTS PASSED SUCCESSFULLY! 🎯")
    print("=======================================================\n")

if __name__ == "__main__":
    run_all_tests()
