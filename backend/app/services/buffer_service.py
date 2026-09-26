import os
import cv2
import time
import threading
import logging
from collections import deque
from typing import Dict, Optional
from app.config import settings

logger = logging.getLogger(__name__)

class RollingBufferService:
    """
    Maintains circular memory buffers of recent video frames (10 seconds)
    per active camera to extract pre/post event incident video clips.
    """
    def __init__(self, buffer_duration_sec: int = 10, target_fps: int = 20):
        self.buffer_size = buffer_duration_sec * target_fps
        self.buffers: Dict[str, deque] = {}  # camera_id -> deque of (timestamp, frame)
        self.locks: Dict[str, threading.Lock] = {}

    def append_frame(self, camera_id: str, frame: cv2.Mat):
        if camera_id not in self.buffers:
            self.buffers[camera_id] = deque(maxlen=self.buffer_size)
            self.locks[camera_id] = threading.Lock()

        with self.locks[camera_id]:
            self.buffers[camera_id].append((time.time(), frame.copy()))

    def save_incident_clip(self, camera_id: str, incident_id: str, extra_frames: list = None) -> Optional[str]:
        """
        Exports rolling pre-event buffer + incident frames to MP4 clip.
        Returns relative web path to saved video clip.
        """
        if camera_id not in self.buffers or len(self.buffers[camera_id]) == 0:
            return None

        os.makedirs(settings.EVIDENCE_DIR, exist_ok=True)
        filename = f"{incident_id}_clip.mp4"
        filepath = os.path.join(settings.EVIDENCE_DIR, filename)

        with self.locks[camera_id]:
            cached_frames = [item[1] for item in list(self.buffers[camera_id])]

        all_frames = cached_frames + (extra_frames or [])
        if len(all_frames) == 0:
            return None

        h, w = all_frames[0].shape[:2]
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(filepath, fourcc, 15.0, (w, h))

        for f in all_frames:
            if f.shape[:2] == (h, w):
                out.write(f)
        out.release()

        logger.info(f"Saved incident forensic clip ({len(all_frames)} frames) to {filepath}")
        return f"/static/evidence/{filename}"

buffer_service = RollingBufferService()
