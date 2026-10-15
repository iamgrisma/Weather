'use client';

import { useState } from 'react';
import { MOUNTAIN_SECTORS, MountainSector } from '@/lib/dhm-data';
import {
  Mountain,
  Wind,
  Compass,
  AlertTriangle,
  ThermometerSnowflake,
  ShieldCheck,
  ArrowUp,
  Activity,
  Layers,
} from 'lucide-react';

export default function MountainsPage() {
  const [selectedSector, setSelectedSector] = useState<MountainSector>(MOUNTAIN_SECTORS[0]);

  return (
    <div className="w-full pb-16 space-y-8">
      {/* Friendly Clean Header */}
      <section className="bg-white border-b border-slate-200/90 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-sky-600 font-semibold mb-2">
            <Mountain className="w-4 h-4" />
            <span>HIMALAYAN PEAKS & EXPEDITIONS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Himalayan Summit Weather & High Winds
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-3xl leading-relaxed">
            Real-time temperatures, wind speeds, and wind chill indices for Mt. Everest, Annapurna, Manaslu, and major Himalayan peaks from lower base camps up to 9,000m summits.
          </p>

          {/* Clean Sector Buttons */}
          <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {MOUNTAIN_SECTORS.map((sector) => {
              const isSelected = selectedSector.id === sector.id;
              return (
                <button
                  key={sector.id}
                  onClick={() => setSelectedSector(sector)}
                  className={`px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Mountain className="w-3.5 h-3.5" />
                  <span>{sector.sectorName}</span>
                  {sector.hazardAlert && (
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse ml-0.5" title="Active High Wind Alert" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Selected Mountain Range Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase">
                {selectedSector.provinceName}
              </div>
              <h2 className="text-2xl font-black text-slate-900 mt-0.5">
                {selectedSector.sectorName}
              </h2>
              <div className="text-xs text-slate-600 mt-1">
                Highest Summit: <strong className="text-slate-900">{selectedSector.highestPeak} ({selectedSector.elevationM}m)</strong>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs max-w-md">
              <span className="font-semibold text-slate-700 block mb-1">Major Peaks Monitored:</span>
              <div className="flex flex-wrap gap-1.5 text-sky-700 font-medium">
                {selectedSector.primaryPeaks.join(' · ')}
              </div>
            </div>
          </div>

          {selectedSector.hazardAlert && (
            <div className="my-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Summit Wind Advisory:</strong>
                <p className="mt-0.5 text-amber-900/80">{selectedSector.hazardAlert}</p>
              </div>
            </div>
          )}

          {/* 4 Altitude Tiers Grid */}
          <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Altitude Temperature & Wind Profile
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {selectedSector.altitudeBands.map((band) => {
                const isDeathZone = band.altitude === 9000;
                const isHighCamp = band.altitude === 7000;

                return (
                  <div
                    key={band.altitude}
                    className={`p-4 rounded-xl border transition-all ${
                      isDeathZone
                        ? 'bg-red-50/50 border-red-200'
                        : isHighCamp
                        ? 'bg-amber-50/50 border-amber-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 mb-3">
                      <div className="font-extrabold text-slate-900 text-sm">
                        {band.altitude} meters
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          isDeathZone ? 'text-red-600' : isHighCamp ? 'text-amber-600' : 'text-sky-600'
                        }`}
                      >
                        {isDeathZone ? 'Death Zone' : isHighCamp ? 'High Camp' : band.altitude === 5500 ? 'Base Camp' : 'Approach'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mb-3">
                      {band.label}
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-baseline justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-500">Air Temperature:</span>
                        <strong className={`text-base font-extrabold ${band.tempCelsius < -10 ? 'text-red-600' : 'text-sky-600'}`}>
                          {band.tempCelsius}°C
                        </strong>
                      </div>

                      <div className="flex items-baseline justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-500">Wind Chill:</span>
                        <strong className="font-bold text-red-600">
                          {band.windChillCelsius}°C
                        </strong>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Wind Speed:</span>
                          <strong className="font-bold text-slate-900">{band.windSpeedKnots} knots</strong>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Compass Direction:</span>
                          <span className="font-semibold text-slate-700">{band.windDirectionDeg}° (West)</span>
                        </div>
                      </div>

                      <div className="pt-2 text-[11px] text-slate-600 italic">
                        {band.condition}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Helpful Safety Guidelines */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h4 className="font-bold text-slate-900 text-sm mb-2">High Altitude Wind Chill</h4>
            <p className="text-slate-500 leading-relaxed">
              At summits above 8,000m, wind speeds over 30 knots drastically accelerate frostbite danger. Summit teams target wind speeds below 20 knots.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h4 className="font-bold text-slate-900 text-sm mb-2">Subtropical Jet Stream</h4>
            <p className="text-slate-500 leading-relaxed">
              Autumn and winter bring upper westerly jet stream currents over the Himalayas. Clear morning windows usually offer the best visibility.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h4 className="font-bold text-slate-900 text-sm mb-2">Helicopter Rescue Window</h4>
            <p className="text-slate-500 leading-relaxed">
              Mountain airstrips at Lukla (Khumbu) and Jomsom (Mustang) typically operate safe flight operations before 11:00 AM before afternoon valley winds pick up.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
