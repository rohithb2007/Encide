import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { Hospital, Patient, IncidentInfo, AssignmentItem, Ambulance, TrafficAdvisory } from '../types';

interface MapViewProps {
  hospitals: Hospital[];
  patients: Patient[];
  assignments: AssignmentItem[];
  ambulances?: Ambulance[];
  advisories?: TrafficAdvisory[];
  incident?: IncidentInfo;
  selectedHospitalId?: string | null;
  selectedPatientId?: string | null;
  selectedAmbulanceId?: string | null;
  onSelectHospital: (hospital: Hospital) => void;
  onSelectPatient: (patient: Patient) => void;
  onSelectAmbulance?: (ambulance: Ambulance) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  hospitals,
  patients,
  assignments,
  ambulances = [],
  advisories = [],
  incident,
  selectedHospitalId,
  selectedPatientId,
  selectedAmbulanceId,
  onSelectHospital,
  onSelectPatient,
  onSelectAmbulance,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const hospitalLayerRef = useRef<L.LayerGroup | null>(null);
  const patientLayerRef = useRef<L.LayerGroup | null>(null);
  const ambulanceLayerRef = useRef<L.LayerGroup | null>(null);
  const advisoryLayerRef = useRef<L.LayerGroup | null>(null);
  const linesLayerRef = useRef<L.LayerGroup | null>(null);
  const incidentLayerRef = useRef<L.LayerGroup | null>(null);

