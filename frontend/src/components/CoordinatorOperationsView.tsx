import React from 'react';
import { Ambulance, Building2, Clock, ShieldCheck } from 'lucide-react';
import type { Ambulance as AmbulanceUnit, Hospital, Patient } from '../types';

interface CoordinatorOperationsViewProps {
  mode: 'HOSPITALS' | 'AMBULANCES';
  hospitals: Hospital[];
  ambulances: AmbulanceUnit[];
  patients: Patient[];
}

export const CoordinatorOperationsView: React.FC<CoordinatorOperationsViewProps> = ({
  mode, hospitals, ambulances, patients
}) => (
  <main className="mx-auto w-full max-w-[1700px] space-y-4 p-4 md:p-6">
    <header className="rounded-xl border border-cyan-900/50 bg-slate-900 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">Coordinator · read-only operational view</p>
      <h2 className="mt-1 text-sm font-bold text-white">
        {mode === 'HOSPITALS' ? 'Hospital Network' : 'Ambulance Fleet Overview'}
      </h2>
      <p className="mt-1 text-xs text-slate-400">Operational updates and receipt confirmation belong to the assigned facility or unit.</p>
    </header>

    {mode === 'HOSPITALS' ? (
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {hospitals.map((hospital) => (
          <article key={hospital.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="flex items-center gap-2 text-xs font-bold text-white"><Building2 className="h-4 w-4 text-cyan-400" />{hospital.name}</h3>
              <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-cyan-300">{hospital.short_code}</span>
            </div>
            <p className="mt-2 text-xs text-slate-300">{hospital.available_beds}/{hospital.total_beds} beds · {hospital.available_icu}/{hospital.total_icu} ICU</p>
            <p className="mt-1 text-xs text-slate-400">
              {hospital.is_accepting === true ? 'Accepting' : hospital.is_accepting === false ? 'Not accepting' : 'Acceptance unknown'} · {hospital.trauma_level}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" />{hospital.confirmation_status || 'Freshness unknown'} · {hospital.last_updated || 'Update time unknown'}
            </p>
            <p className="mt-2 text-xs text-slate-400">Specialists: {hospital.specialists.join(', ') || 'Not reported'}</p>
            <p className="mt-1 text-xs text-slate-400">Equipment: {hospital.equipment.join(', ') || 'Not reported'}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <ShieldCheck className="h-3 w-3" />{hospital.incoming_patients_count ?? 'Unknown'} incoming referrals
            </p>
            {hospital.capacity_history?.slice(0, 3).map((entry, index) => (
              <p key={`${hospital.id}-${index}`} className="mt-1 text-[9px] text-slate-500">
                Capacity update {entry.timestamp} · {entry.updated_by}
              </p>
            ))}
          </article>
        ))}
      </section>
    ) : (
      <section className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-xs uppercase text-slate-400">
            <tr><th className="p-3">Unit</th><th className="p-3">Status / location</th><th className="p-3">Assignment / destination</th><th className="p-3">Patient progress</th><th className="p-3">Capabilities / updated</th></tr>
          </thead>
          <tbody>
            {ambulances.map((unit) => {
              const patient = patients.find((item) => item.id === unit.assigned_patient_id);
              const hospital = hospitals.find((item) => item.id === unit.destination_hospital_id);
              return (
                <tr key={unit.id} className="border-t border-slate-800">
                  <td className="p-3 font-mono text-white">{unit.unit_number}<span className="block text-[9px] text-slate-500">{unit.id}</span></td>
                  <td className="p-3 text-slate-200">{unit.status}<span className="block text-[9px] text-slate-500">{unit.current_latitude.toFixed(4)}, {unit.current_longitude.toFixed(4)}</span></td>
                  <td className="p-3 text-slate-300">{patient?.id || 'Unassigned'}<span className="block text-[9px] text-slate-500">{hospital?.name || 'No destination recorded'}</span></td>
                  <td className="p-3 text-slate-300">{patient ? `${patient.status} · ${patient.severity}` : 'No patient progress'}</td>
                  <td className="p-3 text-slate-400">{unit.capabilities.join(', ') || 'Not reported'}<span className="block text-[9px] text-slate-500">{unit.last_status_update || 'Update time unknown'}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex items-center gap-2 p-3 text-xs text-slate-500"><Ambulance className="h-3.5 w-3.5" />Fleet information is observational; no driver-status controls are available here.</div>
      </section>
    )}
  </main>
);
