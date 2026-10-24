import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, Check, Radio } from 'lucide-react';
import type { AuthorityAlert } from '../types';
import { updateAuthorityAlertAction } from '../api/client';

interface AuthorityAlertsViewProps {
  alerts: AuthorityAlert[];
  onAlertUpdated: (updatedAlert: AuthorityAlert) => void;
}

export const AuthorityAlertsView: React.FC<AuthorityAlertsViewProps> = ({ alerts, onAlertUpdated }) => {
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const filteredAlerts = alerts.filter((a) => {
    if (roleFilter !== 'ALL' && a.recipient_role !== roleFilter) return false;
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    return true;
  });

  const handleAction = async (alertId: string, action: 'ACKNOWLEDGE' | 'RESOLVE' | 'IN_PROGRESS') => {
    setActionLoadingId(alertId);
    try {
      const res = await updateAuthorityAlertAction(alertId, action);
      onAlertUpdated(res);
    } catch (err) {
      console.error('Failed to update alert:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'NEW':
        return 'bg-rose-500 text-white font-bold animate-pulse';
      case 'ACKNOWLEDGED':
        return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
      case 'IN_PROGRESS':
        return 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30';
      case 'RESOLVED':
        return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="flex-1 p-3 md:p-5 max-w-[1700px] w-full mx-auto space-y-4 font-sans">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">INTER-AGENCY ESCALATION & AUTHORITY ALERTS</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                SIMULATED DISPATCH CHANNEL
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Direct escalation for Police, Fire & Rescue, Traffic Police, and Health Directorate
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <span className="text-[10px] text-slate-400 font-bold uppercase">RECIPIENT:</span>
          {['ALL', 'POLICE', 'FIRE_RESCUE', 'EMS_DISPATCH', 'TRAFFIC_AUTHORITY'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-2 py-1 rounded transition-all ${
                roleFilter === r
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {r.replace(/_/g, ' ')}
            </button>
          ))}
          <span className="text-[10px] text-slate-400 font-bold uppercase ml-2">STATUS:</span>
          {['ALL', 'NEW', 'ACKNOWLEDGED', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2 py-1 rounded transition-all ${
                statusFilter === st
                  ? 'bg-cyan-800/60 text-cyan-300 border border-cyan-700'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500 font-mono">
            No active authority alerts matching selected criteria.
          </div>
        ) : (
          filteredAlerts.map((alt) => (
            <div
              key={alt.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3 transition-all hover:border-slate-700"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${getPriorityBadge(alt.priority)}`}>
                    {alt.priority}
                  </span>
                  <span className="font-bold text-white text-xs font-mono">{alt.title}</span>
                  <span className="text-[10px] text-slate-500 font-mono">ID: {alt.id}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-800">
                    TARGET: {alt.recipient_role}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${getStatusBadge(alt.status)}`}>
                    {alt.status}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-sans">{alt.description}</p>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-xs font-mono space-y-1">
                <div className="text-cyan-400 font-bold text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  RECOMMENDED ACTION:
                </div>
                <div className="text-slate-300 text-[11px] font-sans">{alt.recommended_action}</div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] font-mono text-slate-500 pt-1">
                <div>
                  Trigger: <strong className="text-slate-300">{alt.trigger}</strong> • Source: {alt.source} • {new Date(alt.timestamp).toLocaleTimeString()}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {alt.status === 'NEW' && (
                    <button
                      onClick={() => handleAction(alt.id, 'ACKNOWLEDGE')}
                      disabled={actionLoadingId === alt.id}
                      className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs font-mono transition-all"
                    >
                      ACKNOWLEDGE
                    </button>
                  )}
                  {alt.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleAction(alt.id, 'RESOLVE')}
                      disabled={actionLoadingId === alt.id}
                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono transition-all flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      RESOLVE
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
