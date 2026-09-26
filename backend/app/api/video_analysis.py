import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import VideoAnalysisJob
from app.services.video_analysis_service import video_analysis_service, OUTPUTS_DIR

router = APIRouter(prefix="/api/video-analysis", tags=["Video Analysis Lab"])

UPLOAD_TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads_temp")
os.makedirs(UPLOAD_TEMP_DIR, exist_ok=True)


def format_job_response(job: VideoAnalysisJob):
    return {
        "id": job.id,
        "filename": job.filename,
        "camera_id": getattr(job, "camera_id", "CAM-LAB-01"),
        "status": job.status,
        "progress": job.progress_percent,
        "progress_percent": job.progress_percent,
        "total_frames": job.total_frames,
        "processed_frames": job.processed_frames,
        "fps": 25,
        "incident_count": job.threats_detected,
        "threats_detected": job.threats_detected,
        "output_video_url": f"/api/video-analysis/{job.id}/download-video" if job.status == "COMPLETED" else None,
        "output_json_url": f"/api/video-analysis/{job.id}/download-json" if job.status == "COMPLETED" else None,
        "created_at": job.created_at.isoformat() if hasattr(job, "created_at") and job.created_at else "",
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "error_message": job.error_message
    }


@router.post("/upload")
async def upload_video_for_analysis(file: UploadFile = File(...), camera_id: str = "CAM-LAB-01"):
    if not file.filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv')):
        raise HTTPException(status_code=400, detail="Unsupported video format. Please upload MP4, AVI, or MOV.")

    temp_path = os.path.join(UPLOAD_TEMP_DIR, file.filename)
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    job_id = video_analysis_service.start_analysis_job(temp_path, file.filename)

    return {
        "id": job_id,
        "job_id": job_id,
        "filename": file.filename,
        "camera_id": camera_id,
        "status": "PROCESSING",
        "progress": 0,
        "total_frames": 0,
        "processed_frames": 0,
        "fps": 25,
        "incident_count": 0,
        "message": "Video uploaded successfully. AI multi-model analysis running in background."
    }


@router.get("/jobs")
def get_all_jobs(db: Session = Depends(get_db)):
    jobs = db.query(VideoAnalysisJob).order_by(VideoAnalysisJob.created_at.desc()).all()
    return [format_job_response(j) for j in jobs]


@router.get("/status/{job_id}")
@router.get("/{job_id}")
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(VideoAnalysisJob).filter(VideoAnalysisJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Analysis job not found")
    return format_job_response(job)


@router.get("/download/{job_id}/video")
@router.get("/{job_id}/download-video")
def download_annotated_video(job_id: str):
    path = os.path.join(OUTPUTS_DIR, f"annotated_{job_id}.mp4")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Annotated video not ready or not found")
    return FileResponse(path, media_type="video/mp4", filename=f"sentinelvision_annotated_{job_id}.mp4")


@router.get("/download/{job_id}/incidents")
@router.get("/{job_id}/download-json")
def download_incidents_json(job_id: str):
    path = os.path.join(OUTPUTS_DIR, f"incidents_{job_id}.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Incident report not found")
    return FileResponse(path, media_type="application/json", filename=f"incidents_{job_id}.json")
