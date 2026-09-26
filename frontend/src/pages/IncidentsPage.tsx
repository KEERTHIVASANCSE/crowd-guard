import React, { useState, useEffect } from 'react';
import { Incident } from '../types';
import { api, API_BASE } from '../services/api';
import { ForwardModal } from '../components/ForwardModal';
import { DismissModal } from '../components/DismissModal';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  Siren, 
  CheckCircle, 
  ExternalLink, 
  RefreshCw, 
  Clock, 
  MapPin, 
  X,
  Sparkles,
  ShieldX
} from 'lucide-react';

export const IncidentsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [nlQuery, setNlQuery] = useState('');
  const [nlSearching, setNlSearching] = useState(false);
  const [nlExplanation, setNlExplanation] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [showDismissed, setShowDismissed] = useState(false);
  const [activeForwardIncident, setActiveForwardIncident] = useState<Incident | null>(null);
  const [dismissIncidentId, setDismissIncidentId] = useState<string | number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    loadIncidents();
  }, [statusFilter, severityFilter]);

  const loadIncidents = async () => {
    setLoading(true);
    setNlExplanation(null);
    try {
      const data = await api.getIncidents(statusFilter, severityFilter);
      setIncidents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleNlSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlQuery.trim()) {
      loadIncidents();
      return;
    }
    setNlSearching(true);
    try {
      const res = await api.searchIncidentsNl(nlQuery.trim());
      setIncidents(res.results || []);
      setNlExplanation(res.explanation || null);
    } catch (err: any) {
      console.error('NL Search failed', err);
    } finally {
      setNlSearching(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.updateIncidentStatus(id, newStatus);
      loadIncidents();
    } catch (e: any) {
      alert(e.message || 'Status update failed');
    }
  };

  const filteredIncidents = incidents.filter(i => {
    // If not showing dismissed, exclude dismissed
    if (!showDismissed && (i.status === 'DISMISSED' || i.is_dismissed)) {
      return false;
    }
    const q = searchQuery.toLowerCase();
    return (
      i.incident_type.toLowerCase().includes(q) ||
      i.camera_name.toLowerCase().includes(q) ||
      i.id.toLowerCase().includes(q) ||
      i.location.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-mono font-bold text-white tracking-wide">
            INCIDENT ARCHIVE & EVIDENCE LOGS
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Forensic repository of confirmed threat incidents, NL queries, and SOC emergency dispatch trails
          </p>
        </div>
        <button
          onClick={loadIncidents}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-soc-border hover:border-cyan-500/50 text-cyan-400 text-xs font-mono flex items-center space-x-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* AI Natural Language Query Box */}
      <form onSubmit={handleNlSearch} className="glass-panel p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
            AI Natural Language Search
          </span>
          <span className="text-[10px] text-slate-400 font-sans">
            (e.g., "show critical fire alerts from CAM-01", "knife detections", "incidents resolved")
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            placeholder="Type a natural language query..."
            className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:border-indigo-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={nlSearching}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            {nlSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Query AI
          </button>
          {nlQuery && (
            <button
              type="button"
              onClick={() => { setNlQuery(''); loadIncidents(); }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
            >
              Clear
            </button>
          )}
        </div>
        {nlExplanation && (
          <div className="mt-2 text-[11px] text-indigo-300/80 bg-indigo-950/40 p-2 rounded border border-indigo-800/40">
            {nlExplanation}
          </div>
        )}
      </form>

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-xl border border-soc-border flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter displayed results by ID, type, or camera..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto font-mono text-xs">
          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="NEW">NEW</option>
              <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="DISMISSED">DISMISSED</option>
            </select>
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 focus:outline-none"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="WARNING">WARNING</option>
            <option value="INFORMATION">INFORMATION</option>
          </select>

          <label className="flex items-center space-x-1.5 text-slate-400 cursor-pointer text-xs select-none">
            <input
              type="checkbox"
              checked={showDismissed}
              onChange={(e) => setShowDismissed(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Show Dismissed</span>
          </label>
        </div>
      </div>

      {/* Incidents Table / List */}
      <div className="glass-panel rounded-xl border border-soc-border overflow-hidden">
        {filteredIncidents.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-slate-500">
            No incidents matched the given search query or filters.
          </div>
        ) : (
          <div className="divide-y divide-soc-border">
            {filteredIncidents.map(inc => (
              <div key={inc.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors">
                {/* Evidence Thumbnail */}
                <div className="flex items-center space-x-4">
                  <div
                    onClick={() => inc.snapshot_path && setPreviewImage(`${API_BASE}${inc.snapshot_path}`)}
                    className={`w-24 h-16 rounded-lg overflow-hidden border border-soc-border bg-black flex-shrink-0 cursor-pointer relative group`}
                  >
                    {inc.snapshot_path ? (
                      <img
                        src={`${API_BASE}${inc.snapshot_path}`}
                        alt="Evidence"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 font-mono text-[10px]">
                        NO IMAGE
                      </div>
                    )}
                    <span className="absolute inset-0 bg-cyan-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <ExternalLink className="w-4 h-4 text-white" />
                    </span>
                  </div>

                  <div className="space-y-1 font-mono">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white">
                        {inc.incident_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-cyan-400">({inc.id})</span>
                      <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                        inc.severity === 'CRITICAL' ? 'bg-red-950 text-red-400 border border-red-800' :
                        inc.severity === 'HIGH' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        'bg-blue-950 text-blue-400'
                      }`}>
                        {inc.severity}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {Math.round(inc.confidence * 100)}% Conf
                      </span>
                      {inc.status === 'DISMISSED' && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700">
                          DISMISSED
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-slate-400">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{inc.camera_name} • {inc.location}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{new Date(inc.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    {inc.ai_summary && (
                      <p className="text-[11px] text-slate-300 font-sans">{inc.ai_summary}</p>
                    )}

                    {inc.dismiss_reason && (
                      <p className="text-[11px] text-amber-300/90 font-sans italic">
                        Dismissal Rationale: {inc.dismiss_reason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 w-full md:w-auto justify-end font-mono text-xs">
                  {inc.status === 'NEW' && (
                    <button
                      onClick={() => handleUpdateStatus(inc.id, 'ACKNOWLEDGED')}
                      className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center space-x-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Acknowledge</span>
                    </button>
                  )}

                  {inc.status !== 'RESOLVED' && inc.status !== 'DISMISSED' && (
                    <button
                      onClick={() => handleUpdateStatus(inc.id, 'RESOLVED')}
                      className="px-2.5 py-1.5 rounded bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40"
                    >
                      Resolve
                    </button>
                  )}

                  {inc.status !== 'DISMISSED' && (
                    <button
                      onClick={() => setDismissIncidentId(inc.id)}
                      className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-amber-950/70 hover:text-amber-300 text-slate-400 border border-slate-700 flex items-center space-x-1 transition"
                      title="Dismiss false positive with feedback"
                    >
                      <ShieldX className="w-3.5 h-3.5" />
                      <span>Dismiss</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveForwardIncident(inc)}
                    className="px-3 py-1.5 rounded bg-red-600/90 hover:bg-red-500 text-white font-bold flex items-center space-x-1.5 shadow-glow-red"
                  >
                    <Siren className="w-3.5 h-3.5" />
                    <span>FORWARD</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Snapshot Lightbox Preview */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-6" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[85vh]">
            <img src={previewImage} alt="Forensic Evidence" className="max-w-full max-h-[85vh] rounded-lg border border-soc-border" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 p-1.5 rounded-full bg-slate-800 text-white border border-soc-border hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Dismissal Reason Modal */}
      {dismissIncidentId && (
        <DismissModal
          incidentId={dismissIncidentId}
          onClose={() => setDismissIncidentId(null)}
          onSuccess={loadIncidents}
        />
      )}

      {/* Forwarding Modal */}
      {activeForwardIncident && (
        <ForwardModal
          incident={activeForwardIncident}
          onClose={() => setActiveForwardIncident(null)}
          onForwardSuccess={loadIncidents}
        />
      )}
    </div>
  );
};
