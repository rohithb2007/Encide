import React from 'react';
import { UserCheck, Shield, Building2, Truck, Megaphone, Compass, Siren, RadioTower } from 'lucide-react';
import type { UserRole } from '../types';

interface RoleSelectorProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ currentRole, onSelectRole }) => {
  const roles: Array<{ role: UserRole; label: string; icon: React.ReactNode; desc: string }> = [
    {
      role: 'COORDINATOR',
      label: 'Coordinator',
      icon: <Shield className="w-3.5 h-3.5 text-rose-400" />,
      desc: 'Full command, approvals & escalations'
    },
    {
      role: 'HOSPITAL',
      label: 'Hospital Staff',
      icon: <Building2 className="w-3.5 h-3.5 text-cyan-400" />,
      desc: 'Capacity updates & incoming handoffs'
    },
    {
      role: 'AMBULANCE',
      label: 'Ambulance EMS',
      icon: <Truck className="w-3.5 h-3.5 text-amber-400" />,
      desc: 'Fleet telemetry & patient pickup/handover'
    },
    {
      role: 'REPORTER',
      label: 'Public Reporter',
      icon: <Megaphone className="w-3.5 h-3.5 text-emerald-400" />,
      desc: 'Citizen / Call intake & AI fact extraction'
    },
    {
      role: 'DRIVER',
      label: 'Public Driver',
      icon: <Compass className="w-3.5 h-3.5 text-indigo-400" />,
      desc: 'Public route guidance and scene reports (no patient records)'
    },
    {
      role: 'FIELD_RESPONDER',
      label: 'Field Responder',
      icon: <Siren className="w-3.5 h-3.5 text-amber-400" />,
      desc: 'Scene updates and responder reports'
    },
    {
      role: 'AUTHORITY',
      label: 'Authority',
      icon: <RadioTower className="w-3.5 h-3.5 text-indigo-400" />,
      desc: 'Regional aggregate resource and alert view'
    }
  ];

  return (
    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1 font-mono text-xs">
      <span className="text-xs text-slate-400 uppercase px-1 flex items-center gap-1 hidden md:flex font-bold">
        <UserCheck className="w-3 h-3 text-slate-400" />
        ROLE:
      </span>
      <div className="flex items-center gap-1 overflow-x-auto">
        {roles.map((r) => {
          const isActive = currentRole === r.role;
          return (
            <button
              key={r.role}
              onClick={() => onSelectRole(r.role)}
              title={r.desc}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                isActive
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              {r.icon}
              <span>{r.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
