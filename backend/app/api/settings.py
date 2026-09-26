from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.config import settings
from app.api.auth import get_current_user
from app.database.models import User

router = APIRouter(prefix="/api/settings", tags=["Configuration & Rules"])

class ThresholdSettingsUpdate(BaseModel):
    confidence_person: float
    confidence_vehicle: float
    confidence_fire: float
    confidence_smoke: float
    confidence_weapon: float
    confidence_fight: float
    confidence_fall: float
    privacy_blur_faces: bool = False

current_settings = {
    "confidence_person": settings.CONFIDENCE_PERSON,
    "confidence_vehicle": settings.CONFIDENCE_VEHICLE,
    "confidence_fire": settings.CONFIDENCE_FIRE,
    "confidence_smoke": settings.CONFIDENCE_SMOKE,
    "confidence_weapon": settings.CONFIDENCE_WEAPON,
    "confidence_fight": settings.CONFIDENCE_FIGHT,
    "confidence_fall": settings.CONFIDENCE_FALL,
    "privacy_blur_faces": False
}

@router.get("")
def get_settings():
    return current_settings

@router.put("")
def update_settings(new_settings: ThresholdSettingsUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required to update settings")

    current_settings["confidence_person"] = new_settings.confidence_person
    current_settings["confidence_vehicle"] = new_settings.confidence_vehicle
    current_settings["confidence_fire"] = new_settings.confidence_fire
    current_settings["confidence_smoke"] = new_settings.confidence_smoke
    current_settings["confidence_weapon"] = new_settings.confidence_weapon
    current_settings["confidence_fight"] = new_settings.confidence_fight
    current_settings["confidence_fall"] = new_settings.confidence_fall
    current_settings["privacy_blur_faces"] = new_settings.privacy_blur_faces

    # Update backend runtime
    settings.CONFIDENCE_PERSON = new_settings.confidence_person
    settings.CONFIDENCE_VEHICLE = new_settings.confidence_vehicle
    settings.CONFIDENCE_FIRE = new_settings.confidence_fire
    settings.CONFIDENCE_SMOKE = new_settings.confidence_smoke
    settings.CONFIDENCE_WEAPON = new_settings.confidence_weapon
    settings.CONFIDENCE_FIGHT = new_settings.confidence_fight
    settings.CONFIDENCE_FALL = new_settings.confidence_fall

    return {"message": "Settings updated successfully", "settings": current_settings}
