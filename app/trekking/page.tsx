'use client';

import { useState } from 'react';
import { TREKKING_STATIONS, TrekkingStation } from '@/lib/dhm-data';
import {
  Compass,
  Wind,
  Droplets,
  CloudRain,
  AlertTriangle,
  CheckCircle2,
  PhoneCall,
  ShieldCheck,
} from 'lucide-react';

export default function TrekkingPage() {
  const [selectedCorridor, setSelectedCorridor] = useState<string>('all');

  const corridors = ['all', 'Everest / Khumbu', 'Annapurna Circuit', 'Langtang Valley', 'Manaslu Circuit'];

  const filteredStations = selectedCorridor === 'all'
    ? TREKKING_STATIONS
    : TREKKING_STATIONS.filter((s) => s.corridor.toLowerCase() === selectedCorridor.toLowerCase());

  return (
    <div className="w-full pb-16 space-y-8">
      {/* Friendly Clean Header */}
      <section className="bg-white border-b border-slate-200/90 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold mb-2">
            <Compass className="w-4 h-4" />
            <span>NEPAL TREKKING TRAILS & PASSES</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            High-Altitude Trekking Weather & Passes
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-3xl leading-relaxed">
            Live weather conditions and trail statuses across Everest Base Camp, Annapurna Circuit, Thorong La Pass, Langtang, and Manaslu corridors.
          </p>

          {/* Corridor Filter Buttons */}
          <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {corridors.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCorridor(c)}
                className={`px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCorridor.toLowerCase() === c.toLowerCase()
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {c === 'all' ? 'All Trekking Corridors' : c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Stations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStations.map((station) => {
            const isCaution = station.trailStatus.includes('Caution');

            return (
              <div
                key={station.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-[11px] font-semibold text-emerald-600">
                        {station.corridor}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                        {station.name}
                      </h3>
                    </div>
                    <div className="font-extrabold text-xs text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100">
                      {station.elevation} m
                    </div>
                  </div>

                  {/* Status Banner */}
                  <div
                    className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 mb-4 font-semibold ${
                      isCaution
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}
                  >
                    {isCaution ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <span>{station.trailStatus}</span>
                  </div>

                  {/* Sensor Measurements */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="text-slate-500 text-[11px]">Temperature</div>
                      <div
                        className={`text-lg font-black mt-0.5 ${
                          station.currentTemp < 0 ? 'text-sky-600' : 'text-slate-900'
                        }`}
                      >
                        {station.currentTemp}°C
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="text-slate-500 text-[11px]">Wind Velocity</div>
                      <div className="text-lg font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                        <Wind className="w-4 h-4 text-sky-500" />
                        {station.windSpeedMs} m/s
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="text-slate-500 text-[11px]">Humidity</div>
                      <div className="text-lg font-bold text-sky-600 mt-0.5 flex items-center gap-1">
                        <Droplets className="w-4 h-4 text-sky-500" />
                        {station.relativeHumidity}%
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="text-slate-500 text-[11px]">24h Rain</div>
                      <div className="text-lg font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                        <CloudRain className="w-4 h-4 text-sky-500" />
                        {station.rainfall24h} mm
                      </div>
                    </div>
                  </div>

                  {/* Advisory Text */}
                  <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                    <strong className="text-slate-800 block text-[11px] mb-1">
                      Trail Advisory:
                    </strong>
                    {station.advisory}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trail Rescue & Safety Information */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-4">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>High Pass Safety & Emergency Contacts</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600">
            <div>
              <h4 className="font-bold text-slate-900 mb-1.5">Thorong La Pass (5,416m)</h4>
              <p className="leading-relaxed">
                Cross early before 09:00 AM. Afternoon winds across the col frequently exceed 25 knots due to strong canyon updrafts.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-1.5">Altitude Acclimatization</h4>
              <p className="leading-relaxed">
                Ascend conservatively above 3,000m. Acclimatization rest days at Namche Bazaar (3,440m) and Manang (3,540m) prevent acute mountain sickness.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4 text-amber-600" />
                <span>Emergency Helo SAR Contacts</span>
              </h4>
              <div className="space-y-1">
                <div>Himalayan Rescue Association: <strong>+977-1-4440292</strong></div>
                <div>Tourist Police Emergency: <strong>1144</strong></div>
                <div>Nepal Flood Emergency Hotline: <strong>1155</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
