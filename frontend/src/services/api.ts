import { Camera, Incident, SmartZone, SystemHealth, ModelInfo, AIDebugLog, DepartmentIncident, IncidentTimeline, User } from '../types';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('sentinelvision_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  // Auth
  async login(username: string, password: string) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem('sentinelvision_token', data.access_token);
    localStorage.setItem('sentinelvision_user', JSON.stringify(data));
    return data;
  }

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch user profile');
    return res.json();
  }

  logout() {
    localStorage.removeItem('sentinelvision_token');
    localStorage.removeItem('sentinelvision_user');
  }

  // Cameras
  async getCameras(): Promise<Camera[]> {
    const res = await fetch(`${API_BASE}/api/cameras`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch cameras');
    return res.json();
  }

  async getCamera(id: string): Promise<Camera> {
    const res = await fetch(`${API_BASE}/api/cameras/${id}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch camera ${id}`);
    return res.json();
  }

  async addCamera(camera: { id: string; name: string; location: string; source_type: string; source_url: string }) {
    const res = await fetch(`${API_BASE}/api/cameras`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(camera)
    });
    if (!res.ok) throw new Error('Failed to add camera');
    return res.json();
  }

  async updateCamera(id: string, updates: Partial<Camera>) {
    const res = await fetch(`${API_BASE}/api/cameras/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update camera');
    return res.json();
  }

  async deleteCamera(id: string) {
    const res = await fetch(`${API_BASE}/api/cameras/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete camera');
    return res.json();
  }

  // Remote Camera Ingestion
  async pushRemoteFrame(cameraId: string, base64Image: string) {
    const res = await fetch(`${API_BASE}/api/remote_camera/push_frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ camera_id: cameraId, image_base64: base64Image })
    });
    if (!res.ok) throw new Error('Failed to push remote camera frame');
    return res.json();
  }

  // Incidents
  async getIncidents(status?: string, severity?: string): Promise<Incident[]> {
    const params = new URLSearchParams();
    if (status) params.append('status_filter', status);
    if (severity) params.append('severity_filter', severity);

    const res = await fetch(`${API_BASE}/api/incidents?${params.toString()}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch incidents');
    return res.json();
  }

  async getIncident(id: string): Promise<Incident & { timeline: IncidentTimeline[] }> {
    const res = await fetch(`${API_BASE}/api/incidents/${id}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch incident details');
    return res.json();
  }

  async updateIncidentStatus(id: string, status: string, notes?: string) {
    const res = await fetch(`${API_BASE}/api/incidents/${id}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status, notes })
    });
    if (!res.ok) throw new Error('Failed to update incident status');
    return res.json();
  }

  async triggerDemoIncident(type: string, camera_id = 'CAM-01') {
    const res = await fetch(`${API_BASE}/api/incidents/trigger_demo`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ incident_type: type, camera_id, severity: 'CRITICAL', confidence: 0.94 })
    });
    if (!res.ok) throw new Error('Failed to trigger demo incident');
    return res.json();
  }

  // Emergency Response
  async forwardIncident(incidentId: string, department: string, notes?: string) {
    const res = await fetch(`${API_BASE}/api/emergency/forward`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ incident_id: incidentId, department, notes })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to forward incident');
    }
    return res.json();
  }

  async getDepartmentIncidents(department: string): Promise<DepartmentIncident[]> {
    const res = await fetch(`${API_BASE}/api/emergency/${department}/incidents`, {
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch department incidents');
    return res.json();
  }

  async updateResponseStatus(incidentId: string, status: string, message?: string) {
    const res = await fetch(`${API_BASE}/api/emergency/incidents/${incidentId}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ response_status: status, message })
    });
    if (!res.ok) throw new Error('Failed to update emergency response status');
    return res.json();
  }

  async getTimeline(incidentId: string): Promise<IncidentTimeline[]> {
    const res = await fetch(`${API_BASE}/api/emergency/incidents/${incidentId}/timeline`, {
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch incident timeline');
    return res.json();
  }

  // Smart Zones
  async getZones(cameraId: string): Promise<SmartZone[]> {
    const res = await fetch(`${API_BASE}/api/zones/${cameraId}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch zones');
    return res.json();
  }

  async createZone(zone: { camera_id: string; name: string; zone_type: string; polygon_points: [number, number][]; rule_type?: string }) {
    const res = await fetch(`${API_BASE}/api/zones`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(zone)
    });
    if (!res.ok) throw new Error('Failed to create zone');
    return res.json();
  }

  async deleteZone(zoneId: number) {
    const res = await fetch(`${API_BASE}/api/zones/${zoneId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete zone');
    return res.json();
  }

  // Analytics & Diagnostics
  async getAnalyticsSummary() {
    const res = await fetch(`${API_BASE}/api/analytics/summary`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  }

  async getDailyReport() {
    const res = await fetch(`${API_BASE}/api/analytics/daily_report`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch daily report');
    return res.json();
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const res = await fetch(`${API_BASE}/api/system/health`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch system health');
    return res.json();
  }

  async getModels(): Promise<ModelInfo[]> {
    const res = await fetch(`${API_BASE}/api/system/models`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch models');
    return res.json();
  }

  async getAIDebugLogs(): Promise<AIDebugLog[]> {
    const res = await fetch(`${API_BASE}/api/system/debug_logs`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch AI debug logs');
    return res.json();
  }

  async getAuditLogs(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/api/system/audit_logs`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  }

  async getSettings() {
    const res = await fetch(`${API_BASE}/api/settings`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  }

  async dismissIncident(id: string | number, reason: string) {
    const res = await fetch(`${API_BASE}/api/incidents/${id}/dismiss`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to dismiss incident');
    }
    return res.json();
  }

  async searchIncidentsNl(query: string) {
    const res = await fetch(`${API_BASE}/api/incidents/search_nl`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query })
    });
    if (!res.ok) throw new Error('Failed to run natural language search');
    return res.json();
  }

  // Video Analysis Lab
  async uploadVideoAnalysis(file: File, cameraId: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('camera_id', cameraId);

    const token = localStorage.getItem('sentinelvision_token');
    const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

    const res = await fetch(`${API_BASE}/api/video-analysis/upload`, {
      method: 'POST',
      headers,
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload video for analysis');
    }
    return res.json();
  }

  async getVideoAnalysisJobs() {
    const res = await fetch(`${API_BASE}/api/video-analysis/jobs`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch video analysis jobs');
    return res.json();
  }

  async getVideoAnalysisJob(id: number) {
    const res = await fetch(`${API_BASE}/api/video-analysis/${id}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch video analysis job');
    return res.json();
  }

  async updateSettings(settings: any) {
    const res = await fetch(`${API_BASE}/api/settings`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  }
}

export const api = new ApiService();
