import cv2
import numpy as np
import threading
import time
import logging
import asyncio
from typing import Dict, Optional, Generator
from app.ai.detector import vision_pipeline
from app.database.database import SessionLocal
from app.database.models import Camera, SmartZone
from app.services.alert_service import alert_service
from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)

class CameraStreamWorker:
    def __init__(self, camera_id: str, source_type: str, source_url: str, name: str, location: str):
        self.camera_id = camera_id
        self.source_type = source_type
        self.source_url = source_url
        self.name = name
        self.location = location

        self.running = False
        self.thread: Optional[threading.Thread] = None
        self.cap: Optional[cv2.VideoCapture] = None

        self.latest_raw_frame: Optional[np.ndarray] = None
        self.latest_annotated_frame: Optional[np.ndarray] = None
        self.latest_metrics: Dict = {}
        self.fps: float = 0.0
        self.latency_ms: int = 35
        self.lock = threading.Lock()

        # For remote browser cameras: external frame buffer
        self.last_remote_frame_time = 0

    def start(self):
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._run_loop, daemon=True)
            self.thread.start()
            logger.info(f"Started camera worker for {self.camera_id} ({self.name})")

    def stop(self):
        self.running = False
        if self.cap is not None:
            self.cap.release()
            self.cap = None
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=1.0)
        logger.info(f"Stopped camera worker for {self.camera_id}")

    def update_remote_frame(self, frame: np.ndarray):
        """Called when a remote browser uploads a webcam frame."""
        with self.lock:
            self.latest_raw_frame = frame
            self.last_remote_frame_time = time.time()

    def _generate_synthetic_frame(self, text: str) -> np.ndarray:
        """Generates a synthetic SOC test pattern frame if camera device is offline or unavailable."""
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        img[:] = (20, 24, 30)  # Dark slate background

        # Draw grid lines
        for y in range(0, 480, 40):
            cv2.line(img, (0, y), (640, y), (35, 40, 50), 1)
        for x in range(0, 640, 40):
            cv2.line(img, (x, 0), (x, 480), (35, 40, 50), 1)

        cv2.putText(img, "SENTINELVISION AI - SYSTEM ACTIVE", (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 200), 2)
        cv2.putText(img, f"FEED: {self.name} [{self.camera_id}]", (30, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)
        cv2.putText(img, f"STATUS: {text}", (30, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 200, 255), 1)
        cv2.putText(img, time.strftime("%Y-%m-%d %H:%M:%S UTC"), (30, 450), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (160, 160, 160), 1)

        return img

    def _run_loop(self):
        # Open video source if local webcam or file or rtsp
        if self.source_type == "webcam":
            try:
                cam_index = int(self.source_url)
                self.cap = cv2.VideoCapture(cam_index, cv2.CAP_DSHOW if cv2.CAP_DSHOW else cv2.CAP_ANY)
            except Exception:
                self.cap = None
        elif self.source_type in ["file", "rtsp"]:
            try:
                self.cap = cv2.VideoCapture(self.source_url)
            except Exception:
                self.cap = None

        frame_count = 0
        start_time = time.time()

        while self.running:
            loop_start = time.time()
            frame = None

            if self.source_type == "remote":
                # Wait for frames pushed from remote browser
                with self.lock:
                    if self.latest_raw_frame is not None and (time.time() - self.last_remote_frame_time < 5.0):
                        frame = self.latest_raw_frame.copy()
                    else:
                        frame = self._generate_synthetic_frame("WAITING FOR REMOTE BROWSER STREAM...")
            else:
                if self.cap is not None and self.cap.isOpened():
                    ret, raw = self.cap.read()
                    if ret and raw is not None:
                        frame = raw
                    else:
                        # End of file loop or camera lost
                        if self.source_type == "file":
                            self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        else:
                            frame = self._generate_synthetic_frame("DEVICE DISCONNECTED / RETRYING")
                else:
                    frame = self._generate_synthetic_frame("STANDBY / SIMULATION STREAM")

            if frame is None:
                time.sleep(0.05)
                continue

            # Load any active smart zones for this camera from DB
            zones = []
            try:
                db = SessionLocal()
                db_zones = db.query(SmartZone).filter(SmartZone.camera_id == self.camera_id, SmartZone.is_active == True).all()
                for z in db_zones:
                    zones.append({
                        "id": z.id,
                        "name": z.name,
                        "zone_type": z.zone_type,
                        "polygon_points": z.polygon_points
                    })
                db.close()
            except Exception as e:
                logger.warning(f"Error fetching zones: {e}")

            # Run Master AI pipeline
            t_inf_start = time.time()
            result = vision_pipeline.process_frame(self.camera_id, frame, zones=zones)
            inf_time = time.time() - t_inf_start

            annotated = result.get("annotated_frame", frame)
            confirmed = result.get("confirmed_events", [])
            metrics = result.get("metrics", {})

            # If any confirmed events occurred, trigger alert service
            if confirmed:
                try:
                    db = SessionLocal()
                    for evt in confirmed:
                        # Schedule incident creation
                        asyncio.run(alert_service.create_incident(
                            db=db,
                            camera_id=self.camera_id,
                            camera_name=self.name,
                            location=self.location,
                            event=evt,
                            frame=annotated
                        ))
                    db.close()
                except Exception as e:
                    logger.error(f"Error handling confirmed events: {e}")

            frame_count += 1
            elapsed = time.time() - start_time
            if elapsed >= 1.0:
                self.fps = round(frame_count / elapsed, 1)
                frame_count = 0
                start_time = time.time()

            self.latency_ms = int(inf_time * 1000)

            with self.lock:
                self.latest_annotated_frame = annotated
                self.latest_metrics = metrics

            # Target ~20-25 FPS loop
            process_dur = time.time() - loop_start
            sleep_time = max(0.01, 0.04 - process_dur)
            time.sleep(sleep_time)

    def get_latest_jpeg(self) -> bytes:
        with self.lock:
            frame = self.latest_annotated_frame
            if frame is None:
                frame = self._generate_synthetic_frame("INITIALIZING...")
            ret, jpeg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
            return jpeg.tobytes() if ret else b""

class CameraService:
    def __init__(self):
        self.workers: Dict[str, CameraStreamWorker] = {}

    def init_default_cameras(self, db: SessionLocal):
        """Initializes default camera registry and starts workers."""
        default_cams = [
            {"id": "CAM-01", "name": "Main Entrance Gate", "location": "Perimeter North", "source_type": "webcam", "source_url": "0"},
            {"id": "CAM-02", "name": "Parking Area West", "location": "Vehicle Bay 2", "source_type": "file", "source_url": "demo_loop"},
            {"id": "CAM-03", "name": "Remote Laptop Stream", "location": "Mobile Patrol Unit", "source_type": "remote", "source_url": "remote"},
            {"id": "CAM-04", "name": "Central Plaza & Lobby", "location": "Main Building Floor 1", "source_type": "file", "source_url": "demo_loop"},
        ]

        for c_data in default_cams:
            existing = db.query(Camera).filter(Camera.id == c_data["id"]).first()
            if not existing:
                cam = Camera(
                    id=c_data["id"],
                    name=c_data["name"],
                    location=c_data["location"],
                    source_type=c_data["source_type"],
                    source_url=c_data["source_url"],
                    status="online",
                    fps=25,
                    resolution="1280x720",
                    is_active=True,
                    ai_active=True
                )
                db.add(cam)
                db.commit()

        # Start workers for active cameras
        cams = db.query(Camera).filter(Camera.is_active == True).all()
        for cam in cams:
            self.start_worker(cam.id, cam.source_type, cam.source_url, cam.name, cam.location)

    def start_worker(self, camera_id: str, source_type: str, source_url: str, name: str, location: str):
        if camera_id in self.workers:
            self.workers[camera_id].stop()
        worker = CameraStreamWorker(camera_id, source_type, source_url, name, location)
        self.workers[camera_id] = worker
        worker.start()

    def stop_worker(self, camera_id: str):
        if camera_id in self.workers:
            self.workers[camera_id].stop()
            del self.workers[camera_id]

    def get_worker(self, camera_id: str) -> Optional[CameraStreamWorker]:
        return self.workers.get(camera_id)

camera_service = CameraService()
