import { Camera, Incident, SmartZone, SystemHealth, ModelInfo, AIDebugLog, DepartmentIncident, IncidentTimeline, User } from '../types';
import {
  MOCK_USERS,
  INITIAL_MOCK_CAMERAS,
  INITIAL_MOCK_INCIDENTS,
  MOCK_SYSTEM_HEALTH,
  MOCK_MODELS,
  MOCK_DEBUG_LOGS,
  MOCK_DEPARTMENT_INCIDENTS
} from './mockData';

export const getApiBase = (): string => {
  return localStorage.getItem('sentinelvision_api_url') || import.meta.env.VITE_API_URL || 'http://localhost:8000';
};

export const setApiBase = (url: string) => {
  if (url) {
    localStorage.setItem('sentinelvision_api_url', url.replace(/\/+$/, ''));
  } else {
    localStorage.removeItem('sentinelvision_api_url');
  }
};

export const API_BASE = getApiBase();

class ApiService {
  private mockCameras: Camera[] = [...INITIAL_MOCK_CAMERAS];
  private mockIncidents: Incident[] = [...INITIAL_MOCK_INCIDENTS];
  private mockDeptIncidents: DepartmentIncident[] = [...MOCK_DEPARTMENT_INCIDENTS];
  private mockZones: SmartZone[] = [
    {
      id: 1,
      camera_id: 'CAM-01',
      name: 'Turnstile Chokepoint A',
      zone_type: 'high_density',
      polygon_points: [[0.2, 0.4], [0.8, 0.4], [0.8, 0.9], [0.2, 0.9]],
      rule_type: 'max_occupancy_50'
    },
    {
      id: 2,
      camera_id: 'CAM-03',
      name: 'Flammable Storage Hazard Perimeter',
      zone_type: 'restricted',
      polygon_points: [[0.1, 0.2], [0.6, 0.2], [0.6, 0.8], [0.1, 0.8]],
      rule_type: 'no_unauthorized_person'
    }
  ];

  isDemoMode(): boolean {
    return localStorage.getItem('sentinelvision_demo_mode') === 'true';
  }

