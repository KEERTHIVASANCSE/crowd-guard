import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import Camera, User, AuditLog
from app.api.auth import get_current_user
from app.services.camera_service import camera_service

router = APIRouter(prefix="/api/cameras", tags=["Cameras"])

class CameraCreate(BaseModel):
    id: str
    name: str
    location: str
    source_type: str = "webcam"  # webcam, remote, rtsp, file
    source_url: str = "0"
    resolution: str = "1280x720"

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    source_type: Optional[str] = None
    source_url: Optional[str] = None
    is_active: Optional[bool] = None
    ai_active: Optional[bool] = None

@router.get("")
def get_cameras(db: Session = Depends(get_db)):
    cams = db.query(Camera).all()
    results = []
    for c in cams:
        worker = camera_service.get_worker(c.id)
        fps = worker.fps if worker else c.fps
        latency = worker.latency_ms if worker else c.latency_ms
        metrics = worker.latest_metrics if worker else {}

        results.append({
            "id": c.id,
            "name": c.name,
            "location": c.location,
            "source_type": c.source_type,
            "source_url": c.source_url,
            "status": c.status if c.is_active else "offline",
            "fps": fps,
            "resolution": c.resolution,
            "latency_ms": latency,
            "is_active": c.is_active,
            "ai_active": c.ai_active,
            "total_people": metrics.get("total_people", 0),
            "total_vehicles": metrics.get("total_vehicles", 0),
            "crowd_density": metrics.get("crowd", {}).get("density_level", "LOW"),
            "occupancy_pct": metrics.get("crowd", {}).get("occupancy_percentage", 0.0),
            "fire_active": metrics.get("fire_detected", False),
            "smoke_active": metrics.get("smoke_detected", False)
        })
    return results

@router.get("/{camera_id}")
def get_camera(camera_id: str, db: Session = Depends(get_db)):
    cam = db.query(Camera).filter(Camera.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")

    worker = camera_service.get_worker(camera_id)
    fps = worker.fps if worker else cam.fps
    latency = worker.latency_ms if worker else cam.latency_ms
    metrics = worker.latest_metrics if worker else {}

    return {
        "id": cam.id,
        "name": cam.name,
        "location": cam.location,
        "source_type": cam.source_type,
        "source_url": cam.source_url,
        "status": cam.status,
        "fps": fps,
        "resolution": cam.resolution,
        "latency_ms": latency,
        "is_active": cam.is_active,
        "ai_active": cam.ai_active,
        "metrics": metrics
    }

@router.post("", status_code=status.HTTP_201_CREATED)
def add_camera(cam_data: CameraCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")

    existing = db.query(Camera).filter(Camera.id == cam_data.id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Camera with ID {cam_data.id} already exists")

    cam = Camera(
        id=cam_data.id,
        name=cam_data.name,
        location=cam_data.location,
        source_type=cam_data.source_type,
        source_url=cam_data.source_url,
        status="online",
        fps=25,
        resolution=cam_data.resolution,
        is_active=True,
        ai_active=True
    )
    db.add(cam)

    log = AuditLog(
        user_username=current_user.username,
        action="CAMERA_ADDED",
        details=f"Added camera {cam.id} ({cam.name})"
    )
    db.add(log)
    db.commit()

    camera_service.start_worker(cam.id, cam.source_type, cam.source_url, cam.name, cam.location)
    return cam

@router.put("/{camera_id}")
def update_camera(camera_id: str, update_data: CameraUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")

    cam = db.query(Camera).filter(Camera.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")

    if update_data.name is not None:
        cam.name = update_data.name
    if update_data.location is not None:
        cam.location = update_data.location
    if update_data.source_type is not None:
        cam.source_type = update_data.source_type
    if update_data.source_url is not None:
        cam.source_url = update_data.source_url
    if update_data.is_active is not None:
        cam.is_active = update_data.is_active
    if update_data.ai_active is not None:
        cam.ai_active = update_data.ai_active

    db.commit()
    # Restart worker with updated config
    camera_service.start_worker(cam.id, cam.source_type, cam.source_url, cam.name, cam.location)
    return cam

@router.delete("/{camera_id}")
def delete_camera(camera_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")

    cam = db.query(Camera).filter(Camera.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")

    camera_service.stop_worker(camera_id)
    db.delete(cam)

    log = AuditLog(
        user_username=current_user.username,
        action="CAMERA_REMOVED",
        details=f"Removed camera {camera_id}"
    )
    db.add(log)
    db.commit()
    return {"message": f"Camera {camera_id} deleted successfully"}

def _generate_mjpeg(camera_id: str):
    worker = camera_service.get_worker(camera_id)
    while True:
        if worker:
            jpeg = worker.get_latest_jpeg()
            if jpeg:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + jpeg + b'\r\n')
        time.sleep(0.04)  # ~25 FPS

@router.get("/{camera_id}/stream")
def stream_camera(camera_id: str):
    return StreamingResponse(_generate_mjpeg(camera_id), media_type="multipart/x-mixed-replace; boundary=frame")

@router.get("/{camera_id}/snapshot")
def get_camera_snapshot(camera_id: str):
    worker = camera_service.get_worker(camera_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Camera stream not available")
    jpeg = worker.get_latest_jpeg()
    return Response(content=jpeg, media_type="image/jpeg")
