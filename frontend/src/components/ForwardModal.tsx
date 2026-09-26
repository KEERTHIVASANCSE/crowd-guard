import React, { useState } from 'react';
import { Incident } from '../types';
import { api, API_BASE } from '../services/api';
import { Siren, Send, Flame, HeartPulse, ShieldAlert, CheckCircle } from 'lucide-react';

interface ForwardModalProps {
  incident: Incident;
  onClose: () => void;
  onForwardSuccess: () => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({ incident, onClose, onForwardSuccess }) => {
  const [selectedDept, setSelectedDept] = useState<string>(
    incident.recommended_departments?.[0] || 'police'
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const departments = [
    {
      id: 'police',
      name: 'Police Department',
      icon: ShieldAlert,
      color: 'border-indigo-500 bg-indigo-950/40 text-indigo-300',
      activeColor: 'ring-2 ring-indigo-400 bg-indigo-900/60',
      desc: 'Tactical threats, weapons, fights, unauthorized intrusions'
    },
    {
      id: 'fireservice',
      name: 'Fire & Rescue Service',
      icon: Flame,
      color: 'border-red-500 bg-red-950/40 text-red-300',
      activeColor: 'ring-2 ring-red-400 bg-red-900/60',
      desc: 'Active flames, structural smoke, chemical hazards'
    },
    {
      id: 'ambulance',
      name: 'Emergency Medical (Ambulance)',
      icon: HeartPulse,
      color: 'border-emerald-500 bg-emerald-950/40 text-emerald-300',
      activeColor: 'ring-2 ring-emerald-400 bg-emerald-900/60',
      desc: 'Injured personnel, falls, accidents, medical trauma'
    },
  ];

  const handleForward = async () => {
    setSubmitting(true);
    try {
      await api.forwardIncident(incident.id, selectedDept, notes);
      setSuccessMsg(`Incident ${incident.id} dispatched to ${selectedDept.toUpperCase()}!`);
      setTimeout(() => {
        onForwardSuccess();
        onClose();
      }, 1400);
    } catch (e: any) {
      alert(e.message || 'Failed to forward incident');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-soc-card border border-soc-border rounded-xl w-full max-w-xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-soc-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Siren className="w-5 h-5 text-red-400 animate-pulse" />
            <h3 className="text-sm font-mono font-bold text-white">
              Official Incident Forwarding Portal — {incident.id}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xs font-mono">
            [ CANCEL ]
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Incident Summary Card */}
          <div className="p-3.5 rounded-lg bg-slate-900/80 border border-soc-border flex items-center space-x-4">
            {incident.snapshot_path && (
              <img
                src={`${API_BASE}${incident.snapshot_path}`}
                alt="Evidence"
                className="w-20 h-14 rounded object-cover border border-soc-border bg-black"
              />
            )}
            <div className="space-y-1 text-xs font-mono">
              <div className="flex items-center space-x-2">
                <span className="text-white font-bold">{incident.incident_type.replace(/_/g, ' ')}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-950 text-red-400 border border-red-800">
                  {incident.severity}
                </span>
              </div>
              <p className="text-slate-400">{incident.camera_name} • {incident.location}</p>
              <p className="text-[11px] text-cyan-400">Confidence: {Math.round(incident.confidence * 100)}%</p>
            </div>
          </div>

          {/* AI Recommended Department Alert */}
          <div className="p-3 rounded-lg bg-cyan-950/50 border border-cyan-500/30 text-xs font-mono space-y-1">
            <span className="text-cyan-400 font-bold">🤖 AI Department Recommendation:</span>
            <p className="text-slate-300">
              {incident.recommended_departments?.join(' & ').toUpperCase()} recommended based on verified event pattern. Admin manual confirmation required before dispatch.
            </p>
          </div>

          {/* Department Selection */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-300 font-bold">Select Target Emergency Department</label>
            <div className="grid grid-cols-1 gap-2.5">
              {departments.map(dept => {
                const Icon = dept.icon;
                const isSelected = selectedDept === dept.id;
                const isRecommended = incident.recommended_departments?.includes(dept.id);
                return (
                  <div
                    key={dept.id}
                    onClick={() => setSelectedDept(dept.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected ? dept.activeColor : `${dept.color} hover:bg-slate-800/60`
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5" />
                      <div>
                        <div className="text-xs font-mono font-bold flex items-center space-x-2">
                          <span>{dept.name}</span>
                          {isRecommended && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                              RECOMMENDED
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">{dept.desc}</p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-slate-600'}`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black"></div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes for Dispatcher */}
          <div>
            <label className="text-xs font-mono text-slate-300 font-bold">Dispatcher Operational Notes (Optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Verified visual flames in building 2. Dispatch squad with chemical suppressant."
              className="w-full mt-1.5 p-2.5 rounded-lg bg-slate-900 border border-soc-border text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-950 border border-emerald-500/50 text-xs font-mono text-emerald-300 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit Action */}
          <button
            onClick={handleForward}
            disabled={submitting}
            className="w-full py-3 px-4 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white font-mono text-xs font-bold flex items-center justify-center space-x-2 shadow-glow-red transition-all"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'DISPATCHING TO RESPONSE PORTAL...' : `CONFIRM & FORWARD TO ${selectedDept.toUpperCase()}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
