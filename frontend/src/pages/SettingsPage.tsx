import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Sliders, Shield, EyeOff, Save, CheckCircle, RefreshCw } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<any>({
    confidence_person: 0.50,
    confidence_vehicle: 0.50,
    confidence_fire: 0.75,
    confidence_smoke: 0.70,
    confidence_weapon: 0.75,
    confidence_fight: 0.75,
    confidence_fall: 0.70,
    privacy_blur_faces: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSettings(settings);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
    } catch (e: any) {
      alert(e.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-mono font-bold text-white tracking-wide">
            DETECTION THRESHOLDS & PRIVACY RULES
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Calibrate AI model sensitivities, false-positive filters, and ethical privacy masking
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white font-mono text-xs font-bold flex items-center space-x-2 shadow-glow-cyan transition-all"
        >
          {savedMsg ? <CheckCircle className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
          <span>{savedMsg ? 'PARAMETERS APPLIED!' : 'APPLY PARAMETERS'}</span>
        </button>
      </div>

      {/* Threshold Sliders */}
      <div className="glass-panel p-6 rounded-xl border border-soc-border space-y-6">
        <div className="flex items-center space-x-2 pb-3 border-b border-soc-border">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-mono font-bold text-white">CONFIDENCE THRESHOLD TUNING</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
          {/* Fire Threshold */}
          <div className="space-y-2 p-3.5 rounded-lg bg-slate-900 border border-soc-border">
            <div className="flex justify-between">
              <span className="text-slate-300 font-bold text-red-400">🔥 Dedicated Fire Threshold</span>
              <span className="text-cyan-400 font-bold">{Math.round(settings.confidence_fire * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="0.95"
              step="0.05"
              value={settings.confidence_fire}
              onChange={(e) => setSettings({ ...settings, confidence_fire: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Requires dedicated best.pt detection ≥ threshold before validating candidate.</p>
          </div>

          {/* Smoke Threshold */}
          <div className="space-y-2 p-3.5 rounded-lg bg-slate-900 border border-soc-border">
            <div className="flex justify-between">
              <span className="text-slate-300 font-bold text-orange-400">💨 Smoke Threshold</span>
              <span className="text-cyan-400 font-bold">{Math.round(settings.confidence_smoke * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="0.95"
              step="0.05"
              value={settings.confidence_smoke}
              onChange={(e) => setSettings({ ...settings, confidence_smoke: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Filters optical ambient mist and vapor.</p>
          </div>

          {/* Weapon Threshold */}
          <div className="space-y-2 p-3.5 rounded-lg bg-slate-900 border border-soc-border">
            <div className="flex justify-between">
              <span className="text-slate-300 font-bold text-purple-400">⚔️ Weapon & Knife Threshold</span>
              <span className="text-cyan-400 font-bold">{Math.round(settings.confidence_weapon * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="0.95"
              step="0.05"
              value={settings.confidence_weapon}
              onChange={(e) => setSettings({ ...settings, confidence_weapon: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">High-confidence filter to prevent tool/phone false triggers.</p>
          </div>

          {/* Fight Threshold */}
          <div className="space-y-2 p-3.5 rounded-lg bg-slate-900 border border-soc-border">
            <div className="flex justify-between">
              <span className="text-slate-300 font-bold text-indigo-400">🥊 Physical Fight Dynamics</span>
              <span className="text-cyan-400 font-bold">{Math.round(settings.confidence_fight * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="0.95"
              step="0.05"
              value={settings.confidence_fight}
              onChange={(e) => setSettings({ ...settings, confidence_fight: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Proximity and rapid centroid displacement threshold.</p>
          </div>

          {/* Fall Threshold */}
          <div className="space-y-2 p-3.5 rounded-lg bg-slate-900 border border-soc-border">
            <div className="flex justify-between">
              <span className="text-slate-300 font-bold text-emerald-400">🩺 Fall & Trauma Threshold</span>
              <span className="text-cyan-400 font-bold">{Math.round(settings.confidence_fall * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="0.95"
              step="0.05"
              value={settings.confidence_fall}
              onChange={(e) => setSettings({ ...settings, confidence_fall: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Aspect ratio collapse ratio for collapsed person on ground.</p>
          </div>

          {/* Person Threshold */}
          <div className="space-y-2 p-3.5 rounded-lg bg-slate-900 border border-soc-border">
            <div className="flex justify-between">
              <span className="text-slate-300 font-bold text-cyan-400">👤 Person Detection Sensitivity</span>
              <span className="text-cyan-400 font-bold">{Math.round(settings.confidence_person * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="0.9"
              step="0.05"
              value={settings.confidence_person}
              onChange={(e) => setSettings({ ...settings, confidence_person: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">General tracking sensitivity for pedestrians in camera frame.</p>
          </div>
        </div>
      </div>

      {/* Privacy Masking Controls */}
      <div className="glass-panel p-6 rounded-xl border border-soc-border space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-soc-border">
          <EyeOff className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-mono font-bold text-white">ETHICAL AI PRIVACY SAFEGUARDS</h2>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-900 border border-soc-border">
          <div className="space-y-1">
            <div className="text-xs font-mono font-bold text-white">Anonymize Face Regions (Privacy Masking)</div>
            <div className="text-[11px] text-slate-400 font-sans">
              Automatically applies real-time Gaussian blur to detected facial bounding areas to protect civilian privacy.
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.privacy_blur_faces}
              onChange={(e) => setSettings({ ...settings, privacy_blur_faces: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
          </label>
        </div>
      </div>
    </div>
  );
};
