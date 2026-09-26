import React, { useState } from 'react';
import { Camera } from '../types';
import { API_BASE } from '../services/api';
import { Maximize2, Camera as CameraIcon, Flame, AlertOctagon, Users, Car, Settings, CheckCircle } from 'lucide-react';

interface CameraCardProps {
  camera: Camera;
  onSelectForDetail?: (cameraId: string) => void;
  onConfigureZones?: (cameraId: string) => void;
}

export const CameraCard: React.FC<CameraCardProps> = ({ camera, onSelectForDetail, onConfigureZones }) => {
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);
  const [imgError, setImgError] = useState(false);

  const streamUrl = `${API_BASE}/api/cameras/${camera.id}/stream`;
  const isOnline = camera.status === 'online' && camera.is_active;

  const handleTakeSnapshot = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`${API_BASE}/api/cameras/${camera.id}/snapshot`, '_blank');
    setSnapshotSuccess(true);
    setTimeout(() => setSnapshotSuccess(false), 2000);
  };

  return (
    <div className="glass-panel rounded-xl overflow-hidden border border-soc-border hover:border-slate-700 transition-all flex flex-col group">
      {/* Top Header */}
      <div className="p-3 bg-soc-card/90 border-b border-soc-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-cyan-400">{camera.id}</span>
              <span className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">{camera.name}</span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">{camera.location}</p>
          </div>
        </div>

        {/* Telemetry & Badges */}
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {camera.fps || 25} FPS
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {camera.latency_ms || 32}ms
          </span>
          {camera.ai_active && (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800">
              AI ACTIVE
            </span>
          )}
        </div>
      </div>

      {/* Video Viewport */}
      <div className="relative aspect-video bg-black/90 flex items-center justify-center overflow-hidden">
        {isOnline && !imgError ? (
          <img
            src={streamUrl}
            alt={camera.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
            <AlertOctagon className="w-8 h-8 text-amber-500 animate-bounce" />
            <p className="text-xs font-mono text-slate-400">FEED OFFLINE OR STANDBY</p>
            <p className="text-[11px] text-slate-500">Checking video ingestion worker...</p>
          </div>
        )}

        {/* Dynamic Threat Overlays */}
        {camera.fire_active && (
          <div className="absolute top-2 left-2 flex items-center space-x-1.5 px-2 py-1 rounded bg-red-600/90 text-white font-mono text-[10px] font-bold shadow-glow-red animate-bounce">
            <Flame className="w-3.5 h-3.5" />
            <span>🔥 CONFIRMED FIRE</span>
          </div>
        )}

        {camera.smoke_active && !camera.fire_active && (
          <div className="absolute top-2 left-2 flex items-center space-x-1.5 px-2 py-1 rounded bg-orange-600/90 text-white font-mono text-[10px] font-bold">
            <span>💨 SMOKE DETECTED</span>
          </div>
        )}

        {/* Bottom Metadata Bar over video */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 flex items-center justify-between text-[11px] font-mono text-slate-300">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 bg-black/50 px-2 py-0.5 rounded border border-white/10">
              <Users className="w-3 h-3 text-cyan-400" />
              <span>{camera.total_people ?? 0}</span>
            </div>
            <div className="flex items-center space-x-1 bg-black/50 px-2 py-0.5 rounded border border-white/10">
              <Car className="w-3 h-3 text-emerald-400" />
              <span>{camera.total_vehicles ?? 0}</span>
            </div>
            <div className="hidden sm:block">
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                camera.crowd_density === 'CRITICAL' ? 'bg-red-950 text-red-400 border border-red-800' :
                camera.crowd_density === 'HIGH' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                'bg-slate-900 text-slate-400'
              }`}>
                DENSITY: {camera.crowd_density || 'LOW'}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleTakeSnapshot}
              title="Save Snapshot"
              className="p-1 rounded bg-black/60 hover:bg-cyan-900/60 border border-white/10 text-slate-300 hover:text-cyan-300 transition-colors"
            >
              {snapshotSuccess ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <CameraIcon className="w-3.5 h-3.5" />}
            </button>
            {onConfigureZones && (
              <button
                onClick={(e) => { e.stopPropagation(); onConfigureZones(camera.id); }}
                title="Configure Smart Zones"
                className="p-1 rounded bg-black/60 hover:bg-cyan-900/60 border border-white/10 text-slate-300 hover:text-cyan-300 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
            {onSelectForDetail && (
              <button
                onClick={(e) => { e.stopPropagation(); onSelectForDetail(camera.id); }}
                title="Expand Feed"
                className="p-1 rounded bg-black/60 hover:bg-cyan-900/60 border border-white/10 text-slate-300 hover:text-cyan-300 transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
