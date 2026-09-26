import { Camera, Incident, SmartZone, SystemHealth, ModelInfo, AIDebugLog, DepartmentIncident, IncidentTimeline, User } from '../types';

export const MOCK_USERS: Record<string, User & { access_token: string }> = {
  admin: {
    id: 1,
    username: 'admin',
    email: 'admin@crowdguard.ai',
    role: 'admin',
    department: 'soc',
    is_active: true,
    access_token: 'mock-jwt-admin-token-2026'
  },
  user: {
    id: 2,
    username: 'user',
    email: 'operator@crowdguard.ai',
    role: 'user',
    department: 'security',
    is_active: true,
    access_token: 'mock-jwt-user-token-2026'
  },
  police: {
    id: 3,
    username: 'police',
    email: 'dispatch@police.gov',
    role: 'police',
    department: 'police',
    is_active: true,
    access_token: 'mock-jwt-police-token-2026'
  },
  fireservice: {
    id: 4,
    username: 'fireservice',
    email: 'emergency@fire.gov',
    role: 'fireservice',
    department: 'fireservice',
    is_active: true,
    access_token: 'mock-jwt-fire-token-2026'
  },
  ambulance: {
    id: 5,
    username: 'ambulance',
    email: 'dispatch@paramedics.gov',
    role: 'ambulance',
    department: 'ambulance',
    is_active: true,
    access_token: 'mock-jwt-ambulance-token-2026'
  }
};

export const INITIAL_MOCK_CAMERAS: Camera[] = [
  {
    id: 'CAM-01',
    name: 'Main Concourse - Gate A',
    location: 'Terminal 1 Entry',
    source_type: 'webcam',
    source_url: 'webcam://0',
    status: 'online',
    fps: 29.8,
    resolution: '1920x1080',
    latency_ms: 18,
    is_active: true,
    ai_active: true,
    total_people: 74,
    total_vehicles: 0,
    crowd_density: 'HIGH',
    occupancy_pct: 82,
    fire_active: false,
    smoke_active: false
  },
  {
    id: 'CAM-02',
    name: 'Subway Transfer Corridor',
    location: 'Level -1 Metro Link',
    source_type: 'rtsp',
    source_url: 'rtsp://stream.crowdguard.internal/cam02',
    status: 'online',
    fps: 30.0,
    resolution: '1920x1080',
    latency_ms: 22,
    is_active: true,
    ai_active: true,
    total_people: 36,
    total_vehicles: 0,
    crowd_density: 'MEDIUM',
    occupancy_pct: 48,
    fire_active: false,
    smoke_active: false
  },
  {
    id: 'CAM-03',
    name: 'East Cargo Depot & Generator Bay',
    location: 'Sector 4 Industrial',
    source_type: 'rtsp',
    source_url: 'rtsp://stream.crowdguard.internal/cam03',
    status: 'online',
    fps: 25.0,
    resolution: '1280x720',
    latency_ms: 16,
    is_active: true,
    ai_active: true,
    total_people: 4,
    total_vehicles: 2,
    crowd_density: 'LOW',
    occupancy_pct: 12,
    fire_active: true,
    smoke_active: true
  },
  {
    id: 'CAM-04',
    name: 'North Perimeter Gate 3',
    location: 'External Security Perimeter',
    source_type: 'file',
    source_url: 'sample_footage.mp4',
    status: 'online',
    fps: 30.0,
    resolution: '1920x1080',
    latency_ms: 12,
    is_active: true,
    ai_active: true,
    total_people: 2,
    total_vehicles: 5,
    crowd_density: 'LOW',
    occupancy_pct: 8,
    fire_active: false,
    smoke_active: false
  }
];

export const INITIAL_MOCK_INCIDENTS: Incident[] = [
  {
    id: 'INC-8041',
    incident_type: 'FIRE_SMOKE',
    camera_id: 'CAM-03',
    camera_name: 'East Cargo Depot & Generator Bay',
    location: 'Sector 4 Industrial',
    timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    severity: 'CRITICAL',
    confidence: 0.96,
    status: 'NEW',
    is_dismissed: false,
    ai_summary: 'Dedicated Fire/Smoke engine detected persistent thermal flame signatures (0.96 conf) and toxic smoke plume.',
    admin_notes: 'Urgent response initiated; fire suppression alert dispatched.',
    recommended_departments: ['fireservice', 'police']
  },
  {
    id: 'INC-8038',
    incident_type: 'CROWD_SURGE',
    camera_id: 'CAM-01',
    camera_name: 'Main Concourse - Gate A',
    location: 'Terminal 1 Entry',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    severity: 'HIGH',
    confidence: 0.88,
    status: 'INVESTIGATING',
    is_dismissed: false,
    ai_summary: 'Dense bottleneck detected: 74 people exceeding 80% safety occupancy threshold with rapid compression vector.',
    admin_notes: 'Turnstiles 3 and 4 opened for egress.',
    recommended_departments: ['police']
  },
  {
    id: 'INC-8025',
    incident_type: 'FALL_DETECTED',
    camera_id: 'CAM-02',
    camera_name: 'Subway Transfer Corridor',
    location: 'Level -1 Metro Link',
    timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    severity: 'HIGH',
    confidence: 0.91,
    status: 'ACKNOWLEDGED',
    is_dismissed: false,
    ai_summary: 'YOLOv8 Pose analyzer detected sudden vertical keypoint collapse and ground immobility > 8 seconds.',
    admin_notes: 'Paramedic station alerted.',
    recommended_departments: ['ambulance']
  }
];

