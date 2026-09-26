import React, { useState, useEffect, useRef } from 'react';
import { User, Camera, Incident } from './types';
import { api, API_BASE } from './services/api';
import { soundEngine } from './services/sound';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CameraDetailPage } from './pages/CameraDetailPage';
import { EmergencyPortalPage } from './pages/EmergencyPortalPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { CrowdAnalyticsPage } from './pages/CrowdAnalyticsPage';
import { RemoteCameraPage } from './pages/RemoteCameraPage';
import { SystemHealthPage } from './pages/SystemHealthPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReportsPage } from './pages/ReportsPage';
import { VideoAnalysisPage } from './pages/VideoAnalysisPage';
import { ZoneDrawer } from './components/ZoneDrawer';
import { Siren, X } from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [activeToast, setActiveToast] = useState<any>(null);
  const [activeZoneCam, setActiveZoneCam] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Restore session from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('sentinelvision_user');
    const token = localStorage.getItem('sentinelvision_token');
    if (savedUser && token) {
      try {
        const u = JSON.parse(savedUser);
        setCurrentUser(u);
        if (['police', 'ambulance', 'fireservice'].includes(u.role)) {
          setCurrentTab('emergency');
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Poll & Refresh Telemetry
  useEffect(() => {
    if (!currentUser) return;
    loadCoreData();
    const interval = setInterval(loadCoreData, 3000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Connect WebSocket
  useEffect(() => {
    if (!currentUser) return;

    const wsUrl = API_BASE.replace('http', 'ws') + `/ws?role=${currentUser.role}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      console.log('WebSocket connected to SentinelVision Hub');
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'NEW_ALERT') {
          const inc = data.incident;
          setIncidents(prev => [inc, ...prev]);
          setActiveToast(inc);

          // Trigger audible emergency siren
          const t = inc.incident_type.toUpperCase();
          if (t.includes('FIRE') || t.includes('SMOKE')) {
            soundEngine.playFireAlert();
          } else if (t.includes('FALL') || t.includes('ACCIDENT')) {
            soundEngine.playAmbulanceAlert();
          } else {
            soundEngine.playPoliceAlert();
          }

          setTimeout(() => setActiveToast(null), 8000);
        } else if (data.type === 'INCIDENT_FORWARDED') {
          soundEngine.playBeep();
          loadCoreData();
        } else if (data.type === 'RESPONSE_STATUS_CHANGED') {
          loadCoreData();
        }
      } catch (e) {
        console.error('Error handling WS event:', e);
      }
    };

    return () => {
      ws.close();
    };
  }, [currentUser]);

  const loadCoreData = async () => {
    try {
      const [cams, incs] = await Promise.all([
        api.getCameras(),
        api.getIncidents()
      ]);
      setCameras(cams);
      setIncidents(incs);
    } catch (e) {
      console.warn('Sync error:', e);
    }
  };

  const handleLoginSuccess = (userData: any) => {
    setCurrentUser(userData);
    if (['police', 'ambulance', 'fireservice'].includes(userData.role)) {
      setCurrentTab('emergency');
    } else {
      setCurrentTab('dashboard');
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setCurrentTab('dashboard');
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const unacknowledged = incidents.filter(i => i.status === 'NEW').length;

  return (
    <div className="min-h-screen bg-soc-bg text-slate-200 flex flex-col font-sans">
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        wsConnected={wsConnected}
        activeAlertCount={unacknowledged}
      />

      <div className="flex flex-1">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          userRole={currentUser.role}
          unacknowledgedIncidents={unacknowledged}
        />

        <main className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
          {currentTab === 'dashboard' && (
            <DashboardPage
              cameras={cameras}
              incidents={incidents}
              onRefreshData={loadCoreData}
              onNavigateToTab={setCurrentTab}
            />
          )}

          {currentTab === 'cameras' && (
            <CameraDetailPage
              cameras={cameras}
              incidents={incidents}
              onBack={() => setCurrentTab('dashboard')}
            />
          )}

          {currentTab === 'zones' && (
            <CameraDetailPage
              cameras={cameras}
              incidents={incidents}
              onBack={() => setCurrentTab('dashboard')}
            />
          )}

          {currentTab === 'incidents' && (
            <IncidentsPage />
          )}

          {currentTab === 'emergency' && (
            <EmergencyPortalPage userRole={currentUser.role} />
          )}

          {currentTab === 'video_analysis' && (
            <VideoAnalysisPage />
          )}

          {currentTab === 'crowd' && (
            <CrowdAnalyticsPage />
          )}

          {currentTab === 'remote' && (
            <RemoteCameraPage />
          )}

          {currentTab === 'health' && (
            <SystemHealthPage />
          )}

          {currentTab === 'settings' && (
            <SettingsPage />
          )}

          {currentTab === 'reports' && (
            <ReportsPage />
          )}
        </main>
      </div>

      {/* Real-time Threat Pop-up Alert Banner */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-red-950/95 border-2 border-red-500 rounded-2xl p-4 shadow-glow-red flex items-start space-x-4 animate-bounce">
          <div className="p-2 rounded-xl bg-red-900/80 text-white flex-shrink-0 animate-spin">
            <Siren className="w-6 h-6" />
          </div>
          <div className="flex-1 space-y-1 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">
                🔥 {activeToast.incident_type.replace(/_/g, ' ')}
              </span>
              <button onClick={() => setActiveToast(null)} className="text-red-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-red-200">{activeToast.camera_name} • {activeToast.location}</p>
            <p className="text-[11px] text-cyan-300">Confidence: {Math.round(activeToast.confidence * 100)}% • Temporal Verified</p>
            <div className="pt-2 flex space-x-2">
              <button
                onClick={() => { setCurrentTab('incidents'); setActiveToast(null); }}
                className="px-2.5 py-1 rounded bg-white text-red-900 font-bold hover:bg-slate-200 transition-colors"
              >
                Review & Forward
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
