import React from 'react';
import { Activity, Ambulance, Building2, TriangleAlert } from 'lucide-react';
import type { Ambulance as AmbulanceUnit, AuthorityAlert, Hospital, IncidentInfo, TrafficAdvisory } from '../types';

interface RegionalAuthorityViewProps {
  incident: IncidentInfo;
  hospitals: Hospital[];
  ambulances: AmbulanceUnit[];
  alerts: AuthorityAlert[];
  advisories: TrafficAdvisory[];
}

export const RegionalAuthorityView: React.FC<RegionalAuthorityViewProps> = ({ incident, hospitals, ambulances, alerts, advisories }) => {
  const availableAmbulances = ambulances.filter((unit) => unit.status === 'AVAILABLE').length;
  const acceptingHospitals = hospitals.filter((hospital) => hospital.is_accepting === true).length;
  const freeBeds = hospitals.reduce((sum, hospital) => sum + (Number.isInteger(hospital.available_beds) ? hospital.available_beds : 0), 0);
  const activeAlerts = alerts.filter((alert) => alert.status !== 'RESOLVED');
  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-8">
      <header className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Regional authority · aggregate view</p>
        <h2 className="mt-1 text-lg font-bold text-white">{incident.name}</h2>
        <p className="mt-1 text-xs text-slate-400">Status: {incident.status} · Estimated casualties: {incident.estimated_casualties_range || 'Not available'}</p>
      </header>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric icon={<Building2 />} label="Accepting facilities" value={`${acceptingHospitals} / ${hospitals.length}`} />
        <Metric icon={<Activity />} label="Reported free beds" value={String(freeBeds)} />
        <Metric icon={<Ambulance />} label="Available ambulances" value={`${availableAmbulances} / ${ambulances.length}`} />
        <Metric icon={<TriangleAlert />} label="Unresolved alerts" value={String(activeAlerts.length)} />
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-xs font-bold uppercase text-white">Hospital pressure</h3>
          {hospitals.map((hospital) => (
            <div key={hospital.id} className="mt-2 flex items-center justify-between gap-2 border-b border-slate-800 py-2 text-xs">
              <span className="text-slate-200">{hospital.name}</span>
              <span className={hospital.is_accepting === true ? 'text-emerald-300' : hospital.is_accepting === false ? 'text-rose-300' : 'text-slate-400'}>
                {hospital.available_beds}/{hospital.total_beds} reported free · {hospital.is_accepting === true ? 'accepting' : hospital.is_accepting === false ? 'not accepting' : 'acceptance unknown'}
              </span>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-xs font-bold uppercase text-white">Priority alerts & road disruptions</h3>
          {activeAlerts.length === 0 && advisories.length === 0 && <p className="mt-2 text-xs text-slate-500">No active items recorded.</p>}
          {activeAlerts.map((alert) => <p key={alert.id} className="mt-2 rounded border border-rose-900/50 bg-rose-950/30 p-2 text-xs text-rose-200">{alert.priority} · {alert.title}</p>)}
          {advisories.filter((item) => item.is_published).map((item) => <p key={item.id} className="mt-2 rounded border border-amber-900/50 bg-amber-950/30 p-2 text-xs text-amber-200">{item.road_name} · {item.status} · {item.verification_level}</p>)}
        </div>
      </section>
      <p className="text-[10px] text-slate-500">Aggregate decision-support data only. Alerts and external coordination channels are simulated; this view omits patient-level records.</p>
    </main>
  );
};

const Metric: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
    <div className="flex items-center justify-between text-slate-400">{label}<span className="text-cyan-400">{icon}</span></div>
    <strong className="mt-2 block text-xl text-white">{value}</strong>
  </div>
);
