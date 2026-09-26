import os
import cv2
import json
import time
import uuid
import datetime
import threading
import logging
from typing import Dict, Optional
from app.ai.detector import vision_pipeline
from app.database.database import SessionLocal
from app.database.models import VideoAnalysisJob, Incident, ResponseTimeline
from app.config import settings

logger = logging.getLogger(__name__)

OUTPUTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "outputs")
os.makedirs(OUTPUTS_DIR, exist_ok=True)
os.makedirs(os.path.join(OUTPUTS_DIR, "evidence"), exist_ok=True)

class VideoAnalysisService:
    def __init__(self):
        self.active_jobs: Dict[str, Dict] = {}

    def start_analysis_job(self, file_path: str, filename: str) -> str:
        job_id = f"JOB-{uuid.uuid4().hex[:8].upper()}"

        db = SessionLocal()
        job = VideoAnalysisJob(
            id=job_id,
            filename=filename,
            status="PROCESSING",
            progress_percent=0.0,
            created_at=datetime.datetime.utcnow()
        )
        db.add(job)
        db.commit()
        db.close()

        # Run background worker thread
        t = threading.Thread(target=self._process_video, args=(job_id, file_path, filename), daemon=True)
        t.start()
        return job_id

    def _process_video(self, job_id: str, input_path: str, original_filename: str):
        logger.info(f"Beginning full-stack AI analysis on video job {job_id} ({original_filename})")
        db = SessionLocal()
        job = db.query(VideoAnalysisJob).filter(VideoAnalysisJob.id == job_id).first()

        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            logger.error(f"Failed to open video file {input_path}")
            if job:
                job.status = "FAILED"
                job.error_message = "Could not decode video file"
                db.commit()
            db.close()
            return

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = int(cap.get(cv2.CAP_PROP_FPS)) or 25
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        # Output paths
        output_video_name = f"annotated_{job_id}.mp4"
        output_video_path = os.path.join(OUTPUTS_DIR, output_video_name)
        output_json_name = f"incidents_{job_id}.json"
        output_json_path = os.path.join(OUTPUTS_DIR, output_json_name)

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_video_path, fourcc, fps, (w, h))

        frame_idx = 0
        detected_incidents = []
        threat_count = 0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret or frame is None:
                break

            frame_idx += 1

            # Run Multi-Model Vision Pipeline
            res = vision_pipeline.process_frame(
                camera_id=f"FILE-{job_id[-4:]}",
                frame=frame,
                frame_number=frame_idx
            )

            annotated = res.get("annotated_frame", frame)
            confirmed = res.get("confirmed_events", [])

            # For every confirmed event, record incident
            for evt in confirmed:
                threat_count += 1
                inc_id = f"INC-V{frame_idx:05d}"
                evt_type = evt.get("event_type")
                severity = evt.get("severity", "HIGH")
                conf = float(evt.get("confidence", 0.85))
                reason = evt.get("reason", "Multi-model temporal validation confirmed threat")
                t_ids = evt.get("tracking_id", "")

                # Save snapshot
                snap_name = f"{inc_id}.jpg"
                snap_path = os.path.join(OUTPUTS_DIR, "evidence", snap_name)
                cv2.imwrite(snap_path, annotated)

                inc_entry = {
                    "id": inc_id,
                    "job_id": job_id,
                    "frame_number": frame_idx,
                    "timestamp": str(datetime.timedelta(seconds=int(frame_idx / max(fps, 1)))),
                    "incident_type": evt_type,
                    "severity": severity,
                    "confidence": conf,
                    "tracking_ids": t_ids,
                    "bbox": evt.get("bbox", []),
                    "evidence_snapshot": f"/static/evidence/{snap_name}",
                    "reason": reason,
                    "status": "NEW"
                }
                detected_incidents.append(inc_entry)

                # Also save to main incidents table
                new_inc = Incident(
                    id=inc_id,
                    incident_type=evt_type,
                    camera_id=f"FILE-{job_id[-4:]}",
                    camera_name=f"Uploaded CCTV: {original_filename}",
                    location="Video Analysis Lab",
                    timestamp=datetime.datetime.utcnow(),
                    severity=severity,
                    confidence=conf,
                    status="NEW",
                    snapshot_path=f"/static/evidence/{snap_name}",
                    frame_number=frame_idx,
                    tracking_ids=t_ids,
                    ai_summary=reason,
                    evidence_reason=reason
                )
                db.add(new_inc)
                db.commit()

            # Write frame to output video
            out.write(annotated)

            # Update DB progress every 30 frames
            if frame_idx % 30 == 0 or frame_idx == total_frames:
                progress = round((frame_idx / max(total_frames, 1)) * 100, 1)
                if job:
                    job.processed_frames = frame_idx
                    job.total_frames = total_frames
                    job.progress_percent = progress
                    job.threats_detected = threat_count
                    db.commit()

        cap.release()
        out.release()

        # Write JSON Report
        with open(output_json_path, 'w') as jf:
            json.dump({
                "job_id": job_id,
                "video_file": original_filename,
                "total_frames": total_frames,
                "fps": fps,
                "resolution": f"{w}x{h}",
                "analysis_completed_at": datetime.datetime.utcnow().isoformat(),
                "threats_count": threat_count,
                "incidents": detected_incidents
            }, jf, indent=2)

        # Update job completion in database
        if job:
            job.status = "COMPLETED"
            job.progress_percent = 100.0
            job.processed_frames = frame_idx
            job.total_frames = total_frames
            job.threats_detected = threat_count
            job.output_video_path = f"/outputs/{output_video_name}"
            job.output_json_path = f"/outputs/{output_json_name}"
            job.completed_at = datetime.datetime.utcnow()
            db.commit()

        db.close()
        logger.info(f"Video analysis job {job_id} completed successfully. Threats identified: {threat_count}")

video_analysis_service = VideoAnalysisService()
