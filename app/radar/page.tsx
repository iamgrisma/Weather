'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { RADAR_FEEDS } from '@/lib/dhm-data';
import RadarLegendKey, { getDbzLevel } from '@/components/RadarLegendKey';
import { Radio, ExternalLink, Activity, MapPin, Eye, ShieldCheck, CloudRain } from 'lucide-react';

const RadarMap = dynamic(() => import('@/components/RadarMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] bg-slate-100 flex items-center justify-center text-xs text-slate-500 font-mono animate-pulse">
      Initialising Doppler Radar Leaflet Layers...
    </div>
  ),
});

export default function RadarPage() {
  const [showMap, setShowMap] = useState(false);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="text-xs font-bold text-sky-600 tracking-wider uppercase mb-1">
          #DopplerRadar #ReflectivityScans #StormTracking
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Doppler Weather Radar Network
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Four C-Band polarimetric Doppler radars monitoring precipitation echoes, storm cell convection, and cloudburst threats in real time across Nepal.
        </p>
      </div>

      {/* On-Demand Radar Map Section (Zero Performance Hamper on Initial Load) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <div>
            <div className="text-xs font-bold text-sky-700 uppercase tracking-wider">
              Geospatial Doppler Radar Coverage
            </div>
            <div className="text-sm font-extrabold text-slate-900">
              Interactive 200km–250km Radar Sweep Zones
            </div>
          </div>

          {!showMap ? (
            <button
              onClick={() => setShowMap(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0"
            >
              <Eye className="w-4 h-4" />
              <span>Load Interactive Radar Map</span>
            </button>
          ) : (
            <div className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Map Active (4 Radars Online)</span>
            </div>
          )}
        </div>

        <div className="relative min-h-[420px] bg-slate-100 flex items-center justify-center">
          {showMap ? (
            <RadarMap />
          ) : (
            <div className="text-center p-8 max-w-md space-y-3">
              <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mx-auto">
                <Radio className="w-6 h-6 text-sky-600" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">
                Fast-Load Preview: Interactive Radar Radii
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Click below to render OpenStreetMap client-side with 200km and 250km radar sweep boundaries for Pokhara, Kohalpur, Surkhet, and Dharan.
              </p>
              <button
                onClick={() => setShowMap(true)}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                <span>Render Radar Map</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Color-Coded Reflectivity Legend / Key Component (dBZ Scale) */}
      <RadarLegendKey />

      {/* Radars Operational Status & Reflectivity Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">4 Operational Doppler Stations</h2>
            <p className="text-xs text-slate-500">Live C-band echoes, scanning radii, and current maximum reflectivity dBZ</p>
          </div>
          <div className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
            4 / 4 Radars Operational
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {RADAR_FEEDS.map((radar) => {
            const dbzLevel = getDbzLevel(radar.reflectivityDbzMax);

            return (
              <div
                key={radar.name}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>ONLINE · ACTIVE SWEEP</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">{radar.name}</h2>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {radar.location} · Elevation {radar.elevation}
                    </div>
                  </div>

                  {/* dBZ Intensity Badge */}
                  <div className="text-right">
                    <span
                      style={{ backgroundColor: dbzLevel.colorHex }}
                      className="inline-flex items-center gap-1 text-white font-black text-xs px-2.5 py-1 rounded-lg shadow-2xs"
                    >
                      <span>{radar.reflectivityDbzMax} dBZ</span>
                    </span>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-bold">
                      {dbzLevel.intensityLabel.split('/')[0]}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Echo Reflectivity:</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        style={{ backgroundColor: dbzLevel.colorHex }}
                        className="w-2.5 h-2.5 rounded-full inline-block"
                      />
                      <strong className="text-slate-900 font-bold">{radar.reflectivityDbzMax} dBZ</strong>
                      <span className="text-slate-500 font-medium">({dbzLevel.rainRate})</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Radar Frequency:</span>
                    <strong className="text-slate-800">{radar.frequency}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sweep Interval:</span>
                    <strong className="text-slate-800">{radar.sweepInterval}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Coverage Corridor:</span>
                    <span className="text-slate-700 text-right max-w-[220px]">{radar.coverage}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-[11px] text-slate-400">
                    <span>Last Sweep Recorded:</span>
                    <span className="font-mono">{radar.lastScanTime}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
