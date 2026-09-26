import numpy as np
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class BehaviorAnalyzer:
    """
    Analyzes temporal behavior patterns:
    - Fall / Accident Detection (sudden aspect ratio shift & vertical collapse)
    - Fight / Violence Detection (dense proximity + high rapid centroid displacement)
    - Loitering (lingering in small zone for extended duration)
    """
    def __init__(self):
        # track_id -> history of bounding box aspect ratios and positions
        self.track_history: Dict[int, List[Dict]] = {}

    def analyze(self, tracked_people: List[Dict]) -> List[Dict]:
        events = []

        # 1. Fall Detection & Loitering Check
        for p in tracked_people:
            t_id = p.get('track_id')
            if not t_id:
                continue

            bbox = p['bbox']
            w = bbox[2] - bbox[0]
            h = bbox[3] - bbox[1]
            cx = (bbox[0] + bbox[2]) // 2
            cy = (bbox[1] + bbox[3]) // 2
            aspect_ratio = w / max(h, 1)  # Normal standing person: aspect_ratio ~ 0.3 - 0.5. Fallen person: aspect_ratio >= 1.2

            if t_id not in self.track_history:
                self.track_history[t_id] = []

            self.track_history[t_id].append({
                "cx": cx,
                "cy": cy,
                "w": w,
                "h": h,
                "aspect_ratio": aspect_ratio
            })

            if len(self.track_history[t_id]) > 30:
                self.track_history[t_id].pop(0)

            # Check for sudden collapse / lying on ground
            if len(self.track_history[t_id]) >= 5:
                recent_ratios = [item['aspect_ratio'] for item in self.track_history[t_id][-4:]]
                earlier_ratios = [item['aspect_ratio'] for item in self.track_history[t_id][:3]]

                # If recently horizontal (aspect ratio > 1.25) and previously upright (aspect ratio < 0.8)
                if np.mean(recent_ratios) > 1.20 and np.mean(earlier_ratios) < 0.85:
                    events.append({
                        "event_type": "FALL_DETECTED",
                        "track_id": t_id,
                        "confidence": 0.88,
                        "bbox": bbox,
                        "description": f"Person ID {t_id} sudden aspect ratio shift to horizontal posture"
                    })

            # Check for loitering (> 25 frames within 35px radius)
            if len(self.track_history[t_id]) >= 25:
                positions = [(item['cx'], item['cy']) for item in self.track_history[t_id]]
                xs = [pos[0] for pos in positions]
                ys = [pos[1] for pos in positions]
                max_displacement = max(max(xs) - min(xs), max(ys) - min(ys))
                if max_displacement < 35:
                    events.append({
                        "event_type": "LOITERING_DETECTED",
                        "track_id": t_id,
                        "confidence": 0.78,
                        "bbox": bbox,
                        "description": f"Person ID {t_id} loitering in vicinity for sustained duration"
                    })

        # 2. Fight / Physical Altercation Detection
        # Check pairwise distances between tracked people
        num_people = len(tracked_people)
        if num_people >= 2:
            for i in range(num_people):
                for j in range(i + 1, num_people):
                    p1 = tracked_people[i]
                    p2 = tracked_people[j]
                    id1 = p1.get('track_id')
                    id2 = p2.get('track_id')

                    cx1 = (p1['bbox'][0] + p1['bbox'][2]) // 2
                    cy1 = (p1['bbox'][1] + p1['bbox'][3]) // 2
                    cx2 = (p2['bbox'][0] + p2['bbox'][2]) // 2
                    cy2 = (p2['bbox'][1] + p2['bbox'][3]) // 2

                    distance = np.sqrt((cx1 - cx2) ** 2 + (cy1 - cy2) ** 2)

                    # If people are in extreme close proximity (< 65px)
                    if distance < 65:
                        # Check if both have high recent motion
                        h1 = self.track_history.get(id1, [])
                        h2 = self.track_history.get(id2, [])
                        if len(h1) >= 4 and len(h2) >= 4:
                            disp1 = np.sqrt((h1[-1]['cx'] - h1[-4]['cx']) ** 2 + (h1[-1]['cy'] - h1[-4]['cy']) ** 2)
                            disp2 = np.sqrt((h2[-1]['cx'] - h2[-4]['cx']) ** 2 + (h2[-1]['cy'] - h2[-4]['cy']) ** 2)

                            # Both showing rapid shifting while closely engaged
                            if disp1 > 25 and disp2 > 25:
                                union_bbox = [
                                    min(p1['bbox'][0], p2['bbox'][0]),
                                    min(p1['bbox'][1], p2['bbox'][1]),
                                    max(p1['bbox'][2], p2['bbox'][2]),
                                    max(p1['bbox'][3], p2['bbox'][3])
                                ]
                                events.append({
                                    "event_type": "FIGHT_DETECTED",
                                    "track_id": f"{id1}-{id2}",
                                    "confidence": 0.85,
                                    "bbox": union_bbox,
                                    "description": f"Rapid physical interaction detected between ID {id1} and {id2}"
                                })

        # Clean up stale track histories
        active_ids = {p.get('track_id') for p in tracked_people if p.get('track_id')}
        for t_id in list(self.track_history.keys()):
            if t_id not in active_ids:
                del self.track_history[t_id]

        return events
