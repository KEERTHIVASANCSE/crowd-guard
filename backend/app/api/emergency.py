import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import Incident, IncidentForwarding, ResponseTimeline, User, AuditLog
from app.api.auth import get_current_user
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/api/emergency", tags=["Emergency Response"])

class ForwardIncidentRequest(BaseModel):
    incident_id: str
    department: str  # police, ambulance, fireservice
    notes: Optional[str] = None

class UpdateResponseStatusRequest(BaseModel):
    response_status: str  # ACKNOWLEDGED, RESPONSE_ACCEPTED, IN_PROGRESS, RESOLVED, REJECTED, FALSE_ALARM
    message: Optional[str] = None

@router.post("/forward")
async def forward_incident(
    req: ForwardIncidentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Administrator forwards a confirmed incident to an emergency department.
    AI NEVER automatically contacts emergency services; Admin approval is mandatory.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only SOC Administrators can forward incidents")

    incident = db.query(Incident).filter(Incident.id == req.incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    dept_clean = req.department.lower().replace(" ", "").replace("_", "")
    if dept_clean not in ["police", "ambulance", "fireservice"]:
        raise HTTPException(status_code=400, detail="Invalid target department")

    # Check if already forwarded to this department
    existing = db.query(IncidentForwarding).filter(
        IncidentForwarding.incident_id == req.incident_id,
        IncidentForwarding.department == dept_clean
    ).first()

    now = datetime.datetime.utcnow()
    dept_display = {
        "police": "Police Department",
        "ambulance": "Emergency Medical Services",
        "fireservice": "Fire & Rescue Service"
    }.get(dept_clean, dept_clean)

    if not existing:
        forwarding = IncidentForwarding(
            incident_id=req.incident_id,
            department=dept_clean,
            forwarded_by=current_user.username,
            forwarded_at=now,
            response_status="FORWARDED",
            notes=req.notes
        )
        db.add(forwarding)
    else:
        forwarding = existing
        forwarding.response_status = "FORWARDED"
        forwarding.notes = req.notes
        forwarding.updated_at = now

    # Add timeline entry
    timeline_entry = ResponseTimeline(
        incident_id=req.incident_id,
        department=dept_display,
        status="FORWARDED",
        message=f"Incident forwarded to {dept_display} by Administrator ({current_user.username}). Notes: {req.notes or 'None'}",
        timestamp=now
    )
    db.add(timeline_entry)

    log = AuditLog(
        user_username=current_user.username,
        action="INCIDENT_FORWARDED",
        details=f"Forwarded incident {req.incident_id} ({incident.incident_type}) to {dept_display}"
    )
    db.add(log)
    db.commit()

    # Send real-time notification to the emergency department
    payload = {
        "type": "INCIDENT_FORWARDED",
        "department": dept_clean,
        "forwarding": {
            "incident_id": incident.id,
            "incident_type": incident.incident_type,
            "severity": incident.severity,
            "camera_name": incident.camera_name,
            "location": incident.location,
            "timestamp": incident.timestamp.isoformat() if incident.timestamp else "",
            "confidence": incident.confidence,
            "snapshot_path": incident.snapshot_path,
            "ai_summary": incident.ai_summary,
            "notes": req.notes,
            "status": "FORWARDED"
        }
    }
    await ws_manager.broadcast_to_role(dept_clean, payload)

    return {
        "status": "success",
        "message": f"Incident {req.incident_id} successfully forwarded to {dept_display}",
        "department": dept_clean
    }

@router.get("/{department}/incidents")
def get_department_incidents(
    department: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns incidents forwarded to the specific emergency department.
    Enforces RBAC: Department accounts only see their own department's incidents.
    """
    dept_clean = department.lower().replace(" ", "").replace("_", "")

    # Role check: Admin can view any department; department users can only view their own
    if current_user.role != "admin" and current_user.role != dept_clean:
        raise HTTPException(status_code=403, detail="Access denied for this department portal")

    forwardings = db.query(IncidentForwarding).filter(
        IncidentForwarding.department == dept_clean
    ).order_by(IncidentForwarding.forwarded_at.desc()).all()

    results = []
    for f in forwardings:
        inc = f.incident
        if inc:
            results.append({
                "forwarding_id": f.id,
                "incident_id": inc.id,
                "incident_type": inc.incident_type,
                "camera_id": inc.camera_id,
                "camera_name": inc.camera_name,
                "location": inc.location,
                "timestamp": inc.timestamp.isoformat() if inc.timestamp else "",
                "severity": inc.severity,
                "confidence": inc.confidence,
                "snapshot_path": inc.snapshot_path,
                "ai_summary": inc.ai_summary,
                "response_status": f.response_status,
                "forwarded_by": f.forwarded_by,
                "forwarded_at": f.forwarded_at.isoformat() if f.forwarded_at else "",
                "notes": f.notes
            })
    return results

@router.put("/incidents/{incident_id}/status")
async def update_department_response_status(
    incident_id: str,
    req: UpdateResponseStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Department updates response status:
    ACKNOWLEDGED -> RESPONSE_ACCEPTED -> IN_PROGRESS -> RESOLVED / REJECTED
    """
    dept_role = current_user.role
    if dept_role not in ["police", "ambulance", "fireservice", "admin"]:
        raise HTTPException(status_code=403, detail="Invalid responder role")

    query = db.query(IncidentForwarding).filter(IncidentForwarding.incident_id == incident_id)
    if dept_role != "admin":
        query = query.filter(IncidentForwarding.department == dept_role)

    forwarding = query.first()
    if not forwarding:
        raise HTTPException(status_code=404, detail="Incident forwarding record not found")

    now = datetime.datetime.utcnow()
    forwarding.response_status = req.response_status
    forwarding.updated_at = now

    dept_display = {
        "police": "Police Dispatch",
        "ambulance": "Ambulance Unit",
        "fireservice": "Fire Response Unit"
    }.get(forwarding.department, forwarding.department.upper())

    msg = req.message or f"Response status changed to {req.response_status} by {current_user.username}"

    timeline_entry = ResponseTimeline(
        incident_id=incident_id,
        department=dept_display,
        status=req.response_status,
        message=msg,
        timestamp=now
    )
    db.add(timeline_entry)

    # If resolved, update the parent incident status too
    if req.response_status == "RESOLVED":
        inc = db.query(Incident).filter(Incident.id == incident_id).first()
        if inc:
            inc.status = "RESOLVED"

    db.commit()

    # Broadcast timeline and status change to Admin and all relevant departments
    update_payload = {
        "type": "RESPONSE_STATUS_CHANGED",
        "incident_id": incident_id,
        "department": forwarding.department,
        "new_status": req.response_status,
        "updated_by": current_user.username,
        "message": msg,
        "timestamp": now.isoformat()
    }
    await ws_manager.broadcast_to_all(update_payload)

    return {"status": "success", "response_status": forwarding.response_status}

@router.get("/incidents/{incident_id}/timeline")
def get_incident_timeline(incident_id: str, db: Session = Depends(get_db)):
    timeline = db.query(ResponseTimeline).filter(
        ResponseTimeline.incident_id == incident_id
    ).order_by(ResponseTimeline.timestamp.asc()).all()

    return [
        {
            "id": t.id,
            "department": t.department,
            "status": t.status,
            "message": t.message,
            "timestamp": t.timestamp.isoformat() if t.timestamp else ""
        } for t in timeline
    ]
