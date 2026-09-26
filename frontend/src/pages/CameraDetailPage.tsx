import React, { useState } from 'react';
import { Camera, Incident } from '../types';
import { API_BASE } from '../services/api';
import { ZoneDrawer } from '../components/ZoneDrawer';
import { Video, Scan, Users, Car, ShieldAlert, ArrowLeft, Maximize2, Camera as CameraIcon } from 'lucide-react';

interface CameraDetailPageProps {
  cameras: Camera[];
  incidents: Incident[];
  onBack: () => void;
}

export const CameraDetailPage: React.FC<CameraDetailPageProps> = ({ cameras, incidents, onBack }) => {
  const [selectedCamId, setSelectedCamId] = useState<string>(cameras[0]?.id || 'CAM-01');
  const [showZoneDrawer, setShowZoneDrawer] = useState(false);

  const currentCam = cameras.find(c => c.id === selectedCamId) || cameras[0];
  const camIncidents = incidents.filter(i => i.camera_id === selectedCamId);

  if (!currentCam) {
    return <div className="p-6 text-white font-mono">No cameras found.</div>;
  }

  const streamUrl = `${API_BASE}/api/cameras/${currentCam.id}/stream`;

  return (
    <div className="space-y-6">
      {/* Top Header & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-slate-900 border border-soc-border hover:border-cyan-500/50 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-cyan-400">{currentCam.id}</span>
              <h1 className="text-lg font-mono font-bold text-white">{currentCam.name}</h1>
            </div>
            <p className="text-xs text-slate-400 font-sans">{currentCam.location} • Source: {currentCam.source_type.toUpperCase()}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 font-mono text-xs">
          <select
            value={selectedCamId}
            onChange={(e) => setSelectedCamId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-soc-border text-cyan-400 focus:outline-none"
          >
            {cameras.map(c => (
              <option key={c.id} value={c.id}>
                {c.id} — {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowZoneDrawer(true)}
            className="py-2 px-3.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center space-x-2 shadow-glow-cyan transition-colors"
          >
            <Scan className="w-4 h-4" />
            <span>CONFIGURE SMART ZONES</span>
          </button>
        </div>
      </div>

      {/* Main Viewport & Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Large Viewport */}
        <div className="lg:col-span-2 space-y-3">
          <div className="glass-panel rounded-xl overflow-hidden border border-soc-border relative bg-black aspect-video flex items-center justify-center">
            <img
              src={streamUrl}
              alt={currentCam.name}
              className="w-full h-full object-cover"
            />
            {/* Live Pill */}
            <div className="absolute top-3 left-3 flex items-center space-x-2 px-2.5 py-1 rounded bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>LIVE AI STREAM</span>
            </div>

            <div className="absolute top-3 right-3 flex items-center space-x-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/70 text-slate-300 border border-white/10">
                {currentCam.fps || 25} FPS
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/70 text-slate-300 border border-white/10">
                {currentCam.latency_ms || 32}ms Latency
              </span>
            </div>
          </div>
        </div>

        {/* Telemetry & Detection Metrics */}
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-xl border border-soc-border space-y-4 font-mono text-xs">
            <div className="flex items-center space-x-2 pb-3 border-b border-soc-border">
              <Video className="w-4 h-4 text-cyan-400" />
              <h2 className="font-bold text-white">CAMERA TELEMETRY</h2>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Stream Source</span>
                <span className="text-white font-bold">{currentCam.source_type.toUpperCase()} ({currentCam.source_url})</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Resolution</span>
                <span className="text-white font-bold">{currentCam.resolution}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">People In View</span>
                <span className="text-cyan-400 font-bold">{currentCam.total_people || 0}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Vehicles In View</span>
                <span className="text-emerald-400 font-bold">{currentCam.total_vehicles || 0}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Crowd Density Status</span>
                <span className="text-amber-400 font-bold">{currentCam.crowd_density || 'LOW'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Fire/Smoke Model</span>
                <span className="text-emerald-400 font-bold">ONLINE (best.pt)</span>
              </div>
            </div>
          </div>

          {/* Camera Incident History */}
          <div className="glass-panel p-5 rounded-xl border border-soc-border space-y-3 font-mono text-xs">
            <div className="flex items-center space-x-2 pb-2 border-b border-soc-border">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-white">SECTOR THREAT HISTORY ({camIncidents.length})</h3>
            </div>

            {camIncidents.length === 0 ? (
              <p className="text-slate-500 py-3 text-center">No incidents recorded on this camera.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {camIncidents.map(inc => (
                  <div key={inc.id} className="p-2.5 rounded bg-slate-900 border border-soc-border space-y-1">
                    <div className="flex justify-between">
                      <span className="text-white font-bold">{inc.incident_type.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-cyan-400">{inc.id}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex justify-between">
                      <span>{new Date(inc.timestamp).toLocaleTimeString()}</span>
                      <span className="text-red-400 font-bold">{inc.severity}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showZoneDrawer && (
        <ZoneDrawer
          cameraId={currentCam.id}
          cameraName={currentCam.name}
          onClose={() => setShowZoneDrawer(false)}
        />
      )}
    </div>
  );
};
