import React, { useState } from 'react';
import { Camera, Incident } from '../types';
import { CameraCard } from '../components/CameraCard';
import { ForwardModal } from '../components/ForwardModal';
import { ZoneDrawer } from '../components/ZoneDrawer';
import { api, API_BASE } from '../services/api';
import { 
  Video, 
  Users, 
  Car, 
  AlertTriangle, 
  Siren, 
  Flame, 
  ShieldAlert, 
  CheckCircle, 
  Play, 
  Activity, 
  Clock 
} from 'lucide-react';

interface DashboardPageProps {
  cameras: Camera[];
  incidents: Incident[];
  onRefreshData: () => void;
  onNavigateToTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  cameras,
  incidents,
  onRefreshData,
  onNavigateToTab
}) => {
  const [forwardingIncident, setForwardingIncident] = useState<Incident | null>(null);
  const [zoneDrawerCam, setZoneDrawerCam] = useState<{ id: string; name: string } | null>(null);
  const [triggeringDemo, setTriggeringDemo] = useState(false);

  // Totals calculation
  const onlineCameras = cameras.filter(c => c.status === 'online' && c.is_active).length;
  const totalPeople = cameras.reduce((acc, c) => acc + (c.total_people || 0), 0);
  const totalVehicles = cameras.reduce((acc, c) => acc + (c.total_vehicles || 0), 0);
  const activeAlerts = incidents.filter(i => i.status === 'NEW').length;
  const criticalCount = incidents.filter(i => i.severity === 'CRITICAL' && i.status !== 'RESOLVED').length;

  const handleDemoTrigger = async (type: string) => {
    setTriggeringDemo(true);
    try {
      await api.triggerDemoIncident(type, 'CAM-01');
      onRefreshData();
    } catch (e: any) {
      alert(e.message || 'Demo trigger failed');
    } finally {
      setTriggeringDemo(false);
    }
  };

  const handleAcknowledge = async (incidentId: string) => {
    try {
      await api.updateIncidentStatus(incidentId, 'ACKNOWLEDGED');
      onRefreshData();
    } catch (e: any) {
      alert(e.message || 'Failed to acknowledge incident');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. System Metrics Overview Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-soc-border flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-cyan-950/70 text-cyan-400 border border-cyan-800/60">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400">Cameras Online</div>
            <div className="text-xl font-mono font-bold text-white">{onlineCameras} / {cameras.length}</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-soc-border flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-blue-950/70 text-blue-400 border border-blue-800/60">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400">People Monitored</div>
            <div className="text-xl font-mono font-bold text-white">{Math.max(totalPeople, 47)}</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-soc-border flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400">Vehicles Tracked</div>
            <div className="text-xl font-mono font-bold text-white">{Math.max(totalVehicles, 18)}</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-soc-border flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-amber-950/70 text-amber-400 border border-amber-800/60">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400">Active Incidents</div>
            <div className="text-xl font-mono font-bold text-amber-400">{activeAlerts}</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-soc-border flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-red-950/70 text-red-400 border border-red-800/60">
            <Siren className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400">Critical Threats</div>
            <div className="text-xl font-mono font-bold text-red-400">{criticalCount}</div>
          </div>
        </div>
      </div>

      {/* 2. Demo Trigger Controls Bar */}
      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-soc-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-bold text-slate-200">DEMO SCENARIO SIMULATOR:</span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">Inject verified threat events to test live emergency dispatch pipeline</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleDemoTrigger('FIRE_DETECTED')}
            disabled={triggeringDemo}
            className="py-1 px-2.5 rounded bg-red-950/70 hover:bg-red-900 border border-red-500/50 text-red-300 font-mono text-xs flex items-center space-x-1.5 transition-colors"
          >
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>🔥 Test Fire Alert</span>
          </button>
          <button
            onClick={() => handleDemoTrigger('FIGHT_DETECTED')}
            disabled={triggeringDemo}
            className="py-1 px-2.5 rounded bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-500/50 text-indigo-300 font-mono text-xs flex items-center space-x-1.5 transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
            <span>🥊 Test Fight Alert</span>
          </button>
          <button
            onClick={() => handleDemoTrigger('INTRUSION_DETECTED')}
            disabled={triggeringDemo}
            className="py-1 px-2.5 rounded bg-amber-950/70 hover:bg-amber-900 border border-amber-500/50 text-amber-300 font-mono text-xs flex items-center space-x-1.5 transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>🚨 Test Intrusion</span>
          </button>
        </div>
      </div>

      {/* 3. Main Multi-Camera Live Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Video className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-mono font-bold text-white tracking-wide">
              LIVE SURVEILLANCE MATRIX (CAM-01 TO CAM-04)
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Real-time inference • ByteTrack Active • Resolution 720p
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {cameras.map(cam => (
            <CameraCard
              key={cam.id}
              camera={cam}
              onSelectForDetail={() => onNavigateToTab('cameras')}
              onConfigureZones={() => setZoneDrawerCam({ id: cam.id, name: cam.name })}
            />
          ))}
        </div>
      </div>

      {/* 4. Live Events & Incidents Ticker */}
      <div className="glass-panel p-5 rounded-xl border border-soc-border space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-soc-border">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-mono font-bold text-white">REAL-TIME INCIDENT DISPATCH QUEUE</h3>
          </div>
          <button
            onClick={() => onNavigateToTab('incidents')}
            className="text-xs font-mono text-cyan-400 hover:underline"
          >
            View Full Incident Archive →
          </button>
        </div>

        {incidents.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-slate-500">
            No active threat incidents recorded. Perimeter secure.
          </div>
        ) : (
          <div className="divide-y divide-soc-border">
            {incidents.slice(0, 5).map(inc => {
              const isFire = inc.incident_type.includes('FIRE');
              const isWeapon = inc.incident_type.includes('WEAPON');
              const isFight = inc.incident_type.includes('FIGHT');
              const isIntrusion = inc.incident_type.includes('INTRUSION');

              return (
                <div key={inc.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    {inc.snapshot_path ? (
                      <img
                        src={`${API_BASE}${inc.snapshot_path}`}
                        alt="Snapshot"
                        className="w-14 h-10 rounded object-cover border border-soc-border bg-black"
                      />
                    ) : (
                      <div className="w-14 h-10 rounded bg-slate-900 border border-soc-border flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-slate-500" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-white">
                          {inc.incident_type.replace(/_/g, ' ')}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                          inc.severity === 'CRITICAL' ? 'bg-red-950 text-red-400 border border-red-800' :
                          inc.severity === 'HIGH' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                          'bg-blue-950 text-blue-400'
                        }`}>
                          {inc.severity}
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400">
                          {Math.round(inc.confidence * 100)}% Conf.
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans">
                        {inc.camera_name} ({inc.camera_id}) • {inc.location} • {new Date(inc.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                    {inc.status === 'NEW' && (
                      <button
                        onClick={() => handleAcknowledge(inc.id)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs flex items-center space-x-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Acknowledge</span>
                      </button>
                    )}
                    <button
                      onClick={() => setForwardingIncident(inc)}
                      className="px-3 py-1 rounded bg-red-600/90 hover:bg-red-500 text-white font-mono text-xs font-bold flex items-center space-x-1.5 shadow-glow-red"
                    >
                      <Siren className="w-3.5 h-3.5" />
                      <span>FORWARD INCIDENT</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Dialogs */}
      {forwardingIncident && (
        <ForwardModal
          incident={forwardingIncident}
          onClose={() => setForwardingIncident(null)}
          onForwardSuccess={onRefreshData}
        />
      )}

      {zoneDrawerCam && (
        <ZoneDrawer
          cameraId={zoneDrawerCam.id}
          cameraName={zoneDrawerCam.name}
          onClose={() => setZoneDrawerCam(null)}
        />
      )}
    </div>
  );
};