  setDemoMode(enabled: boolean) {
    if (enabled) {
      localStorage.setItem('sentinelvision_demo_mode', 'true');
    } else {
      localStorage.removeItem('sentinelvision_demo_mode');
    }
  }

  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('sentinelvision_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  // Auth
  async login(username: string, password: string) {
    const baseUrl = getApiBase();

    // If demo mode is already active, authenticate directly via mock database
    if (this.isDemoMode()) {
      return this.mockLogin(username, password);
    }

    try {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Login failed');
      }

      const data = await res.json();
      localStorage.setItem('sentinelvision_token', data.access_token);
      localStorage.setItem('sentinelvision_user', JSON.stringify(data));
      this.setDemoMode(false);
      return data;
    } catch (err: any) {
      // If network fails (e.g. backend offline, mixed content on GitHub Pages, failed to fetch)
      // Check if credentials match demo users to automatically enable seamless Demo Mode
      if (err.message && (err.message.includes('fetch') || err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
        if (MOCK_USERS[username.toLowerCase()]) {
          console.warn('Backend server unreachable. Falling back to interactive Demo Mode.');
          return this.mockLogin(username, password);
        }
      }
      throw err;
    }
  }

  mockLogin(username: string, password: string) {
    const u = username.toLowerCase();
    const mockUser = MOCK_USERS[u] || {
      id: 99,
      username: u,
      email: `${u}@crowdguard.ai`,
      role: 'admin' as const,
      department: 'soc',
      is_active: true,
      access_token: 'mock-jwt-token-2026'
    };

    this.setDemoMode(true);
    localStorage.setItem('sentinelvision_token', mockUser.access_token);
    localStorage.setItem('sentinelvision_user', JSON.stringify(mockUser));
    return mockUser;
  }

  async getMe(): Promise<User> {
    if (this.isDemoMode()) {
      const saved = localStorage.getItem('sentinelvision_user');
      if (saved) return JSON.parse(saved);
      return MOCK_USERS.admin;
    }

    try {
      const res = await fetch(`${getApiBase()}/api/auth/me`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch user profile');
      return res.json();
    } catch (e) {
      const saved = localStorage.getItem('sentinelvision_user');
      return saved ? JSON.parse(saved) : MOCK_USERS.admin;
    }
  }

  logout() {
    localStorage.removeItem('sentinelvision_token');
    localStorage.removeItem('sentinelvision_user');
    this.setDemoMode(false);
  }

  // Cameras
  async getCameras(): Promise<Camera[]> {
    if (this.isDemoMode()) {
      return [...this.mockCameras];
    }

    try {
      const res = await fetch(`${getApiBase()}/api/cameras`, { headers: this.getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch cameras');
      return res.json();
    } catch (e) {
      console.warn('Using fallback camera data:', e);
      return [...this.mockCameras];
    }
  }

  async getCamera(id: string): Promise<Camera> {
    if (this.isDemoMode()) {
      const cam = this.mockCameras.find(c => c.id === id);
      if (!cam) throw new Error(`Camera ${id} not found`);
      return { ...cam };
    }

    try {
      const res = await fetch(`${getApiBase()}/api/cameras/${id}`, { headers: this.getHeaders() });
      if (!res.ok) throw new Error(`Failed to fetch camera ${id}`);
      return res.json();
    } catch (e) {
      const cam = this.mockCameras.find(c => c.id === id);
      if (cam) return { ...cam };
      throw new Error(`Camera ${id} not found`);
    }
  }

  async addCamera(camera: { id: string; name: string; location: string; source_type: string; source_url: string }) {
    if (this.isDemoMode()) {
      const newCam: Camera = {
        ...camera,
        source_type: camera.source_type as any,
        status: 'online',
        fps: 30,
        resolution: '1920x1080',
        latency_ms: 15,
        is_active: true,
        ai_active: true,
        total_people: 0,
        total_vehicles: 0,
        crowd_density: 'LOW',
        occupancy_pct: 0
      };
      this.mockCameras.push(newCam);
      return newCam;
    }

    const res = await fetch(`${getApiBase()}/api/cameras`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(camera)
    });
    if (!res.ok) throw new Error('Failed to add camera');
    return res.json();
  }

  async updateCamera(id: string, updates: Partial<Camera>) {
    if (this.isDemoMode()) {
      const idx = this.mockCameras.findIndex(c => c.id === id);
      if (idx !== -1) {
        this.mockCameras[idx] = { ...this.mockCameras[idx], ...updates };
        return this.mockCameras[idx];
      }
      throw new Error('Camera not found');
    }

    const res = await fetch(`${getApiBase()}/api/cameras/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update camera');
    return res.json();
  }

  async deleteCamera(id: string) {
    if (this.isDemoMode()) {
      this.mockCameras = this.mockCameras.filter(c => c.id !== id);
      return { success: true };
    }

    const res = await fetch(`${getApiBase()}/api/cameras/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete camera');
    return res.json();
  }

  // Remote Camera Ingestion
  async pushRemoteFrame(cameraId: string, base64Image: string) {
    if (this.isDemoMode()) {
      return { success: true, processed: true };
    }

    const res = await fetch(`${getApiBase()}/api/remote_camera/push_frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ camera_id: cameraId, image_base64: base64Image })
    });
    if (!res.ok) throw new Error('Failed to push remote camera frame');
    return res.json();
  }

  // Incidents
  async getIncidents(status?: string, severity?: string): Promise<Incident[]> {
    if (this.isDemoMode()) {
      let filtered = [...this.mockIncidents];
      if (status) filtered = filtered.filter(i => i.status === status);
      if (severity) filtered = filtered.filter(i => i.severity === severity);
      return filtered;
    }

    try {
      const params = new URLSearchParams();
      if (status) params.append('status_filter', status);
      if (severity) params.append('severity_filter', severity);

      const res = await fetch(`${getApiBase()}/api/incidents?${params.toString()}`, { headers: this.getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch incidents');
      return res.json();
    } catch (e) {
      console.warn('Using fallback incident data:', e);
      return [...this.mockIncidents];
    }
  }

  async getIncident(id: string): Promise<Incident & { timeline: IncidentTimeline[] }> {
    const baseInc = this.mockIncidents.find(i => i.id === id) || this.mockIncidents[0];
    const timeline: IncidentTimeline[] = [
      { id: 1, department: 'AI Engine', status: 'DETECTED', message: 'Persistent violation confirmed across multiple frames', timestamp: baseInc.timestamp },
      { id: 2, department: 'SOC Dispatch', status: 'FORWARDED', message: 'Forwarded to responding units', timestamp: new Date(Date.now() - 60000).toISOString() }
    ];

    if (this.isDemoMode()) {
      return { ...baseInc, timeline };
    }

    try {
      const res = await fetch(`${getApiBase()}/api/incidents/${id}`, { headers: this.getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch incident details');
      return res.json();
    } catch (e) {
      return { ...baseInc, timeline };
    }
  }

  async updateIncidentStatus(id: string, status: string, notes?: string) {
    if (this.isDemoMode()) {
      const inc = this.mockIncidents.find(i => i.id === id);
      if (inc) {
        inc.status = status as any;
        if (notes) inc.admin_notes = notes;
        return inc;
      }
      return { success: true };
    }

    const res = await fetch(`${getApiBase()}/api/incidents/${id}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status, notes })
    });
    if (!res.ok) throw new Error('Failed to update incident status');
    return res.json();
  }

  async triggerDemoIncident(type: string, camera_id = 'CAM-01') {
    const newInc: Incident = {
      id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      incident_type: type,
      camera_id,
      camera_name: this.mockCameras.find(c => c.id === camera_id)?.name || 'Surveillance Cam',
      location: 'Active Zone Monitor',
      timestamp: new Date().toISOString(),
      severity: type.includes('FIRE') || type.includes('WEAPON') ? 'CRITICAL' : 'HIGH',
      confidence: 0.94,
      status: 'NEW',
      is_dismissed: false,
      ai_summary: `Live AI simulation detected ${type} in camera zone with 94% confidence.`,
      recommended_departments: type.includes('FIRE') ? ['fireservice'] : ['police']
    };

    if (this.isDemoMode()) {
      this.mockIncidents.unshift(newInc);
      return newInc;
    }

    try {
      const res = await fetch(`${getApiBase()}/api/incidents/trigger_demo`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ incident_type: type, camera_id, severity: 'CRITICAL', confidence: 0.94 })
      });
      if (!res.ok) throw new Error('Failed to trigger demo incident');
      return res.json();
    } catch (e) {
      this.mockIncidents.unshift(newInc);
      return newInc;
    }
  }

  // Emergency Response
  async forwardIncident(incidentId: string, department: string, notes?: string) {
    const inc = this.mockIncidents.find(i => i.id === incidentId);
    if (this.isDemoMode() || !inc) {
      const deptInc: DepartmentIncident = {
        forwarding_id: Math.floor(Math.random() * 10000),
        incident_id: incidentId,
        incident_type: inc?.incident_type || 'CRITICAL_ALERT',
        camera_id: inc?.camera_id || 'CAM-01',
        camera_name: inc?.camera_name || 'Active Camera',
        location: inc?.location || 'Sector 1',
        timestamp: inc?.timestamp || new Date().toISOString(),
        severity: inc?.severity || 'CRITICAL',
        confidence: inc?.confidence || 0.95,
        ai_summary: inc?.ai_summary,
        response_status: 'FORWARDED',
        forwarded_by: 'SOC Operator',
        forwarded_at: new Date().toISOString(),
        notes: notes || 'Immediate response requested'
      };
      this.mockDeptIncidents.unshift(deptInc);
      return { success: true, department, incidentId };
    }

    try {
      const res = await fetch(`${getApiBase()}/api/emergency/forward`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ incident_id: incidentId, department, notes })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to forward incident');
      }
      return res.json();
    } catch (e) {
      return { success: true, department, incidentId };
    }
  }

  async getDepartmentIncidents(department: string): Promise<DepartmentIncident[]> {
    if (this.isDemoMode()) {
      return [...this.mockDeptIncidents];
    }

    try {
      const res = await fetch(`${getApiBase()}/api/emergency/${department}/incidents`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch department incidents');
      return res.json();
    } catch (e) {
      return [...this.mockDeptIncidents];
    }
  }

  async updateResponseStatus(incidentId: string, status: string, message?: string) {
    if (this.isDemoMode()) {
      const deptInc = this.mockDeptIncidents.find(d => d.incident_id === incidentId);
      if (deptInc) {
        deptInc.response_status = status as any;
        if (message) deptInc.notes = message;
      }
      return { success: true };
    }

    const res = await fetch(`${getApiBase()}/api/emergency/incidents/${incidentId}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ response_status: status, message })
    });
    if (!res.ok) throw new Error('Failed to update emergency response status');
    return res.json();
  }

  async getTimeline(incidentId: string): Promise<IncidentTimeline[]> {
    return [
      { id: 1, department: 'AI Engine', status: 'DETECTED', message: 'Violation confirmed', timestamp: new Date(Date.now() - 300000).toISOString() },
      { id: 2, department: 'SOC Dispatch', status: 'FORWARDED', message: 'Forwarded to emergency unit', timestamp: new Date(Date.now() - 120000).toISOString() }
    ];
  }

  // Smart Zones
  async getZones(cameraId: string): Promise<SmartZone[]> {
    if (this.isDemoMode()) {
      return this.mockZones.filter(z => z.camera_id === cameraId);
    }

    try {
      const res = await fetch(`${getApiBase()}/api/zones/${cameraId}`, { headers: this.getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch zones');
      return res.json();
    } catch (e) {
      return this.mockZones.filter(z => z.camera_id === cameraId);
    }
  }

  async createZone(zone: { camera_id: string; name: string; zone_type: string; polygon_points: [number, number][]; rule_type?: string }) {
    if (this.isDemoMode()) {
      const newZ: SmartZone = {
        id: Math.floor(Math.random() * 10000),
        camera_id: zone.camera_id,
        name: zone.name,
        zone_type: zone.zone_type as any,
        polygon_points: zone.polygon_points,
        rule_type: zone.rule_type || 'standard'
      };
      this.mockZones.push(newZ);
      return newZ;
    }

    const res = await fetch(`${getApiBase()}/api/zones`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(zone)
    });
    if (!res.ok) throw new Error('Failed to create zone');
    return res.json();
  }

  async deleteZone(zoneId: number) {
    if (this.isDemoMode()) {
      this.mockZones = this.mockZones.filter(z => z.id !== zoneId);
      return { success: true };
    }

    const res = await fetch(`${getApiBase()}/api/zones/${zoneId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete zone');
    return res.json();
  }

  // Analytics & Diagnostics
  async getAnalyticsSummary() {
    if (this.isDemoMode()) {
      return {
        total_active_cameras: this.mockCameras.length,
        total_people_detected: this.mockCameras.reduce((acc, c) => acc + (c.total_people || 0), 0),
        total_incidents_today: this.mockIncidents.length + 8,
        active_critical_alerts: this.mockIncidents.filter(i => i.severity === 'CRITICAL' && !i.is_dismissed).length,
        average_ai_inference_time_ms: 16.4,
        threat_levels: {
          fire: 'ACTIVE_ALARM',
          crowd_surge: 'ELEVATED',
          violence: 'NOMINAL',
          fall: 'MONITORED'
        }
      };
    }

    try {
      const res = await fetch(`${getApiBase()}/api/analytics/summary`, { headers: this.getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    } catch (e) {
      return {
        total_active_cameras: 4,
        total_people_detected: 116,
        total_incidents_today: 12,
        active_critical_alerts: 1,
        average_ai_inference_time_ms: 16.4
      };
    }
  }

  async getDailyReport() {
    return {
      date: new Date().toLocaleDateString(),
      total_incidents: 14,
      by_type: { FIRE_SMOKE: 3, CROWD_SURGE: 6, FALL_DETECTED: 4, FIGHT: 1 },
      avg_resolution_time_min: 2.4,
      safety_score_percentage: 97.2
    };
  }

  async getSystemHealth(): Promise<SystemHealth> {
    if (this.isDemoMode()) {
      return MOCK_SYSTEM_HEALTH;
    }

    try {
      const res = await fetch(`${getApiBase()}/api/system/health`, { headers: this.getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch system health');
      return res.json();
    } catch (e) {
      return MOCK_SYSTEM_HEALTH;
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    if (this.isDemoMode()) {
      return MOCK_MODELS;
    }

    try {
      const res = await fetch(`${getApiBase()}/api/system/models`, { headers: this.getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch models');
      return res.json();
    } catch (e) {
      return MOCK_MODELS;
    }
  }

  async getAIDebugLogs(): Promise<AIDebugLog[]> {
    return MOCK_DEBUG_LOGS;
  }

  async getAuditLogs(): Promise<any[]> {
    return [
      { id: 1, timestamp: new Date(Date.now() - 180000).toISOString(), user: 'admin', action: 'Zone Boundary Updated', detail: 'CAM-01 Turnstile Zone expanded' },
      { id: 2, timestamp: new Date(Date.now() - 420000).toISOString(), user: 'police', action: 'Incident Acknowledged', detail: 'INC-8038 Crowd Surge dispatched' }
    ];
  }

  async getSettings() {
    return {
      api_base: getApiBase(),
      confidence_person: 0.50,
      confidence_fire: 0.75,
      confidence_smoke: 0.70,
      confidence_weapon: 0.75,
      fire_persistence_frames: 3,
      alert_sound_enabled: true
    };
  }

  async dismissIncident(id: string | number, reason: string) {
    if (this.isDemoMode()) {
      const inc = this.mockIncidents.find(i => String(i.id) === String(id));
      if (inc) {
        inc.is_dismissed = true;
        inc.status = 'DISMISSED';
        inc.dismiss_reason = reason;
      }
      return { success: true };
    }

    try {
      const res = await fetch(`${getApiBase()}/api/incidents/${id}/dismiss`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ reason })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to dismiss incident');
      }
      return res.json();
    } catch (e) {
      const inc = this.mockIncidents.find(i => String(i.id) === String(id));
      if (inc) {
        inc.is_dismissed = true;
        inc.status = 'DISMISSED';
        inc.dismiss_reason = reason;
      }
      return { success: true };
    }
  }

  async searchIncidentsNl(query: string) {
    const q = query.toLowerCase();
    const matches = this.mockIncidents.filter(i =>
      i.incident_type.toLowerCase().includes(q) ||
      i.location.toLowerCase().includes(q) ||
      (i.ai_summary && i.ai_summary.toLowerCase().includes(q))
    );
    return { query, count: matches.length, results: matches, explanation: `Filtered ${matches.length} incidents matching query: "${query}"` };
  }

  // Video Analysis Lab
  async uploadVideoAnalysis(file: File, cameraId: string) {
    return {
      id: Math.floor(Math.random() * 10000),
      filename: file.name,
      camera_id: cameraId,
      status: 'PROCESSING' as const,
      progress: 0,
      total_frames: 300,
      processed_frames: 0,
      fps: 25,
      incident_count: 0,
      created_at: new Date().toISOString()
    };
  }

  async getVideoAnalysisJobs() {
    return [
      {
        id: 1,
        filename: 'concourse_cctv_sample.mp4',
        camera_id: 'CAM-01',
        status: 'COMPLETED' as const,
        progress: 100,
        total_frames: 450,
        processed_frames: 450,
        fps: 29.8,
        incident_count: 3,
        created_at: new Date(Date.now() - 3600000).toISOString()
      }
    ];
  }

  async getVideoAnalysisJob(id: number) {
    return {
      id,
      filename: 'concourse_cctv_sample.mp4',
      camera_id: 'CAM-01',
      status: 'COMPLETED' as const,
      progress: 100,
      total_frames: 450,
      processed_frames: 450,
      fps: 29.8,
      incident_count: 3,
      created_at: new Date(Date.now() - 3600000).toISOString()
    };
  }

  async updateSettings(settings: any) {
    if (settings.api_base) {
      setApiBase(settings.api_base);
    }
    return { success: true, settings };
  }
}

export const api = new ApiService();
