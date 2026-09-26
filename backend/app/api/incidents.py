import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import Incident, ResponseTimeline, User, AuditLog
from app.api.auth import get_current_user
from app.services.alert_service import alert_service
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])

class IncidentStatusUpdate(BaseModel):
    status: str  # NEW, ACKNOWLEDGED, INVESTIGATING, RESOLVED, DISMISSED, FALSE_POSITIVE
    notes: Optional[str] = None

class IncidentDismissRequest(BaseModel):
    dismiss_reason: str  # Mandatory explanation: e.g. "FALSE POSITIVE: Steam from radiator triggered candidate"
    is_false_positive: bool = True

class NaturalLanguageSearchRequest(BaseModel):
    query: str  # e.g. "Show all fire alerts today", "Show gun incidents from Camera 1", "Show dismissed incidents"

class TestIncidentTrigger(BaseModel):
    incident_type: str  # FIRE, SMOKE, GUN, KNIFE, FIGHT, FALL, ACCIDENT, INTRUSION
    camera_id: str = "CAM-01"
    severity: str = "CRITICAL"
    confidence: float = 0.94

@router.get("")
def get_incidents(
    status_filter: Optional[str] = None,
    severity_filter: Optional[str] = None,
    camera_id: Optional[str] = None,
    include_dismissed: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(Incident).order_by(Incident.timestamp.desc())

    # By default, do NOT show dismissed incidents in active list
    if not include_dismissed and not status_filter:
        query = query.filter(~Incident.status.in_(["DISMISSED", "FALSE_POSITIVE"]))
    elif status_filter:
        query = query.filter(Incident.status == status_filter)

    if severity_filter:
        query = query.filter(Incident.severity == severity_filter)
    if camera_id:
        query = query.filter(Incident.camera_id == camera_id)

    incidents = query.limit(limit).all()
    results = []
    for inc in incidents:
        results.append({
            "id": inc.id,
            "incident_type": inc.incident_type,
            "camera_id": inc.camera_id,
            "camera_name": inc.camera_name,
            "location": inc.location,
            "timestamp": inc.timestamp.isoformat() if inc.timestamp else "",
            "severity": inc.severity,
            "confidence": inc.confidence,
            "status": inc.status,
            "snapshot_path": inc.snapshot_path,
            "video_clip_path": inc.video_clip_path,
            "tracking_ids": inc.tracking_ids,
            "frame_number": inc.frame_number,
            "ai_summary": inc.ai_summary,
            "evidence_reason": inc.evidence_reason,
            "dismiss_reason": inc.dismiss_reason,
            "dismissed_by": inc.dismissed_by,
            "admin_notes": inc.admin_notes,
            "recommended_departments": alert_service.get_recommended_departments(inc.incident_type)
        })
    return results

@router.get("/{incident_id}")
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    timeline = db.query(ResponseTimeline).filter(ResponseTimeline.incident_id == incident_id).order_by(ResponseTimeline.timestamp.asc()).all()

    return {
        "id": inc.id,
        "incident_type": inc.incident_type,
        "camera_id": inc.camera_id,
        "camera_name": inc.camera_name,
        "location": inc.location,
        "timestamp": inc.timestamp.isoformat() if inc.timestamp else "",
        "severity": inc.severity,
        "confidence": inc.confidence,
        "status": inc.status,
        "snapshot_path": inc.snapshot_path,
        "video_clip_path": inc.video_clip_path,
        "tracking_ids": inc.tracking_ids,
        "frame_number": inc.frame_number,
        "ai_summary": inc.ai_summary,
        "evidence_reason": inc.evidence_reason,
        "dismiss_reason": inc.dismiss_reason,
        "dismissed_by": inc.dismissed_by,
        "admin_notes": inc.admin_notes,
        "recommended_departments": alert_service.get_recommended_departments(inc.incident_type),
        "timeline": [
            {
                "id": t.id,
                "department": t.department,
                "status": t.status,
                "message": t.message,
                "timestamp": t.timestamp.isoformat() if t.timestamp else ""
            } for t in timeline
        ]
    }

@router.post("/{incident_id}/dismiss")
async def dismiss_incident(
    incident_id: str,
    req: IncidentDismissRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Operator marks an incident as False Positive or Dismissed with a mandatory reason.
    Removes incident from active view while retaining it in the database for audit and retraining.
    """
    if current_user.role not in ["admin", "user"]:
        raise HTTPException(status_code=403, detail="Operator permissions required")

    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    status_name = "FALSE_POSITIVE" if req.is_false_positive else "DISMISSED"
    now = datetime.datetime.utcnow()

    inc.status = status_name
    inc.dismiss_reason = req.dismiss_reason
    inc.dismissed_by = current_user.username
    inc.dismissed_at = now

    tl = ResponseTimeline(
        incident_id=incident_id,
        department="OPERATOR_AUDIT",
        status=status_name,
        message=f"Incident marked {status_name} by {current_user.username}. Reason: {req.dismiss_reason}",
        timestamp=now
    )
    db.add(tl)

    log = AuditLog(
        user_username=current_user.username,
        action="INCIDENT_DISMISSED",
        details=f"Incident {incident_id} marked as {status_name}. Reason: {req.dismiss_reason}"
    )
    db.add(log)
    db.commit()

    # Broadcast status change via WebSocket
    await ws_manager.broadcast_to_all({
        "type": "INCIDENT_STATUS_CHANGED",
        "incident_id": incident_id,
        "new_status": status_name,
        "dismiss_reason": req.dismiss_reason,
        "updated_by": current_user.username,
        "timestamp": now.isoformat()
    })

    return {
        "status": "success",
        "message": f"Incident {incident_id} successfully marked as {status_name}",
        "incident_id": incident_id
    }

def parse_nl_query_to_filters(q_str: str) -> dict:
    """Parses freeform natural language text into structured filter keys."""
    q_str = q_str.lower()
    filters = {}

    # Type
    if "fire" in q_str:
        filters["incident_type"] = "FIRE"
    elif "smoke" in q_str:
        filters["incident_type"] = "SMOKE"
    elif "gun" in q_str or "firearm" in q_str:
        filters["incident_type"] = "GUN"
    elif "knife" in q_str or "blade" in q_str:
        filters["incident_type"] = "KNIFE"
    elif "accident" in q_str or "collision" in q_str:
        filters["incident_type"] = "ACCIDENT"
    elif "fight" in q_str or "violence" in q_str:
        filters["incident_type"] = "FIGHTING"
    elif "fall" in q_str or "collapse" in q_str:
        filters["incident_type"] = "FALL"
    elif "intrusion" in q_str:
        filters["incident_type"] = "ZONE_INTRUSION"

    # Camera
    for i in range(1, 10):
        if f"camera {i}" in q_str or f"cam-{i}" in q_str or f"cam {i}" in q_str or f"cam-0{i}" in q_str:
            filters["camera_id"] = f"CAM-0{i}" if i < 10 else f"CAM-{i}"
            break

    # Severity
    if "critical" in q_str:
        filters["severity"] = "CRITICAL"
    elif "high" in q_str:
        filters["severity"] = "HIGH"
    elif "warning" in q_str:
        filters["severity"] = "WARNING"

    # Status
    if "dismissed" in q_str or "false positive" in q_str:
        filters["status"] = "DISMISSED"
    elif "resolved" in q_str:
        filters["status"] = "RESOLVED"
    elif "active" in q_str or "new" in q_str:
        filters["status"] = "NEW"

    return filters

@router.post("/search_nl")
def search_incidents_natural_language(req: NaturalLanguageSearchRequest, db: Session = Depends(get_db)):
    """
    Parses natural language query strings (e.g. "Show all fire alerts", "Show accidents from Camera 1", "Show dismissed")
    into structured database filters.
    """
    filters = parse_nl_query_to_filters(req.query)
    query = db.query(Incident)

    if "incident_type" in filters:
        query = query.filter(Incident.incident_type.like(f"%{filters['incident_type']}%"))
    if "camera_id" in filters:
        query = query.filter(Incident.camera_id.like(f"%{filters['camera_id']}%"))
    if "severity" in filters:
        query = query.filter(Incident.severity == filters["severity"])
    if "status" in filters:
        if filters["status"] == "DISMISSED":
            query = query.filter(Incident.status.in_(["DISMISSED", "FALSE_POSITIVE"]))
        else:
            query = query.filter(Incident.status == filters["status"])

    results = query.order_by(Incident.timestamp.desc()).limit(30).all()

    return [
        {
            "id": inc.id,
            "incident_type": inc.incident_type,
            "camera_id": inc.camera_id,
            "camera_name": inc.camera_name,
            "location": inc.location,
            "timestamp": inc.timestamp.isoformat() if inc.timestamp else "",
            "severity": inc.severity,
            "confidence": inc.confidence,
            "status": inc.status,
            "snapshot_path": inc.snapshot_path,
            "ai_summary": inc.ai_summary,
            "evidence_reason": inc.evidence_reason,
            "dismiss_reason": inc.dismiss_reason,
            "recommended_departments": alert_service.get_recommended_departments(inc.incident_type)
        } for inc in results
    ]

@router.put("/{incident_id}/status")
async def update_incident_status(
    incident_id: str,
    update: IncidentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    inc.status = update.status
    if update.notes:
        inc.admin_notes = update.notes

    tl = ResponseTimeline(
        incident_id=incident_id,
        department=current_user.department or current_user.role.upper(),
        status=update.status,
        message=f"Incident status changed to {update.status} by {current_user.username}",
        timestamp=datetime.datetime.utcnow()
    )
    db.add(tl)
    db.commit()

    await ws_manager.broadcast_to_all({
        "type": "INCIDENT_STATUS_CHANGED",
        "incident_id": incident_id,
        "new_status": update.status,
        "updated_by": current_user.username,
        "timestamp": datetime.datetime.utcnow().isoformat()
    })

    return {"message": "Status updated successfully", "status": inc.status}

@router.post("/trigger_demo")
async def trigger_demo_incident(
    req: TestIncidentTrigger,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin required to trigger demo incidents")

    import numpy as np
    dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    dummy_frame[:] = (25, 30, 42)

    incident = await alert_service.create_incident(
        db=db,
        camera_id=req.camera_id,
        camera_name="Main Gate Camera",
        location="Perimeter North",
        event={
            "event_type": req.incident_type,
            "confidence": req.confidence,
            "severity": req.severity,
            "description": f"Verified {req.incident_type.replace('_', ' ')} confirmed by multi-model security pipeline"
        },
        frame=dummy_frame
    )
    return {"message": "Demo incident generated successfully", "incident_id": incident.id}
