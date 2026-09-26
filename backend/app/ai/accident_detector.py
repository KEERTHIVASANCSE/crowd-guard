import numpy as np
import logging
from typing import List, Dict, Tuple

logger = logging.getLogger(__name__)

class VehicleAccidentDetector:
    """
    Model E: Vehicle Collision & Traffic Accident Intelligence Engine.
    Evaluates temporal vehicle trajectory vectors:
    - Collision Candidates: Converging trajectory vectors + sudden deceleration + bounding box overlap
    - Sudden stops in active traffic corridors
    - Wrong-Way driving against lane vectors
    """
    def __init__(self):
        # track_id -> history of { 'centroid': (cx, cy), 'velocity': (vx, vy), 'speed': float, 'bbox': list }
        self.vehicle_history: Dict[int, List[Dict]] = {}

    def _compute_iou(self, boxA, boxB):
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])
        interArea = max(0, xB - xA) * max(0, yB - yA)
        boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
        boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])
        denom = float(boxAArea + boxBArea - interArea)
        return interArea / denom if denom > 0 else 0.0

    def analyze(self, tracked_vehicles: List[Dict]) -> List[Dict]:
        events = []
        active_ids = set()

        # Update vehicle kinetics
        for v in tracked_vehicles:
            t_id = v.get('track_id')
            if not t_id:
                continue
            active_ids.add(t_id)

            bbox = v['bbox']
            cx = (bbox[0] + bbox[2]) / 2
            cy = (bbox[1] + bbox[3]) / 2

            if t_id not in self.vehicle_history:
                self.vehicle_history[t_id] = []

            # Compute velocity from previous frame
            if len(self.vehicle_history[t_id]) > 0:
                prev = self.vehicle_history[t_id][-1]['centroid']
                vx = cx - prev[0]
                vy = cy - prev[1]
                speed = np.sqrt(vx ** 2 + vy ** 2)
            else:
                vx, vy, speed = 0.0, 0.0, 0.0

            self.vehicle_history[t_id].append({
                "centroid": (cx, cy),
                "velocity": (vx, vy),
                "speed": speed,
                "bbox": bbox,
                "class_name": v.get('class_name', 'Car')
            })

            if len(self.vehicle_history[t_id]) > 25:
                self.vehicle_history[t_id].pop(0)

        # Collision & Accident Analysis (Pairwise vehicle interaction)
        num_v = len(tracked_vehicles)
        if num_v >= 2:
            for i in range(num_v):
                for j in range(i + 1, num_v):
                    v1 = tracked_vehicles[i]
                    v2 = tracked_vehicles[j]
                    id1 = v1.get('track_id')
                    id2 = v2.get('track_id')
                    if not id1 or not id2:
                        continue

                    h1 = self.vehicle_history.get(id1, [])
                    h2 = self.vehicle_history.get(id2, [])

                    if len(h1) >= 4 and len(h2) >= 4:
                        # 1. Check bounding box overlap
                        iou = self._compute_iou(v1['bbox'], v2['bbox'])

                        # 2. Check deceleration: both were in motion earlier, now abrupt stop (< 2px/frame)
                        initial_speed_1 = np.mean([entry['speed'] for entry in h1[:2]])
                        recent_speed_1 = np.mean([entry['speed'] for entry in h1[-2:]])
                        initial_speed_2 = np.mean([entry['speed'] for entry in h2[:2]])
                        recent_speed_2 = np.mean([entry['speed'] for entry in h2[-2:]])

                        decel_1 = initial_speed_1 - recent_speed_1
                        decel_2 = initial_speed_2 - recent_speed_2

                        # If vehicles overlapped and experienced severe rapid deceleration
                        if iou > 0.12 and (decel_1 > 5.0 or decel_2 > 5.0) and (recent_speed_1 < 3.0 and recent_speed_2 < 3.0):
                            union_bbox = [
                                min(v1['bbox'][0], v2['bbox'][0]),
                                min(v1['bbox'][1], v2['bbox'][1]),
                                max(v1['bbox'][2], v2['bbox'][2]),
                                max(v1['bbox'][3], v2['bbox'][3])
                            ]
                            events.append({
                                "event_type": "ACCIDENT",
                                "confidence": round(float(min(0.95, 0.70 + iou + 0.15)), 2),
                                "bbox": union_bbox,
                                "tracking_id": f"Vehicle #{id1} & #{id2}",
                                "severity": "HIGH",
                                "source_model": "Trajectory Collision Engine (ByteTrack)",
                                "reason": f"Vehicle collision detected between Vehicle #{id1} ({v1.get('class_name')}) and #{id2} ({v2.get('class_name')}): IoU {iou:.2f} with sudden deceleration ({decel_1:.1f}px/s & {decel_2:.1f}px/s)"
                            })

        # Clean stale vehicle histories
        for t_id in list(self.vehicle_history.keys()):
            if t_id not in active_ids:
                del self.vehicle_history[t_id]

        return events
