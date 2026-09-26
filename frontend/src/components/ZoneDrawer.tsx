import React, { useState, useEffect, useRef } from 'react';
import { SmartZone } from '../types';
import { api, API_BASE } from '../services/api';
import { ShieldAlert, Trash2, Plus, Check, RefreshCw } from 'lucide-react';

interface ZoneDrawerProps {
  cameraId: string;
  cameraName: string;
  onClose: () => void;
}

export const ZoneDrawer: React.FC<ZoneDrawerProps> = ({ cameraId, cameraName, onClose }) => {
  const [zones, setZones] = useState<SmartZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<[number, number][]>([]);
  const [zoneName, setZoneName] = useState('Restricted Zone 1');
  const [zoneType, setZoneType] = useState<'restricted' | 'entry' | 'exit' | 'high_density'>('restricted');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadZones();
  }, [cameraId]);

  const loadZones = async () => {
    setLoading(true);
    try {
      const data = await api.getZones(cameraId);
      setZones(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setCurrentPoints(prev => [...prev, [parseFloat(x.toFixed(3)), parseFloat(y.toFixed(3))]]);
  };

  const handleSaveZone = async () => {
    if (currentPoints.length < 3) {
      alert('A polygon zone requires at least 3 points.');
      return;
    }

    try {
      await api.createZone({
        camera_id: cameraId,
        name: zoneName,
        zone_type: zoneType,
        polygon_points: currentPoints,
        rule_type: zoneType === 'restricted' ? 'INTRUSION' : 'CROWD_FLOW'
      });
      setCurrentPoints([]);
      setIsDrawing(false);
      loadZones();
    } catch (e: any) {
      alert(e.message || 'Failed to save zone');
    }
  };

  const handleDeleteZone = async (id: number) => {
    try {
      await api.deleteZone(id);
      loadZones();
    } catch (e: any) {
      alert(e.message || 'Failed to delete zone');
    }
  };

  // Render polygon overlays on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing zones
    zones.forEach(z => {
      if (z.polygon_points.length >= 3) {
        ctx.beginPath();
        const startX = z.polygon_points[0][0] * canvas.width;
        const startY = z.polygon_points[0][1] * canvas.height;
        ctx.moveTo(startX, startY);

        for (let i = 1; i < z.polygon_points.length; i++) {
          ctx.lineTo(z.polygon_points[i][0] * canvas.width, z.polygon_points[i][1] * canvas.height);
        }
        ctx.closePath();

        const isRestricted = z.zone_type === 'restricted';
        ctx.strokeStyle = isRestricted ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = isRestricted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)';
        ctx.fill();

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px "JetBrains Mono"';
        ctx.fillText(z.name, startX + 5, startY - 5);
      }
    });

    // Draw current in-progress points
    if (currentPoints.length > 0) {
      ctx.beginPath();
      const sX = currentPoints[0][0] * canvas.width;
      const sY = currentPoints[0][1] * canvas.height;
      ctx.moveTo(sX, sY);

      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(currentPoints[i][0] * canvas.width, currentPoints[i][1] * canvas.height);
      }

      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw point handles
      currentPoints.forEach(p => {
        ctx.beginPath();
        ctx.arc(p[0] * canvas.width, p[1] * canvas.height, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#00f0ff';
        ctx.fill();
      });
    }
  }, [zones, currentPoints]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-soc-card border border-soc-border rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-soc-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-mono font-bold text-white">
              Smart Zone Geofencing — {cameraName} ({cameraId})
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm font-mono">
            [ CLOSE ]
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto">
          {/* Stream & Drawing Canvas */}
          <div className="lg:col-span-2 space-y-3">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-soc-border" ref={containerRef}>
              <img
                src={`${API_BASE}/api/cameras/${cameraId}/stream`}
                alt={cameraName}
                className="w-full h-full object-cover"
              />
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                onClick={handleCanvasClick}
                className={`absolute inset-0 w-full h-full ${isDrawing ? 'cursor-crosshair' : 'cursor-default'}`}
              />
            </div>
            <p className="text-xs text-slate-400 font-mono">
              {isDrawing 
                ? 'CLICK on the video frame to place polygon boundary points. Minimum 3 points required.' 
                : 'Click "+ Draw New Zone" below to begin defining a smart restricted boundary.'}
            </p>
          </div>

          {/* Controls & Active Zones List */}
          <div className="space-y-4">
            {/* Draw Controls */}
            {!isDrawing ? (
              <button
                onClick={() => { setIsDrawing(true); setCurrentPoints([]); }}
                className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-glow-cyan"
              >
                <Plus className="w-4 h-4" />
                <span>DRAW NEW SMART ZONE</span>
              </button>
            ) : (
              <div className="p-4 rounded-lg bg-slate-900 border border-cyan-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-cyan-400">ZONE PARAMETERS</span>
                  <span className="text-[10px] font-mono text-slate-400">{currentPoints.length} points placed</span>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-mono">Zone Name</label>
                  <input
                    type="text"
                    value={zoneName}
                    onChange={(e) => setZoneName(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-mono">Security Classification</label>
                  <select
                    value={zoneType}
                    onChange={(e) => setZoneType(e.target.value as any)}
                    className="w-full mt-1 px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="restricted">RESTRICTED AREA (Intrusion Alert)</option>
                    <option value="high_density">HIGH DENSITY AREA</option>
                    <option value="entry">ENTRY CORRIDOR</option>
                    <option value="exit">EXIT CORRIDOR</option>
                  </select>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={handleSaveZone}
                    disabled={currentPoints.length < 3}
                    className="flex-1 py-1.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-mono text-xs font-bold flex items-center justify-center space-x-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>SAVE</span>
                  </button>
                  <button
                    onClick={() => { setIsDrawing(false); setCurrentPoints([]); }}
                    className="py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}

            {/* Existing Zones */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-slate-300">ACTIVE CAMERA ZONES ({zones.length})</span>
              {loading ? (
                <div className="text-xs text-slate-500 font-mono flex items-center space-x-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading zones...</span>
                </div>
              ) : zones.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono italic">No custom zones configured yet.</p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {zones.map(z => (
                    <div key={z.id} className="p-2.5 rounded bg-slate-900 border border-soc-border flex items-center justify-between">
                      <div>
                        <div className="text-xs font-mono font-semibold text-white">{z.name}</div>
                        <div className={`text-[10px] font-mono ${z.zone_type === 'restricted' ? 'text-red-400' : 'text-emerald-400'}`}>
                          {z.zone_type.toUpperCase()} ({z.polygon_points.length} pts)
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteZone(z.id)}
                        className="p-1 text-slate-400 hover:text-red-400 rounded transition-colors"
                        title="Delete Zone"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
