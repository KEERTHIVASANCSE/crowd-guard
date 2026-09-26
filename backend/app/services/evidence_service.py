import os
import cv2
import numpy as np
import logging
from app.config import settings

logger = logging.getLogger(__name__)

class EvidenceService:
    def __init__(self):
        os.makedirs(settings.EVIDENCE_DIR, exist_ok=True)

    def save_snapshot(self, incident_id: str, frame: np.ndarray) -> str:
        """
        Saves snapshot of the incident frame and returns the relative URL path.
        """
        if frame is None or frame.size == 0:
            return ""

        filename = f"{incident_id}.jpg"
        filepath = os.path.join(settings.EVIDENCE_DIR, filename)

        try:
            cv2.imwrite(filepath, frame)
            logger.info(f"Saved incident evidence snapshot to {filepath}")
            return f"/static/evidence/{filename}"
        except Exception as e:
            logger.error(f"Failed to save evidence snapshot: {e}")
            return ""

evidence_service = EvidenceService()
