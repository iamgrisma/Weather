'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { RADAR_FEEDS } from '@/lib/dhm-data';
import RadarLegendKey, { getDbzLevel } from '@/components/RadarLegendKey';
import { Eye, Layers, X } from 'lucide-react';

export default function RadarMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const [showOnMapLegend, setShowOnMapLegend] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = (await import('leaflet')).default;

      if (!isMounted || !mapContainerRef.current) return;

      // Initialize map centered over Nepal
      const map = L.map(mapContainerRef.current, {
        center: [28.25, 84.15],
        zoom: 7,
        minZoom: 6,
        maxZoom: 12,
        scrollWheelZoom: true,
      });

      mapInstanceRef.current = map;

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      setTimeout(() => {
        if (map && isMounted) {
          try {
            map.invalidateSize();
          } catch {
            // ignore
          }
        }
      }, 250);

      // Radar Coordinates
      const radarLocations: Record<string, [number, number, number]> = {
        'Pokhara Doppler Weather Radar': [28.19, 83.98, 200000], // 200km radius
        'Kohalpur Doppler Weather Radar': [28.19, 81.69, 250000], // 250km radius
        'Surkhet Doppler Weather Radar': [28.60, 81.63, 200000],  // 200km radius
        'Dharan Doppler Weather Radar': [26.88, 87.31, 250000],   // 250km radius
      };

      RADAR_FEEDS.forEach((radar) => {
        const loc = radarLocations[radar.name];
        if (!loc) return;

        const [lat, lng, radiusMeters] = loc;
        const dbzLevel = getDbzLevel(radar.reflectivityDbzMax);

        // Radar Range Circle with color corresponding to dBZ level
        L.circle([lat, lng], {
          radius: radiusMeters,
          color: dbzLevel.colorHex,
          fillColor: dbzLevel.colorHex,
          fillOpacity: 0.12,
          weight: 2,
          dashArray: '5, 5',
        }).addTo(map);

        // Inner Core Convective Sweep (50km)
        L.circle([lat, lng], {
          radius: 50000,
          color: dbzLevel.colorHex,
          fillColor: dbzLevel.colorHex,
          fillOpacity: 0.22,
          weight: 1.5,
        }).addTo(map);

        // Radar Station Marker Icon with color badge
        const dishIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;">
              <span style="position:absolute;width:34px;height:34px;border-radius:9999px;background-color:${dbzLevel.colorHex}44;animation:ping 2.2s cubic-bezier(0,0,0.2,1) infinite;"></span>
              <div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;background-color:${dbzLevel.colorHex};color:#ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid #ffffff;z-index:10;cursor:pointer;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>
              </div>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          popupAnchor: [0, -17],
        });

        const marker = L.marker([lat, lng], { icon: dishIcon });

        marker.bindPopup(`
          <div style="font-family:inherit;padding:4px;min-width:230px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <span style="font-size:10px;font-weight:800;color:#0284c7;text-transform:uppercase;">
                ● ONLINE · ACTIVE SWEEP
              </span>
              <span style="font-size:10px;font-weight:900;background:${dbzLevel.colorHex};color:#ffffff;padding:2px 6px;border-radius:4px;">
                ${radar.reflectivityDbzMax} dBZ
              </span>
            </div>

            <h4 style="margin:2px 0 4px;font-size:14px;font-weight:800;color:#0f172a;">${radar.name}</h4>
            <div style="font-size:11px;color:#64748b;margin-bottom:6px;">${radar.location} · Elevation ${radar.elevation}</div>
            
            <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:6px 8px;border-radius:8px;font-size:11px;line-height:1.4;">
              <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
                <span style="color:#64748b;">Reflectivity Echo:</span>
                <strong style="color:${dbzLevel.colorHex};">${radar.reflectivityDbzMax} dBZ (${dbzLevel.intensityLabel})</strong>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
                <span style="color:#64748b;">Precipitation Rate:</span>
                <span style="font-weight:700;color:#334155;">${dbzLevel.rainRate}</span>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
                <span style="color:#64748b;">Frequency:</span>
                <strong style="color:#334155;">${radar.frequency}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;">
                <span style="color:#64748b;">Sweep Range:</span>
                <span style="color:#334155;">${Math.round(radiusMeters / 1000)} km radius</span>
              </div>
            </div>
          </div>
        `);

        marker.addTo(map);
      });
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

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full min-h-[460px]" />

      {/* On-Map Floating dBZ Legend Key Overlay */}
      <div className="absolute top-3 right-3 z-1000">
        {showOnMapLegend ? (
          <div className="relative">
            <button
              onClick={() => setShowOnMapLegend(false)}
              className="absolute -top-2 -right-2 w-5 h-5 bg-slate-800 text-white rounded-full flex items-center justify-center hover:bg-slate-700 shadow-md cursor-pointer z-10"
              title="Minimize Legend"
            >
              <X className="w-3 h-3" />
            </button>
            <RadarLegendKey compact={true} />
          </div>
        ) : (
          <button
            onClick={() => setShowOnMapLegend(true)}
            className="bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-xl border border-slate-300 shadow-md text-xs font-bold text-slate-700 hover:text-sky-600 flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-sky-600" />
            <span>dBZ Legend</span>
          </button>
        )}
      </div>
    </div>
  );
}
