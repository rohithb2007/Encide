import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { Hospital, Patient, IncidentInfo, Ambulance, TrafficAdvisory, NearbyHospital } from '../types';

interface MapViewProps {
  hospitals: Hospital[];
  patients: Patient[];
  nearbyHospitals: NearbyHospital[];
  casualtyRouteActive: boolean;
  routingOptimized: boolean;
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
  nearbyHospitals,
  casualtyRouteActive,
  routingOptimized,
  ambulances = [],
  advisories = [],
  incident,
  selectedHospitalId,
  selectedAmbulanceId,
  onSelectHospital,
  onSelectAmbulance,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const focusedRouteRef = useRef<string | null>(null);

  const hospitalLayerRef = useRef<L.LayerGroup | null>(null);
  const patientLayerRef = useRef<L.LayerGroup | null>(null);
  const ambulanceLayerRef = useRef<L.LayerGroup | null>(null);
  const advisoryLayerRef = useRef<L.LayerGroup | null>(null);
  const linesLayerRef = useRef<L.LayerGroup | null>(null);
  const incidentLayerRef = useRef<L.LayerGroup | null>(null);

  // Layer Visibility Controls
  const [showHospitals, setShowHospitals] = useState<boolean>(true);
  const [showPatients, setShowPatients] = useState<boolean>(true);
  const [showAmbulances, setShowAmbulances] = useState<boolean>(false);
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
    const casualtyRoutePane = map.createPane('casualtyRoutePane');
    casualtyRoutePane.style.zIndex = '450';

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
    focusedRouteRef.current = null;
    const resizeObserver = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (routingOptimized) return;
    const incidentLat = incident?.latitude;
    const incidentLon = incident?.longitude;
    if (incidentLat !== undefined && incidentLon !== undefined &&
        Number.isFinite(incidentLat) && Number.isFinite(incidentLon)) {
      map.setView([incidentLat, incidentLon], 13);
    } else if (hospitals.length > 0) {
      map.fitBounds(
        L.latLngBounds(hospitals.map((hospital) => L.latLng(hospital.latitude, hospital.longitude))),
        { padding: [24, 24] }
      );
    }
  }, [incident?.latitude, incident?.longitude, routingOptimized]);

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
      '<div class="font-mono text-[10px] font-bold text-rose-300">🚨 MAJOR CASUALTY INCIDENT</div>',
      { permanent: true, direction: 'bottom', offset: [0, 20], className: 'bg-slate-950 text-white border border-rose-500/40 rounded p-1' }
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
      const isAccepting = h.is_accepting !== false;
      const isFull = !isAccepting || h.available_beds <= 0;
      let loadColor = '#10b981';
      if (isFull) loadColor = '#f43f5e';
      else if (h.total_beds > 0 && (h.total_beds - h.available_beds) / h.total_beds >= 0.65) loadColor = '#facc15';
      const capacityLabel = isFull ? (h.available_beds <= 0 ? 'FULL' : 'NOT ACCEPTING') : loadColor === '#facc15' ? 'PARTIALLY FILLED' : 'VACANCY';
      const ringColor = isSelected ? '#38bdf8' : '#fff';

      const html = `
        <div class="relative flex items-center justify-center group cursor-pointer">
          ${isSelected ? `<div class="absolute w-11 h-11 rounded-full animate-ping opacity-60" style="background-color: ${ringColor}"></div>` : ''}
          <div class="rounded-lg shadow-xl text-center font-bold border-2" style="background-color:${loadColor};color:#020617;border-color:${ringColor};min-width:76px;padding:5px 8px;">
            <div style="font-size:12px;line-height:16px;">✚ ${h.short_code}</div>
            <div style="font-size:10px;line-height:14px;">${isFull ? capacityLabel : `${h.available_beds} beds free`}</div>
          </div>
        </div>
      `;

      const icon = L.divIcon({ html, className: 'custom-hosp-icon', iconSize: [84, 48], iconAnchor: [42, 24] });
      const marker = L.marker([h.latitude, h.longitude], { icon, zIndexOffset: isSelected ? 1200 : 200 });

      marker.on('click', () => onSelectHospital(h));
      marker.bindTooltip(
        `<div class="font-mono text-xs">
          <div class="font-bold text-white">${h.name} (${h.trauma_level})</div>
          <div class="text-[10px] text-slate-300">
            Available Beds: <strong class="text-emerald-400">${h.available_beds}</strong> / ${h.total_beds} •
            ICU: <strong class="text-cyan-400">${h.available_icu}</strong> •
            Status: <span style="color: ${loadColor}">${capacityLabel}</span>
          </div>
          <div class="text-[9px] text-slate-400">Freshness: ${h.confirmation_status || 'CONFIRMED'}</div>
        </div>`,
        { direction: 'top', className: 'bg-slate-950 text-white border border-slate-800 rounded p-1.5 shadow-xl' }
      );

      marker.addTo(hospitalLayerRef.current!);
    });
  }, [hospitals, selectedHospitalId, showHospitals, onSelectHospital]);

  // Scene groups are count summaries at the accident region, not individual GPS pins.
  useEffect(() => {
    if (!mapInstanceRef.current || !patientLayerRef.current) return;
    patientLayerRef.current.clearLayers();
    const lat = incident?.latitude;
    const lon = incident?.longitude;
    if (!showPatients || !casualtyRouteActive || lat === undefined || lon === undefined ||
        !Number.isFinite(lat) || !Number.isFinite(lon)) return;

    const sceneCasualties = patients.filter((p) => p.incident_id === incident?.id && (p.status === 'WAITING' || p.status === 'ASSIGNED'));
    const red = sceneCasualties.filter((p) => p.severity === 'RED').length;
    const yellow = sceneCasualties.filter((p) => p.severity === 'YELLOW').length;
    const minor = sceneCasualties.filter((p) => p.severity === 'GREEN').length;
    const expectant = sceneCasualties.filter((p) => p.severity === 'BLACK').length;

    L.circle([lat, lon], {
      radius: 200, color: '#f43f5e', weight: 2, dashArray: '6 5',
      fillColor: '#f43f5e', fillOpacity: 0.09, interactive: false,
    }).addTo(patientLayerRef.current);

    const groups = [
      { label: 'MAJOR / URGENT', count: red + yellow, color: '#f43f5e', lat: lat + 0.001, lon, anchor: [112, 24] as L.PointTuple,
        detail: `${red} immediate (red), ${yellow} delayed (yellow)` },
      { label: 'MINOR', count: minor, color: '#10b981', lat: lat + 0.001, lon, anchor: [-4, 24] as L.PointTuple,
        detail: 'Green triage cases at the scene' },
      { label: 'EXPECTANT', count: expectant, color: '#64748b', lat: lat - 0.0012, lon, anchor: [54, 24] as L.PointTuple,
        detail: 'Black triage cases recorded at the scene' },
    ];
    groups.filter((group) => group.count > 0).forEach((group) => {
      const icon = L.divIcon({
        html: `<div style="background:#0f172a;color:#fff;border:2px solid ${group.color};border-radius:9px;padding:4px 6px;text-align:center;box-shadow:0 3px 12px #02061780;">
          <strong style="display:block;font-size:17px;line-height:20px;color:${group.color};">${group.count}</strong>
          <span style="font-size:10px;font-weight:700;white-space:nowrap;">${group.label}</span>
        </div>`,
        className: 'scene-casualty-group', iconSize: [108, 48], iconAnchor: group.anchor,
      });
      L.marker([group.lat, group.lon], { icon, zIndexOffset: 800 })
        .bindTooltip(`${group.detail}. Scene group count; not individual GPS positions.`, { direction: 'top' })
        .addTo(patientLayerRef.current!);
    });
  }, [patients, incident?.id, incident?.latitude, incident?.longitude, showPatients, casualtyRouteActive]);

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

  // Render the casualty region's road route to the nearest hospital only.
  useEffect(() => {
    if (!mapInstanceRef.current || !linesLayerRef.current) return;
    linesLayerRef.current.clearLayers();
    if (!showRoutes || !casualtyRouteActive || !routingOptimized) {
      if (!casualtyRouteActive || !routingOptimized) focusedRouteRef.current = null;
      return;
    }
    if (!Number.isFinite(incident?.latitude) || !Number.isFinite(incident?.longitude)) return;

    const nearest = nearbyHospitals.find((nearby) => nearby.is_nearest &&
      hospitals.some((hospital) => hospital.id === nearby.hospital.id && hospital.is_accepting !== false && hospital.available_beds > 0));
    const geometry = nearest?.route_geometry;
    if (nearest?.route_source === 'OSRM_ROAD_ROUTE' && geometry && geometry.length >= 2) {
      if (geometry.some(({ latitude, longitude }) =>
        !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
      )) return;
      const scene = L.latLng(incident!.latitude!, incident!.longitude!);
      const start = geometry[0];
      const end = geometry[geometry.length - 1];
      if (scene.distanceTo([start.latitude, start.longitude]) > 120 ||
          L.latLng(nearest.hospital.latitude, nearest.hospital.longitude).distanceTo([end.latitude, end.longitude]) > 120) return;

      const leafletLatLngs: L.LatLngExpression[] = geometry.map(({ latitude, longitude }) => [latitude, longitude]);
      const routeKey = `${incident?.id}:${incident?.latitude}:${incident?.longitude}:${nearest.hospital.id}:${geometry.length}`;
      if (focusedRouteRef.current !== routeKey) {
        const routeMap = mapInstanceRef.current;
        const routeBounds = L.latLngBounds(leafletLatLngs);
        routeBounds.extend([incident!.latitude!, incident!.longitude!]);
        routeMap.invalidateSize({ pan: false });
        routeMap.fitBounds(routeBounds, { paddingTopLeft: [120, 100], paddingBottomRight: [100, 160], maxZoom: 15, animate: false });
        focusedRouteRef.current = routeKey;
      }
      const routeOutline = L.polyline(leafletLatLngs, {
        pane: 'casualtyRoutePane',
        color: '#f8fafc',
        weight: 11,
        opacity: 0.9,
        interactive: false,
      });
      const casualtyEndpoint = L.circleMarker(leafletLatLngs[0] as L.LatLngExpression, {
        pane: 'casualtyRoutePane',
        radius: 9,
        color: '#fff',
        weight: 3,
        fillColor: '#f43f5e',
        fillOpacity: 1,
      }).bindTooltip('MAJOR CASUALTY REGION', { direction: 'top', className: 'bg-slate-950 text-white border border-rose-500 rounded px-2 py-1' });
      const hospitalEndpoint = L.circleMarker(leafletLatLngs[leafletLatLngs.length - 1] as L.LatLngExpression, {
        pane: 'casualtyRoutePane',
        radius: 8,
        color: '#fff',
        weight: 3,
        fillColor: nearest.hospital.current_load >= 0.65 ? '#facc15' : '#10b981',
        fillOpacity: 1,
      }).bindTooltip(`NEAREST AVAILABLE: ${nearest.hospital.name}`, { direction: 'top', className: 'bg-slate-950 text-white border border-emerald-500 rounded px-2 py-1' });
      const polyline = L.polyline(leafletLatLngs, {
        pane: 'casualtyRoutePane',
        color: '#7c3aed',
        weight: 6,
        opacity: 1,
        className: 'osrm-road-route',
      });

      polyline.bindTooltip(
        `<div class="font-mono text-[10px]">
          <strong>CASUALTY REGION ➔ ${nearest.hospital.short_code}</strong><br/>
          OSRM DRIVING ROUTE<br/>
          ${nearest.route_distance_km?.toFixed(1) ?? nearest.distance_km.toFixed(1)} km • ${nearest.route_eta_minutes?.toFixed(0) ?? nearest.estimated_transit_minutes.toFixed(0)} min
        </div>`,
        { sticky: true, className: 'bg-slate-950 text-white border border-slate-800 rounded p-1' }
      );

      routeOutline.addTo(linesLayerRef.current!);
      polyline.addTo(linesLayerRef.current!);
      casualtyEndpoint.addTo(linesLayerRef.current!);
      hospitalEndpoint.addTo(linesLayerRef.current!);
      polyline.bringToFront();
      casualtyEndpoint.bringToFront();
      hospitalEndpoint.bringToFront();
    }
  }, [nearbyHospitals, hospitals, showRoutes, casualtyRouteActive, routingOptimized, incident?.id, incident?.latitude, incident?.longitude]);

  const nearestHospital = nearbyHospitals.find((nearby) => nearby.is_nearest &&
    hospitals.some((hospital) => hospital.id === nearby.hospital.id && hospital.is_accepting !== false && hospital.available_beds > 0));
  const nearestRouteSource = nearestHospital?.route_source;

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      {/* Map DOM node */}
      <div ref={mapContainerRef} className="w-full h-full z-0 min-h-[480px]" />

      {/* Layer Toggles Toolbar Top-Right */}
      <div className="absolute top-3 right-3 left-14 sm:left-auto z-10 bg-slate-950/90 border border-slate-800 backdrop-blur-md px-2.5 py-1.5 rounded-lg font-mono text-xs text-slate-300 shadow-xl flex flex-wrap items-center gap-2">
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
          Scene cases
        </button>
        <button
          onClick={() => setShowAmbulances(!showAmbulances)}
          className={`px-1.5 py-0.5 rounded transition-all ${showAmbulances ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'text-slate-500'}`}
        >
          Ambulances
        </button>
        <button
          onClick={() => setShowRoutes(!showRoutes)}
          disabled={!routingOptimized}
          title={routingOptimized ? 'Toggle optimized hospital route' : 'Optimize casualty evacuation to show the hospital route'}
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
      <div className="absolute bottom-3 left-3 right-3 z-10 bg-slate-950/95 border border-slate-700 backdrop-blur-md px-3 py-2 rounded-lg text-xs text-slate-300 shadow-xl space-y-2" data-testid="incident-route-summary">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-bold text-white">
              {!casualtyRouteActive ? 'Major casualty incident map' : !routingOptimized ? 'Accident scene · Ready for evacuation optimization' : nearestHospital ? `Accident scene → ${nearestHospital.hospital.name}` : 'No receiving hospital available'}
            </div>
            <div className="mt-1 text-slate-400">
              {!casualtyRouteActive ? 'Trigger the incident to show scene cases, then optimize evacuation to display the hospital route.'
                : !routingOptimized ? 'Optimize casualty evacuation to display the hospital route.'
                : nearestRouteSource === 'OSRM_ROAD_ROUTE' ? `Nearest accepting hospital · ${nearestHospital?.route_distance_km?.toFixed(1)} km · ${nearestHospital?.route_eta_minutes?.toFixed(0)} min driving${showRoutes ? '' : ' · Route hidden: enable Routes above'}`
                : nearestHospital ? 'Road route unavailable. Retry when the routing service is reachable.'
                : 'All hospitals are full or not accepting casualties.'}
            </div>
          </div>
          {casualtyRouteActive && routingOptimized && nearestHospital && <button type="button" className="px-3 py-1.5 rounded border border-violet-500/60 text-violet-200 hover:bg-violet-500/20" onClick={() => {
            setShowRoutes(true);
            const map = mapInstanceRef.current;
            const geometry = nearestHospital.route_geometry;
            if (map && geometry?.length) {
              map.fitBounds(L.latLngBounds(geometry.map((point) => [point.latitude, point.longitude] as L.LatLngTuple)), { paddingTopLeft: [120, 100], paddingBottomRight: [100, 160], maxZoom: 15, animate: false });
            } else if (map && Number.isFinite(incident?.latitude) && Number.isFinite(incident?.longitude)) {
              map.setView([incident!.latitude!, incident!.longitude!], 15);
            }
          }}>Focus route</button>}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-800 pt-2 text-[11px]">
          <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded bg-emerald-500" /> Vacancy (&lt;65% occupied)</span>
          <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded bg-yellow-400" /> Partially filled (≥65%)</span>
          <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded bg-rose-500" /> Full / not accepting</span>
          <span className="text-slate-500">Demo capacity · Scene badges show grouped cases</span>
        </div>
      </div>
    </div>
  );
};
