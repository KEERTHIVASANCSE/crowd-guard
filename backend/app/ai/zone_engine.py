import json
import cv2
import numpy as np
from typing import List, Dict

class ZoneEngine:
    """
    Evaluates Smart Zones (Restricted, Entry, Exit, High-Density)
    against tracked objects in the frame using point-in-polygon tests.
    """
    def __init__(self):
        pass

    def check_zones(self, zones: List[Dict], tracked_objects: List[Dict], frame_width: int, frame_height: int) -> List[Dict]:
        """
        zones: list of dicts: {'id': int, 'name': str, 'zone_type': str, 'polygon_points': list of [x, y]}
        tracked_objects: list of dicts with 'bbox', 'track_id', 'class_name'
        Returns list of zone events: [{'event_type': 'INTRUSION_DETECTED', 'zone_name': str, 'track_id': int, 'bbox': ...}]
        """
        events = []

        for zone in zones:
            pts = zone.get('polygon_points', [])
            if isinstance(pts, str):
                try:
                    pts = json.loads(pts)
                except Exception:
                    continue

            if len(pts) < 3:
                continue

            # Convert normalized coordinates [0.0..1.0] to pixel coordinates
            pixel_pts = np.array([[int(p[0] * frame_width), int(p[1] * frame_height)] for p in pts], dtype=np.int32)
            zone_type = zone.get('zone_type', 'restricted').lower()
            zone_name = zone.get('name', 'Restricted Zone')

            for obj in tracked_objects:
                bbox = obj['bbox']
                # Test bottom-center point (foot position for people, base for vehicles)
                cx = (bbox[0] + bbox[2]) // 2
                cy = bbox[3]

                dist = cv2.pointPolygonTest(pixel_pts, (cx, cy), False)
                if dist >= 0:  # Inside or on the polygon boundary
                    if zone_type == 'restricted':
                        events.append({
                            "event_type": "INTRUSION_DETECTED",
                            "zone_name": zone_name,
                            "zone_id": zone.get('id'),
                            "track_id": obj.get('track_id'),
                            "class_name": obj.get('class_name', 'Person'),
                            "confidence": obj.get('confidence', 0.90),
                            "bbox": bbox
                        })
                    elif zone_type == 'high_density':
                        events.append({
                            "event_type": "HIGH_DENSITY_ZONE_PRESENCE",
                            "zone_name": zone_name,
                            "zone_id": zone.get('id'),
                            "track_id": obj.get('track_id'),
                            "bbox": bbox
                        })

        return events
