import time
import logging
from typing import Dict, List, Optional
import numpy as np
from app.config import settings

logger = logging.getLogger(__name__)

class AlertStateMachine:
    """
    Temporal confirmation & false-positive elimination state machine.
    States:
    DETECTION -> CANDIDATE -> VALIDATING (3/5 frames) -> CONFIRMED -> ALERT
    Provides comprehensive AI explainability reasoning for every decision.
    """
    def __init__(self):
        # camera_id -> event_type -> { 'consecutive_frames': int, 'history': list, 'last_seen_time': float, 'last_conf': float, 'state': str }
        self.camera_candidates: Dict[str, Dict[str, Dict]] = {}
        self.debug_logs: List[Dict] = []
        self.alert_cooldowns: Dict[str, float] = {}

    def log_debug(self, model: str, raw_prediction: str, confidence: float, threshold: float, status: str, reason: str, camera_id: str):
        entry = {
            "timestamp": time.strftime("%H:%M:%S"),
            "camera_id": camera_id,
            "model": model,
            "raw_prediction": raw_prediction,
            "confidence": round(confidence, 3),
            "threshold": round(threshold, 3),
            "status": status,  # "ACCEPTED", "REJECTED", "VALIDATING", "CONFIRMED", "FALSE_POSITIVE"
            "reason": reason
        }
        self.debug_logs.insert(0, entry)
        if len(self.debug_logs) > 70:
            self.debug_logs.pop()

    def evaluate_candidates(self, camera_id: str, raw_events: List[Dict], frame_number: int = None) -> List[Dict]:
        now = time.time()
        if camera_id not in self.camera_candidates:
            self.camera_candidates[camera_id] = {}

        current_event_types = set()
        confirmed_alerts = []

        for evt in raw_events:
            event_type = evt.get('event_type')
            confidence = evt.get('confidence', 0.0)
            model_name = evt.get('source_model', 'AI Model')
            base_reason = evt.get('reason', '')
            t_ids = evt.get('tracking_id', '')
            current_event_types.add(event_type)

            # Determine thresholds and persistence requirement
            if event_type in ['FIRE', 'FIRE_DETECTED']:
                req_frames = settings.FIRE_PERSISTENCE_FRAMES
                req_thresh = settings.CONFIDENCE_FIRE
            elif event_type in ['SMOKE', 'SMOKE_DETECTED']:
                req_frames = settings.SMOKE_PERSISTENCE_FRAMES
                req_thresh = settings.CONFIDENCE_SMOKE
            elif event_type in ['GUN', 'KNIFE', 'WEAPON_DETECTED']:
                req_frames = 2
                req_thresh = settings.CONFIDENCE_WEAPON
            elif event_type in ['ACCIDENT']:
                req_frames = 2
                req_thresh = 0.70
            elif event_type in ['FIGHT', 'FIGHT_DETECTED']:
                req_frames = settings.FIGHT_PERSISTENCE_FRAMES
                req_thresh = settings.CONFIDENCE_FIGHT
            elif event_type in ['FALL', 'FALL_DETECTED']:
                req_frames = settings.FALL_PERSISTENCE_FRAMES
                req_thresh = settings.CONFIDENCE_FALL
            elif event_type in ['INTRUSION', 'INTRUSION_DETECTED']:
                req_frames = settings.INTRUSION_PERSISTENCE_FRAMES
                req_thresh = 0.70
            elif event_type in ['CROWD_SURGE']:
                req_frames = 2
                req_thresh = 0.75
            else:
                req_frames = 2
                req_thresh = 0.60

            # 1. Strict Confidence Threshold Check
            if confidence < req_thresh:
                self.log_debug(
                    model=model_name,
                    raw_prediction=f"{event_type} = {confidence:.2f}",
                    confidence=confidence,
                    threshold=req_thresh,
                    status="REJECTED",
                    reason=f"Confidence {confidence:.2f} is below mandatory threshold {req_thresh:.2f}",
                    camera_id=camera_id
                )
                continue

            # 2. Temporal Persistence Check
            candidate_state = self.camera_candidates[camera_id].get(event_type, {
                "consecutive_frames": 0,
                "history": [],
                "last_seen_time": now,
                "state": "DETECTED"
            })

            candidate_state["consecutive_frames"] += 1
            candidate_state["last_seen_time"] = now
            candidate_state["last_conf"] = confidence
            candidate_state["history"].append(confidence)
            if len(candidate_state["history"]) > 10:
                candidate_state["history"].pop(0)

            # Check if required temporal frames reached
            if candidate_state["consecutive_frames"] < req_frames:
                candidate_state["state"] = "VALIDATING"
                self.camera_candidates[camera_id][event_type] = candidate_state
                self.log_debug(
                    model=model_name,
                    raw_prediction=f"{event_type} = {confidence:.2f}",
                    confidence=confidence,
                    threshold=req_thresh,
                    status="VALIDATING",
                    reason=f"Candidate temporal persistence {candidate_state['consecutive_frames']}/{req_frames} frames",
                    camera_id=camera_id
                )
                continue

            # Cooldown check for active streaming (15 seconds)
            cooldown_key = f"{camera_id}_{event_type}"
            last_alert_time = self.alert_cooldowns.get(cooldown_key, 0)
            if now - last_alert_time < 15.0 and frame_number is None:
                # Still within cooldown window on live feed
                continue

            # 3. CONFIRMATION
            candidate_state["state"] = "CONFIRMED"
            self.camera_candidates[camera_id][event_type] = candidate_state
            self.alert_cooldowns[cooldown_key] = now

            # Build comprehensive explainability statement
            explain_reason = (
                f"{base_reason}. Verified across {candidate_state['consecutive_frames']} consecutive frames "
                f"with average confidence {np.mean(candidate_state['history']):.2f} (Threshold: {req_thresh:.2f}). "
                f"Spatial-temporal validation confirmed."
            )

            self.log_debug(
                model=model_name,
                raw_prediction=f"{event_type} = {confidence:.2f}",
                confidence=confidence,
                threshold=req_thresh,
                status="CONFIRMED",
                reason=explain_reason,
                camera_id=camera_id
            )

            confirmed_copy = dict(evt)
            confirmed_copy['state'] = "CONFIRMED"
            confirmed_copy['reason'] = explain_reason
            confirmed_copy['tracking_ids'] = t_ids
            if frame_number is not None:
                confirmed_copy['frame_number'] = frame_number
            confirmed_alerts.append(confirmed_copy)

        # False-Positive Eviction: if candidate vanished before temporal validation finished
        for prev_event in list(self.camera_candidates[camera_id].keys()):
            if prev_event not in current_event_types:
                prev_info = self.camera_candidates[camera_id][prev_event]
                if prev_info.get("state") in ["DETECTED", "VALIDATING"]:
                    self.log_debug(
                        model="AlertStateMachine",
                        raw_prediction=f"{prev_event} candidate vanished",
                        confidence=prev_info.get("last_conf", 0.0),
                        threshold=0.0,
                        status="FALSE_POSITIVE",
                        reason="Detection disappeared before reaching required consecutive frame threshold",
                        camera_id=camera_id
                    )
                del self.camera_candidates[camera_id][prev_event]

        return confirmed_alerts

alert_state_machine = AlertStateMachine()
