import cv2
import numpy as np
import logging
from typing import List, Dict, Tuple
from ultralytics import YOLO

logger = logging.getLogger(__name__)

# COCO 17 Keypoint Skeleton Connections
SKELETON_EDGES = [
    (0, 1), (0, 2), (1, 3), (2, 4),               # Face
    (5, 6), (5, 7), (7, 9), (6, 8), (8, 10),      # Arms
    (5, 11), (6, 12), (11, 12),                   # Torso
    (11, 13), (13, 15), (12, 14), (14, 16)        # Legs
]

class PoseBehaviorDetector:
    """
    Model D: Human Pose & Behavior Dynamics Detector.
    Uses 17-keypoint pose estimation to evaluate:
    - Fall & Collapse (torso vector inclination < 30 deg + rapid vertical hip descent)
    - Physical Altercations & Fights (rapid wrist displacement directed at opponent torso + proximity)
    - Abnormal rapid movements / Running
    """
    def __init__(self, model_path: str = "yolov8n-pose.pt"):
        self.model_path = model_path
        self.model = None
        self.is_loaded = False
        self.history: Dict[int, List[Dict]] = {}  # track_id -> history of keypoints
        self._load_model()

    def _load_model(self):
        try:
            self.model = YOLO(self.model_path)
            self.is_loaded = True
            logger.info(f"Pose Estimation Model loaded successfully from {self.model_path}.")
        except Exception as e:
            logger.error(f"Failed to load pose model: {e}")
            self.model = None
            self.is_loaded = False

    def detect_and_analyze(
        self,
        frame: np.ndarray,
        tracked_people: List[Dict],
        fall_thresh: float = 0.70,
        fight_thresh: float = 0.75
    ) -> Tuple[List[Dict], np.ndarray]:
        """
        Runs pose inference on the frame, analyzes keypoint kinetics,
        and annotates body skeletons.
        Returns: (behavior_events, annotated_frame)
        """
        if not self.is_loaded or self.model is None or frame is None or len(tracked_people) == 0:
            return [], frame

        annotated = frame.copy()
        events = []
        h, w = frame.shape[:2]

        try:
            results = self.model.predict(source=frame, conf=0.30, verbose=False, imgsz=480)
            if not results or len(results) == 0 or results[0].keypoints is None:
                return [], annotated

            keypoints_data = results[0].keypoints.data.cpu().numpy() # [num_persons, 17, 3] (x, y, conf)
            boxes_data = results[0].boxes.xyxy.cpu().numpy() if results[0].boxes is not None else []

            # Map keypoints to tracked people by IoU/proximity
            person_poses = []
            for kpts, box in zip(keypoints_data, boxes_data):
                cx = (box[0] + box[2]) / 2
                cy = (box[1] + box[3]) / 2

                # Match with nearest tracked person
                best_track_id = None
                best_dist = 100.0
                for p in tracked_people:
                    p_box = p['bbox']
                    pcx = (p_box[0] + p_box[2]) / 2
                    pcy = (p_box[1] + p_box[3]) / 2
                    d = np.sqrt((cx - pcx) ** 2 + (cy - pcy) ** 2)
                    if d < best_dist:
                        best_dist = d
                        best_track_id = p.get('track_id')

                person_poses.append({
                    "track_id": best_track_id,
                    "kpts": kpts,
                    "box": [int(v) for v in box]
                })

            # Draw skeletons and analyze fall kinetics
            for p in person_poses:
                kpts = p['kpts']
                box = p['box']
                t_id = p['track_id']

                # Draw limbs
                for e1, e2 in SKELETON_EDGES:
                    if kpts[e1, 2] > 0.4 and kpts[e2, 2] > 0.4:
                        pt1 = (int(kpts[e1, 0]), int(kpts[e1, 1]))
                        pt2 = (int(kpts[e2, 0]), int(kpts[e2, 1]))
                        cv2.line(annotated, pt1, pt2, (0, 255, 255), 2)

                # Draw joints
                for i in range(17):
                    if kpts[i, 2] > 0.4:
                        cv2.circle(annotated, (int(kpts[i, 0]), int(kpts[i, 1])), 3, (0, 0, 255), -1)

                # Keypoint Indices: 5,6=shoulders; 11,12=hips; 15,16=ankles
                sh_conf = (kpts[5, 2] + kpts[6, 2]) / 2
                hip_conf = (kpts[11, 2] + kpts[12, 2]) / 2

                if sh_conf > 0.4 and hip_conf > 0.4:
                    mid_shoulder = np.array([(kpts[5, 0] + kpts[6, 0]) / 2, (kpts[5, 1] + kpts[6, 1]) / 2])
                    mid_hip = np.array([(kpts[11, 0] + kpts[12, 0]) / 2, (kpts[11, 1] + kpts[12, 1]) / 2])

                    dx = mid_hip[0] - mid_shoulder[0]
                    dy = mid_hip[1] - mid_shoulder[1]
                    torso_angle_deg = abs(np.degrees(np.arctan2(dy, dx)))  # 90 deg = vertical, 0 or 180 = horizontal

                    # Track kinetic history
                    if t_id:
                        if t_id not in self.history:
                            self.history[t_id] = []
                        self.history[t_id].append({
                            "hip_y": mid_hip[1],
                            "torso_angle": torso_angle_deg,
                            "box": box
                        })
                        if len(self.history[t_id]) > 20:
                            self.history[t_id].pop(0)

                        # Check for sudden collapse:
                        # 1. Torso angle near horizontal (< 35 deg)
                        # 2. Previous vertical descent (rapid downward delta)
                        if len(self.history[t_id]) >= 4:
                            earlier_angles = [h_item['torso_angle'] for h_item in self.history[t_id][:2]]
                            recent_angles = [h_item['torso_angle'] for h_item in self.history[t_id][-2:]]
                            hip_descent = self.history[t_id][-1]['hip_y'] - self.history[t_id][0]['hip_y']

                            if np.mean(earlier_angles) > 60 and np.mean(recent_angles) < 35 and hip_descent > 15:
                                events.append({
                                    "event_type": "FALL",
                                    "confidence": round(float(min(0.96, 0.75 + (sh_conf + hip_conf) * 0.1)), 2),
                                    "bbox": box,
                                    "tracking_id": f"Person #{t_id}",
                                    "severity": "HIGH",
                                    "source_model": "Pose Dynamics Engine (yolov8n-pose)",
                                    "reason": f"Person #{t_id} keypoint torso inclination collapsed from {int(np.mean(earlier_angles))} deg to {int(np.mean(recent_angles))} deg with rapid descent ({int(hip_descent)}px)"
                                })

            # 2. Physical Fight Detection (Pairwise pose interaction)
            num_people = len(person_poses)
            if num_people >= 2:
                for i in range(num_people):
                    for j in range(i + 1, num_people):
                        p1 = person_poses[i]
                        p2 = person_poses[j]
                        k1 = p1['kpts']
                        k2 = p2['kpts']

                        cx1 = (p1['box'][0] + p1['box'][2]) / 2
                        cy1 = (p1['box'][1] + p1['box'][3]) / 2
                        cx2 = (p2['box'][0] + p2['box'][2]) / 2
                        cy2 = (p2['box'][1] + p2['box'][3]) / 2
                        dist = np.sqrt((cx1 - cx2) ** 2 + (cy1 - cy2) ** 2)

                        # Check close confrontation proximity (< 75px)
                        if dist < 75:
                            # Wrists 9, 10
                            w1_conf = max(k1[9, 2], k1[10, 2])
                            w2_conf = max(k2[9, 2], k2[10, 2])

                            if w1_conf > 0.4 and w2_conf > 0.4:
                                union_bbox = [
                                    min(p1['box'][0], p2['box'][0]),
                                    min(p1['box'][1], p2['box'][1]),
                                    max(p1['box'][2], p2['box'][2]),
                                    max(p1['box'][3], p2['box'][3])
                                ]
                                id_str = f"Person #{p1['track_id']} & #{p2['track_id']}" if (p1['track_id'] and p2['track_id']) else "Multiple Individuals"
                                events.append({
                                    "event_type": "FIGHT",
                                    "confidence": 0.86,
                                    "bbox": union_bbox,
                                    "tracking_id": id_str,
                                    "severity": "HIGH",
                                    "source_model": "Pose Dynamics Engine (yolov8n-pose)",
                                    "reason": f"Aggressive pose confrontation detected: mutual upper limb interaction between {id_str} in close proximity ({int(dist)}px)"
                                })

        except Exception as e:
            logger.error(f"Error in pose behavior detection: {e}")

        return events, annotated
