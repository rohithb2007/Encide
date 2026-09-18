
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Hospital, Patient, IncidentInfo, AssignmentItem } from '../types';

interface MapViewProps {
  hospitals: Hospital[];
  patients: Patient[];
  assignments: AssignmentItem[];
  incident?: IncidentInfo;
  selectedHospitalId?: string | null;
  selectedPatientId?: string | null;
  onSelectHospital: (hospital: Hospital) => void;
  onSelectPatient: (patient: Patient) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  hospitals,
  patients,
  assignments,
  incident,
  selectedHospitalId,
  selectedPatientId,
  onSelectHospital,
  onSelectPatient,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const hospitalLayerRef = useRef<L.LayerGroup | null>(null);
  const patientLayerRef = useRef<L.LayerGroup | null>(null);
  const linesLayerRef = useRef<L.LayerGroup | null>(null);
  const incidentLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = incident?.latitude ?? 9.9816;
    const initialLon = incident?.longitude ?? 76.2999;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: 11,
      zoomControl: true,
      attributionControl: false,
    });

    // Free OpenStreetMap Tiles - No API Key Required
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Layer Groups
    linesLayerRef.current = L.layerGroup().addTo(map);
    hospitalLayerRef.current = L.layerGroup().addTo(map);
    patientLayerRef.current = L.layerGroup().addTo(map);
    incidentLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render Incident Epicenter
  useEffect(() => {
    if (!mapInstanceRef.current || !incidentLayerRef.current) return;

    incidentLayerRef.current.clearLayers();

    const epicLat = incident?.latitude ?? 9.9816;
    const epicLon = incident?.longitude ?? 76.2999;

    const incidentHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-12 h-12 rounded-full bg-rose-500/20 radar-pulse"></div>
        <div class="absolute w-8 h-8 rounded-full bg-rose-600/30 animate-ping"></div>
        <div class="w-6 h-6 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center shadow-lg shadow-rose-950 text-[10px] font-bold text-white">
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

    const marker = L.marker([epicLat, epicLon], {
      icon: incidentIcon,
    });

    marker.bindTooltip(
      `<div class="font-mono text-xs font-bold text-rose-300">
        DISASTER GROUND ZERO<br/>
        <span class="text-slate-300 text-[10px] font-normal">
          ${incident?.name || 'MCI Epicenter'}
        </span>
      </div>`,
      {
        className: 'bg-slate-950 border border-rose-600 text-white',
        direction: 'top',
        offset: [0, -15],
      }
    );

    marker.addTo(incidentLayerRef.current);
  }, [incident]);

  // Render Hospitals
  useEffect(() => {
    if (!mapInstanceRef.current || !hospitalLayerRef.current) return;

    hospitalLayerRef.current.clearLayers();

    hospitals.forEach((hosp) => {
      const isSelected = selectedHospitalId === hosp.id;

      let loadColor = '#10b981';
      let loadBorder = '#059669';
      let pulseColor = 'bg-emerald-500/20';

      if (hosp.current_load >= 0.85) {
        loadColor = '#ef4444';
        loadBorder = '#dc2626';
        pulseColor = 'bg-rose-500/30';
      } else if (hosp.current_load >= 0.65) {
        loadColor = '#f59e0b';
        loadBorder = '#d97706';
        pulseColor = 'bg-amber-500/20';
      }

      const hospHtml = `
        <div class="relative flex flex-col items-center cursor-pointer transition-transform hover:scale-110">
          <div class="absolute -top-1 w-10 h-10 rounded-full ${pulseColor} animate-pulse"></div>

          <div
            style="background-color: ${loadColor}; border-color: ${loadBorder};"
            class="w-8 h-8 rounded-lg border-2 shadow-xl flex items-center justify-center text-white font-bold text-xs relative z-10 ${isSelected ? 'ring-4 ring-cyan-400 scale-110' : ''
        }"
          >
            H
          </div>

          <div class="bg-slate-950/90 text-slate-200 border border-slate-700 px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap mt-1 shadow-md z-10">
            ${hosp.short_code || hosp.name.slice(0, 10)} (${hosp.available_beds}b)
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: hospHtml,
        className: 'custom-hosp-marker',
        iconSize: [40, 50],
        iconAnchor: [20, 25],
      });

      const marker = L.marker([hosp.latitude, hosp.longitude], {
        icon,
      });

      marker.on('click', () => {
        onSelectHospital(hosp);
      });

      marker.bindTooltip(
        `<div class="font-mono text-xs">
          <strong class="text-white">${hosp.name}</strong><br/>
          <span class="text-slate-300">
            Load: ${Math.round(hosp.current_load * 100)}% (${hosp.status})
          </span><br/>
          <span class="text-cyan-400">
            Available Beds: ${hosp.available_beds} / ${hosp.total_beds}
          </span><br/>
          <span class="text-rose-400">
            Available ICU: ${hosp.available_icu}
          </span>
        </div>`,
        {
          className: 'bg-slate-950 border border-slate-700',
          direction: 'top',
          offset: [0, -20],
        }
      );

      marker.addTo(hospitalLayerRef.current!);
    });
  }, [hospitals, selectedHospitalId, onSelectHospital]);

  // Render Patients
  useEffect(() => {
    if (!mapInstanceRef.current || !patientLayerRef.current) return;

    patientLayerRef.current.clearLayers();

    patients.forEach((patient) => {
      const isSelected = selectedPatientId === patient.id;

      let color = '#ef4444';

      if (patient.severity === 'YELLOW') {
        color = '#eab308';
      } else if (patient.severity === 'GREEN') {
        color = '#22c55e';
      } else if (patient.severity === 'BLACK') {
        color = '#374151';
      }

      const patientHtml = `
        <div class="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-125">
          <div
            style="background-color: ${color};"
            class="w-3.5 h-3.5 rounded-full border border-white/90 shadow-md ${isSelected ? 'ring-4 ring-cyan-400 scale-150' : ''
        } ${patient.severity === 'RED' ? 'animate-pulse' : ''
        }"
          >
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: patientHtml,
        className: 'custom-patient-marker',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker(
        [patient.latitude, patient.longitude],
        {
          icon,
        }
      );

      marker.on('click', () => {
        onSelectPatient(patient);
      });

      marker.bindTooltip(
        `<div class="font-mono text-xs">
          <strong class="text-white">${patient.id}</strong>
          (Triage:
          <span style="color:${color}">
            ${patient.severity}
          </span>)<br/>

          <span class="text-slate-300">
            Status: ${patient.status}
          </span><br/>

          <span class="text-indigo-300">
            Needs: ${patient.required_specialist}
          </span>
        </div>`,
        {
          className: 'bg-slate-950 border border-slate-700',
          direction: 'top',
          offset: [0, -10],
        }
      );

      marker.addTo(patientLayerRef.current!);
    });
  }, [patients, selectedPatientId, onSelectPatient]);

  // Render Assignment Lines
  useEffect(() => {
    if (!mapInstanceRef.current || !linesLayerRef.current) return;

    linesLayerRef.current.clearLayers();

    const hospMap = new Map<string, Hospital>(
      hospitals.map((h) => [h.id, h])
    );

    const patientMap = new Map<string, Patient>(
      patients.map((p) => [p.id, p])
    );

    assignments.forEach((assignment) => {
      const patient = patientMap.get(assignment.patient_id);
      const hospital = hospMap.get(assignment.hospital_id);

      if (!patient || !hospital) return;

      let lineColor = '#ef4444';

      if (patient.severity === 'YELLOW') {
        lineColor = '#eab308';
      } else if (patient.severity === 'GREEN') {
        lineColor = '#22c55e';
      } else if (patient.severity === 'BLACK') {
        lineColor = '#475569';
      }

      const isPatientSelected =
        selectedPatientId === patient.id;

      const polyline = L.polyline(
        [
          [patient.latitude, patient.longitude],
          [hospital.latitude, hospital.longitude],
        ],
        {
          color: lineColor,
          weight: isPatientSelected ? 3.5 : 2,
          opacity: isPatientSelected ? 1.0 : 0.65,
          dashArray: '6, 6',
          className: 'animated-routing-line',
        }
      );

      polyline.bindTooltip(
        `<div class="font-mono text-[10px]">
          <strong>
            ${patient.id} ➔ ${hospital.short_code}
          </strong><br/>
          Score: ${(assignment.score * 100).toFixed(0)}%
          • ETA: ${assignment.estimated_transit_minutes} min
        </div>`,
        {
          sticky: true,
          className:
            'bg-slate-950 text-white border border-slate-800',
        }
      );

      polyline.addTo(linesLayerRef.current!);
    });
  }, [assignments, hospitals, patients, selectedPatientId]);

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">

      {/* Map DOM node */}
      <div
        ref={mapContainerRef}
        className="w-full h-full z-0"
      />

      {/* Tactical Map Overlay Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-slate-950/90 border border-slate-800 backdrop-blur-md px-3 py-2 rounded-lg font-mono text-[10px] text-slate-300 shadow-xl space-y-1">

        <div className="flex items-center justify-between gap-3 font-bold text-white tracking-wider mb-1">
          <span>TACTICAL MAP TELEMETRY</span>
          <span className="text-[9px] text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/50">
            KOCHI / ERNAKULAM SECTOR
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
          Hospital Normal (&lt;65%)

          <span className="w-2.5 h-2.5 rounded bg-amber-500 ml-1" />
          Warning (65-85%)

          <span className="w-2.5 h-2.5 rounded bg-rose-500 ml-1" />
          Saturated (&gt;85%)
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          Red (Immediate)

          <span className="w-2 h-2 rounded-full bg-amber-400 ml-1" />
          Yellow (Delayed)

          <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1" />
          Green (Minor)
        </div>

        <div className="pt-1.5 mt-1 border-t border-slate-800/80 text-[9px] text-slate-400 flex items-center justify-between">
          <span>Hospital capacity/load: <strong className="text-amber-400 font-medium">SIMULATED DATA</strong></span>
          <span className="text-slate-500">Verified GPS Coordinates</span>
        </div>

      </div>
    </div>
  );
};
