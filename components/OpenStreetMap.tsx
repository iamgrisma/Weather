'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, LayerGroup, Marker, Polygon } from 'leaflet';
import {
  RIVER_STATIONS,
  MAJOR_CITIES_WEATHER,
  MOUNTAIN_SECTORS,
  TREKKING_STATIONS,
  FLOOD_HAZARD_ZONES,
  FloodHazardZone,
  computeRiverTrendForecast,
} from '@/lib/dhm-data';
import { AlertTriangle, Layers, Waves, Mountain, Compass, ShieldAlert } from 'lucide-react';

type LayerType = 'all' | 'hazards' | 'rivers' | 'cities' | 'mountains' | 'trekking';

interface OpenStreetMapProps {
  focusLocation?: { lat: number; lng: number; stationName?: string } | null;
  focusZoneId?: string | null;
  showHazardsByDefault?: boolean;
}

export default function OpenStreetMap({
  focusLocation,
  focusZoneId,
  showHazardsByDefault = true,
}: OpenStreetMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const layerGroupRef = useRef<LayerGroup | null>(null);
  const markersMapRef = useRef<Record<string, Marker>>({});
  const polygonsMapRef = useRef<Record<string, Polygon>>({});
  const [activeLayer, setActiveLayer] = useState<LayerType>('all');
  const [showHazardPolygons, setShowHazardPolygons] = useState<boolean>(showHazardsByDefault);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = (await import('leaflet')).default;

      if (!isMounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [28.04, 84.81], // Centered near central Nepal / Budhigandaki
        zoom: 8,
        minZoom: 6,
        maxZoom: 13,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;

      setIsMapReady(true);
      setTimeout(() => {
        if (map && isMounted) {
          try {
            map.invalidateSize();
          } catch {
            // ignore
          }
        }
      }, 250);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Safe navigation function with full NaN, size, and distance protection
  const safeNavigateMap = (
    lat: number,
    lng: number,
    zoom: number = 10,
    highlightAction?: () => void
  ) => {
    const map = mapInstanceRef.current;
    if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

    try {
      map.invalidateSize();
      const size = map.getSize();

      const current = map.getCenter();
      const currentZoom = map.getZoom();
      const dist = current
        ? Math.hypot(current.lat - lat, current.lng - lng)
        : 1;

      // If already at target center and zoom, just trigger the popup without re-flying
      if (dist < 0.001 && currentZoom === zoom) {
        if (highlightAction) highlightAction();
        return;
      }

      // If map container is not yet sized or distance is negligible, use setView to prevent (NaN, NaN) in Leaflet flyTo
      if (!size || size.x <= 0 || size.y <= 0 || dist < 0.005) {
        map.setView([lat, lng], zoom);
        if (highlightAction) setTimeout(highlightAction, 300);
        return;
      }

      // Safely perform flyTo
      map.flyTo([lat, lng], zoom, {
        duration: 0.8,
        easeLinearity: 0.25,
      });

      if (highlightAction) {
        setTimeout(highlightAction, 900);
      }
    } catch (err) {
      console.warn('Map safe navigation fallback to setView', err);
      try {
        map.setView([lat, lng], zoom);
        if (highlightAction) setTimeout(highlightAction, 300);
      } catch {
        // Safe fail
      }
    }
  };

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !layerGroupRef.current) return;

    async function renderMarkers() {
      const L = (await import('leaflet')).default;
      const layerGroup = layerGroupRef.current;
      if (!layerGroup) return;

      layerGroup.clearLayers();
      markersMapRef.current = {};
      polygonsMapRef.current = {};

      // 0. Flood Hazard Risk Zones (Polygons overlaying river basins)
      if (showHazardPolygons || activeLayer === 'all' || activeLayer === 'hazards') {
        FLOOD_HAZARD_ZONES.forEach((zone) => {
          const isExtreme = zone.severity === 'EXTREME_DANGER';
          const isWarning = zone.severity === 'HIGH_WARNING';
          const strokeColor = isExtreme ? '#dc2626' : isWarning ? '#ea580c' : '#ca8a04';
          const fillColor = isExtreme ? '#ef4444' : isWarning ? '#f97316' : '#eab308';
          const fillOpacity = isExtreme ? 0.38 : isWarning ? 0.28 : 0.20;

          const polygon = L.polygon(zone.coordinates, {
            color: strokeColor,
            weight: isExtreme ? 2.5 : 2,
            dashArray: isExtreme ? '4 4' : undefined,
            fillColor: fillColor,
            fillOpacity: fillOpacity,
          });

          const zonePopup = `
            <div style="font-family:inherit;padding:4px;min-width:260px;max-width:320px;">
              <div style="display:inline-block;background:${isExtreme ? '#fee2e2' : isWarning ? '#ffedd5' : '#fef9c3'};color:${isExtreme ? '#991b1b' : isWarning ? '#9a3412' : '#854d0e'};border:1px solid ${strokeColor};font-size:10px;font-weight:800;padding:2px 8px;border-radius:4px;text-transform:uppercase;margin-bottom:4px;">
                ${isExtreme ? 'ZONE 1: ACTIVE INUNDATION DANGER' : isWarning ? 'ZONE 2: HIGH WARNING FLOODPLAIN' : 'ZONE 3: FLOOD WATCH CORRIDOR'}
              </div>
              <h4 style="margin:2px 0 4px;font-size:15px;font-weight:900;color:#0f172a;">${zone.name}</h4>
              <div style="font-size:11px;color:#475569;margin-bottom:6px;">${zone.basin} Basin · Districts: <strong>${zone.districts.join(', ')}</strong></div>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:8px;border-radius:8px;font-size:11px;margin-bottom:6px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                  <span style="color:#64748b;">Risk Index:</span>
                  <strong style="color:${strokeColor};font-size:13px;">${zone.riskScore} / 100</strong>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:3px;color:#475569;">
                  <span>Hydrology Model:</span>
                  <span style="font-weight:600;">${zone.returnPeriod}</span>
                </div>
                <div style="display:flex;justify-content:space-between;color:#475569;">
                  <span>At-Risk Population:</span>
                  <span style="font-weight:600;">${zone.affectedPopulationEst}</span>
                </div>
              </div>

              <div style="font-size:11px;color:#334155;margin-bottom:6px;line-height:1.4;">
                ${zone.threatDescription}
              </div>

              <div style="background:${isExtreme ? '#fef2f2' : '#fffbeb'};color:${isExtreme ? '#991b1b' : '#92400e'};border-left:3px solid ${strokeColor};padding:6px 8px;font-size:10px;line-height:1.35;font-weight:600;">
                <strong>Directive:</strong> ${zone.evacuationDirective}
              </div>
            </div>
          `;

          polygon.bindPopup(zonePopup);
          layerGroup.addLayer(polygon);
          polygonsMapRef.current[zone.id] = polygon;
        });
      }

      const createMarker = (bgColor: string, text: string, isDangerPulsing: boolean = false) => {
        if (isDangerPulsing) {
          return L.divIcon({
            className: 'custom-leaflet-marker',
            html: `
              <div style="position:relative;display:flex;align-items:center;justify-content:center;">
                <span class="danger-beacon-ripple"></span>
                <div class="danger-river-marker-pulse" style="position:relative;padding:0 8px;height:30px;border-radius:9999px;background-color:#dc2626;color:#ffffff;font-size:11px;font-weight:900;border:2px solid #ffffff;white-space:nowrap;z-index:20;cursor:pointer;display:flex;align-items:center;gap:4px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span>${text}</span>
                </div>
              </div>
            `,
            iconSize: [52, 30],
            iconAnchor: [26, 15],
            popupAnchor: [0, -15],
          });
        }

        return L.divIcon({
          className: 'custom-leaflet-marker',
          html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background-color:${bgColor};color:#ffffff;font-size:11px;font-weight:700;box-shadow:0 2px 5px rgba(0,0,0,0.25);border:2px solid #ffffff;">${text}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -14],
        });
      };

      // 1. Rivers (Strictly conditional based on waterLevel >= danger_level)
      if (activeLayer === 'all' || activeLayer === 'rivers' || activeLayer === 'hazards') {
        RIVER_STATIONS.forEach((river) => {
          const isDanger = river.waterLevel >= river.danger_level;
          const isWarning = !isDanger && river.waterLevel >= river.warning_level;
          const color = isDanger ? '#dc2626' : isWarning ? '#d97706' : '#10b981';
          const trend = computeRiverTrendForecast(river);
          
          const icon = createMarker(color, `${river.waterLevel}m`, isDanger);
          const marker = L.marker([river.latitude, river.longitude], {
            icon,
            zIndexOffset: isDanger ? 1000 : 0,
          });

          const popupContent = isDanger ? `
            <div style="font-family:inherit;padding:4px;min-width:245px;">
              <div style="display:inline-block;background:#fee2e2;color:#991b1b;border:1px solid #f87171;font-size:11px;font-weight:800;padding:2px 8px;border-radius:4px;text-transform:uppercase;margin-bottom:4px;">
                CRITICAL FLOOD DANGER ALERT
              </div>
              <h4 style="margin:2px 0 4px;font-size:16px;font-weight:900;color:#991b1b;">${river.name}</h4>
              <div style="font-size:12px;color:#4b5563;margin-bottom:8px;">${river.basin} Basin · ${river.district}</div>
              
              <div style="background:#fef2f2;border:1.5px solid #f87171;padding:8px 10px;border-radius:8px;font-size:12px;margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                  <span style="font-weight:600;color:#991b1b;">Live Water Level:</span>
                  <strong style="color:#dc2626;font-size:15px;">${river.waterLevel} m (RISING)</strong>
                </div>
                <div style="display:flex;justify-content:space-between;color:#7f1d1d;font-size:11px;margin-bottom:2px;">
                  <span>Danger Threshold:</span>
                  <strong>${river.danger_level} m (+${(river.waterLevel - river.danger_level).toFixed(2)}m EXCEEDED)</strong>
                </div>
                <div style="display:flex;justify-content:space-between;color:#7f1d1d;font-size:11px;margin-bottom:4px;">
                  <span>Warning Threshold:</span>
                  <span>${river.warning_level} m</span>
                </div>

                <!-- Trend & 3h Forecast percentage -->
                <div style="border-top:1px dashed #fca5a5;padding-top:4px;margin-top:4px;display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-weight:700;color:#991b1b;">3h Trend Forecast:</span>
                  <span style="font-weight:800;color:#dc2626;background:#fee2e2;padding:1px 6px;border-radius:4px;">
                    +${trend.changePercent}% (${trend.riskAssessment})
                  </span>
                </div>
                <div style="font-size:10px;color:#7f1d1d;margin-top:2px;display:flex;justify-content:space-between;">
                  <span>Projected Level:</span>
                  <strong>${trend.projectedLevel} m (+${(trend.projectedLevel - river.waterLevel).toFixed(2)}m)</strong>
                </div>
              </div>

              <div style="background:#fee2e2;color:#991b1b;padding:6px 8px;border-radius:6px;font-size:11px;line-height:1.4;font-weight:600;">
                Flood Evacuation Advisory: Downstream riverbanks in Arughat, Salyantar, and Benighat are advised to move to higher ground immediately.
              </div>
            </div>
          ` : `
            <div style="font-family:inherit;padding:2px;min-width:210px;">
              <div style="font-size:11px;color:${color};font-weight:700;text-transform:uppercase;">
                ${isWarning ? 'Warning Level' : 'Normal Water Flow'}
              </div>
              <h4 style="margin:2px 0 4px;font-size:14px;font-weight:800;color:#0f172a;">${river.name}</h4>
              <div style="font-size:11px;color:#64748b;margin-bottom:6px;">${river.basin} Basin · ${river.district}</div>
              <div style="background:#f8fafc;padding:6px 8px;border-radius:6px;font-size:12px;">
                <div style="display:flex;justify-content:space-between;"><span>Water Level:</span><strong style="color:${color}">${river.waterLevel} m</strong></div>
                <div style="display:flex;justify-content:space-between;color:#64748b;"><span>Warning Limit:</span><span>${river.warning_level} m</span></div>
                <div style="display:flex;justify-content:space-between;color:#64748b;"><span>Danger Limit:</span><span>${river.danger_level} m</span></div>
                <div style="border-top:1px solid #e2e8f0;margin-top:4px;padding-top:4px;display:flex;justify-content:space-between;font-size:11px;">
                  <span style="color:#64748b;">3h Trend Forecast:</span>
                  <strong style="color:${trend.direction === 'RISING' ? '#ea580c' : trend.direction === 'FALLING' ? '#059669' : '#64748b'}">
                    ${trend.direction === 'RISING' ? '+' : ''}${trend.changePercent}% (${trend.riskAssessment})
                  </strong>
                </div>
              </div>
            </div>
          `;

          marker.bindPopup(popupContent);
          layerGroup.addLayer(marker);
          markersMapRef.current[`river-${river.id}`] = marker;

          // Automatically open Budhigandaki River danger popup by default so user sees it right away!
          if (river.id === 120 && !focusZoneId) {
            setTimeout(() => {
              marker.openPopup();
            }, 600);
          }
        });
      }

      // 2. Cities
      if (activeLayer === 'all' || activeLayer === 'cities') {
        MAJOR_CITIES_WEATHER.forEach((city) => {
          const icon = createMarker('#0284c7', `${Math.round(city.currentTemp)}°`);
          const marker = L.marker([city.lat, city.lng], { icon });
          marker.bindPopup(`
            <div style="font-family:inherit;padding:2px;min-width:180px;">
              <div style="font-size:11px;color:#0284c7;font-weight:700;text-transform:uppercase;">City Weather</div>
              <h4 style="margin:2px 0 4px;font-size:15px;font-weight:800;color:#0f172a;">${city.name}</h4>
              <div style="font-size:12px;color:#334155;margin-bottom:6px;">${city.conditionEn}</div>
              <div style="background:#f8fafc;padding:6px 8px;border-radius:6px;font-size:12px;">
                <div style="display:flex;justify-content:space-between;"><span>Temp:</span><strong>${city.currentTemp}°C</strong></div>
                <div style="display:flex;justify-content:space-between;color:#64748b;"><span>Range:</span><span>${city.fromTemp}° – ${city.toTemp}°C</span></div>
                <div style="display:flex;justify-content:space-between;color:#64748b;"><span>Rain Chance:</span><span>${city.rainProbability}%</span></div>
              </div>
            </div>
          `);
          layerGroup.addLayer(marker);
          markersMapRef.current[`city-${city.id}`] = marker;
        });
      }

      // 3. Mountains
      if (activeLayer === 'all' || activeLayer === 'mountains') {
        MOUNTAIN_SECTORS.forEach((mountain) => {
          const deathZone = mountain.altitudeBands.find((b) => b.altitude === 9000);
          const mountainIconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`;
          const icon = createMarker('#475569', mountainIconSvg);
          const marker = L.marker([mountain.lat, mountain.lng], { icon });
          marker.bindPopup(`
            <div style="font-family:inherit;padding:2px;min-width:180px;">
              <div style="font-size:11px;color:#475569;font-weight:700;text-transform:uppercase;">Peak</div>
              <h4 style="margin:2px 0 4px;font-size:14px;font-weight:800;color:#0f172a;">${mountain.highestPeak} (${mountain.elevationM}m)</h4>
              <div style="background:#f8fafc;padding:6px 8px;border-radius:6px;font-size:12px;">
                <div style="display:flex;justify-content:space-between;"><span>Summit:</span><strong style="color:#ef4444">${deathZone?.tempCelsius}°C</strong></div>
                <div style="display:flex;justify-content:space-between;color:#64748b;"><span>Wind:</span><span>${deathZone?.windSpeedKnots} knots</span></div>
              </div>
            </div>
          `);
          layerGroup.addLayer(marker);
        });
      }

      // 4. Trekking
      if (activeLayer === 'all' || activeLayer === 'trekking') {
        TREKKING_STATIONS.forEach((trek) => {
          const trekIconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`;
          const icon = createMarker('#059669', trekIconSvg);
          const marker = L.marker([trek.latitude, trek.longitude], { icon });
          marker.bindPopup(`
            <div style="font-family:inherit;padding:2px;min-width:180px;">
              <div style="font-size:11px;color:#059669;font-weight:700;text-transform:uppercase;">Trek Station</div>
              <h4 style="margin:2px 0 4px;font-size:14px;font-weight:800;color:#0f172a;">${trek.name}</h4>
              <div style="background:#f8fafc;padding:6px 8px;border-radius:6px;font-size:12px;">
                <div style="display:flex;justify-content:space-between;"><span>Elevation:</span><span>${trek.elevation} m</span></div>
                <div style="display:flex;justify-content:space-between;"><span>Temp:</span><strong>${trek.currentTemp}°C</strong></div>
                <div style="display:flex;justify-content:space-between;color:#059669;font-weight:600;"><span>Status:</span><span>${trek.trailStatus}</span></div>
              </div>
            </div>
          `);
          layerGroup.addLayer(marker);
        });
      }
    }

    renderMarkers();
  }, [isMapReady, activeLayer, showHazardPolygons, focusZoneId]);

  const prevFocusKeyRef = useRef<string | null>(null);
  const prevZoneIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);

  // Handle focusLocation changes from ticker or parent safely
  useEffect(() => {
    if (!isMapReady || !focusLocation) return;
    if (
      typeof focusLocation.lat !== 'number' ||
      typeof focusLocation.lng !== 'number' ||
      !Number.isFinite(focusLocation.lat) ||
      !Number.isFinite(focusLocation.lng)
    ) {
      return;
    }

    const currentKey = `${focusLocation.lat.toFixed(4)},${focusLocation.lng.toFixed(4)}`;
    if (prevFocusKeyRef.current === currentKey) return;
    prevFocusKeyRef.current = currentKey;

    // Skip redundant initial fly if already centered on Budhigandaki on first mount
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      if (
        Math.abs(focusLocation.lat - 28.04) < 0.01 &&
        Math.abs(focusLocation.lng - 84.81) < 0.01
      ) {
        return;
      }
    }

    safeNavigateMap(focusLocation.lat, focusLocation.lng, 10, () => {
      if (focusLocation.stationName && focusLocation.stationName.includes('Budhigandaki')) {
        const marker = markersMapRef.current['river-120'];
        if (marker) marker.openPopup();
      }
    });
  }, [focusLocation, isMapReady]);

  // Handle focusZoneId changes to zoom into flood hazard risk zone safely
  useEffect(() => {
    if (!isMapReady || !focusZoneId) return;
    if (prevZoneIdRef.current === focusZoneId) return;
    prevZoneIdRef.current = focusZoneId;

    const targetZone = FLOOD_HAZARD_ZONES.find((z) => z.id === focusZoneId);
    if (
      targetZone &&
      Number.isFinite(targetZone.center[0]) &&
      Number.isFinite(targetZone.center[1])
    ) {
      safeNavigateMap(targetZone.center[0], targetZone.center[1], 10, () => {
        const polygon = polygonsMapRef.current[targetZone.id];
        if (polygon) polygon.openPopup();
      });
    }
  }, [focusZoneId, isMapReady]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Interactive Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border-b border-slate-200 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-600 font-semibold mr-1">Layer:</span>
          {(
            [
              { id: 'all', label: 'All Telemetry' },
              { id: 'hazards', label: 'Flood Risk Zones' },
              { id: 'rivers', label: 'River Gauges' },
              { id: 'cities', label: 'Cities' },
              { id: 'mountains', label: 'Mountains' },
              { id: 'trekking', label: 'Trekking' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveLayer(item.id)}
              className={`px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
                activeLayer === item.id
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Overlay hazard zones toggle */}
          <button
            onClick={() => setShowHazardPolygons((prev) => !prev)}
            className={`px-2.5 py-1 font-semibold rounded-lg border text-xs cursor-pointer transition-colors ${
              showHazardPolygons
                ? 'bg-red-50 text-red-700 border-red-300 font-bold'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {showHazardPolygons ? 'Inundation Polygons (Active)' : '+ Show Risk Polygons'}
          </button>

          {/* Quick Danger Alert Button on map bar */}
          <button
            onClick={() => {
              safeNavigateMap(28.04, 84.81, 10, () => {
                const m = markersMapRef.current['river-120'];
                if (m) m.openPopup();
              });
            }}
            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs text-xs"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Budhigandaki Danger (8.85m)</span>
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative w-full h-[460px] bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full" />
        {!isMapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-500 text-xs font-medium">
            Loading interactive Nepal weather and flood hazard map...
          </div>
        )}
      </div>

      {/* Flood Hazard Map Inundation Legend */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-medium text-slate-700">
          <span className="font-bold text-slate-900">Hazard Map Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-red-500/40 border border-red-600 inline-block" />
            <span>Zone 1: Active Danger Inundation (Budhigandaki)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-orange-500/40 border border-orange-600 inline-block" />
            <span>Zone 2: Warning Flood Corridor (Bagmati, Narayani)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-yellow-500/40 border border-yellow-600 inline-block" />
            <span>Zone 3: Floodplain Watch (Koshi, Rapti)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping inline-block" />
            <span className="font-bold text-red-600">Pulsing Gauge Beacon</span>
          </span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          Model: DHM 2026 Telemetry & Flood Inundation GIS
        </div>
      </div>
    </div>
  );
}
