import React, { useState } from 'react';
import { Shield, Lock, User as UserIcon, AlertCircle, ArrowRight, Radio, Server, Sparkles, Settings2 } from 'lucide-react';
import { api, getApiBase, setApiBase } from '../services/api';

interface LoginPageProps {
  onLoginSuccess: (userData: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [apiUrl, setApiUrl] = useState(getApiBase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(username, password);
      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleInstantDemo = (role = 'admin') => {
    setError('');
    const data = api.mockLogin(role, `${role}123`);
    onLoginSuccess(data);
  };

  const handleSaveApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setApiBase(apiUrl);
    setShowServerConfig(false);
    setError('');
  };

  return (
    <div className="min-h-screen bg-soc-bg flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1c2638_1px,transparent_1px),linear-gradient(to_bottom,#1c2638_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25"></div>

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 shadow-glow-cyan mb-2">
            <Shield className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold font-mono tracking-widest text-white">
            SENTINELVISION AI
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Intelligent Crowd Monitoring & Real-Time Threat Detection Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel p-8 rounded-2xl border border-soc-border space-y-6 shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-soc-border">
            <span className="text-xs font-mono font-bold text-slate-300">SECURE TERMINAL ACCESS</span>
            <button
              type="button"
              onClick={() => setShowServerConfig(!showServerConfig)}
              className="flex items-center space-x-1.5 text-[10px] font-mono text-cyan-400 hover:text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30 bg-cyan-950/40"
              title="Configure API Server URL"
            >
              <Server className="w-3 h-3" />
              <span>{showServerConfig ? 'Close' : 'Server Config'}</span>
            </button>
          </div>

          {/* Server Config Accordion */}
          {showServerConfig && (
            <form onSubmit={handleSaveApiUrl} className="p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-cyan-300 flex items-center space-x-1">
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>BACKEND API ENDPOINT</span>
                </span>
                <span className="text-[10px] text-slate-400">FastAPI Server</span>
              </div>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:8000 or https://your-backend.render.com"
                className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-cyan-200 font-mono focus:border-cyan-400 focus:outline-none"
              />
              <div className="flex justify-between items-center pt-1">
                <button
                  type="button"
                  onClick={() => { setApiUrl('http://localhost:8000'); setApiBase('http://localhost:8000'); }}
                  className="text-[10px] font-mono text-slate-400 hover:text-slate-200 underline"
                >
                  Reset to Localhost
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-mono rounded font-bold transition-all"
                >
                  Save URL
                </button>
              </div>
            </form>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/50 text-xs font-mono text-red-300 space-y-2">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <div className="pt-2 border-t border-red-900/50">
                <button
                  type="button"
                  onClick={() => handleInstantDemo(username)}
                  className="w-full py-1.5 px-3 rounded bg-cyan-600/80 hover:bg-cyan-500 text-white font-mono text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-all"
                >
                  <Sparkles className="w-3 h-3 text-yellow-300" />
                  <span>Enter in Interactive Demo Mode</span>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">OPERATOR USERNAME</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none transition-colors"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">ACCESS CREDENTIAL</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white font-mono text-xs font-bold flex items-center justify-center space-x-2 shadow-glow-cyan transition-all"
            >
              <span>{loading ? 'AUTHENTICATING ENCRYPTED SESSION...' : 'AUTHENTICATE & ENTER'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Instant Cloud Demo Button */}
          <button
            type="button"
            onClick={() => handleInstantDemo('admin')}
            className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-950 to-blue-950 hover:from-cyan-900 hover:to-blue-900 border border-cyan-500/50 text-cyan-300 font-mono text-xs font-bold flex items-center justify-center space-x-2 shadow-lg transition-all"
          >
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Instant Cloud Demo (No Backend Needed)</span>
          </button>

          {/* Quick Demo Switcher */}
          <div className="pt-2 border-t border-soc-border space-y-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block text-center">
              Quick Role Switcher (Pre-Seeded Portals)
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => handleInstantDemo('admin')}
                className="p-1.5 rounded bg-slate-900 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500/50 text-slate-300 text-left transition-colors"
              >
                🛡️ <span className="font-bold text-cyan-400">Admin</span> SOC
              </button>
              <button
                type="button"
                onClick={() => handleInstantDemo('user')}
                className="p-1.5 rounded bg-slate-900 hover:bg-blue-950/60 border border-slate-700 hover:border-blue-500/50 text-slate-300 text-left transition-colors"
              >
                👤 <span className="font-bold text-blue-400">Normal</span> User
              </button>
              <button
                type="button"
                onClick={() => handleInstantDemo('police')}
                className="p-1.5 rounded bg-slate-900 hover:bg-indigo-950/60 border border-slate-700 hover:border-indigo-500/50 text-slate-300 text-left transition-colors"
              >
                👮 <span className="font-bold text-indigo-400">Police</span> Dept
              </button>
              <button
                type="button"
                onClick={() => handleInstantDemo('fireservice')}
                className="p-1.5 rounded bg-slate-900 hover:bg-red-950/60 border border-slate-700 hover:border-red-500/50 text-slate-300 text-left transition-colors"
              >
                🔥 <span className="font-bold text-red-400">Fire</span> Service
              </button>
              <button
                type="button"
                onClick={() => handleInstantDemo('ambulance')}
                className="col-span-2 p-1.5 rounded bg-slate-900 hover:bg-emerald-950/60 border border-slate-700 hover:border-emerald-500/50 text-slate-300 text-center transition-colors"
              >
                🚑 <span className="font-bold text-emerald-400">Ambulance</span> Medical Response
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
