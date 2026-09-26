import React, { useState, useEffect } from 'react';
import {
  Upload,
  Video,
  FileText,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  Play,
  RotateCw,
  ShieldAlert,
  Layers
} from 'lucide-react';
import { api, API_BASE } from '../services/api';
import { AnalysisJob } from '../types';

export const VideoAnalysisPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [cameraId, setCameraId] = useState('CAM-LAB-01');
  const [uploading, setUploading] = useState(false);
  const [currentJob, setCurrentJob] = useState<AnalysisJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<AnalysisJob[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [error, setError] = useState('');

  const fetchRecentJobs = async () => {
    try {
      const data = await api.getVideoAnalysisJobs();
      setRecentJobs(data);
    } catch (e) {
      console.error('Failed to load recent jobs', e);
    }
  };

  useEffect(() => {
    fetchRecentJobs();
  }, []);

  // Poll current job if processing
  useEffect(() => {
    let interval: any;
    if (currentJob && (currentJob.status === 'PENDING' || currentJob.status === 'PROCESSING')) {
      interval = setInterval(async () => {
        try {
          const updated = await api.getVideoAnalysisJob(currentJob.id);
          setCurrentJob(updated);

          if (updated.status === 'COMPLETED') {
            fetchJobIncidents(updated.id);
            fetchRecentJobs();
          }
        } catch (e) {
          console.error('Poll error', e);
        }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [currentJob]);

  const fetchJobIncidents = async (jobId: number) => {
    try {
      const res = await fetch(`${API_BASE}/outputs/incidents_${jobId}.json`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setIncidents(data);
        }
      }
    } catch (e) {
      console.error('Could not load incidents JSON directly', e);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError('');
    setIncidents([]);

    try {
      const job = await api.uploadVideoAnalysis(file, cameraId);
      setCurrentJob(job);
      fetchRecentJobs();
    } catch (err: any) {
      setError(err.message || 'Failed to upload video for analysis.');
    } finally {
      setUploading(false);
    }
  };

  const selectJob = (job: AnalysisJob) => {
    setCurrentJob(job);
    if (job.status === 'COMPLETED') {
      fetchJobIncidents(job.id);
    } else {
      setIncidents([]);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-wider text-slate-100 flex items-center gap-3">
            <Video className="w-7 h-7 text-indigo-400" />
            FORENSIC VIDEO ANALYSIS LAB
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Offline CCTV File Threat Ingestion, Multi-Model Behavioral Inference & Video Annotation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Multi-Model AI Ready
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upload and Job Selector */}
        <div className="space-y-6">
          {/* Upload Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h2 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-400" />
              Upload CCTV Video
            </h2>

            {error && (
              <div className="p-3 mb-4 rounded-lg bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Camera Feed Identifier
                </label>
                <input
                  type="text"
                  value={cameraId}
                  onChange={(e) => setCameraId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Select Video File (.mp4, .avi, .mov)
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer bg-slate-950 border border-slate-800 p-2 rounded-lg"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={uploading || !file}
                className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition"
              >
                {uploading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Multi-Model Analysis
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Recent Jobs Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Analysis History
              </h3>
              <button
                onClick={fetchRecentJobs}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                Refresh
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {recentJobs.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No video jobs yet.</p>
              ) : (
                recentJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => selectJob(job)}
                    className={`p-3 rounded-lg border cursor-pointer transition ${
                      currentJob?.id === job.id
                        ? 'bg-indigo-950/40 border-indigo-500/60'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200 truncate max-w-[150px]">
                        {job.filename}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          job.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : job.status === 'PROCESSING'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                      <span>Incidents: <strong className="text-amber-400">{job.incident_count}</strong></span>
                      <span>Progress: {job.progress}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Columns: Active Job Details, Video Player & Incident List */}
        <div className="lg:col-span-2 space-y-6">
          {currentJob ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-6">
              {/* Job Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-100">Job #{currentJob.id}: {currentJob.filename}</h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        currentJob.status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : currentJob.status === 'PROCESSING'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {currentJob.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Processed {currentJob.processed_frames} / {currentJob.total_frames} frames • {currentJob.fps} FPS
                  </p>
                </div>

                {currentJob.status === 'COMPLETED' && (
                  <div className="flex items-center gap-2">
                    <a
                      href={`${API_BASE}/api/video-analysis/${currentJob.id}/download-video`}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 transition"
                      download
                    >
                      <Download className="w-3.5 h-3.5" />
                      Annotated MP4
                    </a>
                    <a
                      href={`${API_BASE}/api/video-analysis/${currentJob.id}/download-json`}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 border border-slate-700 transition"
                      download
                    >
                      <FileText className="w-3.5 h-3.5" />
                      JSON Log
                    </a>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {(currentJob.status === 'PROCESSING' || currentJob.status === 'PENDING') && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300 flex items-center gap-2">
                      <RotateCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                      Running Multi-Model Inference (Fire, Person, Pose, Weapon, Collision, Crowd)...
                    </span>
                    <span className="text-indigo-400">{currentJob.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${currentJob.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Video Player */}
              {currentJob.status === 'COMPLETED' ? (
                <div className="space-y-4">
                  <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative">
                    <video
                      controls
                      className="w-full h-full object-contain"
                      src={`${API_BASE}/outputs/annotated_${currentJob.id}.mp4`}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <p className="text-xs text-slate-400 text-center italic">
                    Bounding boxes, keypoint skeletons, and threat telemetry are directly baked into the video frames above.
                  </p>
                </div>
              ) : currentJob.status === 'FAILED' ? (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-sm flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-bold">Analysis Failed</p>
                    <p className="text-xs mt-0.5">{currentJob.error_message || 'An unexpected error occurred during processing.'}</p>
                  </div>
                </div>
              ) : null}

              {/* Incidents Detected Breakdown */}
              {currentJob.status === 'COMPLETED' && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    Detected Threats ({incidents.length > 0 ? incidents.length : currentJob.incident_count})
                  </h3>

                  {incidents.length === 0 ? (
                    <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center">
                      No security incidents confirmed in this video feed.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {incidents.map((inc: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  inc.class === 'fire' || inc.class === 'gun' || inc.class === 'fighting'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                }`}
                              >
                                {inc.class}
                              </span>
                              <span className="text-slate-300 font-semibold">
                                Conf: {(inc.confidence * 100).toFixed(1)}%
                              </span>
                              <span className="text-slate-500">
                                Frame #{inc.frame_number || 'N/A'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {inc.explanation || 'Multi-frame validated incident detection.'}
                            </p>
                          </div>

                          <div className="text-right text-[11px] text-slate-500">
                            <div>Track ID: {inc.tracking_id ?? 'N/A'}</div>
                            {inc.timestamp && <div>{new Date(inc.timestamp).toLocaleTimeString()}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-dashed border-slate-800 rounded-xl p-12 text-center text-slate-500 flex flex-col items-center justify-center min-h-[350px]">
              <Layers className="w-12 h-12 text-slate-700 mb-3" />
              <h3 className="text-base font-bold text-slate-300">No Video Job Selected</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Upload a CCTV video clip using the form on the left, or pick a completed job from the history list to inspect results.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
