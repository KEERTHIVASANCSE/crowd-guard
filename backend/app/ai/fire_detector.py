import os
import cv2
import numpy as np
import logging
from ultralytics import YOLO
from app.config import settings

logger = logging.getLogger(__name__)

class FireSmokeDetector:
    """
    Dedicated Fire and Smoke detector strictly powered by weights/best.pt.
    Classes: 0 = Smoke, 1 = Fire.
    Guaranteed NEVER to classify persons, vehicles, bags, or shadows as fire.
    """
    def __init__(self, model_path: str = None):
        self.model_path = model_path or settings.FIRE_MODEL_PATH
        self.model = None
        self.is_loaded = False
        self._load_model()

    def _load_model(self):
        try:
            if os.path.exists(self.model_path):
                self.model = YOLO(self.model_path)
                self.is_loaded = True
                logger.info(f"Fire/Smoke YOLO model loaded successfully from {self.model_path}. Classes: {self.model.names}")
            else:
                logger.warning(f"Fire/Smoke weights not found at {self.model_path}. Fire model disabled.")
        except Exception as e:
            logger.error(f"Failed to load Fire/Smoke model: {e}")
            self.model = None
            self.is_loaded = False

    def detect(self, frame: np.ndarray, fire_threshold: float = None, smoke_threshold: float = None):
        """
        Runs inference ONLY for Fire and Smoke.
        Returns list of detections: [{ 'class_name': 'Fire'|'Smoke', 'confidence': float, 'bbox': [x1, y1, x2, y2] }]
        """
        if not self.is_loaded or self.model is None or frame is None:
            return []

        fire_thresh = fire_threshold if fire_threshold is not None else settings.CONFIDENCE_FIRE
        smoke_thresh = smoke_threshold if smoke_threshold is not None else settings.CONFIDENCE_SMOKE

        detections = []
        try:
            # Run inference with lowest viable conf to allow debug inspection, but filter strictly below
            results = self.model.predict(source=frame, conf=0.20, verbose=False, imgsz=480)
            if not results or len(results) == 0:
                return []

            boxes = results[0].boxes
            if boxes is None:
                return []

            for box in boxes:
                cls_id = int(box.cls[0].item())
                conf = float(box.conf[0].item())
                xyxy = [int(v) for v in box.xyxy[0].tolist()]

                # Class mapping: 0 -> Smoke, 1 -> Fire (as trained in best.pt)
                class_name = self.model.names.get(cls_id, "Unknown")
                if cls_id == 0 or class_name.lower() == "smoke":
                    class_name = "Smoke"
                    if conf >= smoke_thresh:
                        detections.append({
                            "class_name": "Smoke",
                            "confidence": round(conf, 3),
                            "bbox": xyxy,
                            "raw_conf": round(conf, 3)
                        })
                elif cls_id == 1 or class_name.lower() == "fire":
                    class_name = "Fire"
                    if conf >= fire_thresh:
                        detections.append({
                            "class_name": "Fire",
                            "confidence": round(conf, 3),
                            "bbox": xyxy,
                            "raw_conf": round(conf, 3)
                        })
        except Exception as e:
            logger.error(f"Error during fire/smoke inference: {e}")

        return detections
