import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Users, Car, TrendingUp, AlertTriangle, RefreshCw, BarChart2, Compass } from 'lucide-react';

export const CrowdAnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 4000);
    return () => clearInterval(interval);
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await api.getAnalyticsSummary();
      setAnalytics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-mono font-bold text-white tracking-wide">
            CROWD INTELLIGENCE & TRAFFIC DYNAMICS
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Zone occupancy, flow estimation, peak thresholds, and density spatial analysis
          </p>
        </div>
        <button
          onClick={loadAnalytics}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-soc-border hover:border-cyan-500/50 text-cyan-400 text-xs font-mono flex items-center space-x-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Telemetry</span>
        </button>
      </div>

      {analytics && (
        <>
          {/* People & Entry/Exit Counting Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="glass-panel p-4 rounded-xl border border-soc-border font-mono">
              <div className="text-[10px] text-slate-400 uppercase">CURRENT CROWD</div>
              <div className="text-2xl font-bold text-cyan-400 mt-1">{analytics.current_people}</div>
              <div className="text-[10px] text-slate-500">Tracked Individuals</div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-soc-border font-mono">
              <div className="text-[10px] text-slate-400 uppercase">TOTAL ENTRY</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">+{analytics.entry_count}</div>
              <div className="text-[10px] text-slate-500">Inbound Flow</div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-soc-border font-mono">
              <div className="text-[10px] text-slate-400 uppercase">TOTAL EXIT</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">-{analytics.exit_count}</div>
              <div className="text-[10px] text-slate-500">Outbound Flow</div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-soc-border font-mono">
              <div className="text-[10px] text-slate-400 uppercase">PEAK CROWD</div>
              <div className="text-2xl font-bold text-purple-400 mt-1">{analytics.peak_people}</div>
              <div className="text-[10px] text-slate-500">At 18:42 UTC</div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-soc-border font-mono">
              <div className="text-[10px] text-slate-400 uppercase">AVG DENSITY</div>
              <div className="text-2xl font-bold text-white mt-1">{analytics.average_people}</div>
              <div className="text-[10px] text-slate-500">Per Quadrant</div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-soc-border font-mono">
              <div className="text-[10px] text-slate-400 uppercase">VEHICLES</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{analytics.current_vehicles}</div>
              <div className="text-[10px] text-slate-500">In Parking Bays</div>
            </div>
          </div>

          {/* Spatial Density Quadrants */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-5 rounded-xl border border-soc-border space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-soc-border">
                <Compass className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-mono font-bold text-white">SPATIAL QUADRANT DISTRIBUTION</h2>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-4 rounded-lg bg-slate-900/90 border border-soc-border space-y-1">
                  <div className="text-slate-400 text-[11px]">ZONE A (NORTH-WEST)</div>
                  <div className="text-xl font-bold text-cyan-400">14 People</div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                    DENSITY: LOW
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-slate-900/90 border border-soc-border space-y-1">
                  <div className="text-slate-400 text-[11px]">ZONE B (NORTH-EAST)</div>
                  <div className="text-xl font-bold text-cyan-400">18 People</div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950 text-amber-400 border border-amber-800">
                    DENSITY: MEDIUM
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-slate-900/90 border border-soc-border space-y-1">
                  <div className="text-slate-400 text-[11px]">ZONE C (SOUTH-WEST)</div>
                  <div className="text-xl font-bold text-cyan-400">8 People</div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                    DENSITY: LOW
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-slate-900/90 border border-soc-border space-y-1">
                  <div className="text-slate-400 text-[11px]">ZONE D (SOUTH-EAST)</div>
                  <div className="text-xl font-bold text-cyan-400">7 People</div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                    DENSITY: LOW
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-soc-border text-xs font-mono text-slate-300">
                Overall Perimeter Status: <strong className="text-emerald-400">NORMAL FLOW (38% OCCUPANCY)</strong>. Max capacity set to 50 persons per camera sector.
              </div>
            </div>

            {/* Vehicle Analytics */}
            <div className="glass-panel p-5 rounded-xl border border-soc-border space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-soc-border">
                <Car className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-mono font-bold text-white">VEHICLE CLASSIFICATION BREAKDOWN</h2>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {Object.entries(analytics.vehicle_breakdown || {}).map(([type, count]: any) => (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span>{type}</span>
                      <span className="font-bold text-cyan-400">{count} Units</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                        style={{ width: `${(count / 18) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-soc-border text-xs font-mono text-slate-400">
                Parking Bay Occupancy: <strong className="text-white">62%</strong> • No traffic congestion detected.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
