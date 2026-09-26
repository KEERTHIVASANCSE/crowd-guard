import React, { useState, useEffect } from 'react';
import { DepartmentIncident, IncidentTimeline, UserRole } from '../types';
import { api, API_BASE } from '../services/api';
import { 
  Siren, 
  ShieldAlert, 
  Flame, 
  HeartPulse, 
  CheckCircle, 
  Clock, 
  MapPin, 
  RefreshCw, 
  ArrowRight, 
  AlertOctagon,
  FileCheck
} from 'lucide-react';

interface EmergencyPortalPageProps {
  userRole: UserRole;
}

export const EmergencyPortalPage: React.FC<EmergencyPortalPageProps> = ({ userRole }) => {
  const [selectedDept, setSelectedDept] = useState<string>(
    ['police', 'ambulance', 'fireservice'].includes(userRole) ? userRole : 'police'
  );
  const [incidents, setIncidents] = useState<DepartmentIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncidentTimeline, setSelectedIncidentTimeline] = useState<{ id: string; events: IncidentTimeline[] } | null>(null);

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    loadDepartmentIncidents();
  }, [selectedDept]);

  const loadDepartmentIncidents = async () => {
    setLoading(true);
    try {
      const data = await api.getDepartmentIncidents(selectedDept);
      setIncidents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (incidentId: string, status: string) => {
    try {
      await api.updateResponseStatus(incidentId, status);
      loadDepartmentIncidents();
    } catch (e: any) {
      alert(e.message || 'Status update failed');
    }
  };

  const handleViewTimeline = async (incidentId: string) => {
    try {
      const timeline = await api.getTimeline(incidentId);
      setSelectedIncidentTimeline({ id: incidentId, events: timeline });
    } catch (e) {
      console.error(e);
    }
  };

  const deptMeta = {
    police: {
      name: 'POLICE TACTICAL RESPONSE CENTER',
      icon: ShieldAlert,
      theme: 'from-indigo-950/70 to-slate-900 border-indigo-500/40 text-indigo-400',
      tag: 'CRITICAL SECURITY DISPATCH'
    },
    fireservice: {
      name: 'FIRE & RESCUE EMERGENCY OPERATIONS',
      icon: Flame,
      theme: 'from-red-950/70 to-slate-900 border-red-500/40 text-red-400',
      tag: 'HAZMAT & FIRE DISPATCH'
    },
    ambulance: {
      name: 'PARAMEDIC & MEDICAL TRAUMA CENTER',
      icon: HeartPulse,
      theme: 'from-emerald-950/70 to-slate-900 border-emerald-500/40 text-emerald-400',
      tag: 'EMERGENCY MEDICAL DISPATCH'
    },
  }[selectedDept] || {
    name: 'EMERGENCY RESPONSE CENTER',
    icon: Siren,
    theme: 'from-slate-900 to-slate-900 border-slate-700 text-cyan-400',
    tag: 'FIRST RESPONDER DESK'
  };

  const DeptIcon = deptMeta.icon;

  return (
    <div className="space-y-6">
      {/* Department Banner & Switcher */}
      <div className={`p-6 rounded-2xl bg-gradient-to-r ${deptMeta.theme} border shadow-2xl space-y-4`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
              <DeptIcon className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-black/40 border border-white/10 text-white">
                {deptMeta.tag}
              </span>
              <h1 className="text-xl font-mono font-bold text-white tracking-wide mt-1">
                {deptMeta.name}
              </h1>
              <p className="text-xs text-slate-300 font-sans">
                Real-Time Incident Forwarding & Rapid Dispatch Execution Unit
              </p>
            </div>
          </div>

          {/* Admin Department Switcher Tabs */}
          {isAdmin && (
            <div className="flex items-center space-x-1.5 p-1 rounded-lg bg-black/50 border border-white/10 font-mono text-xs">
              <button
                onClick={() => setSelectedDept('police')}
                className={`px-3 py-1.5 rounded-md transition-all ${selectedDept === 'police' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                👮 POLICE
              </button>
              <button
                onClick={() => setSelectedDept('fireservice')}
                className={`px-3 py-1.5 rounded-md transition-all ${selectedDept === 'fireservice' ? 'bg-red-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                🔥 FIRE SERVICE
              </button>
              <button
                onClick={() => setSelectedDept('ambulance')}
                className={`px-3 py-1.5 rounded-md transition-all ${selectedDept === 'ambulance' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                🚑 AMBULANCE
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Incidents Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-mono font-bold text-white">
              DISPATCHED INCIDENTS QUEUE ({incidents.length})
            </h2>
          </div>
          <button
            onClick={loadDepartmentIncidents}
            className="text-xs font-mono text-slate-400 hover:text-cyan-400 flex items-center space-x-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>

        {incidents.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-soc-card/60 border border-soc-border space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-mono font-bold text-white">NO ACTIVE FORWARDED INCIDENTS</h3>
            <p className="text-xs text-slate-400">All dispatched events have been responded to or none are currently assigned.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {incidents.map(inc => {
              const statusColors: Record<string, string> = {
                FORWARDED: 'bg-blue-950 text-blue-400 border-blue-800',
                ACKNOWLEDGED: 'bg-amber-950 text-amber-400 border-amber-800',
                RESPONSE_ACCEPTED: 'bg-purple-950 text-purple-400 border-purple-800',
                IN_PROGRESS: 'bg-red-950 text-red-400 border-red-800 animate-pulse',
                RESOLVED: 'bg-emerald-950 text-emerald-400 border-emerald-800',
                REJECTED: 'bg-slate-900 text-slate-400 border-slate-800'
              };

              return (
                <div key={inc.forwarding_id} className="glass-panel p-6 rounded-xl border border-soc-border hover:border-slate-700 transition-all flex flex-col md:flex-row gap-6">
                  {/* Evidence Snapshot */}
                  <div className="w-full md:w-56 h-36 rounded-lg overflow-hidden border border-soc-border bg-black flex-shrink-0 relative">
                    {inc.snapshot_path ? (
                      <img
                        src={`${API_BASE}${inc.snapshot_path}`}
                        alt="Evidence"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 font-mono text-xs">
                        NO SNAPSHOT
                      </div>
                    )}
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/80 text-cyan-400 border border-white/10">
                      {Math.round(inc.confidence * 100)}% CONF.
                    </span>
                  </div>

                  {/* Incident Details & Workflow Status */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-base font-mono font-bold text-white">
                          {inc.incident_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {inc.incident_id}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${statusColors[inc.response_status] || 'bg-slate-900 text-slate-300'}`}>
                        {inc.response_status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 font-mono space-y-1">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{inc.camera_name} • {inc.location}</span>
                      </div>
                      <div>
                        <span>Forwarded by: <strong className="text-slate-200">{inc.forwarded_by}</strong> at {new Date(inc.forwarded_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {inc.notes && (
                      <div className="p-2.5 rounded bg-slate-900/90 border border-soc-border text-xs font-mono text-amber-300">
                        <strong>Dispatcher Note:</strong> {inc.notes}
                      </div>
                    )}

                    {/* Operational Action Progression Buttons */}
                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      {inc.response_status === 'FORWARDED' && (
                        <button
                          onClick={() => handleUpdateStatus(inc.incident_id, 'ACKNOWLEDGED')}
                          className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold transition-colors"
                        >
                          [ 1. ACKNOWLEDGE DISPATCH ]
                        </button>
                      )}

                      {inc.response_status === 'ACKNOWLEDGED' && (
                        <button
                          onClick={() => handleUpdateStatus(inc.incident_id, 'RESPONSE_ACCEPTED')}
                          className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-colors"
                        >
                          [ 2. ACCEPT & ASSIGN UNITS ]
                        </button>
                      )}

                      {inc.response_status === 'RESPONSE_ACCEPTED' && (
                        <button
                          onClick={() => handleUpdateStatus(inc.incident_id, 'IN_PROGRESS')}
                          className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold animate-pulse transition-colors"
                        >
                          [ 3. MARK EN ROUTE / IN PROGRESS ]
                        </button>
                      )}

                      {inc.response_status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleUpdateStatus(inc.incident_id, 'RESOLVED')}
                          className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-colors shadow-glow-cyan"
                        >
                          [ 4. MARK INCIDENT RESOLVED ]
                        </button>
                      )}

                      {inc.response_status !== 'RESOLVED' && (
                        <button
                          onClick={() => handleUpdateStatus(inc.incident_id, 'REJECTED')}
                          className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 font-mono text-xs transition-colors"
                        >
                          False Alarm / Stand Down
                        </button>
                      )}

                      <button
                        onClick={() => handleViewTimeline(inc.incident_id)}
                        className="px-2.5 py-1.5 rounded bg-slate-900 border border-soc-border hover:border-cyan-500/50 text-cyan-400 font-mono text-xs ml-auto"
                      >
                        View Timeline Audit
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Timeline Modal */}
      {selectedIncidentTimeline && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-soc-card border border-soc-border rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-soc-border">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-mono font-bold text-white">
                  Audit Timeline — {selectedIncidentTimeline.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedIncidentTimeline(null)}
                className="text-xs font-mono text-slate-400 hover:text-white"
              >
                [ CLOSE ]
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {selectedIncidentTimeline.events.map((evt, idx) => (
                <div key={evt.id || idx} className="p-3 rounded bg-slate-900/80 border border-soc-border text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-400">{evt.department}</span>
                    <span className="text-[10px] text-slate-500">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-300">{evt.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
