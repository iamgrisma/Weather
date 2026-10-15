'use client';

import { useState } from 'react';
import { RADAR_FEEDS } from '@/lib/dhm-data';
import { Info, CloudRain, AlertTriangle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export interface DbzLevel {
  range: string;
  minDbz: number;
  maxDbz: number;
  colorHex: string;
  bgTailwind: string;
  textTailwind: string;
  borderTailwind: string;
  intensityLabel: string;
  rainRate: string;
  description: string;
  hazardRisk: 'None' | 'Minimal' | 'Moderate' | 'High' | 'Severe' | 'Extreme';
}

export const RADAR_DBZ_LEVELS: DbzLevel[] = [
  {
    range: '< 10 dBZ',
    minDbz: 0,
    maxDbz: 10,
    colorHex: '#38bdf8',
    bgTailwind: 'bg-sky-100',
    textTailwind: 'text-sky-800',
    borderTailwind: 'border-sky-300',
    intensityLabel: 'Cloud Droplets & Mist',
    rainRate: '< 0.25 mm/h',
    description: 'Precipitation barely reaching ground (virga), mountain mist, or dense fog.',
    hazardRisk: 'None',
  },
  {
    range: '10 – 20 dBZ',
    minDbz: 10,
    maxDbz: 20,
    colorHex: '#10b981',
    bgTailwind: 'bg-emerald-100',
    textTailwind: 'text-emerald-800',
    borderTailwind: 'border-emerald-300',
    intensityLabel: 'Light Rain / Drizzle',
    rainRate: '0.25 – 1.2 mm/h',
    description: 'Steady light drizzle or dampening mountain showers. Minimal soil runoff.',
    hazardRisk: 'Minimal',
  },
  {
    range: '20 – 30 dBZ',
    minDbz: 20,
    maxDbz: 30,
    colorHex: '#84cc16',
    bgTailwind: 'bg-lime-100',
    textTailwind: 'text-lime-800',
    borderTailwind: 'border-lime-300',
    intensityLabel: 'Moderate Rain',
    rainRate: '1.2 – 4.5 mm/h',
    description: 'Noticeable soaking rain. Standard monsoon and post-monsoon precipitation bands.',
    hazardRisk: 'Moderate',
  },
  {
    range: '30 – 40 dBZ',
    minDbz: 30,
    maxDbz: 40,
    colorHex: '#eab308',
    bgTailwind: 'bg-amber-100',
    textTailwind: 'text-amber-800',
    borderTailwind: 'border-amber-300',
    intensityLabel: 'Moderate-to-Heavy Rain',
    rainRate: '4.5 – 15.0 mm/h',
    description: 'Significant downpour. Can initiate urban street pooling and minor stream swells.',
    hazardRisk: 'Moderate',
  },
  {
    range: '40 – 50 dBZ',
    minDbz: 40,
    maxDbz: 50,
    colorHex: '#f97316',
    bgTailwind: 'bg-orange-100',
    textTailwind: 'text-orange-800',
    borderTailwind: 'border-orange-300',
    intensityLabel: 'Heavy Rain & Thunderstorms',
    rainRate: '15.0 – 35.0 mm/h',
    description: 'Intense thunderstorm core with potential squall line. Rapid tributary rise and hill slope mud movement.',
    hazardRisk: 'High',
  },
  {
    range: '50 – 60 dBZ',
    minDbz: 50,
    maxDbz: 60,
    colorHex: '#ef4444',
    bgTailwind: 'bg-red-100',
    textTailwind: 'text-red-800',
    borderTailwind: 'border-red-300',
    intensityLabel: 'Very Heavy / Severe Hail',
    rainRate: '35.0 – 75.0 mm/h',
    description: 'Violent convective cell. High probability of damaging hail and sudden flash flooding.',
    hazardRisk: 'Severe',
  },
  {
    range: '> 60 dBZ',
    minDbz: 60,
    maxDbz: 80,
    colorHex: '#a855f7',
    bgTailwind: 'bg-purple-100',
    textTailwind: 'text-purple-800',
    borderTailwind: 'border-purple-300',
    intensityLabel: 'Extreme Cloudburst / Violent Hail',
    rainRate: '> 75.0 mm/h',
    description: 'Catastrophic cloudburst storm. Extreme danger of debris flows, landslides, and riverbank collapse.',
    hazardRisk: 'Extreme',
  },
];

export function getDbzLevel(dbz: number): DbzLevel {
  if (dbz < 10) return RADAR_DBZ_LEVELS[0];
  if (dbz < 20) return RADAR_DBZ_LEVELS[1];
  if (dbz < 30) return RADAR_DBZ_LEVELS[2];
  if (dbz < 40) return RADAR_DBZ_LEVELS[3];
  if (dbz < 50) return RADAR_DBZ_LEVELS[4];
  if (dbz < 60) return RADAR_DBZ_LEVELS[5];
  return RADAR_DBZ_LEVELS[6];
}

interface RadarLegendKeyProps {
  compact?: boolean;
}

export default function RadarLegendKey({ compact = false }: RadarLegendKeyProps) {
  const [selectedLevel, setSelectedLevel] = useState<DbzLevel | null>(null);
  const [showScientificNote, setShowScientificNote] = useState(false);

  if (compact) {
    return (
      <div className="bg-white/95 backdrop-blur-xs p-2.5 rounded-xl border border-slate-200 shadow-md text-xs space-y-1.5 max-w-xs">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            Radar Echo (dBZ)
          </span>
          <span className="text-[10px] text-slate-400 font-mono">DHM C-Band</span>
        </div>

        {/* Color Spectrum Bar */}
        <div className="grid grid-cols-7 h-2.5 rounded-sm overflow-hidden border border-slate-200">
          {RADAR_DBZ_LEVELS.map((level) => (
            <div
              key={level.range}
              style={{ backgroundColor: level.colorHex }}
              title={`${level.range}: ${level.intensityLabel} (${level.rainRate})`}
              className="h-full hover:opacity-80 transition-opacity cursor-pointer"
              onClick={() => setSelectedLevel(selectedLevel?.range === level.range ? null : level)}
            />
          ))}
        </div>

        {/* Scale labels */}
        <div className="flex justify-between text-[9px] text-slate-500 font-mono px-0.5">
          <span>&lt;10</span>
          <span>20</span>
          <span>30</span>
          <span>40</span>
          <span>50</span>
          <span>60+</span>
        </div>

        {selectedLevel && (
          <div className="pt-1.5 border-t border-slate-100 text-[10px] space-y-0.5 animate-fadeIn">
            <div className="font-bold flex items-center justify-between">
              <span className={selectedLevel.textTailwind}>{selectedLevel.range}: {selectedLevel.intensityLabel}</span>
              <span className="font-mono text-slate-600">{selectedLevel.rainRate}</span>
            </div>
            <div className="text-slate-500 text-[9px] line-clamp-2">{selectedLevel.description}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="text-xs font-bold text-sky-600 uppercase tracking-wider flex items-center gap-1.5">
            <CloudRain className="w-4 h-4" />
            <span>#RadarReflectivity #dBZScale #MeteorologicalKey</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">
            Doppler Radar Echo Intensity Scale (dBZ)
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Understanding logarithmic radar reflectivity factors (dBZ) to interpret rainfall rate, storm convection, and cloudburst hazard threats.
          </p>
        </div>

        <button
          onClick={() => setShowScientificNote(!showScientificNote)}
          className="text-xs font-semibold text-slate-600 hover:text-sky-600 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>What is dBZ?</span>
          {showScientificNote ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Explanatory Callout if toggled */}
      {showScientificNote && (
        <div className="p-3.5 bg-sky-50/80 border border-sky-200 rounded-xl text-xs text-slate-700 space-y-2 animate-fadeIn">
          <div className="font-bold text-sky-900 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Scientific Definition: Radar Reflectivity Factor (dBZ)</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            <strong>dBZ</strong> stands for <em>decibels relative to Z</em>, where <strong>Z</strong> represents the energy reflected back to the radar antenna proportional to the 6th power of droplet diameter (∑D⁶). Because droplet volumes vary exponentially, a logarithmic decibel scale is utilized by DHM and the World Meteorological Organization (WMO). Higher values correspond to denser, larger precipitation drops or hail cores.
          </p>
        </div>
      )}

      {/* Color Spectrum Continuous Ramp */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800">Precipitation Intensity Gradient:</span>
          <span className="text-[11px] text-slate-500 font-mono">DHM Operational Standards</span>
        </div>

        <div className="h-4 rounded-lg overflow-hidden flex shadow-2xs border border-slate-200">
          {RADAR_DBZ_LEVELS.map((level) => (
            <div
              key={level.range}
              style={{ backgroundColor: level.colorHex }}
              className="flex-1 h-full cursor-pointer hover:opacity-85 transition-opacity"
              title={`${level.range}: ${level.intensityLabel} (${level.rainRate})`}
              onClick={() => setSelectedLevel(selectedLevel?.range === level.range ? null : level)}
            />
          ))}
        </div>

        <div className="flex justify-between text-[11px] font-mono text-slate-500 px-1">
          <span>&lt;10 dBZ (Mist)</span>
          <span>25 dBZ (Rain)</span>
          <span>45 dBZ (Heavy)</span>
          <span>&gt;60 dBZ (Severe)</span>
        </div>
      </div>

      {/* Grid of All dBZ Intensity Levels with Rich Descriptions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 text-xs">
        {RADAR_DBZ_LEVELS.map((level) => {
          const isSelected = selectedLevel?.range === level.range;
          return (
            <div
              key={level.range}
              onClick={() => setSelectedLevel(isSelected ? null : level)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-sky-500 bg-sky-50/50 border-sky-400 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  style={{ backgroundColor: level.colorHex }}
                  className="w-3.5 h-3.5 rounded-full inline-block shadow-2xs"
                />
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  {level.range}
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                    level.hazardRisk === 'None' || level.hazardRisk === 'Minimal'
                      ? 'bg-slate-200 text-slate-700'
                      : level.hazardRisk === 'Moderate'
                      ? 'bg-amber-100 text-amber-800'
                      : level.hazardRisk === 'High'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-red-100 text-red-800 animate-pulse'
                  }`}
                >
                  {level.hazardRisk} Risk
                </span>
              </div>

              <div className="font-bold text-slate-900 text-sm">{level.intensityLabel}</div>
              <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                Est. Rate: <strong className="text-slate-800">{level.rainRate}</strong>
              </div>

              <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                {level.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Current Real-Time Live Radar Readings Across Nepal */}
      <div className="pt-3 border-t border-slate-100 space-y-2">
        <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
          <span>Active Nepal Doppler Radar Readings (Live Scan Values):</span>
          <span className="text-[11px] text-slate-500">Updated every 10 min</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
          {RADAR_FEEDS.map((radar) => {
            const level = getDbzLevel(radar.reflectivityDbzMax);
            return (
              <div
                key={radar.name}
                className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between shadow-2xs"
              >
                <div>
                  <div className="font-bold text-slate-800 text-[11px] truncate max-w-[150px]">
                    {radar.name.replace(' Doppler Weather Radar', '')}
                  </div>
                  <div className="text-[10px] text-slate-500">{level.intensityLabel}</div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 font-mono font-black text-sm">
                    <span
                      style={{ backgroundColor: level.colorHex }}
                      className="w-2.5 h-2.5 rounded-full inline-block"
                    />
                    <span>{radar.reflectivityDbzMax} dBZ</span>
                  </div>
                  <div className="text-[9px] text-slate-400">{radar.lastScanTime.split(' ')[1]}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
