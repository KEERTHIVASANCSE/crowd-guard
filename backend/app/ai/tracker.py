import numpy as np
from typing import List, Dict

class SimpleTracker:
    """
    Centroid and IoU tracker for maintaining persistent object IDs across frames.
    Also tracks line-crossing (entry/exit) and trajectory vectors.
    """
    def __init__(self, max_disappeared: int = 15, iou_threshold: float = 0.3):
        self.next_id = 1
        self.objects: Dict[int, Dict] = {}       # id -> {'bbox': [x1, y1, x2, y2], 'centroid': (cx, cy), 'disappeared': int, 'history': [(cx, cy)]}
        self.max_disappeared = max_disappeared
        self.iou_threshold = iou_threshold

        # Counting statistics
        self.entry_count = 0
        self.exit_count = 0
        self.counted_ids = set()

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

    def update(self, detections: List[Dict], frame_height: int = 720) -> List[Dict]:
        """
        Takes list of detections [{'class_name': str, 'confidence': float, 'bbox': [x1, y1, x2, y2]}]
        Returns enriched list with 'track_id', 'speed', and direction.
        """
        midline_y = frame_height // 2

        if len(detections) == 0:
            # Mark all existing objects as disappeared
            for obj_id in list(self.objects.keys()):
                self.objects[obj_id]['disappeared'] += 1
                if self.objects[obj_id]['disappeared'] > self.max_disappeared:
                    del self.objects[obj_id]
            return []

        # If no tracked objects yet, register all detections
        if len(self.objects) == 0:
            tracked_results = []
            for det in detections:
                obj_id = self.next_id
                self.next_id += 1
                bbox = det['bbox']
                cx = (bbox[0] + bbox[2]) // 2
                cy = (bbox[1] + bbox[3]) // 2
                self.objects[obj_id] = {
                    'bbox': bbox,
                    'centroid': (cx, cy),
                    'disappeared': 0,
                    'history': [(cx, cy)],
                    'class_name': det.get('class_name', 'Person')
                }
                enriched = dict(det)
                enriched['track_id'] = obj_id
                tracked_results.append(enriched)
            return tracked_results

        # Match detections to existing objects using IoU
        object_ids = list(self.objects.keys())
        iou_matrix = np.zeros((len(object_ids), len(detections)))

        for i, obj_id in enumerate(object_ids):
            for j, det in enumerate(detections):
                iou_matrix[i, j] = self._compute_iou(self.objects[obj_id]['bbox'], det['bbox'])

        matched_objects = set()
        matched_detections = set()

        if iou_matrix.size > 0:
            rows = iou_matrix.max(axis=1).argsort()[::-1]
            for row in rows:
                col = iou_matrix[row].argmax()
                if iou_matrix[row, col] >= self.iou_threshold:
                    matched_objects.add(row)
                    matched_detections.add(col)
                    obj_id = object_ids[row]
                    det = detections[col]
                    bbox = det['bbox']
                    cx = (bbox[0] + bbox[2]) // 2
                    cy = (bbox[1] + bbox[3]) // 2

                    # Check for entry/exit across midline
                    prev_cy = self.objects[obj_id]['centroid'][1]
                    if obj_id not in self.counted_ids:
                        if prev_cy < midline_y and cy >= midline_y:
                            self.entry_count += 1
                            self.counted_ids.add(obj_id)
                        elif prev_cy > midline_y and cy <= midline_y:
                            self.exit_count += 1
                            self.counted_ids.add(obj_id)

                    self.objects[obj_id]['bbox'] = bbox
                    self.objects[obj_id]['centroid'] = (cx, cy)
                    self.objects[obj_id]['disappeared'] = 0
                    self.objects[obj_id]['history'].append((cx, cy))
                    if len(self.objects[obj_id]['history']) > 30:
                        self.objects[obj_id]['history'].pop(0)

        # Build output enriched detections
        tracked_results = []
        for j, det in enumerate(detections):
            if j in matched_detections:
                # Find matching row
                for r in matched_objects:
                    if iou_matrix[r, j] >= self.iou_threshold:
                        obj_id = object_ids[r]
                        enriched = dict(det)
                        enriched['track_id'] = obj_id
                        tracked_results.append(enriched)
                        break
            else:
                # New object
                obj_id = self.next_id
                self.next_id += 1
                bbox = det['bbox']
                cx = (bbox[0] + bbox[2]) // 2
                cy = (bbox[1] + bbox[3]) // 2
                self.objects[obj_id] = {
                    'bbox': bbox,
                    'centroid': (cx, cy),
                    'disappeared': 0,
                    'history': [(cx, cy)],
                    'class_name': det.get('class_name', 'Person')
                }
                enriched = dict(det)
                enriched['track_id'] = obj_id
                tracked_results.append(enriched)

        # Clean up disappeared objects
        unmatched_rows = set(range(len(object_ids))) - matched_objects
        for r in unmatched_rows:
            obj_id = object_ids[r]
            self.objects[obj_id]['disappeared'] += 1
            if self.objects[obj_id]['disappeared'] > self.max_disappeared:
                del self.objects[obj_id]

        return tracked_results
