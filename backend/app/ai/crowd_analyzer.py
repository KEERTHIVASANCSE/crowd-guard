import numpy as np
import cv2
from typing import List, Dict, Tuple

class CrowdAnalyzer:
    """
    Computes spatial crowd distribution, zone density, occupancy percentages,
    crowd surge/flow detection, and generates visual density heatmaps.
    """
    def __init__(self, max_capacity: int = 50):
        self.max_capacity = max_capacity
        self.history_counts: List[int] = []
        self.centroid_history: List[List[Tuple[int, int]]] = []

    def analyze(self, people_detections: List[Dict], frame_shape: Tuple[int, int]) -> Dict:
        h, w = frame_shape
        total_people = len(people_detections)

        self.history_counts.append(total_people)
        if len(self.history_counts) > 20:
            self.history_counts.pop(0)

        current_centroids = []
        for p in people_detections:
            bbox = p['bbox']
            cx = (bbox[0] + bbox[2]) // 2
            cy = (bbox[1] + bbox[3]) // 2
            current_centroids.append((cx, cy))

        self.centroid_history.append(current_centroids)
        if len(self.centroid_history) > 15:
            self.centroid_history.pop(0)

        # Growth rate
        if len(self.history_counts) >= 10:
            growth_rate = round(float(np.mean(self.history_counts[-5:]) - np.mean(self.history_counts[:5])), 2)
        else:
            growth_rate = 0.0

        # Crowd Surge Detection: rapid influx (> 8 increase) or high collective acceleration
        is_surge = False
        surge_reason = ""
        if len(self.history_counts) >= 6:
            recent_delta = self.history_counts[-1] - self.history_counts[-6]
            if recent_delta >= 8 or (growth_rate >= 6.0 and total_people >= 15):
                is_surge = True
                surge_reason = f"Sudden crowd influx: +{recent_delta} individuals within 6 frames (Growth Rate: +{growth_rate}/s)"

        # Zone counts (Quadrant split)
        zone_a = 0  # Top-Left
        zone_b = 0  # Top-Right
        zone_c = 0  # Bottom-Left
        zone_d = 0  # Bottom-Right

        mid_x = w // 2
        mid_y = h // 2

        for cx, cy in current_centroids:
            if cx < mid_x and cy < mid_y:
                zone_a += 1
            elif cx >= mid_x and cy < mid_y:
                zone_b += 1
            elif cx < mid_x and cy >= mid_y:
                zone_c += 1
            else:
                zone_d += 1

        occupancy_pct = min(100.0, round((total_people / max(self.max_capacity, 1)) * 100, 1))

        if occupancy_pct < 25:
            density_level = "LOW"
        elif occupancy_pct < 55:
            density_level = "MEDIUM"
        elif occupancy_pct < 80:
            density_level = "HIGH"
        else:
            density_level = "CRITICAL"

        return {
            "total_people": total_people,
            "occupancy_percentage": occupancy_pct,
            "density_level": density_level,
            "growth_rate": growth_rate,
            "is_surge": is_surge,
            "surge_reason": surge_reason,
            "max_capacity": self.max_capacity,
            "zones": {
                "Zone A (North-West)": {"count": zone_a, "level": self._zone_level(zone_a)},
                "Zone B (North-East)": {"count": zone_b, "level": self._zone_level(zone_b)},
                "Zone C (South-West)": {"count": zone_c, "level": self._zone_level(zone_c)},
                "Zone D (South-East)": {"count": zone_d, "level": self._zone_level(zone_d)},
            }
        }

    def _zone_level(self, count: int) -> str:
        q_cap = self.max_capacity / 4.0
        pct = (count / max(q_cap, 1)) * 100
        if pct < 30:
            return "LOW"
        elif pct < 65:
            return "MEDIUM"
        elif pct < 85:
            return "HIGH"
        return "CRITICAL"

    def generate_heatmap_overlay(self, frame: np.ndarray, people_detections: List[Dict]) -> np.ndarray:
        h, w = frame.shape[:2]
        heatmap = np.zeros((h, w), dtype=np.float32)

        for p in people_detections:
            bbox = p['bbox']
            cx = int((bbox[0] + bbox[2]) / 2)
            cy = int((bbox[1] + bbox[3]) / 2)
            radius = max(30, int(w * 0.05))
            y1 = max(0, cy - radius)
            y2 = min(h, cy + radius)
            x1 = max(0, cx - radius)
            x2 = min(w, cx + radius)
            heatmap[y1:y2, x1:x2] += 1.0

        if np.max(heatmap) > 0:
            heatmap = heatmap / np.max(heatmap)
            heatmap = np.uint8(255 * heatmap)
            heatmap_blurred = cv2.GaussianBlur(heatmap, (51, 51), 0)
            colored_heatmap = cv2.applyColorMap(heatmap_blurred, cv2.COLORMAP_JET)
            return cv2.addWeighted(frame, 0.65, colored_heatmap, 0.35, 0)
        return frame
