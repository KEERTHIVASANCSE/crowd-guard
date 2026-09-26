import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { Smartphone, Video, VideoOff, RefreshCw, Radio, CheckCircle, AlertCircle } from 'lucide-react';

export const RemoteCameraPage: React.FC = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState(0);
  const [framesSent, setFramesSent] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [targetCameraId, setTargetCameraId] = useState('CAM-03');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);

  const startStreaming = async () => {
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'environment' },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsStreaming(true);

      // Start pushing frames at ~12-15 FPS (every 75ms)
      let sentCount = 0;
      let lastTime = Date.now();

      intervalRef.current = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video.videoWidth === 0 || video.videoHeight === 0) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.65);

        const tStart = Date.now();
        try {
          const res = await api.pushRemoteFrame(targetCameraId, dataUrl);
          sentCount++;
          setFramesSent(sentCount);
          setLatency(Date.now() - tStart);

          const now = Date.now();
          if (now - lastTime >= 1000) {
            setFps(sentCount);
            sentCount = 0;
            lastTime = now;
          }
        } catch (err: any) {
          console.warn('Frame push warning:', err);
        }
      }, 75);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to access camera device. Please grant browser camera permissions.');
      setIsStreaming(false);
    }
  };

  const stopStreaming = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/60 to-slate-900 border border-soc-border shadow-2xl space-y-2">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-mono font-bold text-white tracking-wide">
              REMOTE LAPTOP / MOBILE CAMERA TRANSMITTER
            </h1>
            <p className="text-xs text-slate-300 font-sans">
              Turns this device's camera into an active remote feed on the SentinelVision operations matrix
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/70 border border-red-500/50 text-xs font-mono text-red-300 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Video Preview & Controls */}
      <div className="glass-panel p-6 rounded-2xl border border-soc-border space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-soc-border">
          <div className="flex items-center space-x-3">
            <label className="text-xs font-mono text-slate-400">TARGET CAMERA SLOT:</label>
            <select
              value={targetCameraId}
              onChange={(e) => setTargetCameraId(e.target.value)}
              className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-400 focus:outline-none"
            >
              <option value="CAM-03">CAM-03 (Remote Laptop Unit)</option>
              <option value="CAM-01">CAM-01 (Main Entrance)</option>
              <option value="CAM-02">CAM-02 (Parking Bay)</option>
              <option value="CAM-04">CAM-04 (Plaza Lobby)</option>
            </select>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono">
            <div className="flex items-center space-x-1.5">
              <Radio className={`w-3.5 h-3.5 ${isStreaming ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <span className={isStreaming ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                {isStreaming ? 'BROADCASTING LIVE' : 'TRANSMITTER IDLE'}
              </span>
            </div>
            {isStreaming && (
              <>
                <span className="text-slate-400">FPS: <strong className="text-cyan-400">{fps || 14}</strong></span>
                <span className="text-slate-400">Latency: <strong className="text-cyan-400">{latency}ms</strong></span>
                <span className="text-slate-400">Frames: <strong className="text-slate-200">{framesSent}</strong></span>
              </>
            )}
          </div>
        </div>

        {/* Viewport */}
        <div className="relative aspect-video max-w-2xl mx-auto rounded-xl overflow-hidden bg-black border border-soc-border flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${isStreaming ? 'block' : 'hidden'}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {!isStreaming && (
            <div className="text-center space-y-3 p-8">
              <VideoOff className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-xs font-mono text-slate-400">CAMERA TRANSMISSION STOPPED</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto font-sans">
                Click "Activate Camera Stream" to broadcast this webcam feed to the SentinelVision AI command center.
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-4">
          {!isStreaming ? (
            <button
              onClick={startStreaming}
              className="py-3 px-6 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold flex items-center space-x-2 shadow-glow-cyan transition-all"
            >
              <Video className="w-4 h-4" />
              <span>ACTIVATE CAMERA STREAM</span>
            </button>
          ) : (
            <button
              onClick={stopStreaming}
              className="py-3 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold flex items-center space-x-2 transition-all shadow-glow-red"
            >
              <VideoOff className="w-4 h-4" />
              <span>TERMINATE TRANSMISSION</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
