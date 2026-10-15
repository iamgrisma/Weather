'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ACTIVE_WEATHER_ALERTS, ActiveAlert } from '@/lib/dhm-data';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Waves,
  Wind,
  CloudRain,
  MapPin,
} from 'lucide-react';

interface AlertTickerProps {
  onSelectAlertLocation?: (location: { lat: number; lng: number; stationName?: string }) => void;
}

export default function ActiveWeatherAlertsTicker({ onSelectAlertLocation }: AlertTickerProps) {
  const [alerts, setAlerts] = useState<ActiveAlert[]>(ACTIVE_WEATHER_ALERTS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch('/api/alerts');
        if (res.ok) {
          const json = await res.json();
          if (json.alerts && json.alerts.length > 0) {
            setAlerts(json.alerts);
          }
        }
      } catch (err) {
        // Fallback to initial alerts
      }
    }
    fetchAlerts();
  }, []);

  useEffect(() => {
    if (isPaused || alerts.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % alerts.length);
    }, 5500);

    return () => clearInterval(timer);
  }, [isPaused, alerts.length]);

  if (!alerts || alerts.length === 0) return null;

  const currentAlert = alerts[currentIndex] || alerts[0];
  const isDanger = currentAlert.severity === 'danger';

  const handleAlertClick = () => {
    if (onSelectAlertLocation && currentAlert.coordinates) {
      onSelectAlertLocation({
        lat: currentAlert.coordinates.lat,
        lng: currentAlert.coordinates.lng,
        stationName: currentAlert.location,
      });
    }
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`border-b transition-colors ${
        isDanger
          ? 'bg-red-600 text-white border-red-700'
          : 'bg-amber-500 text-slate-950 border-amber-600'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        
        {/* Left Side: Clean Highlight Text (NO pill badge) */}
        <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
          {/* Unboxed Text Kicker */}
          <span className="font-mono text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>{isDanger ? '#CRITICAL_DANGER' : '#WEATHER_ADVISORY'}</span>
          </span>

          <span className="opacity-40">|</span>

          {/* Active Alert Title */}
          <div
            onClick={handleAlertClick}
            className="truncate cursor-pointer hover:underline flex items-center gap-1.5 text-[12px] font-bold"
            title={`${currentAlert.headline} - Click to focus on map`}
          >
            {currentAlert.category === 'flood' && <Waves className="w-3.5 h-3.5 shrink-0" />}
            {currentAlert.category === 'wind' && <Wind className="w-3.5 h-3.5 shrink-0" />}
            {currentAlert.category === 'rain' && <CloudRain className="w-3.5 h-3.5 shrink-0" />}
            <span className="truncate">{currentAlert.headline}</span>
          </div>
        </div>

        {/* Right Side: Clean Focus Link & Controls */}
        <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end gap-3 shrink-0 text-xs font-semibold">
          <button
            onClick={handleAlertClick}
            className="hover:underline flex items-center gap-1 cursor-pointer font-bold"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>#FocusMap</span>
          </button>

          <div className="flex items-center gap-1 font-mono text-[11px]">
            <span>{currentIndex + 1}/{alerts.length}</span>
            <button
              onClick={() => setCurrentIndex((prev) => (prev - 1 + alerts.length) % alerts.length)}
              className="p-1 hover:opacity-75 cursor-pointer"
              aria-label="Previous alert"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % alerts.length)}
              className="p-1 hover:opacity-75 cursor-pointer"
              aria-label="Next alert"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Sub-bar for Budhigandaki danger alert details */}
      {isDanger && (
        <div className="bg-red-950 text-red-200 px-4 py-1.5 text-[11px] border-t border-red-500/30">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <strong className="text-white inline-flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-300" /> Urgent Evacuation Notice:</strong> {currentAlert.actionRequired}
            </div>
            <div className="text-[10px] text-red-300 font-mono">
              #Budhigandaki #Arughat (8.85m / Danger 7.80m)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
