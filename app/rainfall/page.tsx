'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ALL_518_RAINFALL_STATIONS, computeRainfallStatus, RainfallStation } from '@/lib/dhm-data';
import {
  CloudRain,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  Radio,
} from 'lucide-react';

export default function RainfallPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(18);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBasin, setSelectedBasin] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortOption, setSortOption] = useState<'active_first' | 'rain_desc' | 'elevation' | 'alphabetical'>('active_first');

  // 1. Process all 518 stations with dynamic status and anomaly score
  const processedStations = useMemo(() => {
    return ALL_518_RAINFALL_STATIONS.map((st) => {
      const computedStatus = computeRainfallStatus(st.latest_value, st.averages.interval24h);
      
      // Anomaly score: non-normal active rain gets high priority
      let anomalyScore = 0;
      if (computedStatus === 'EXTREME') anomalyScore = 1000 + st.averages.interval24h;
      else if (computedStatus === 'HEAVY') anomalyScore = 500 + st.averages.interval24h;
      else if (computedStatus === 'MODERATE') anomalyScore = 200 + st.averages.interval24h;
      else if (st.latest_value > 0 || st.averages.interval24h > 0) anomalyScore = 50 + st.averages.interval24h;

      return {
        ...st,
        status: computedStatus,
        isOngoingActivity: anomalyScore > 50,
        anomalyScore,
      };
    });
  }, []);

  // 2. Filter & Sort
  const filteredStations = useMemo(() => {
    let list = processedStations;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.district.toLowerCase().includes(q) ||
          s.basin.toLowerCase().includes(q)
      );
    }

    if (selectedBasin !== 'all') {
      list = list.filter((s) => s.basin.toLowerCase() === selectedBasin.toLowerCase());
    }

    if (selectedStatus !== 'all') {
      list = list.filter((s) => s.status === selectedStatus);
    }

    // Sort: Ongoing activity / Heavy rain / Non-normal changes highlighted FIRST!
    const sorted = [...list];
    if (sortOption === 'active_first') {
      sorted.sort((a, b) => b.anomalyScore - a.anomalyScore);
    } else if (sortOption === 'rain_desc') {
      sorted.sort((a, b) => b.averages.interval24h - a.averages.interval24h);
    } else if (sortOption === 'elevation') {
      sorted.sort((a, b) => b.elevation - a.elevation);
    } else if (sortOption === 'alphabetical') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }

    return sorted;
  }, [processedStations, searchQuery, selectedBasin, selectedStatus, sortOption]);

  // 3. Pagination calculations
  const totalItems = filteredStations.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  
  // Guard current page
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const currentItems = filteredStations.slice(startIndex, startIndex + pageSize);

  const ongoingCount = useMemo(() => {
    return processedStations.filter((s) => s.isOngoingActivity).length;
  }, [processedStations]);

  const heavyCount = useMemo(() => {
    return processedStations.filter((s) => s.status === 'HEAVY' || s.status === 'EXTREME').length;
  }, [processedStations]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="text-xs font-bold text-sky-600 tracking-wider uppercase mb-1">
          #RainfallWatch #PrecipitationTelemetry #518Gauges
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          518 Rainfall Stations & Precipitation Gauges
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Paginated nationwide network of automated precipitation gauges across all 77 districts. Stations recording active rain or heavy accumulation are highlighted first.
        </p>
      </div>

      {/* Ongoing Activity Alert Highlight Banner */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-xs text-sky-950 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CloudRain className="w-5 h-5 text-sky-600 shrink-0" />
          <span>
            <strong>Ongoing Activity Highlight:</strong>{' '}
            <strong className="text-red-700">{heavyCount} stations</strong> with heavy rainfall,{' '}
            <strong className="text-sky-800">{ongoingCount} stations</strong> recording active precipitation.
            Top downpour in <strong>Lumle (48.5 mm/24h)</strong> and <strong>Pokhara (22.0 mm/24h)</strong>.
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-600 font-mono text-[11px]">
          <span>Auto-sorted: Active Anomalies First</span>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search station, district, basin..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-slate-500 flex items-center gap-1 font-semibold">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
            </span>
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-hidden"
            >
              <option value="active_first">Ongoing Activity / Heavy Rain First</option>
              <option value="rain_desc">24h Rain: Highest to Lowest</option>
              <option value="elevation">Elevation: Highest to Lowest</option>
              <option value="alphabetical">Station Name (A–Z)</option>
            </select>
          </div>
        </div>

        {/* Basin & Status Quick Filters (Clean Highlight Text, Zero-Pills) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Basins */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 text-[11px] font-semibold mr-1">Basin:</span>
            {['all', 'Gandaki', 'Koshi', 'Bagmati', 'Karnali', 'West Rapti', 'Mahakali'].map((b) => (
              <button
                key={b}
                onClick={() => {
                  setSelectedBasin(b);
                  setCurrentPage(1);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  selectedBasin === b
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {b === 'all' ? 'All Basins' : b}
              </button>
            ))}
          </div>

          {/* Status */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] font-semibold mr-1">Status:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'HEAVY', label: 'Heavy/Extreme' },
              { id: 'MODERATE', label: 'Moderate' },
              { id: 'NORMAL', label: 'Normal' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  setSelectedStatus(st.id);
                  setCurrentPage(1);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  selectedStatus === st.id
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Showing count indicator */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing <strong>{startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)}</strong> of{' '}
          <strong>{totalItems}</strong> stations (Page {safeCurrentPage} of {totalPages})
        </div>
        <div className="flex items-center gap-2">
          <span>Items per page:</span>
          {[18, 36, 54].map((sz) => (
            <button
              key={sz}
              onClick={() => {
                setPageSize(sz);
                setCurrentPage(1);
              }}
              className={`px-1.5 py-0.5 rounded font-mono ${
                pageSize === sz ? 'font-bold text-sky-600 underline' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {sz}
            </button>
          ))}
        </div>
      </div>

      {/* Paginated Stations Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentItems.map((rain) => {
          const isHeavy = rain.status === 'HEAVY' || rain.status === 'EXTREME';
          const isModerate = rain.status === 'MODERATE';
          const hasRain = rain.latest_value > 0 || rain.averages.interval24h > 5;

          return (
            <div
              key={rain.id}
              className={`bg-white border rounded-xl p-4 shadow-2xs transition-all relative ${
                isHeavy
                  ? 'border-red-400 bg-red-50/20 ring-1 ring-red-400'
                  : isModerate
                  ? 'border-amber-300 bg-amber-50/15'
                  : hasRain
                  ? 'border-sky-300 bg-sky-50/10'
                  : 'border-slate-200'
              }`}
            >
              {/* Ongoing activity badge for anomalies */}
              {isHeavy && (
                <div className="mb-2 inline-flex items-center gap-1 text-[10px] font-black uppercase text-red-700 tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  <span>ONGOING HEAVY DOWNPOUR</span>
                </div>
              )}

              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm leading-snug">{rain.name}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {rain.district} · {rain.basin} Basin · {rain.elevation}m
                  </div>
                </div>
                <span
                  className={`text-[11px] font-extrabold uppercase shrink-0 ${
                    isHeavy
                      ? 'text-red-700'
                      : isModerate
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {rain.status}
                </span>
              </div>

              {/* Rain Numbers */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs my-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                <div>
                  <div className="text-slate-400 text-[10px]">1-Hour</div>
                  <div
                    className={`font-bold text-sm mt-0.5 ${
                      rain.latest_value > 0 ? 'text-red-600 font-extrabold' : 'text-slate-800'
                    }`}
                  >
                    {rain.latest_value} mm
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">6-Hour</div>
                  <div className="font-bold text-slate-800 text-sm mt-0.5">
                    {rain.averages.interval6h} mm
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">24-Hour</div>
                  <div
                    className={`font-bold text-sm mt-0.5 ${
                      isHeavy ? 'text-red-600 font-black' : isModerate ? 'text-amber-600 font-bold' : 'text-sky-600'
                    }`}
                  >
                    {rain.averages.interval24h} mm
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 font-mono">
                <span>GPS: {rain.latitude}°N, {rain.longitude}°E</span>
                <span>#{rain.id} · Series #{rain.series_id}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            Page <strong className="text-slate-800">{safeCurrentPage}</strong> of{' '}
            <strong className="text-slate-800">{totalPages}</strong>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold">
            {/* Prev */}
            <button
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              disabled={safeCurrentPage <= 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>

            {/* Smart page range buttons */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = safeCurrentPage - 2 + i;
              if (safeCurrentPage <= 2) pageNum = i + 1;
              if (safeCurrentPage >= totalPages - 1) pageNum = totalPages - 4 + i;
              if (pageNum < 1 || pageNum > totalPages) return null;

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-8 h-8 rounded-lg font-bold transition-colors ${
                    safeCurrentPage === pageNum
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Ellipsis if many pages */}
            {totalPages > 5 && safeCurrentPage < totalPages - 2 && (
              <span className="px-1 text-slate-400">...</span>
            )}

            {/* Next */}
            <button
              onClick={() => handlePageChange(safeCurrentPage + 1)}
              disabled={safeCurrentPage >= totalPages}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
