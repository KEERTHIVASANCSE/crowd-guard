import cv2
import numpy as np
import logging
import torch
from typing import Dict, List, Tuple

from app.ai.fire_detector import FireSmokeDetector
from app.ai.person_vehicle_detector import PersonVehicleDetector
from app.ai.weapon_detector import WeaponDetector
from app.ai.pose_detector import PoseBehaviorDetector
from app.ai.accident_detector import VehicleAccidentDetector
from app.ai.tracker import SimpleTracker
from app.ai.crowd_analyzer import CrowdAnalyzer
from app.ai.zone_engine import ZoneEngine
from app.ai.alert_state_machine import alert_state_machine

logger = logging.getLogger(__name__)

class MasterVisionPipeline:
    """
    Central Multi-Model Video Analytics Engine.
    Coordinates:
    - Model A: YOLOv8 General Object Detection (Person, Car, Truck, Bus, Motorcycle, Bicycle)
    - Model B: Dedicated Fire/Smoke Detection (weights/best.pt)
    - Model C: Dedicated Weapon & Tactical Threat Detector (Knife, Gun, Weapons)
    - Model D: YOLO Pose 17-Keypoint Dynamics (Falls, Physical Altercations, Skeletons)
    - Model E: Vehicle & Accident Trajectory Intelligence (Collisions, Decelerations)
    - Crowd Dynamics & Heatmap Engine (Surges, Density)
    - Smart Geofenced Zone Point-in-Polygon Engine
    - Temporal Confirmation & False-Positive Filter State Machine
    """
    def __init__(self):
        # Auto-detect compute hardware
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Initializing MasterVisionPipeline on device: {self.device.upper()}")

        # Multi-Model Registry
        self.person_vehicle_detector = PersonVehicleDetector()
        self.fire_detector = FireSmokeDetector()
        self.weapon_detector = WeaponDetector()
        self.pose_detector = PoseBehaviorDetector()
        self.accident_detector = VehicleAccidentDetector()
        self.crowd_analyzer = CrowdAnalyzer(max_capacity=50)
        self.zone_engine = ZoneEngine()

        # Trackers per camera feed
        self.trackers: Dict[str, SimpleTracker] = {}

    def get_tracker(self, camera_id: str) -> SimpleTracker:
        if camera_id not in self.trackers:
            self.trackers[camera_id] = SimpleTracker()
        return self.trackers[camera_id]

    def process_frame(
        self,
        camera_id: str,
        frame: np.ndarray,
        zones: List[Dict] = None,
        privacy_blur: bool = False,
        frame_number: int = None
    ) -> Dict:
        """
        Executes full multi-stage analytics pipeline on a single frame.
        """
        if frame is None or frame.size == 0:
            return {"annotated_frame": frame, "raw_events": [], "confirmed_events": [], "metrics": {}}

        h, w = frame.shape[:2]
        zones = zones or []
        tracker = self.get_tracker(camera_id)

        # 1. Model A: General Person & Vehicle Detection
        pv_results = self.person_vehicle_detector.detect(frame)
        raw_people = pv_results.get("people", [])
        raw_vehicles = pv_results.get("vehicles", [])

        # 2. Tracking: Assign persistent tracking IDs
        all_objects = raw_people + raw_vehicles
        tracked_objects = tracker.update(all_objects, frame_height=h)

        tracked_people = [obj for obj in tracked_objects if obj.get('class_name') == 'Person']
        tracked_vehicles = [obj for obj in tracked_objects if obj.get('class_name') != 'Person']

        # 3. Model B: Dedicated Fire & Smoke Inference (best.pt ONLY)
        fire_smoke_results = self.fire_detector.detect(frame)

        # 4. Model C: Dedicated Weapon Detection (Knife / Gun / Tactical Threats)
        weapon_results = self.weapon_detector.detect(frame)

        # 5. Model D: Human Pose & Kinetic Behavior (17-Keypoint Skeletons)
        pose_events, frame_with_poses = self.pose_detector.detect_and_analyze(frame, tracked_people)

        # 6. Model E: Vehicle Accident & Collision Intelligence
        accident_events = self.accident_detector.analyze(tracked_vehicles)

        # 7. Crowd Density & Surge Dynamics
        crowd_metrics = self.crowd_analyzer.analyze(tracked_people, (h, w))

        # 8. Smart Zone Point-in-Polygon Checks
        zone_events = self.zone_engine.check_zones(zones, tracked_people, w, h)

        # 9. Aggregate Raw Event Candidates for this Frame
        raw_candidate_events = []

        # From dedicated Fire/Smoke Model ONLY:
        for fs in fire_smoke_results:
            c_name = fs['class_name']
            evt_type = "FIRE" if c_name == "Fire" else "SMOKE"
            raw_candidate_events.append({
                "event_type": evt_type,
                "confidence": fs['confidence'],
                "bbox": fs['bbox'],
                "tracking_id": "Flame/Smoke Region",
                "severity": "CRITICAL" if evt_type == "FIRE" else "HIGH",
                "source_model": "Dedicated Fire/Smoke Engine (weights/best.pt)",
                "reason": f"Dedicated thermal/smoke visual pattern identified ({c_name})"
            })

        # From dedicated Weapon Model:
        for w_det in weapon_results:
            raw_candidate_events.append({
                "event_type": w_det['class_name'],
                "confidence": w_det['confidence'],
                "bbox": w_det['bbox'],
                "tracking_id": "Threat Item",
                "severity": "CRITICAL",
                "source_model": w_det['source_model'],
                "reason": w_det['reason']
            })

        # From Pose Dynamics (Falls & Fights):
        for pe in pose_events:
            raw_candidate_events.append({
                "event_type": pe['event_type'],
                "confidence": pe['confidence'],
                "bbox": pe['bbox'],
                "tracking_id": pe.get('tracking_id', ''),
                "severity": pe['severity'],
                "source_model": pe['source_model'],
                "reason": pe['reason']
            })

        # From Vehicle Accident Intelligence:
        for ae in accident_events:
            raw_candidate_events.append({
                "event_type": "ACCIDENT",
                "confidence": ae['confidence'],
                "bbox": ae['bbox'],
                "tracking_id": ae.get('tracking_id', ''),
                "severity": "HIGH",
                "source_model": ae['source_model'],
                "reason": ae['reason']
            })

        # From Smart Zone Intrusion:
        for ze in zone_events:
            if ze['event_type'] == 'INTRUSION_DETECTED':
                raw_candidate_events.append({
                    "event_type": "INTRUSION",
                    "confidence": ze.get('confidence', 0.92),
                    "bbox": ze['bbox'],
                    "tracking_id": f"Person #{ze.get('track_id')}",
                    "severity": "HIGH",
                    "source_model": "Smart Zone Geofence Engine",
                    "reason": f"Person #{ze.get('track_id')} breached perimeter of restricted zone '{ze['zone_name']}'"
                })

        # From Crowd Surge:
        if crowd_metrics.get('is_surge'):
            raw_candidate_events.append({
                "event_type": "CROWD_SURGE",
                "confidence": 0.92,
                "bbox": [0, 0, w, h],
                "tracking_id": f"Crowd ({crowd_metrics['total_people']} persons)",
                "severity": "HIGH",
                "source_model": "Crowd Dynamics Engine",
                "reason": crowd_metrics.get('surge_reason', 'Sudden rapid crowd accumulation')
            })

        # 10. Evaluate through Alert Confirmation State Machine
        confirmed_alerts = alert_state_machine.evaluate_candidates(
            camera_id=camera_id,
            raw_events=raw_candidate_events,
            frame_number=frame_number
        )

        # 11. Complete Frame Annotations
        annotated_frame = frame_with_poses.copy()

        # Draw Smart Zones
        for z in zones:
            pts = z.get('polygon_points', [])
            if isinstance(pts, str):
                import json
                try:
                    pts = json.loads(pts)
                except Exception:
                    continue
            if len(pts) >= 3:
                pixel_pts = np.array([[int(p[0] * w), int(p[1] * h)] for p in pts], dtype=np.int32)
                z_color = (0, 0, 255) if z.get('zone_type') == 'restricted' else (0, 255, 255)
                cv2.polylines(annotated_frame, [pixel_pts], True, z_color, 2)
                cv2.putText(annotated_frame, z.get('name', 'Zone'), (pixel_pts[0][0], pixel_pts[0][1] - 5),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, z_color, 1)

        # Draw Tracked Objects
        for obj in tracked_objects:
            bbox = obj['bbox']
            c_name = obj.get('class_name', 'Object')
            t_id = obj.get('track_id', 0)
            conf = int(obj.get('confidence', 0.8) * 100)

            if privacy_blur and c_name == 'Person':
                face_y2 = bbox[1] + int((bbox[3] - bbox[1]) * 0.35)
                face_roi = annotated_frame[max(0, bbox[1]):face_y2, max(0, bbox[0]):min(w, bbox[2])]
                if face_roi.size > 0:
                    blurred_face = cv2.GaussianBlur(face_roi, (25, 25), 30)
                    annotated_frame[max(0, bbox[1]):face_y2, max(0, bbox[0]):min(w, bbox[2])] = blurred_face

            box_color = (255, 255, 0) if c_name == 'Person' else (0, 255, 0)
            cv2.rectangle(annotated_frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), box_color, 2)
            label = f"{c_name} #{t_id} {conf}%"
            cv2.putText(annotated_frame, label, (bbox[0], max(15, bbox[1] - 5)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, box_color, 1)

        # Draw Fire/Smoke
        for fs in fire_smoke_results:
            bbox = fs['bbox']
            f_color = (0, 69, 255) if fs['class_name'] == 'Fire' else (128, 128, 128)
            cv2.rectangle(annotated_frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), f_color, 3)
            label = f"[{fs['class_name'].upper()}] {int(fs['confidence'] * 100)}%"
            cv2.putText(annotated_frame, label, (bbox[0], max(20, bbox[1] - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, f_color, 2)

        # Draw Weapons
        for w_det in weapon_results:
            bbox = w_det['bbox']
            cv2.rectangle(annotated_frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (255, 0, 255), 3)
            label = f"[WEAPON: {w_det['class_name']}] {int(w_det['confidence'] * 100)}%"
            cv2.putText(annotated_frame, label, (bbox[0], max(20, bbox[1] - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 0, 255), 2)

        # Draw Confirmed Threat Alerts over frame
        for alert in confirmed_alerts:
            abox = alert['bbox']
            cv2.rectangle(annotated_frame, (abox[0], abox[1]), (abox[2], abox[3]), (0, 0, 255), 3)
            alert_label = f"! ALERT: {alert['event_type']} !"
            cv2.putText(annotated_frame, alert_label, (abox[0], max(25, abox[1] - 25)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 0, 255), 2)

        metrics = {
            "total_people": len(tracked_people),
            "total_vehicles": len(tracked_vehicles),
            "entry_count": tracker.entry_count,
            "exit_count": tracker.exit_count,
            "crowd": crowd_metrics,
            "active_tracks": len(tracked_objects),
            "fire_detected": any(fs['class_name'] == 'Fire' for fs in fire_smoke_results),
            "smoke_detected": any(fs['class_name'] == 'Smoke' for fs in fire_smoke_results),
            "weapon_detected": len(weapon_results) > 0,
            "accidents_detected": len(accident_events) > 0,
            "falls_detected": any(pe['event_type'] == 'FALL' for pe in pose_events),
            "fights_detected": any(pe['event_type'] == 'FIGHT' for pe in pose_events),
        }

        return {
            "annotated_frame": annotated_frame,
            "tracked_objects": tracked_objects,
            "fire_smoke": fire_smoke_results,
            "weapon_results": weapon_results,
            "raw_candidate_events": raw_candidate_events,
            "confirmed_events": confirmed_alerts,
            "metrics": metrics
        }

vision_pipeline = MasterVisionPipeline()