export const MOCK_SYSTEM_HEALTH: SystemHealth = {
  status: 'OPTIMAL',
  cpu_percent: 32.4,
  ram_percent: 44.1,
  ram_used_gb: 3.5,
  ram_total_gb: 8.0,
  disk_percent: 38.6,
  gpu_available: true,
  gpu_device: 'NVIDIA GeForce RTX 4070 (6GB VRAM reserved)',
  inference_engine: 'YOLOv8 + ByteTrack CUDA Acceleration',
  average_inference_ms: 16.8,
  websocket_active: true,
  ai_status: 'RUNNING'
};

export const MOCK_MODELS: ModelInfo[] = [
  {
    id: 'MOD-01',
    name: 'YOLOv8n General Vision',
    version: '8.3.0',
    purpose: 'Real-time Person & Vehicle Spatial Detection',
    status: 'ONLINE',
    inference_speed: '12.4 ms',
    confidence_threshold: 0.50
  },
  {
    id: 'MOD-02',
    name: 'Dedicated Fire & Smoke Engine',
    version: 'weights/best.pt (Custom YOLO11n)',
    purpose: 'Dual-Class Flame & Thermal Smoke Detection',
    status: 'ONLINE',
    inference_speed: '15.1 ms',
    confidence_threshold: 0.75
  },
  {
    id: 'MOD-03',
    name: 'YOLOv8n-Pose Behavior Analyzer',
    version: '8.2.1',
    purpose: 'Skeletal Motion, Fall Collapse & Violence Detection',
    status: 'ONLINE',
    inference_speed: '18.9 ms',
    confidence_threshold: 0.70
  }
];

export const MOCK_DEBUG_LOGS: AIDebugLog[] = [
  {
    timestamp: new Date().toLocaleTimeString(),
    camera_id: 'CAM-03',
    model: 'weights/best.pt',
    raw_prediction: 'class: fire (0.96), bbox: [412, 198, 580, 420]',
    confidence: 0.96,
    threshold: 0.75,
    status: 'CONFIRMED',
    reason: 'Consecutive frame persistence count: 4 >= 3 required'
  },
  {
    timestamp: new Date(Date.now() - 30000).toLocaleTimeString(),
    camera_id: 'CAM-01',
    model: 'yolov8n.pt',
    raw_prediction: 'person count: 74, density: HIGH',
    confidence: 0.92,
    threshold: 0.50,
    status: 'ACCEPTED',
    reason: 'Spatial clustering density index 0.82'
  }
];

export const MOCK_DEPARTMENT_INCIDENTS: DepartmentIncident[] = [
  {
    forwarding_id: 101,
    incident_id: 'INC-8041',
    incident_type: 'FIRE_SMOKE',
    camera_id: 'CAM-03',
    camera_name: 'East Cargo Depot & Generator Bay',
    location: 'Sector 4 Industrial',
    timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    severity: 'CRITICAL',
    confidence: 0.96,
    ai_summary: 'Dedicated Fire/Smoke engine detected persistent thermal flame signatures (0.96 conf) and toxic smoke plume.',
    response_status: 'FORWARDED',
    forwarded_by: 'SOC Chief Operator (admin)',
    forwarded_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    notes: 'Unit Engine-4 dispatched to Gate 4.'
  },
  {
    forwarding_id: 102,
    incident_id: 'INC-8025',
    incident_type: 'FALL_DETECTED',
    camera_id: 'CAM-02',
    camera_name: 'Subway Transfer Corridor',
    location: 'Level -1 Metro Link',
    timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    severity: 'HIGH',
    confidence: 0.91,
    ai_summary: 'Skeletal collapse with ground immobility > 8s.',
    response_status: 'ACKNOWLEDGED',
    forwarded_by: 'Automated Dispatch Gateway',
    forwarded_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    notes: 'Paramedic team responding.'
  }
];
