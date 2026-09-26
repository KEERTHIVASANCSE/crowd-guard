import React from 'react';
import { Shield, Radio, Volume2, VolumeX, LogOut, User as UserIcon, Siren } from 'lucide-react';
import { User } from '../types';
import { soundEngine } from '../services/sound';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  wsConnected: boolean;
  activeAlertCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, wsConnected, activeAlertCount }) => {
  const [isMuted, setIsMuted] = React.useState(soundEngine.getMuted());

  const toggleSound = () => {
    const nextState = !isMuted;
    soundEngine.setMuted(nextState);
    setIsMuted(nextState);
  };

  const getRoleBadge = () => {
    if (!user) return null;
    const map: Record<string, { label: string; color: string }> = {
      admin: { label: 'SOC ADMINISTRATOR', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' },
      user: { label: 'SECURITY OPERATOR', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
      police: { label: 'POLICE DISPATCH', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' },
      ambulance: { label: 'MEDICAL DISPATCH', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
      fireservice: { label: 'FIRE SERVICE DISPATCH', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
    };
    const roleStyle = map[user.role] || { label: user.role.toUpperCase(), color: 'bg-slate-500/20 text-slate-300 border-slate-500/40' };
    return (
      <span className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-full border ${roleStyle.color}`}>
        {roleStyle.label}
      </span>
    );
  };

  return (
    <header className="h-16 bg-soc-card/90 backdrop-blur-md border-b border-soc-border flex items-center justify-between px-6 sticky top-0 z-50">
      {/* Brand & System Title */}
      <div className="flex items-center space-x-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-glow-cyan">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
          </span>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold tracking-wider font-mono bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">
              SENTINELVISION AI
            </h1>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/60 text-cyan-400">
              v2.0 PRO
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans">
            Intelligent Crowd Monitoring & Threat Detection Platform
          </p>
        </div>
      </div>

      {/* Center status indicators */}
      <div className="hidden md:flex items-center space-x-6">
        {/* WS Stream Status */}
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/60 border border-soc-border text-xs font-mono">
          <Radio className={`w-3.5 h-3.5 ${wsConnected ? 'text-emerald-400 animate-pulse' : 'text-red-400'}`} />
          <span className={wsConnected ? 'text-emerald-400' : 'text-red-400'}>
            {wsConnected ? 'AI CORE ONLINE' : 'DISCONNECTED'}
          </span>
        </div>

        {/* Active Threats Counter */}
        {activeAlertCount > 0 ? (
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-red-950/70 border border-red-500/50 text-xs font-mono text-red-300 animate-cyber-pulse shadow-glow-red">
            <Siren className="w-3.5 h-3.5 text-red-400 animate-spin" />
            <span>{activeAlertCount} CRITICAL THREAT{activeAlertCount > 1 ? 'S' : ''} ACTIVE</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/60 border border-soc-border text-xs font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
            <span>PERIMETER SECURE</span>
          </div>
        )}
      </div>

      {/* User Actions & Controls */}
      <div className="flex items-center space-x-4">
        {/* Mute/Sound Toggle */}
        <button
          onClick={toggleSound}
          title={isMuted ? 'Unmute Emergency Siren' : 'Mute Emergency Siren'}
          className={`p-2 rounded-lg border transition-all ${
            isMuted 
              ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200' 
              : 'bg-cyan-950/40 border-cyan-800/80 text-cyan-400 shadow-glow-cyan hover:bg-cyan-900/50'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Role Badge */}
        {getRoleBadge()}

        {/* User Info & Logout */}
        {user && (
          <div className="flex items-center space-x-3 pl-2 border-l border-soc-border">
            <div className="flex items-center space-x-2 text-sm text-slate-300">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="font-mono text-xs hidden lg:inline">{user.username}</span>
            </div>
            <button
              onClick={onLogout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
