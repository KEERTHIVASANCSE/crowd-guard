import uuid
import datetime
import logging
from typing import Dict, List
import numpy as np
from sqlalchemy.orm import Session
from app.database.models import Incident, ResponseTimeline
from app.services.evidence_service import evidence_service
from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)

class AlertService:
    def get_recommended_departments(self, incident_type: str) -> List[str]:
        """
        Smart Department Recommendation based on incident classification.
        """
        t = incident_type.upper()
        if "FIRE" in t or "SMOKE" in t:
            return ["fireservice", "ambulance"]
        elif any(k in t for k in ["WEAPON", "GUN", "KNIFE", "FIGHT", "INTRUSION", "LOITERING"]):
            return ["police"]
        elif any(k in t for k in ["FALL", "ACCIDENT", "COLLISION", "INJURY"]):
            return ["ambulance"]
        elif "CROWD" in t:
            return ["police"]
        return ["police"]

    async def create_incident(
        self,
        db: Session,
        camera_id: str,
        camera_name: str,
        location: str,
        event: Dict,
        frame: np.ndarray
    ) -> Incident:
        """
        Persists confirmed incident to database, saves evidence snapshot,
        logs timeline entry, and broadcasts real-time alert via WebSocket.
        """
        incident_id = f"INC-{int(datetime.datetime.utcnow().timestamp()) % 100000:05d}"
        event_type = event.get('event_type', 'UNUSUAL_MOVEMENT')
        confidence = float(event.get('confidence', 0.85))
        severity = event.get('severity', 'HIGH')
        description = event.get('description', f"{event_type} confirmed by AI pipeline")

        # Save snapshot
        snapshot_url = evidence_service.save_snapshot(incident_id, frame)

        incident = Incident(
            id=incident_id,
            incident_type=event_type,
            camera_id=camera_id,
            camera_name=camera_name,
            location=location,
            timestamp=datetime.datetime.utcnow(),
            severity=severity,
            confidence=confidence,
            status="NEW",
            snapshot_path=snapshot_url,
            ai_summary=description
        )

        db.add(incident)

        # Add initial timeline entry
        timeline_entry = ResponseTimeline(
            incident_id=incident_id,
            department="AI_SYSTEM",
            status="DETECTED",
            message=f"Incident detected and confirmed by AI Vision Pipeline ({int(confidence * 100)}% confidence)",
            timestamp=datetime.datetime.utcnow()
        )
        db.add(timeline_entry)
        db.commit()
        db.refresh(incident)

        recommended_depts = self.get_recommended_departments(event_type)

        # Broadcast incident alert to Admin and all clients
        await ws_manager.broadcast_to_all({
            "type": "NEW_ALERT",
            "incident": {
                "id": incident.id,
                "incident_type": incident.incident_type,
                "camera_id": incident.camera_id,
                "camera_name": incident.camera_name,
                "location": incident.location,
                "severity": incident.severity,
                "confidence": incident.confidence,
                "status": incident.status,
                "snapshot_path": incident.snapshot_path,
                "ai_summary": incident.ai_summary,
                "timestamp": incident.timestamp.isoformat(),
                "recommended_departments": recommended_depts
            }
        })

        logger.info(f"Confirmed Incident {incident_id} created for {camera_id}: {event_type}")
        return incident

alert_service = AlertService()
