import os
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database.database import engine, Base, SessionLocal
from app.database.models import User
from app.api.auth import router as auth_router, seed_default_users
from app.api.cameras import router as cameras_router
from app.api.remote_camera import router as remote_camera_router
from app.api.incidents import router as incidents_router
from app.api.emergency import router as emergency_router
from app.api.zones import router as zones_router
from app.api.analytics import router as analytics_router
from app.api.system import router as system_router
from app.api.settings import router as settings_router
from app.api.video_analysis import router as video_analysis_router
from app.services.camera_service import camera_service
from app.websocket.manager import ws_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("SentinelVision")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="SentinelVision AI - Intelligent Crowd Monitoring & Real-Time Threat Detection Platform"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static directory for evidence snapshots and media
os.makedirs(settings.EVIDENCE_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")

# Include API routers
app.include_router(auth_router)
app.include_router(cameras_router)
app.include_router(remote_camera_router)
app.include_router(incidents_router)
app.include_router(emergency_router)
app.include_router(zones_router)
app.include_router(analytics_router)
app.include_router(system_router)
app.include_router(settings_router)
app.include_router(video_analysis_router)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, role: str = Query("user")):
    """
    WebSocket endpoint for real-time telemetry, incidents, and department alerts.
    """
    await ws_manager.connect(websocket, role=role)
    try:
        while True:
            # Keep socket alive and receive heartbeat / client messages
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket connection error: {e}")
        ws_manager.disconnect(websocket)

@app.on_event("startup")
def startup_event():
    logger.info("Initializing SentinelVision AI Database and Services...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_default_users(db)
        camera_service.init_default_cameras(db)
        logger.info("Database initialized with default credentials and cameras.")
    finally:
        db.close()

@app.on_event("shutdown")
def shutdown_event():
    logger.info("Shutting down SentinelVision AI camera workers...")
    for cam_id in list(camera_service.workers.keys()):
        camera_service.stop_worker(cam_id)

@app.get("/api/health")
def root_health():
    return {
        "status": "ONLINE",
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "ai_engine": "ACTIVE"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
