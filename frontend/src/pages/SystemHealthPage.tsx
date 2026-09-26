import React, { useState, useEffect } from 'react';
import { SystemHealth, ModelInfo, AIDebugLog } from '../types';
import { api } from '../services/api';
import { Cpu, HardDrive, Zap, Server, ShieldCheck, Activity, RefreshCw, Layers } from 'lucide-react';

export const SystemHealthPage: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [debugLogs, setDebugLogs] = useState<AIDebugLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 3000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      const [h, m, d] = await Promise.all([
        api.getSystemHealth(),
        api.getModels(),
        api.getAIDebugLogs()
      ]);
      setHealth(h);
      setModels(m);
      setDebugLogs(d);
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
            SYSTEM HEALTH & AI ENGINE DIAGNOSTICS
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Real-time hardware telemetry, model inference rates, and decision-tree validation logs
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-soc-border hover:border-cyan-500/50 text-cyan-400 text-xs font-mono flex items-center space-x-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Diagnostics</span>
        </button>
      </div>

      {/* Hardware Telemetry Cards */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-xl border border-soc-border space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>CPU UTILIZATION</span>
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-mono font-bold text-white">{health.cpu_percent}%</div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-cyan-400 transition-all" style={{ width: `${health.cpu_percent}%` }}></div>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-soc-border space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>SYSTEM MEMORY</span>
              <HardDrive className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-mono font-bold text-white">
              {health.ram_used_gb} / {health.ram_total_gb} GB
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-purple-400 transition-all" style={{ width: `${health.ram_percent}%` }}></div>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-soc-border space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>INFERENCE ENGINE</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-sm font-mono font-bold text-white truncate">{health.gpu_device}</div>
            <div className="text-[11px] font-mono text-emerald-400">Latency: ~{health.average_inference_ms}ms / frame</div>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-soc-border space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>CORE CLUSTER STATUS</span>
              <Server className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-mono font-bold text-emerald-400">{health.status}</div>
            <div className="text-[11px] font-mono text-slate-400">WebSocket Real-Time Feed Active</div>
          </div>
        </div>
      )}

      {/* Model Registry */}
      <div className="glass-panel p-5 rounded-xl border border-soc-border space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-soc-border">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-mono font-bold text-white">MODULAR AI DETECTOR REGISTRY</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {models.map(m => (
            <div key={m.id} className="p-4 rounded-lg bg-slate-900/90 border border-soc-border space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{m.name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {m.status}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] font-sans">{m.purpose}</p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                <span className="text-slate-500">Version: <strong className="text-slate-300">{m.version}</strong></span>
                <span className="text-slate-500">Speed: <strong className="text-cyan-400">{m.inference_speed}</strong></span>
                <span className="text-slate-500">Threshold: <strong className="text-amber-400">{Math.round(m.confidence_threshold * 100)}%</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Debug Panel (False Positive & Rejection Inspector) */}
      <div className="glass-panel p-5 rounded-xl border border-soc-border space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-soc-border">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-mono font-bold text-white">
              AI DEBUG PANEL — PREDICTION VALIDATION LOGS
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Real-time inspection of accepted vs rejected event candidates
          </span>
        </div>

        {debugLogs.length === 0 ? (
          <p className="p-6 text-center text-xs font-mono text-slate-500">Awaiting inference evaluations...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Camera</th>
                  <th className="py-2 px-3">Model</th>
                  <th className="py-2 px-3">Raw Prediction</th>
                  <th className="py-2 px-3">Threshold</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Reason / Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {debugLogs.slice(0, 15).map((log, idx) => {
                  const isAccepted = log.status === 'CONFIRMED';
                  const isValidating = log.status === 'VALIDATING';
                  const isFalsePositive = log.status === 'FALSE_POSITIVE';

                  return (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-3 text-slate-500">{log.timestamp}</td>
                      <td className="py-2.5 px-3 font-bold text-cyan-400">{log.camera_id}</td>
                      <td className="py-2.5 px-3 text-slate-300">{log.model}</td>
                      <td className="py-2.5 px-3 text-slate-200 font-semibold">{log.raw_prediction}</td>
                      <td className="py-2.5 px-3 text-slate-400">≥ {log.threshold}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isAccepted ? 'bg-red-950 text-red-400 border border-red-800 animate-pulse' :
                          isValidating ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                          isFalsePositive ? 'bg-purple-950 text-purple-400 border border-purple-800' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">{log.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
