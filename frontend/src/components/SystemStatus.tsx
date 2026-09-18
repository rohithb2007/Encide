import React from 'react';
import { Activity, Wifi, WifiOff } from 'lucide-react';

interface SystemStatusProps {
  backendConnected: boolean;
  wsConnected: boolean;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({
  backendConnected,
  wsConnected,
}) => {
  return (
    <div className="flex items-center gap-3 text-xs font-mono">
      {/* Backend API Health Status */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
          backendConnected
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
            : 'bg-rose-950/60 border-rose-500/40 text-rose-400'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            backendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
          }`}
        />
        <span className="font-semibold tracking-wider">
          {backendConnected ? 'BACKEND CONNECTED' : 'BACKEND OFFLINE'}
        </span>
      </div>

      {/* Real-Time WebSocket Telemetry Status */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
          wsConnected
            ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-400'
            : 'bg-slate-900/80 border-slate-700 text-slate-400'
        }`}
      >
        {wsConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
        <span className="font-semibold tracking-wider">
          {wsConnected ? 'MESH SYNC: LIVE' : 'SYNC: DISCONNECTED'}
        </span>
      </div>

      {/* System Operational Badge */}
      <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-slate-900/60 border-slate-700/60 text-slate-300">
        <Activity className="w-3.5 h-3.5 text-indigo-400" />
        <span>INCIDENT COMMAND: ONLINE</span>
      </div>
    </div>
  );
};
