import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SentinelVision AI"
    VERSION: str = "2.0.0"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "sentinelvision-super-secure-jwt-secret-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./sentinelvision.db")

    # AI Model paths
    FIRE_MODEL_PATH: str = os.getenv("FIRE_MODEL_PATH", "weights/best.pt")
    YOLO_MODEL_PATH: str = os.getenv("YOLO_MODEL_PATH", "yolov8n.pt")

    # Strict confidence thresholds (0.0 to 1.0)
    CONFIDENCE_PERSON: float = 0.50
    CONFIDENCE_VEHICLE: float = 0.50
    CONFIDENCE_FIRE: float = 0.75
    CONFIDENCE_SMOKE: float = 0.70
    CONFIDENCE_WEAPON: float = 0.75
    CONFIDENCE_FIGHT: float = 0.75
    CONFIDENCE_FALL: float = 0.70

    # Temporal persistence requirements (consecutive frames needed to trigger confirmed alert)
    FIRE_PERSISTENCE_FRAMES: int = 3
    SMOKE_PERSISTENCE_FRAMES: int = 3
    FIGHT_PERSISTENCE_FRAMES: int = 2
    FALL_PERSISTENCE_FRAMES: int = 3
    INTRUSION_PERSISTENCE_FRAMES: int = 2

    # Storage paths
    STATIC_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
    EVIDENCE_DIR: str = os.path.join(STATIC_DIR, "evidence")

    class Config:
        case_sensitive = True

settings = Settings()
