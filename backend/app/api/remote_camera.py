import base64
import cv2
import numpy as np
from fastapi import APIRouter, HTTPException, Request, Body
from pydantic import BaseModel
from app.services.camera_service import camera_service

router = APIRouter(prefix="/api/remote_camera", tags=["Remote Camera"])

class RemoteFramePayload(BaseModel):
    camera_id: str = "CAM-03"
    image_base64: str  # Data URL or raw base64 JPEG/PNG

@router.post("/push_frame")
async def push_remote_frame(payload: RemoteFramePayload):
    """
    Accepts webcam frame pushed by a remote device (e.g. secondary laptop or smartphone).
    Decodes the frame and injects it into the AI pipeline for CAM-03.
    """
    try:
        data_str = payload.image_base64
        if "," in data_str:
            data_str = data_str.split(",")[1]

        image_bytes = base64.b64decode(data_str)
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            raise HTTPException(status_code=400, detail="Could not decode image")

        worker = camera_service.get_worker(payload.camera_id)
        if not worker:
            raise HTTPException(status_code=404, detail=f"Camera worker for {payload.camera_id} not found")

        worker.update_remote_frame(frame)
        return {"status": "success", "fps": worker.fps, "latency_ms": worker.latency_ms}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing frame: {str(e)}")
