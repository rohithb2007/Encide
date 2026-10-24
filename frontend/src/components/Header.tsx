import React from 'react';
import { ShieldAlert, RefreshCw, Radio, LayoutDashboard, Inbox, Building2, Truck, Bell, Compass, FileText } from 'lucide-react';
import { SystemStatus } from './SystemStatus';
import { RoleSelector } from './RoleSelector';
import type { IncidentInfo, UserRole } from '../types';

export type NavTab = 'OVERVIEW' | 'INTAKE' | 'HOSPITALS' | 'AMBULANCES' | 'ALERTS' | 'DRIVER' | 'REPORTS';

interface HeaderProps {
  backendConnected: boolean;
  wsConnected: boolean;
  incident: IncidentInfo;
  onReset: () => void;
  isResetting?: boolean;
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  alertsCount?: number;
  showCoordinatorNavigation: boolean;
  showReset: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  backendConnected,
  wsConnected,
  incident,
  onReset,
  isResetting = false,
  currentRole,
  onSelectRole,
  activeTab,
  onSelectTab,
  alertsCount = 0,
  showCoordinatorNavigation,
  showReset,
}) => {
  const tabs: Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'OVERVIEW', label: 'Command', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { id: 'INTAKE', label: 'Intake & AI', icon: <Inbox className="w-3.5 h-3.5" /> },
    { id: 'HOSPITALS', label: 'Hospital Network', icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'AMBULANCES', label: 'Fleet Overview', icon: <Truck className="w-3.5 h-3.5" /> },
    { id: 'ALERTS', label: 'Alerts', icon: <Bell className="w-3.5 h-3.5" />, badge: alertsCount },
    { id: 'DRIVER', label: 'Driver Guidance', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'REPORTS', label: 'Reports', icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="bg-slate-950 border-b border-slate-800/80 px-3 md:px-5 py-2.5 sticky top-0 z-30 shadow-lg shadow-black/40 space-y-2">
      {/* Top Bar: Brand, Role Selector, Status & Reset */}
      <div className="flex flex-col md:flex-row md:flex-wrap md:items-center justify-between gap-3 xl:flex-nowrap">
        {/* Brand & Incident Tag */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-rose-600 to-indigo-700 shadow-md shadow-rose-950/50">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white m-0 p-0 leading-tight">
                MED-NET AI
              </h1>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                <Radio className="w-2 h-2 animate-pulse text-rose-400" />
                MCI PROTOCOL
              </span>
            </div>
            <p className="text-xs text-slate-300 hidden sm:block font-medium">
              {incident.name} · {incident.status}
            </p>
            <span className="mt-1 inline-flex rounded border border-amber-800/60 bg-amber-950/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
              Demo role selection · not an authorization boundary
            </span>
          </div>
        </div>

        {/* Center: Role Selector */}
        <RoleSelector currentRole={currentRole} onSelectRole={onSelectRole} />

        {/* Right: Telemetry Status & Reset */}
        <div className="flex items-center gap-2.5 justify-end">
          <SystemStatus backendConnected={backendConnected} wsConnected={wsConnected} />
          {showReset && <button
            onClick={onReset}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-mono transition-all active:scale-95 disabled:opacity-50"
            title="Reset Simulation State for Demo"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden lg:inline">RESET</span>
          </button>}
        </div>
      </div>

      {/* Bottom Bar: Operational Modules Navigation Tabs */}
      {showCoordinatorNavigation && <nav className="flex items-center gap-1 overflow-x-auto pt-1 border-t border-slate-900 scrollbar-none font-mono text-xs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-medium whitespace-nowrap ${
                isActive
                  ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 ? (
                <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>}
    </header>
  );
};
