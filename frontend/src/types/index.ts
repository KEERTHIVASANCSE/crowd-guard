export type UserRole = 'admin' | 'user' | 'police' | 'ambulance' | 'fireservice';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  department?: string;
  is_active: boolean;
}

export interface Camera {
  id: string;
  name: string;
  location: string;
  source_type: 'webcam' | 'remote' | 'rtsp' | 'file';
  source_url: string;
  status: 'online' | 'offline';
  fps: number;
  resolution: string;
  latency_ms: number;
  is_active: boolean;
  ai_active: boolean;
  total_people?: number;
  total_vehicles?: number;
  crowd_density?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  occupancy_pct?: number;
  fire_active?: boolean;
  smoke_active?: boolean;
}

export interface Incident {
  id: string;
  incident_type: string;
  camera_id: string;
  camera_name: string;
  location: string;
  timestamp: string;
  severity: 'INFORMATION' | 'WARNING' | 'HIGH' | 'CRITICAL';
  confidence: number;
  status: 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  is_dismissed?: boolean;
  dismiss_reason?: string;
  snapshot_path?: string;
  ai_summary?: string;
  admin_notes?: string;
  recommended_departments: string[];
}

export interface AnalysisJob {
  id: number;
  filename: string;
  camera_id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  total_frames: number;
  processed_frames: number;
  fps: number;
  incident_count: number;
  error_message?: string;
  annotated_video_path?: string;
  incidents_json_path?: string;
  created_at: string;
  completed_at?: string;
}

export interface IncidentTimeline {
  id: number;
  department: string;
  status: string;
  message: string;
  timestamp: string;
}

export interface SmartZone {
  id: number;
  camera_id: string;
  name: string;
  zone_type: 'restricted' | 'entry' | 'exit' | 'high_density';
  polygon_points: [number, number][]; // normalized [0-1] coordinates
  rule_type: string;
}

export interface SystemHealth {
  status: string;
  cpu_percent: number;
  ram_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  disk_percent: number;
  gpu_available: boolean;
  gpu_device: string;
  inference_engine: string;
  average_inference_ms: number;
  websocket_active: boolean;
  ai_status: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  version: string;
  purpose: string;
  status: string;
  inference_speed: string;
  confidence_threshold: number;
}

export interface AIDebugLog {
  timestamp: string;
  camera_id: string;
  model: string;
  raw_prediction: string;
  confidence: number;
  threshold: number;
  status: 'ACCEPTED' | 'REJECTED' | 'VALIDATING' | 'CONFIRMED' | 'FALSE_POSITIVE';
  reason: string;
}

export interface DepartmentIncident {
  forwarding_id: number;
  incident_id: string;
  incident_type: string;
  camera_id: string;
  camera_name: string;
  location: string;
  timestamp: string;
  severity: 'INFORMATION' | 'WARNING' | 'HIGH' | 'CRITICAL';
  confidence: number;
  snapshot_path?: string;
  ai_summary?: string;
  response_status: 'FORWARDED' | 'RECEIVED' | 'ACKNOWLEDGED' | 'RESPONSE_ACCEPTED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  forwarded_by: string;
  forwarded_at: string;
  notes?: string;
}
