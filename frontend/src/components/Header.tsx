import React from 'react';
import { ShieldAlert, RefreshCw, Radio } from 'lucide-react';
import { SystemStatus } from './SystemStatus';

interface HeaderProps {
  backendConnected: boolean;
  wsConnected: boolean;
  onReset: () => void;
  isResetting?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  backendConnected,
  wsConnected,
  onReset,
  isResetting = false,
}) => {
  return (
    <header className="bg-slate-950 border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-lg shadow-black/40">
      {/* Brand & Incident Tag */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-rose-600 to-indigo-700 shadow-md shadow-rose-950/50">
          <ShieldAlert className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-white m-0 p-0 leading-tight">
              MED-NET AI
            </h1>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 animate-pulse text-rose-400" />
              DISASTER PROTOCOL
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block font-medium">
            Dynamic Casualty Routing & Regional Hospital Load-Balancing AI
          </p>
        </div>
      </div>

      {/* System Status Indicators & Reset Demo Button */}
      <div className="flex items-center gap-3">
        <SystemStatus backendConnected={backendConnected} wsConnected={wsConnected} />

        <button
          onClick={onReset}
          disabled={isResetting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-mono transition-all active:scale-95 disabled:opacity-50"
          title="Reset Simulation State for Demo"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">RESET SIMULATION</span>
        </button>
      </div>
    </header>
  );
};
