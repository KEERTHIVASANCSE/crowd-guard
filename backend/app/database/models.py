import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="user", nullable=False)  # admin, user, police, ambulance, fireservice
    department = Column(String(50), nullable=True)             # Police, Ambulance, Fire Service, SOC Admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(String(50), primary_key=True, index=True)  # e.g. CAM-01, CAM-02
    name = Column(String(100), nullable=False)
    location = Column(String(100), default="Main Compound")
    source_type = Column(String(20), default="webcam")     # webcam, remote, rtsp, file
    source_url = Column(String(255), default="0")
    status = Column(String(20), default="online")          # online, offline
    fps = Column(Integer, default=25)
    resolution = Column(String(20), default="1280x720")
    latency_ms = Column(Integer, default=35)
    is_active = Column(Boolean, default=True)
    ai_active = Column(Boolean, default=True)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)

    zones = relationship("SmartZone", back_populates="camera", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="camera")

class SmartZone(Base):
    __tablename__ = "smart_zones"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String(50), ForeignKey("cameras.id"), nullable=False)
    name = Column(String(100), nullable=False)
    zone_type = Column(String(50), default="restricted")  # restricted, entry, exit, high_density
    polygon_points = Column(Text, nullable=False)         # JSON string list of [x, y] coordinates (normalized 0-1)
    rule_type = Column(String(50), default="INTRUSION")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    camera = relationship("Camera", back_populates="zones")

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(50), primary_key=True, index=True)  # e.g. INC-1024
    incident_type = Column(String(50), nullable=False)     # FIRE, SMOKE, GUN, KNIFE, GRENADE, ACCIDENT, FIGHT, FALL, INTRUSION, etc.
    camera_id = Column(String(50), ForeignKey("cameras.id"), nullable=False)
    camera_name = Column(String(100), nullable=False)
    location = Column(String(100), default="Main Compound")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    severity = Column(String(20), default="HIGH")          # LOW, MEDIUM, HIGH, CRITICAL
    confidence = Column(Float, nullable=False)
    status = Column(String(30), default="NEW")             # NEW, ACKNOWLEDGED, INVESTIGATING, RESOLVED, DISMISSED, FALSE_POSITIVE
    snapshot_path = Column(String(255), nullable=True)
    video_clip_path = Column(String(255), nullable=True)   # Pre/post event video clip
    frame_number = Column(Integer, nullable=True)
    tracking_ids = Column(String(100), nullable=True)      # e.g. "Person #17, Car #4"
    ai_summary = Column(Text, nullable=True)
    evidence_reason = Column(Text, nullable=True)          # AI explainability reason
    admin_notes = Column(Text, nullable=True)
    dismiss_reason = Column(Text, nullable=True)           # Mandatory reason if dismissed / marked false positive
    dismissed_by = Column(String(50), nullable=True)
    dismissed_at = Column(DateTime, nullable=True)

    camera = relationship("Camera", back_populates="incidents")
    forwardings = relationship("IncidentForwarding", back_populates="incident", cascade="all, delete-orphan")
    timeline = relationship("ResponseTimeline", back_populates="incident", cascade="all, delete-orphan")

class IncidentForwarding(Base):
    __tablename__ = "incident_forwardings"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(50), ForeignKey("incidents.id"), nullable=False)
    department = Column(String(50), nullable=False)        # police, ambulance, fireservice
    forwarded_by = Column(String(50), default="admin")
    forwarded_at = Column(DateTime, default=datetime.datetime.utcnow)
    response_status = Column(String(50), default="FORWARDED")  # FORWARDED, RECEIVED, ACKNOWLEDGED, RESPONSE_ACCEPTED, IN_PROGRESS, RESOLVED, REJECTED
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    incident = relationship("Incident", back_populates="forwardings")

class ResponseTimeline(Base):
    __tablename__ = "response_timeline"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(50), ForeignKey("incidents.id"), nullable=False)
    department = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False)
    message = Column(String(255), nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    incident = relationship("Incident", back_populates="timeline")

class SystemRule(Base):
    __tablename__ = "system_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_name = Column(String(100), nullable=False)
    event_type = Column(String(50), nullable=False)
    confidence_threshold = Column(Float, default=0.75)
    is_enabled = Column(Boolean, default=True)
    severity = Column(String(20), default="HIGH")
    target_department = Column(String(50), default="police")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_username = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    ip_address = Column(String(50), default="127.0.0.1")

class VideoAnalysisJob(Base):
    __tablename__ = "video_analysis_jobs"

    id = Column(String(50), primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    status = Column(String(50), default="PENDING")         # PENDING, PROCESSING, COMPLETED, FAILED
    progress_percent = Column(Float, default=0.0)
    total_frames = Column(Integer, default=0)
    processed_frames = Column(Integer, default=0)
    threats_detected = Column(Integer, default=0)
    output_video_path = Column(String(255), nullable=True)
    output_json_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
