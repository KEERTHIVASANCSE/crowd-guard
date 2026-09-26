import os
import cv2
import numpy as np
import logging
from ultralytics import YOLO
from app.config import settings

logger = logging.getLogger(__name__)

# COCO class IDs of interest
PERSON_CLASS = 0
VEHICLE_CLASSES = {1: "Bicycle", 2: "Car", 3: "Motorcycle", 5: "Bus", 7: "Truck"}
WEAPON_CLASSES = {43: "Knife"}  # standard COCO knife class

class PersonVehicleDetector:
    """
    Detects People, Vehicles, and threat items using standard YOLO.
    """
    def __init__(self, model_path: str = None):
        self.model_path = model_path or settings.YOLO_MODEL_PATH
        self.model = None
        self.is_loaded = False
        self._load_model()

    def _load_model(self):
        try:
            # Ultralytics will auto-download yolov8n.pt if not found locally
            self.model = YOLO(self.model_path)
            self.is_loaded = True
            logger.info(f"Person/Vehicle YOLO model loaded successfully from {self.model_path}.")
        except Exception as e:
            logger.error(f"Failed to load Person/Vehicle YOLO model: {e}")
            self.model = None
            self.is_loaded = False

    def detect(self, frame: np.ndarray, person_threshold: float = None, vehicle_threshold: float = None):
        if not self.is_loaded or self.model is None or frame is None:
            return {"people": [], "vehicles": [], "weapons": []}

        p_thresh = person_threshold if person_threshold is not None else settings.CONFIDENCE_PERSON
        v_thresh = vehicle_threshold if vehicle_threshold is not None else settings.CONFIDENCE_VEHICLE
        w_thresh = settings.CONFIDENCE_WEAPON

        people = []
        vehicles = []
        weapons = []

        try:
            results = self.model.predict(source=frame, conf=0.25, verbose=False, imgsz=480)
            if not results or len(results) == 0:
                return {"people": people, "vehicles": vehicles, "weapons": weapons}

            boxes = results[0].boxes
            if boxes is None:
                return {"people": people, "vehicles": vehicles, "weapons": weapons}

            for box in boxes:
                cls_id = int(box.cls[0].item())
                conf = float(box.conf[0].item())
                xyxy = [int(v) for v in box.xyxy[0].tolist()]

                if cls_id == PERSON_CLASS:
                    if conf >= p_thresh:
                        people.append({
                            "class_name": "Person",
                            "confidence": round(conf, 3),
                            "bbox": xyxy
                        })
                elif cls_id in VEHICLE_CLASSES:
                    if conf >= v_thresh:
                        vehicles.append({
                            "class_name": VEHICLE_CLASSES[cls_id],
                            "confidence": round(conf, 3),
                            "bbox": xyxy
                        })
                elif cls_id in WEAPON_CLASSES:
                    if conf >= w_thresh:
                        weapons.append({
                            "class_name": WEAPON_CLASSES[cls_id],
                            "confidence": round(conf, 3),
                            "bbox": xyxy
                        })
        except Exception as e:
            logger.error(f"Error during Person/Vehicle detection: {e}")

        return {
            "people": people,
            "vehicles": vehicles,
            "weapons": weapons
        }