  // Layer Visibility Controls
  const [showHospitals, setShowHospitals] = useState<boolean>(true);
  const [showPatients, setShowPatients] = useState<boolean>(true);
  const [showAmbulances, setShowAmbulances] = useState<boolean>(true);
  const [showRoutes, setShowRoutes] = useState<boolean>(true);
  const [showAdvisories, setShowAdvisories] = useState<boolean>(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const incidentHasLocation =
      Number.isFinite(incident?.latitude) && Number.isFinite(incident?.longitude);
    const initialLat = incidentHasLocation ? incident?.latitude ?? 0 : hospitals[0]?.latitude ?? 0;
    const initialLon = incidentHasLocation ? incident?.longitude ?? 0 : hospitals[0]?.longitude ?? 0;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: 11,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    linesLayerRef.current = L.layerGroup().addTo(map);
    hospitalLayerRef.current = L.layerGroup().addTo(map);
    patientLayerRef.current = L.layerGroup().addTo(map);
    ambulanceLayerRef.current = L.layerGroup().addTo(map);
    advisoryLayerRef.current = L.layerGroup().addTo(map);
    incidentLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [hospitals, incident]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const incidentLat = incident?.latitude;
    const incidentLon = incident?.longitude;
    if (incidentLat !== undefined && incidentLon !== undefined &&
        Number.isFinite(incidentLat) && Number.isFinite(incidentLon)) {
      map.setView([incidentLat, incidentLon], 11);
    } else if (hospitals.length > 0) {
      map.fitBounds(
        L.latLngBounds(hospitals.map((hospital) => L.latLng(hospital.latitude, hospital.longitude))),
        { padding: [24, 24] }
      );
    }
  }, [hospitals, incident]);

  // Render Incident Epicenter
  useEffect(() => {
    if (!mapInstanceRef.current || !incidentLayerRef.current) return;
    incidentLayerRef.current.clearLayers();

    const epicLat = incident?.latitude;
    const epicLon = incident?.longitude;
    if (epicLat === undefined || epicLon === undefined ||
        !Number.isFinite(epicLat) || !Number.isFinite(epicLon)) return;

    const incidentHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-12 h-12 rounded-full bg-rose-500/20 radar-pulse"></div>
        <div class="absolute w-8 h-8 rounded-full bg-rose-600/30 animate-ping"></div>
        <div class="w-7 h-7 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center shadow-lg shadow-rose-950 text-[11px] font-bold text-white">
          ⚠
        </div>
      </div>
    `;

    const incidentIcon = L.divIcon({
      html: incidentHtml,
      className: 'custom-incident-icon',
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    const marker = L.marker([epicLat, epicLon], { icon: incidentIcon });
    marker.bindTooltip(
      `<div class="font-mono text-xs font-bold text-rose-300">
        🚨 ${incident?.name ?? 'DISASTER EPICENTER'}
        <div class="text-[10px] text-slate-300 font-normal">Active Mass Casualty Incident Zone</div>
      </div>`,
      { permanent: false, direction: 'top', className: 'bg-slate-950 text-white border border-rose-500/40 rounded p-1.5' }
    );

    marker.addTo(incidentLayerRef.current);
  }, [incident]);

  // Render Hospitals
  useEffect(() => {
    if (!mapInstanceRef.current || !hospitalLayerRef.current) return;
    hospitalLayerRef.current.clearLayers();
    if (!showHospitals) return;

    hospitals.forEach((h) => {
      if (!Number.isFinite(h.latitude) || !Number.isFinite(h.longitude)) return;
      const isSelected = selectedHospitalId === h.id;
      let loadColor = '#10b981';
      if (h.current_load >= 0.85) loadColor = '#f43f5e';
      else if (h.current_load >= 0.65) loadColor = '#f59e0b';

      const isAccepting = h.is_accepting !== false;
      const ringColor = !isAccepting ? '#64748b' : isSelected ? '#38bdf8' : loadColor;

      const html = `
        <div class="relative flex items-center justify-center group cursor-pointer">
          ${isSelected ? `<div class="absolute w-11 h-11 rounded-full animate-ping opacity-60" style="background-color: ${ringColor}"></div>` : ''}
          <div class="w-8 h-8 rounded-lg shadow-xl flex items-center justify-center text-white font-bold text-xs border-2"
               style="background-color: ${!isAccepting ? '#334155' : '#0f172a'}; border-color: ${ringColor};">
            <span class="text-[11px] font-mono">${h.short_code.slice(0, 3)}</span>
          </div>
          <div class="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-slate-950 shadow"
               style="background-color: ${loadColor}">
            ${h.available_beds}
          </div>
        </div>
      `;

      const icon = L.divIcon({ html, className: 'custom-hosp-icon', iconSize: [36, 36], iconAnchor: [18, 18] });
      const marker = L.marker([h.latitude, h.longitude], { icon });

      marker.on('click', () => onSelectHospital(h));
      marker.bindTooltip(
        `<div class="font-mono text-xs">
          <div class="font-bold text-white">${h.name} (${h.trauma_level})</div>
          <div class="text-[10px] text-slate-300">
            Available Beds: <strong class="text-emerald-400">${h.available_beds}</strong> / ${h.total_beds} •
            ICU: <strong class="text-cyan-400">${h.available_icu}</strong> •
            Status: <span style="color: ${ringColor}">${!isAccepting ? 'CLOSED / FULL' : h.status}</span>
          </div>
          <div class="text-[9px] text-slate-400">Freshness: ${h.confirmation_status || 'CONFIRMED'}</div>
        </div>`,
        { direction: 'top', className: 'bg-slate-950 text-white border border-slate-800 rounded p-1.5 shadow-xl' }
      );

      marker.addTo(hospitalLayerRef.current!);
    });
  }, [hospitals, selectedHospitalId, showHospitals, onSelectHospital]);

  // Render Casualties (Patients)
  useEffect(() => {
    if (!mapInstanceRef.current || !patientLayerRef.current) return;
    patientLayerRef.current.clearLayers();
    if (!showPatients) return;

    patients.forEach((p) => {
      if (!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) return;
      const isSelected = selectedPatientId === p.id;
      let dotColor = '#10b981';
      if (p.severity === 'RED') dotColor = '#f43f5e';
      else if (p.severity === 'YELLOW') dotColor = '#f59e0b';
      else if (p.severity === 'BLACK') dotColor = '#475569';

      const html = `
        <div class="relative flex items-center justify-center cursor-pointer">
          ${isSelected ? `<div class="absolute w-6 h-6 rounded-full animate-ping opacity-75" style="background-color: ${dotColor}"></div>` : ''}
          <div class="w-4 h-4 rounded-full border-2 border-slate-950 shadow-md flex items-center justify-center"
               style="background-color: ${dotColor}; ${p.severity === 'RED' ? 'box-shadow: 0 0 8px rgba(244, 63, 94, 0.8);' : ''}">
          </div>
        </div>
      `;

      const icon = L.divIcon({ html, className: 'custom-patient-icon', iconSize: [16, 16], iconAnchor: [8, 8] });
      const marker = L.marker([p.latitude, p.longitude], { icon });

      marker.on('click', () => onSelectPatient(p));
      marker.bindTooltip(
        `<div class="font-mono text-xs">
          <strong>${p.id}</strong> [Triage: <span style="color: ${dotColor}">${p.severity}</span>]
          <div class="text-[10px] text-slate-300">Status: ${p.status} • Need: ${p.required_specialist}</div>
        </div>`,
        { direction: 'top', className: 'bg-slate-950 text-white border border-slate-800 rounded p-1.5 shadow-xl' }
      );

      marker.addTo(patientLayerRef.current!);
    });
  }, [patients, selectedPatientId, showPatients, onSelectPatient]);

  // Render Ambulances Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !ambulanceLayerRef.current) return;
    ambulanceLayerRef.current.clearLayers();
    if (!showAmbulances) return;

    ambulances.forEach((amb) => {
      if (!Number.isFinite(amb.current_latitude) || !Number.isFinite(amb.current_longitude)) return;
      const isSelected = selectedAmbulanceId === amb.id;
      let ambColor = '#06b6d4'; // Available: Cyan
      if (amb.status === 'TRANSPORTING') ambColor = '#f43f5e'; // Code Hot: Rose
      else if (amb.status === 'ASSIGNED' || amb.status === 'EN_ROUTE_TO_SCENE') ambColor = '#f59e0b'; // Yellow
      else if (amb.status === 'UNAVAILABLE') ambColor = '#64748b';

      const html = `
        <div class="relative flex items-center justify-center cursor-pointer">
          ${isSelected ? `<div class="absolute w-9 h-9 rounded-full bg-cyan-400/50 animate-ping"></div>` : ''}
          ${amb.status === 'TRANSPORTING' ? `<div class="absolute w-8 h-8 rounded-full bg-rose-500/30 animate-ping"></div>` : ''}
          <div class="w-6 h-6 rounded-md bg-slate-950 border-2 flex items-center justify-center shadow-lg"
               style="border-color: ${ambColor};">
            <span class="text-[10px]">🚑</span>
          </div>
        </div>
      `;

      const icon = L.divIcon({ html, className: 'custom-amb-icon', iconSize: [24, 24], iconAnchor: [12, 12] });
      const marker = L.marker([amb.current_latitude, amb.current_longitude], { icon });

      if (onSelectAmbulance) {
        marker.on('click', () => onSelectAmbulance(amb));
      }

      marker.bindTooltip(
        `<div class="font-mono text-xs">
          <div class="font-bold text-cyan-300">${amb.unit_number} (${amb.id})</div>
          <div class="text-[10px] text-slate-300">Status: <strong style="color: ${ambColor}">${amb.status}</strong></div>
          <div class="text-[9px] text-slate-400">Capabilities: ${amb.capabilities.join(', ')}</div>
        </div>`,
        { direction: 'top', className: 'bg-slate-950 text-white border border-slate-800 rounded p-1.5 shadow-xl' }
      );

      marker.addTo(ambulanceLayerRef.current!);
    });
  }, [ambulances, selectedAmbulanceId, showAmbulances, onSelectAmbulance]);

  // Render Public Road Closures & Advisories Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !advisoryLayerRef.current) return;
    advisoryLayerRef.current.clearLayers();
    if (!showAdvisories) return;

    advisories.forEach((adv) => {
      if (!adv.is_published) return;

      const polyline = L.polyline(
        [adv.start_coordinates, adv.end_coordinates],
        { color: '#f43f5e', weight: 6, opacity: 0.9, dashArray: '8, 8' }
      );

      polyline.bindTooltip(
        `<div class="font-mono text-xs">
          <div class="font-bold text-rose-400">⛔ ${adv.road_name}</div>
          <div class="text-[10px] text-slate-300">${adv.hazard_description}</div>
          <div class="text-[9px] text-amber-300 mt-1">Detour: ${adv.suggested_detour}</div>
        </div>`,
        { sticky: true, className: 'bg-slate-950 text-white border border-rose-600 rounded p-2 shadow-2xl' }
      );

      polyline.addTo(advisoryLayerRef.current!);
    });
  }, [advisories, showAdvisories]);

  // Render Assignment Routing Lines
  useEffect(() => {
    if (!mapInstanceRef.current || !linesLayerRef.current) return;
    linesLayerRef.current.clearLayers();
    if (!showRoutes) return;

    assignments.forEach((assignment) => {
      const patient = patients.find((p) => p.id === assignment.patient_id);
      const hospital = hospitals.find((h) => h.id === assignment.hospital_id);
      if (!patient || !hospital) return;

      let lineColor = '#06b6d4';
      if (patient.severity === 'RED') lineColor = '#f43f5e';
      else if (patient.severity === 'YELLOW') lineColor = '#f59e0b';
      else if (patient.severity === 'GREEN') lineColor = '#10b981';

      const isPatientSelected = selectedPatientId === patient.id;
      const start: [number, number] = [patient.latitude, patient.longitude];
      const end: [number, number] = [hospital.latitude, hospital.longitude];
      if (![...start, ...end].every(Number.isFinite)) return;

      // Keep the route local to the map: casualty coordinates should not be sent
      // to a third-party routing service. Repeated chevrons show travel direction.
      const routeAngle = Math.atan2(-(end[0] - start[0]), end[1] - start[1]) * (180 / Math.PI);
      const routePoint = (fraction: number): [number, number] => [
        start[0] + (end[0] - start[0]) * fraction,
        start[1] + (end[1] - start[1]) * fraction,
      ];

      L.polyline([start, end], {
        color: '#020617',
        weight: isPatientSelected ? 9 : 7,
        opacity: 0.8,
        interactive: false,
      }).addTo(linesLayerRef.current!);

      const polyline = L.polyline(
        [start, end],
        {
          color: lineColor,
          weight: isPatientSelected ? 4 : 3,
          opacity: isPatientSelected ? 1.0 : 0.85,
          dashArray: '10, 8',
          className: 'animated-routing-line',
        }
      );

      polyline.bindTooltip(
        `<div class="font-mono text-[10px]">
          <strong>${patient.id} ➔ ${hospital.short_code}</strong><br/>
          Score: ${(assignment.score * 100).toFixed(0)}% • ETA: ${assignment.estimated_transit_minutes} min
        </div>`,
        { sticky: true, className: 'bg-slate-950 text-white border border-slate-800 rounded p-1' }
      );

      polyline.addTo(linesLayerRef.current!);

      [0.28, 0.52, 0.76].forEach((fraction) => {
        const arrow = L.marker(routePoint(fraction), {
          interactive: false,
          icon: L.divIcon({
            className: 'routing-direction-icon',
            html: `<span style="transform: rotate(${routeAngle}deg)">➤</span>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        });
        arrow.addTo(linesLayerRef.current!);
      });

      [start, end].forEach((point, index) => {
        L.circleMarker(point, {
          radius: index === 0 ? 4 : 5,
          color: lineColor,
          weight: 2,
          fillColor: '#020617',
          fillOpacity: 1,
          interactive: false,
        }).addTo(linesLayerRef.current!);
      });
    });
  }, [assignments, hospitals, patients, selectedPatientId, showRoutes]);

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      {/* Map DOM node */}
      <div ref={mapContainerRef} className="w-full h-full z-0 min-h-[480px]" />

      {/* Layer Toggles Toolbar Top-Right */}
      <div className="absolute top-3 right-3 z-10 bg-slate-950/90 border border-slate-800 backdrop-blur-md px-2.5 py-1.5 rounded-lg font-mono text-[10px] text-slate-300 shadow-xl flex items-center gap-2">
        {(!Number.isFinite(incident?.latitude) || !Number.isFinite(incident?.longitude)) && (
          <span className="text-amber-300">Incident location unavailable</span>
        )}
        <span className="text-slate-400 font-bold uppercase text-[9px] mr-1">LAYERS:</span>
        <button
          onClick={() => setShowHospitals(!showHospitals)}
          className={`px-1.5 py-0.5 rounded transition-all ${showHospitals ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-500'}`}
        >
          Hospitals
        </button>
        <button
          onClick={() => setShowPatients(!showPatients)}
          className={`px-1.5 py-0.5 rounded transition-all ${showPatients ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-500'}`}
        >
          Casualties
        </button>
        <button
          onClick={() => setShowAmbulances(!showAmbulances)}
          className={`px-1.5 py-0.5 rounded transition-all ${showAmbulances ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'text-slate-500'}`}
        >
          Ambulances
        </button>
        <button
          onClick={() => setShowRoutes(!showRoutes)}
          className={`px-1.5 py-0.5 rounded transition-all ${showRoutes ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-500'}`}
        >
          Routes
        </button>
        <button
          onClick={() => setShowAdvisories(!showAdvisories)}
          className={`px-1.5 py-0.5 rounded transition-all ${showAdvisories ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-500'}`}
        >
          Closures
        </button>
      </div>

      {/* Tactical Map Overlay Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-slate-950/90 border border-slate-800 backdrop-blur-md px-3 py-2 rounded-lg font-mono text-[10px] text-slate-300 shadow-xl space-y-1">
        <div className="flex items-center justify-between gap-3 font-bold text-white tracking-wider mb-1">
          <span>OPERATIONAL MAP TELEMETRY</span>
          <span className="text-[9px] text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/50">
            ERNAKULAM TRAUMA GRID
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Normal (&lt;65%)
          <span className="w-2.5 h-2.5 rounded bg-amber-500 ml-1" /> Warning (65-85%)
          <span className="w-2.5 h-2.5 rounded bg-rose-500 ml-1" /> Saturated (&gt;85%)
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-rose-500" /> Red (Immediate)
          <span className="w-2 h-2 rounded-full bg-amber-400 ml-1" /> Yellow (Delayed)
          <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1" /> Green (Minor)
          <span className="ml-2">🚑 Available / En Route</span>
          <span className="text-rose-400 ml-1">⛔ Road Closure</span>
        </div>

        <div className="pt-1.5 mt-1 border-t border-slate-800/80 text-[9px] text-slate-400 flex items-center justify-between">
          <span>Capacity & Traffic: <strong className="text-amber-400 font-medium">SIMULATED DATA</strong></span>
          <span className="text-slate-500">Positions from backend records</span>
        </div>
      </div>
    </div>
  );
};
