'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  RIVER_STATIONS,
  RiverStation,
  generateHistoricalTimeSeries,
  computeRiverTrendForecast,
} from '@/lib/dhm-data';
import FloodNotificationManager from '@/components/FloodNotificationManager';
import River7DayTrendChart from '@/components/River7DayTrendChart';
import {
  Waves,
  Search,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  BarChart3,
  Activity,
  CheckCircle2,
} from 'lucide-react';

export default function HydrologyPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBasin, setSelectedBasin] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  // Default to the critical danger station (Budhigandaki River at Arughat)
  const [activeSeriesStation, setActiveSeriesStation] = useState<RiverStation>(() => {
    return RIVER_STATIONS.find((r) => r.waterLevel >= r.danger_level) || RIVER_STATIONS[0];
  });
  // Live simulated water level for testing conditionality
  const [simulatedLevel, setSimulatedLevel] = useState<number | null>(null);
  const [chartView, setChartView] = useState<'recharts-7d' | 'rapid-48h'>('recharts-7d');

  const currentLevel = simulatedLevel !== null ? simulatedLevel : activeSeriesStation.waterLevel;
  const isDangerActive = currentLevel >= activeSeriesStation.danger_level;
  const isWarningActive = !isDangerActive && currentLevel >= activeSeriesStation.warning_level;

  // Filtered and dynamically sorted river list: ongoing danger/warning activity FIRST!
  const filteredRivers = useMemo(() => {
    const list = RIVER_STATIONS.filter((river) => {
      const matchesSearch =
        river.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        river.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        river.stationIndex.includes(searchTerm);

      const matchesBasin =
        selectedBasin === 'all' || river.basin.toLowerCase() === selectedBasin.toLowerCase();

      const isWarning = river.waterLevel >= river.warning_level && river.waterLevel < river.danger_level;
      const isDanger = river.waterLevel >= river.danger_level;
      const isNormal = !isWarning && !isDanger;

      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'danger' && isDanger) ||
        (selectedStatus === 'warning' && isWarning) ||
        (selectedStatus === 'normal' && isNormal) ||
        (selectedStatus === 'rising' && river.steady === 'RISING');

      return matchesSearch && matchesBasin && matchesStatus;
    });

    // Ongoing activity / non-normal changes prioritized to top: DANGER (1000) > WARNING (500) > RISING (100) > NORMAL (0)
    return list.sort((a, b) => {
      const aScore = (a.waterLevel >= a.danger_level ? 1000 : 0) + (a.waterLevel >= a.warning_level ? 500 : 0) + (a.steady === 'RISING' ? 100 : 0);
      const bScore = (b.waterLevel >= b.danger_level ? 1000 : 0) + (b.waterLevel >= b.warning_level ? 500 : 0) + (b.steady === 'RISING' ? 100 : 0);
      return bScore - aScore;
    });
  }, [searchTerm, selectedBasin, selectedStatus]);

  // Historical time series data
  const timeSeriesData = useMemo(() => {
    return generateHistoricalTimeSeries(
      activeSeriesStation.series_id,
      activeSeriesStation.waterLevel,
      activeSeriesStation.warning_level,
      activeSeriesStation.danger_level,
      2
    );
  }, [activeSeriesStation]);

  const svgChart = useMemo(() => {
    const data = timeSeriesData.data;
    if (!data.length) return { points: '', minVal: 0, maxVal: 10, yWarning: 50, yDanger: 30 };

    const values = data.map((d) => d.value);
    const minVal = Math.min(...values, 0);
    const maxVal = Math.max(...values, timeSeriesData.danger_level * 1.15);

    const width = 800;
    const height = 220;
    const padding = 20;

    const points = data
      .map((d, i) => {
        const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((d.value - minVal) / (maxVal - minVal)) * (height - 2 * padding);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const yWarning = Number(
      (height - padding - ((timeSeriesData.warning_level - minVal) / (maxVal - minVal)) * (height - 2 * padding)).toFixed(2)
    );
    const yDanger = Number(
      (height - padding - ((timeSeriesData.danger_level - minVal) / (maxVal - minVal)) * (height - 2 * padding)).toFixed(2)
    );

    return { points, minVal, maxVal, yWarning, yDanger, width, height };
  }, [timeSeriesData]);

  const basinsList = ['all', 'Bagmati', 'Koshi', 'Gandaki', 'Karnali', 'West Rapti', 'Mahakali'];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Clean Header with Hashtag Highlight Text (No Pills) */}
      <div className="border-b border-slate-200 pb-4">
        <div className="text-xs font-bold text-sky-600 tracking-wider uppercase mb-1">
          #RiverWatch #FloodAlert #Budhigandaki #Bagmati #Narayani #Koshi
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          River Water Levels & Flood Warning System
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Automated gauge telemetry for 336 rivers across Nepal. Looking for rain gauges? Check our dedicated{' '}
          <Link href="/rainfall" className="font-bold text-sky-600 underline">
            518 Rainfall Stations page →
          </Link>
        </p>
      </div>

      {/* Push Notification Manager Banner */}
      <FloodNotificationManager />

      {/* Selected River Hydrograph Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">
              {activeSeriesStation.basin} Basin · {activeSeriesStation.district}
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {activeSeriesStation.name}
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            {isDangerActive ? (
              <span className="text-xs font-black text-red-600 flex items-center gap-1.5 bg-red-100 px-3 py-1 rounded-lg">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>DANGER LEVEL EXCEEDED (+{(currentLevel - activeSeriesStation.danger_level).toFixed(2)}m)</span>
              </span>
            ) : isWarningActive ? (
              <span className="text-xs font-black text-amber-700 flex items-center gap-1.5 bg-amber-100 px-3 py-1 rounded-lg">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>WARNING LEVEL (+{(currentLevel - activeSeriesStation.warning_level).toFixed(2)}m)</span>
              </span>
            ) : (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 bg-emerald-100 px-3 py-1 rounded-lg">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Water Level Normal ({currentLevel}m &lt; {activeSeriesStation.warning_level}m)</span>
              </span>
            )}
          </div>
        </div>

        {/* Live Water Level Tester Slider (Proof of 100% Conditional Logic) */}
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Dynamic Level Tester:</span>
            <span className="text-slate-500 font-mono text-[11px]">
              (Slide to verify conditional danger/warning triggers & live 3h forecast)
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input
              type="range"
              min="1.0"
              max="13.0"
              step="0.05"
              value={currentLevel}
              onChange={(e) => setSimulatedLevel(parseFloat(e.target.value))}
              className="w-48 cursor-pointer accent-sky-600"
            />
            <span className="font-bold font-mono text-sm w-16 text-right">
              {currentLevel.toFixed(2)}m
            </span>
            {simulatedLevel !== null && (
              <button
                onClick={() => setSimulatedLevel(null)}
                className="text-[11px] text-sky-600 underline font-semibold hover:text-sky-800 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* 5 Stat Boxes (Including Trend Arrow & Short-Term 3h Forecast) */}
        {(() => {
          const activeTrend = computeRiverTrendForecast(activeSeriesStation, currentLevel);
          return (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="text-slate-500 font-medium">Live Water Height</div>
                <div className={`text-2xl font-black mt-1 ${isDangerActive ? 'text-red-600' : isWarningActive ? 'text-amber-600' : 'text-sky-600'}`}>
                  {currentLevel.toFixed(2)} m
                </div>
                <div className="text-slate-500 mt-0.5 font-semibold">Gauge: {activeSeriesStation.steady}</div>
              </div>

              {/* Trend & 3h Forecast percentage box */}
              <div className={`p-3 rounded-xl border ${
                activeTrend.riskAssessment === 'INTENSIFYING'
                  ? 'bg-red-50/80 border-red-200'
                  : activeTrend.riskAssessment === 'SUBSIDING'
                  ? 'bg-emerald-50/80 border-emerald-200'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-slate-500 font-medium">
                  <span>3h Forecast Trend</span>
                  {activeTrend.direction === 'RISING' ? (
                    <ArrowUpRight className="w-4 h-4 text-red-600" />
                  ) : activeTrend.direction === 'FALLING' ? (
                    <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Minus className="w-4 h-4 text-slate-500" />
                  )}
                </div>
                <div className={`text-xl font-black mt-1 ${
                  activeTrend.riskAssessment === 'INTENSIFYING'
                    ? 'text-red-600'
                    : activeTrend.riskAssessment === 'SUBSIDING'
                    ? 'text-emerald-700'
                    : 'text-slate-800'
                }`}>
                  {activeTrend.changePercent > 0 ? '+' : ''}{activeTrend.changePercent}%
                </div>
                <div className={`text-[10px] font-bold mt-0.5 ${
                  activeTrend.riskAssessment === 'INTENSIFYING'
                    ? 'text-red-700'
                    : activeTrend.riskAssessment === 'SUBSIDING'
                    ? 'text-emerald-700'
                    : 'text-slate-600'
                }`}>
                  {activeTrend.riskAssessment === 'INTENSIFYING'
                    ? 'Risk Intensifying'
                    : activeTrend.riskAssessment === 'SUBSIDING'
                    ? 'Risk Subsiding'
                    : 'Stable Flow'}
                  {' '}(Est. {activeTrend.projectedLevel}m)
                </div>
              </div>

              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-100">
                <div className="text-amber-800 font-medium">Warning Limit</div>
                <div className="text-2xl font-black text-amber-600 mt-1">{activeSeriesStation.warning_level} m</div>
                <div className="text-amber-700 mt-0.5">Caution threshold</div>
              </div>

              <div className="bg-red-50/70 p-3 rounded-xl border border-red-100">
                <div className="text-red-800 font-medium">Danger Limit</div>
                <div className="text-2xl font-black text-red-600 mt-1">{activeSeriesStation.danger_level} m</div>
                <div className="text-red-700 mt-0.5">Flood limit</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="text-slate-500 font-medium">Discharge Rate</div>
                <div className="text-xl font-bold text-slate-800 mt-1">
                  {activeSeriesStation.dischargeM3s ? `${activeSeriesStation.dischargeM3s} m³/s` : '180 m³/s'}
                </div>
                <div className="text-slate-500 mt-0.5">Automated sensor flow</div>
              </div>
            </div>
          );
        })()}

        {/* Hydrograph View Mode Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Telemetry Mode:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              <button
                onClick={() => setChartView('recharts-7d')}
                className={`px-3 py-1 rounded-md transition-colors font-semibold cursor-pointer flex items-center gap-1.5 ${
                  chartView === 'recharts-7d'
                    ? 'bg-white text-sky-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>7-Day Recharts Trend</span>
                <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded font-bold">Recommended</span>
              </button>
              <button
                onClick={() => setChartView('rapid-48h')}
                className={`px-3 py-1 rounded-md transition-colors font-semibold cursor-pointer flex items-center gap-1.5 ${
                  chartView === 'rapid-48h'
                    ? 'bg-white text-sky-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>48-Hour Rapid Curve</span>
              </button>
            </div>
          </div>
          <span className="text-[11px] text-slate-500">
            Interactive Recharts graph with threshold alarms & hourly resolution
          </span>
        </div>

        {chartView === 'recharts-7d' ? (
          <River7DayTrendChart
            station={activeSeriesStation}
            simulatedLevel={simulatedLevel}
          />
        ) : (
          /* Scalable 48-Hour Chart */
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div className="flex flex-wrap items-center justify-between text-xs mb-3 gap-2">
              <span className="font-bold text-slate-800">48-Hour Hydrograph Curve</span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-sky-600 font-semibold">• Live Water</span>
                <span className="text-amber-600 font-semibold">• Warning ({activeSeriesStation.warning_level}m)</span>
                <span className="text-red-600 font-semibold">• Danger ({activeSeriesStation.danger_level}m)</span>
              </div>
            </div>

            <svg
              viewBox={`0 0 ${svgChart.width} ${svgChart.height}`}
              className="w-full h-auto max-h-52 stroke-linecap-round stroke-linejoin-round"
            >
              <line x1="20" y1="20" x2="780" y2="20" stroke="#e2e8f0" strokeWidth="1" />
              <line x1="20" y1="80" x2="780" y2="80" stroke="#e2e8f0" strokeWidth="1" />
              <line x1="20" y1="140" x2="780" y2="140" stroke="#e2e8f0" strokeWidth="1" />
              <line x1="20" y1="200" x2="780" y2="200" stroke="#e2e8f0" strokeWidth="1" />

              <line
                x1="20"
                y1={svgChart.yDanger}
                x2="780"
                y2={svgChart.yDanger}
                stroke="#dc2626"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              <line
                x1="20"
                y1={svgChart.yWarning}
                x2="780"
                y2={svgChart.yWarning}
                stroke="#d97706"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              <polyline
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
                points={svgChart.points}
              />
            </svg>

            <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-medium">
              <span>-48 hours</span>
              <span>-24 hours</span>
              <span>Current ({activeSeriesStation.waterLevel}m)</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Controls (Clean Text Highlight Links, Zero Pill Badges) */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search river or district (e.g. Budhigandaki, Bagmati, Narayani)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-sky-500 shadow-2xs"
          />
        </div>

        {/* Clean Highlight Text Filter Links */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="text-slate-400 font-semibold">Basin:</span>
          {basinsList.map((basin) => (
            <button
              key={basin}
              onClick={() => setSelectedBasin(basin)}
              className={`font-semibold cursor-pointer transition-colors ${
                selectedBasin.toLowerCase() === basin.toLowerCase()
                  ? 'text-sky-600 underline font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              #{basin === 'all' ? 'AllBasins' : basin}
            </button>
          ))}
        </div>
      </div>

      {/* Rivers List (Cards with Trend Arrows & Short-Term Forecast Change) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filteredRivers.map((river) => {
          const isDanger = river.waterLevel >= river.danger_level;
          const isWarning = river.waterLevel >= river.warning_level && !isDanger;
          const isSelected = activeSeriesStation.id === river.id;
          const trend = computeRiverTrendForecast(river);

          return (
            <div
              key={river.id}
              onClick={() => {
                setActiveSeriesStation(river);
                window.scrollTo({ top: 80, behavior: 'smooth' });
              }}
              className={`bg-white border rounded-xl p-4 shadow-2xs transition-colors cursor-pointer flex flex-col justify-between ${
                isDanger
                  ? 'border-red-400 bg-red-50/30 ring-1 ring-red-300'
                  : isSelected
                  ? 'border-sky-500 ring-2 ring-sky-200'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{river.name}</h3>
                    <div className="text-[11px] text-slate-500">{river.basin} Basin · {river.district}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-xl font-black flex items-center justify-end gap-1 ${isDanger ? 'text-red-600' : 'text-sky-600'}`}>
                      {trend.direction === 'RISING' ? (
                        <ArrowUpRight className={`w-5 h-5 ${isDanger ? 'text-red-600 animate-pulse' : 'text-amber-600'}`} />
                      ) : trend.direction === 'FALLING' ? (
                        <ArrowDownRight className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Minus className="w-4 h-4 text-slate-400" />
                      )}
                      <span>{river.waterLevel} m</span>
                    </div>
                    <div className={`text-[10px] font-bold ${isDanger ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {isDanger ? 'Danger Limit Exceeded' : isWarning ? 'Warning' : 'Normal'}
                    </div>
                  </div>
                </div>

                {/* Short-Term Forecast Percentage Change Badge */}
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">3h Forecast:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                      trend.riskAssessment === 'INTENSIFYING'
                        ? 'bg-red-100 text-red-700 font-extrabold'
                        : trend.riskAssessment === 'SUBSIDING'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{trend.changePercent > 0 ? '+' : ''}{trend.changePercent}%</span>
                    <span>·</span>
                    <span>
                      {trend.riskAssessment === 'INTENSIFYING'
                        ? 'Intensifying Risk'
                        : trend.riskAssessment === 'SUBSIDING'
                        ? 'Subsiding'
                        : 'Stable'}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100">
                <span>Warn: {river.warning_level}m</span>
                <span>Danger: {river.danger_level}m</span>
                <span className="font-semibold text-slate-700">
                  Est. 3h: <strong className={isDanger ? 'text-red-600' : 'text-slate-800'}>{trend.projectedLevel}m</strong>
                </span>
              </div>

              {/* 7-Day Trend Visualization Hint */}
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-sky-600 font-bold hover:underline flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>View 7-Day Trend Chart →</span>
                </span>
                {isSelected && (
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">
                    Active Station
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
