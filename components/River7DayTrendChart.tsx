'use client';

import React, { useState, useMemo, useSyncExternalStore } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  RiverStation,
  generate7DayHistoricalTrend,
  SevenDayTrendSummary,
} from '@/lib/dhm-data';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldCheck,
  Waves,
  Calendar,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Gauge,
  Info,
} from 'lucide-react';

interface River7DayTrendChartProps {
  station: RiverStation;
  simulatedLevel?: number | null;
  compact?: boolean;
}

const emptySubscribe = () => () => {};

export default function River7DayTrendChart({
  station,
  simulatedLevel,
  compact = false,
}: River7DayTrendChartProps) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [timeRange, setTimeRange] = useState<'7d' | '3d' | '24h'>('7d');
  const [showDischarge, setShowDischarge] = useState(false);

  const daysCount = timeRange === '7d' ? 7 : timeRange === '3d' ? 3 : 1;

  const trendSummary: SevenDayTrendSummary = useMemo(() => {
    return generate7DayHistoricalTrend(station, simulatedLevel ?? undefined, daysCount);
  }, [station, simulatedLevel, daysCount]);

  const currentLevel = simulatedLevel !== null && simulatedLevel !== undefined ? simulatedLevel : station.waterLevel;
  const isDanger = currentLevel >= station.danger_level;
  const isWarning = !isDanger && currentLevel >= station.warning_level;

  // Compute Y-Axis domain bounds
  const yDomain = useMemo(() => {
    const levels = trendSummary.points.map((p) => p.waterLevel);
    const min = Math.max(0, Math.floor(Math.min(...levels, station.warning_level * 0.7)));
    const max = Math.ceil(Math.max(...levels, station.danger_level * 1.15));
    return [min, max];
  }, [trendSummary, station]);

  // Downsample tick display on X-axis for clean readability
  const xTicks = useMemo(() => {
    const pts = trendSummary.points;
    if (timeRange === '24h') {
      // Every 4 hours
      return pts.filter((_, idx) => idx % 4 === 0).map((p) => p.formattedTime);
    } else if (timeRange === '3d') {
      // Every 12 hours
      return pts.filter((_, idx) => idx % 12 === 0).map((p) => p.fullLabel);
    } else {
      // Every 24 hours (once per day)
      return pts.filter((_, idx) => idx % 24 === 0).map((p) => p.formattedDate);
    }
  }, [trendSummary.points, timeRange]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-sky-600 tracking-wider uppercase flex items-center gap-1">
              <Waves className="w-3.5 h-3.5" />
              <span>#HydrographTrend #RechartsTelemetry</span>
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-semibold text-slate-500">
              {station.basin} Basin · Station #{station.stationIndex}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
            <span>7-Day Water Level Trend & Flood Pattern</span>
            {isDanger ? (
              <span className="text-xs font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>DANGER ZONE</span>
              </span>
            ) : isWarning ? (
              <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>WARNING ZONE</span>
              </span>
            ) : (
              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>NORMAL FLOW</span>
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Continuous hourly automated telemetry for <strong className="text-slate-700">{station.name}</strong>, tracking long-term flood surges, diurnal fluctuations, and channel thresholds.
          </p>
        </div>

        {/* Time-Range & View Controls (Zero Pills Discipline) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                timeRange === '7d'
                  ? 'bg-sky-600 text-white font-bold shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeRange('3d')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                timeRange === '3d'
                  ? 'bg-sky-600 text-white font-bold shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              72 Hours
            </button>
            <button
              onClick={() => setTimeRange('24h')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                timeRange === '24h'
                  ? 'bg-sky-600 text-white font-bold shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              24 Hours
            </button>
          </div>

          <button
            onClick={() => setShowDischarge(!showDischarge)}
            className={`text-xs px-2.5 py-1 rounded-lg border cursor-pointer transition-colors font-medium flex items-center gap-1.5 ${
              showDischarge
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>{showDischarge ? 'Hide Flow Rate' : 'Show Flow (m³/s)'}</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards for Long-Term Flood Patterns */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Card 1: 7-Day Peak */}
        <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
          <div className="flex items-center justify-between text-slate-500 font-semibold">
            <span>{timeRange === '7d' ? '7-Day' : timeRange === '3d' ? '3-Day' : '24h'} Peak Crest</span>
            <Activity className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className={`text-xl sm:text-2xl font-black mt-1 ${trendSummary.peakLevel >= station.danger_level ? 'text-red-600' : trendSummary.peakLevel >= station.warning_level ? 'text-amber-600' : 'text-slate-900'}`}>
            {trendSummary.peakLevel} m
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
            {trendSummary.peakTime}
          </div>
        </div>

        {/* Card 2: 7-Day Low / Baseflow */}
        <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
          <div className="flex items-center justify-between text-slate-500 font-semibold">
            <span>Minimum Baseflow</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {trendSummary.minLevel} m
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
            Recorded: {trendSummary.minTime}
          </div>
        </div>

        {/* Card 3: Flood Duration */}
        <div className={`p-3 rounded-xl border ${
          trendSummary.hoursAboveDanger > 0
            ? 'bg-red-50/70 border-red-200'
            : trendSummary.hoursAboveWarning > 0
            ? 'bg-amber-50/70 border-amber-200'
            : 'bg-emerald-50/70 border-emerald-200'
        }`}>
          <div className="flex items-center justify-between text-slate-600 font-semibold">
            <span>Threshold Exceedance</span>
            {trendSummary.hoursAboveDanger > 0 ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            )}
          </div>
          <div className={`text-xl sm:text-2xl font-black mt-1 ${
            trendSummary.hoursAboveDanger > 0
              ? 'text-red-700'
              : trendSummary.hoursAboveWarning > 0
              ? 'text-amber-700'
              : 'text-emerald-700'
          }`}>
            {trendSummary.hoursAboveDanger > 0
              ? `${trendSummary.hoursAboveDanger}h Danger`
              : trendSummary.hoursAboveWarning > 0
              ? `${trendSummary.hoursAboveWarning}h Warning`
              : '0h Inundation'}
          </div>
          <div className="text-[11px] font-medium text-slate-600 mt-0.5">
            {trendSummary.hoursAboveDanger > 0
              ? `Danger ceiling (${station.danger_level}m) exceeded`
              : trendSummary.hoursAboveWarning > 0
              ? `Warning limit (${station.warning_level}m) breached`
              : 'Flow remained safely in channel'}
          </div>
        </div>

        {/* Card 4: Net Stage Change */}
        <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
          <div className="flex items-center justify-between text-slate-500 font-semibold">
            <span>Net Stage Delta</span>
            {trendSummary.netChange7d > 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-red-600" />
            ) : trendSummary.netChange7d < 0 ? (
              <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Activity className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
          <div className={`text-xl sm:text-2xl font-black mt-1 ${
            trendSummary.netChange7d > 0 ? 'text-red-600' : trendSummary.netChange7d < 0 ? 'text-emerald-700' : 'text-slate-800'
          }`}>
            {trendSummary.netChange7d > 0 ? '+' : ''}{trendSummary.netChange7d} m
          </div>
          <div className={`text-[11px] font-bold mt-0.5 flex items-center gap-1 ${
            trendSummary.netChange7d > 0 ? 'text-red-700' : trendSummary.netChange7d < 0 ? 'text-emerald-700' : 'text-slate-600'
          }`}>
            {trendSummary.netChange7d > 0 ? (
              <>
                <ArrowUpRight className="w-3 h-3" />
                <span>+{trendSummary.netChangePercent7d}% weekly surge</span>
              </>
            ) : trendSummary.netChange7d < 0 ? (
              <>
                <ArrowDownRight className="w-3 h-3" />
                <span>{trendSummary.netChangePercent7d}% steady recession</span>
              </>
            ) : (
              <span>Balanced catchment inflow</span>
            )}
          </div>
        </div>
      </div>

      {/* Recharts Area Chart Container */}
      <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between text-xs mb-3 gap-2">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-800">
              {timeRange === '7d' ? '7-Day Historical Hydrograph' : timeRange === '3d' ? '72-Hour Rapid Hydrograph' : '24-Hour Diurnal Hydrograph'}
            </span>
            <span className="text-[11px] text-slate-500">
              (1-Hour Resolution · {trendSummary.points.length} Sensor Telemetry Records)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-sky-700 font-semibold">
              <span className="w-2.5 h-2.5 bg-sky-500 rounded-xs inline-block"></span>
              <span>Water Level (m)</span>
            </span>
            {showDischarge && (
              <span className="flex items-center gap-1 text-indigo-700 font-semibold">
                <span className="w-2.5 h-2.5 bg-indigo-500 rounded-xs inline-block"></span>
                <span>Discharge (m³/s)</span>
              </span>
            )}
            <span className="flex items-center gap-1 text-amber-700 font-semibold">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-500 inline-block"></span>
              <span>Warning Limit ({station.warning_level}m)</span>
            </span>
            <span className="flex items-center gap-1 text-red-700 font-semibold">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-red-500 inline-block"></span>
              <span>Danger Limit ({station.danger_level}m)</span>
            </span>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="w-full h-72 sm:h-80">
          {!mounted ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-white/80 rounded-lg text-slate-400 gap-2 border border-slate-200">
              <Activity className="w-6 h-6 animate-spin text-sky-600" />
              <span className="text-xs font-semibold">Initializing Recharts Telemetry Graph...</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendSummary.points}
                margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
              >
                <defs>
                  {/* Dynamic Water Level Gradient */}
                  <linearGradient id="waterLevelGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#0284c7'}
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor={isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#0284c7'}
                      stopOpacity={0.02}
                    />
                  </linearGradient>

                  <linearGradient id="dischargeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

                <XAxis
                  dataKey={timeRange === '24h' ? 'formattedTime' : timeRange === '3d' ? 'formattedDate' : 'formattedDate'}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={timeRange === '7d' ? 30 : 20}
                />

                <YAxis
                  yAxisId="waterLevel"
                  domain={yDomain}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  unit="m"
                  width={36}
                />

                {showDischarge && (
                  <YAxis
                    yAxisId="discharge"
                    orientation="right"
                    stroke="#818cf8"
                    fontSize={11}
                    tickLine={false}
                    unit="m³/s"
                    width={52}
                  />
                )}

                {/* Warning Level Reference Line */}
                <ReferenceLine
                  yAxisId="waterLevel"
                  y={station.warning_level}
                  stroke="#d97706"
                  strokeDasharray="4 4"
                  strokeWidth={1.8}
                  label={{
                    value: `Warning (${station.warning_level}m)`,
                    fill: '#b45309',
                    fontSize: 10,
                    fontWeight: 700,
                    position: 'insideTopRight',
                  }}
                />

                {/* Danger Level Reference Line */}
                <ReferenceLine
                  yAxisId="waterLevel"
                  y={station.danger_level}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `Danger Limit (${station.danger_level}m)`,
                    fill: '#b91c1c',
                    fontSize: 10,
                    fontWeight: 800,
                    position: 'insideTopRight',
                  }}
                />

                {/* Custom Tooltip */}
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload as SevenDayTrendSummary['points'][0];
                    const isPtDanger = data.waterLevel >= station.danger_level;
                    const isPtWarning = !isPtDanger && data.waterLevel >= station.warning_level;

                    return (
                      <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-lg border border-slate-700 text-xs space-y-1.5 min-w-[210px] backdrop-blur-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="font-bold text-sky-400">{data.fullLabel}</span>
                          <span className="text-[10px] font-mono text-slate-400">{data.dayLabel}</span>
                        </div>

                        <div className="flex items-baseline justify-between pt-0.5">
                          <span className="text-slate-300">Water Level:</span>
                          <span className={`text-base font-black ${
                            isPtDanger ? 'text-red-400' : isPtWarning ? 'text-amber-400' : 'text-sky-300'
                          }`}>
                            {data.waterLevel} m
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Flood Status:</span>
                          <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                            isPtDanger
                              ? 'bg-red-950 text-red-300 border border-red-800'
                              : isPtWarning
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}>
                            {isPtDanger ? 'Danger Exceeded' : isPtWarning ? 'Warning Level' : 'Normal Stage'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800 pt-1">
                          <span>Danger Delta:</span>
                          <span className={data.deltaFromDanger > 0 ? 'text-red-400 font-bold' : 'text-slate-300'}>
                            {data.deltaFromDanger > 0 ? `+${data.deltaFromDanger}m over danger` : `${Math.abs(data.deltaFromDanger)}m below danger`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Est. Flow Discharge:</span>
                          <span className="text-indigo-300 font-semibold">{data.dischargeM3s} m³/s</span>
                        </div>
                      </div>
                    );
                  }}
                />

                {/* Primary Water Level Area Curve */}
                <Area
                  yAxisId="waterLevel"
                  type="monotone"
                  dataKey="waterLevel"
                  name="Water Level"
                  stroke={isDanger ? '#dc2626' : isWarning ? '#d97706' : '#0284c7'}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#waterLevelGradient)"
                  isAnimationActive={false}
                />

                {/* Secondary Discharge Curve */}
                {showDischarge && (
                  <Area
                    yAxisId="discharge"
                    type="monotone"
                    dataKey="dischargeM3s"
                    name="Discharge Flow"
                    stroke="#6366f1"
                    strokeWidth={1.8}
                    fillOpacity={1}
                    fill="url(#dischargeGradient)"
                    isAnimationActive={false}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Timeline Bottom Axis Indicators */}
        <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2 font-medium px-1">
          <span>← {timeRange === '7d' ? '7 Days Ago (Oct 04)' : timeRange === '3d' ? '72 Hours Ago' : '24 Hours Ago'}</span>
          <span className="text-slate-400 hidden sm:inline">Mid-Period Telemetry</span>
          <span className="font-bold text-sky-700">Current Observation: {currentLevel.toFixed(2)}m (Now) →</span>
        </div>
      </div>

      {/* Long-Term Flood Pattern Assessment Banner */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        trendSummary.patternType === 'CRITICAL_MONSOON_SURGE'
          ? 'bg-red-50 border-red-200'
          : trendSummary.patternType === 'ACTIVE_WARNING_PHASE'
          ? 'bg-amber-50 border-amber-200'
          : 'bg-sky-50/70 border-sky-200'
      }`}>
        <div className="flex items-start gap-3">
          <Info className={`w-5 h-5 shrink-0 mt-0.5 ${
            trendSummary.patternType === 'CRITICAL_MONSOON_SURGE'
              ? 'text-red-600'
              : trendSummary.patternType === 'ACTIVE_WARNING_PHASE'
              ? 'text-amber-600'
              : 'text-sky-600'
          }`} />
          <div>
            <div className={`text-xs font-bold uppercase tracking-wider ${
              trendSummary.patternType === 'CRITICAL_MONSOON_SURGE'
                ? 'text-red-700'
                : trendSummary.patternType === 'ACTIVE_WARNING_PHASE'
                ? 'text-amber-800'
                : 'text-sky-800'
            }`}>
              Hydrological Pattern: {trendSummary.patternHeadline}
            </div>
            <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
              {trendSummary.hydrologicalAssessment}
            </p>
          </div>
        </div>

        <div className="shrink-0 self-end sm:self-auto text-right">
          <div className="text-[11px] font-semibold text-slate-500">Peak Flood Crest</div>
          <div className={`text-sm font-black ${trendSummary.peakLevel >= station.danger_level ? 'text-red-600' : 'text-slate-800'}`}>
            {trendSummary.peakLevel}m · {trendSummary.peakTime.split(',')[0]}
          </div>
        </div>
      </div>
    </div>
  );
}
