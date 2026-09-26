import React from 'react';
import { 
  LayoutDashboard, 
  Video, 
  Scan, 
  AlertTriangle, 
  Siren, 
  Users, 
  Smartphone, 
  Activity, 
  Sliders, 
  FileText 
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  userRole: UserRole;
  unacknowledgedIncidents: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, userRole, unacknowledgedIncidents }) => {
  const isEmergencyRole = ['police', 'ambulance', 'fireservice'].includes(userRole);
  const isAdmin = userRole === 'admin';

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Command Center',
      icon: LayoutDashboard,
      visible: !isEmergencyRole,
    },
    {
      id: 'cameras',
      label: 'Live Monitoring',
      icon: Video,
      visible: true,
    },
    {
      id: 'zones',
      label: 'Smart Zones',
      icon: Scan,
      visible: isAdmin,
    },
    {
      id: 'incidents',
      label: 'Incident Log',
      icon: AlertTriangle,
      badge: unacknowledgedIncidents > 0 ? unacknowledgedIncidents : undefined,
      visible: true,
    },
    {
      id: 'emergency',
      label: isEmergencyRole ? 'Response Center' : 'Emergency Dispatch',
      icon: Siren,
      highlight: isEmergencyRole,
      visible: true,
    },
    {
      id: 'video_analysis',
      label: 'Forensic Video Lab',
      icon: Video,
      visible: true,
    },
    {
      id: 'crowd',
      label: 'Crowd Intelligence',
      icon: Users,
      visible: !isEmergencyRole,
    },
    {
      id: 'remote',
      label: 'Remote WebCam',
      icon: Smartphone,
      visible: isAdmin,
    },
    {
      id: 'health',
      label: 'System & AI Debug',
      icon: Activity,
      visible: isAdmin,
    },
    {
      id: 'settings',
      label: 'Rules & Thresholds',
      icon: Sliders,
      visible: isAdmin,
    },
    {
      id: 'reports',
      label: 'Reports & Audit',
      icon: FileText,
      visible: isAdmin,
    },
  ];

  return (
    <aside className="w-64 bg-soc-bg border-r border-soc-border flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[10px] uppercase font-mono font-semibold tracking-wider text-slate-400">
          Navigation Control
        </div>
        {menuItems.filter(item => item.visible).map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-soc-card/70 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-red-600 text-white animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Security Status Box */}
      <div className="p-3 rounded-lg bg-soc-card/60 border border-soc-border text-xs font-mono space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>AI Engine</span>
          <span className="text-cyan-400 font-bold">YOLOv8 + best.pt</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>False-Positive Guard</span>
          <span className="text-emerald-400 font-bold">ACTIVE (3F)</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Emergency Sync</span>
          <span className="text-purple-400 font-bold">DISPATCH READY</span>
        </div>
      </div>
    </aside>
  );
};
