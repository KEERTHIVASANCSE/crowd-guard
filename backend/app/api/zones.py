import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import SmartZone, User
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/zones", tags=["Smart Zones"])

class SmartZoneCreate(BaseModel):
    camera_id: str
    name: str
    zone_type: str = "restricted"  # restricted, entry, exit, high_density
    polygon_points: List[List[float]]  # list of [x, y] normalized points
    rule_type: str = "INTRUSION"

@router.get("/{camera_id}")
def get_camera_zones(camera_id: str, db: Session = Depends(get_db)):
    zones = db.query(SmartZone).filter(
        SmartZone.camera_id == camera_id,
        SmartZone.is_active == True
    ).all()

    results = []
    for z in zones:
        try:
            pts = json.loads(z.polygon_points)
        except Exception:
            pts = []
        results.append({
            "id": z.id,
            "camera_id": z.camera_id,
            "name": z.name,
            "zone_type": z.zone_type,
            "polygon_points": pts,
            "rule_type": z.rule_type
        })
    return results

@router.post("", status_code=status.HTTP_201_CREATED)
def create_zone(
    zone_in: SmartZoneCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required to configure zones")

    new_zone = SmartZone(
        camera_id=zone_in.camera_id,
        name=zone_in.name,
        zone_type=zone_in.zone_type,
        polygon_points=json.dumps(zone_in.polygon_points),
        rule_type=zone_in.rule_type,
        is_active=True
    )
    db.add(new_zone)
    db.commit()
    db.refresh(new_zone)

    return {
        "id": new_zone.id,
        "camera_id": new_zone.camera_id,
        "name": new_zone.name,
        "zone_type": new_zone.zone_type,
        "polygon_points": zone_in.polygon_points,
        "rule_type": new_zone.rule_type
    }

@router.delete("/{zone_id}")
def delete_zone(
    zone_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")

    zone = db.query(SmartZone).filter(SmartZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    db.delete(zone)
    db.commit()
    return {"message": "Zone deleted successfully"}
