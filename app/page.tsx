'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  MAJOR_CITIES_WEATHER,
  RIVER_STATIONS,
  RiverStation,
  EPHEMERIS_DATA,
  CityWeather,
  FLOOD_HAZARD_ZONES,
  computeRiverTrendForecast,
} from '@/lib/dhm-data';
import ActiveWeatherAlertsTicker from '@/components/ActiveWeatherAlertsTicker';
import WeatherWidgetGrid from '@/components/WeatherWidgetGrid';
import FloodNotificationManager from '@/components/FloodNotificationManager';
import River7DayTrendChart from '@/components/River7DayTrendChart';
import {
  CloudRain,
  Wind,
  Droplets,
  Waves,
  Mountain,
  AlertTriangle,
  Sunrise,
  Sunset,
  Search,
  MapPin,
  Radio,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ShieldAlert,
  Layers,
} from 'lucide-react';

const OpenStreetMap = dynamic(() => import('@/components/OpenStreetMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[460px] bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 text-xs">
      Loading Nepal weather & flood hazard map...
    </div>
  ),
});

export default function HomePage() {
  const [selectedCity, setSelectedCity] = useState<CityWeather>(MAJOR_CITIES_WEATHER[0]); // Kathmandu
  const [citySearch, setCitySearch] = useState('');
  const [selectedHazardZoneId, setSelectedHazardZoneId] = useState<string | null>('zone-budhigandaki-extreme');
  const [focusLocation, setFocusLocation] = useState<{ lat: number; lng: number; stationName?: string } | null>(null);
  const [selectedChartRiver, setSelectedChartRiver] = useState<RiverStation>(() => {
    return RIVER_STATIONS.find((r) => r.id === 120) || RIVER_STATIONS[0];
  });
  const [showRiverTrendChart, setShowRiverTrendChart] = useState(true);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  const filteredCities = MAJOR_CITIES_WEATHER.filter((c) =>
    c.name.toLowerCase().includes(citySearch.toLowerCase())
  );

  const handleTickerLocationSelect = (loc: { lat: number; lng: number; stationName?: string }) => {
    setFocusLocation(loc);
    if (mapSectionRef.current) {
      mapSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const dangerRivers = RIVER_STATIONS.filter((r) => r.status === 'DANGER LEVEL EXCEEDED' || r.waterLevel >= r.danger_level);
  const budhigandaki = RIVER_STATIONS.find((r) => r.name.includes('Budhigandaki'));
  const budhigandakiTrend = budhigandaki ? computeRiverTrendForecast(budhigandaki) : null;

  return (
    <div className="w-full">
      {/* 1. Compact 'Active Weather Alerts' Ticker at the Very Top */}
      <ActiveWeatherAlertsTicker onSelectAlertLocation={handleTickerLocationSelect} />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* Search & Quick City Hashtag Highlight Links (Zero Pills) */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search any city in Nepal (Kathmandu, Pokhara, Biratnagar, Jumla)..."
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-sky-500 shadow-2xs"
            />
          </div>

          {/* Clean Hashtag Formats Instead of Pill Capsules */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="text-slate-400 font-semibold">Explore:</span>
            {MAJOR_CITIES_WEATHER.slice(0, 7).map((city) => (
              <button
                key={city.id}
                onClick={() => setSelectedCity(city)}
                className={`font-semibold cursor-pointer transition-colors ${
                  selectedCity.id === city.id
                    ? 'text-sky-600 underline font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                #{city.name} ({Math.round(city.currentTemp)}°C)
              </button>
            ))}
          </div>
        </div>

        {/* Main Weather Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="text-xs font-bold text-sky-600 uppercase tracking-wider">
                #{selectedCity.province.replace(' Province', '')} #LiveWeather
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-1">
                {selectedCity.name}
              </h1>
              <div className="text-base text-slate-600 font-medium mt-1">
                {selectedCity.conditionEn} · {selectedCity.conditionNp}
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black text-slate-900 tracking-tight">
                {Math.round(selectedCity.currentTemp)}°
              </span>
              <span className="text-xl text-slate-400 font-light">Celsius</span>
            </div>
          </div>

          {/* 4 Clean Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 text-sm">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 font-medium">Day High / Low</div>
              <div className="text-base font-bold text-slate-800 mt-0.5">
                {selectedCity.toTemp}° / {selectedCity.fromTemp}°C
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <CloudRain className="w-3.5 h-3.5 text-sky-500" /> Chance of Rain
              </div>
              <div className="text-base font-bold text-sky-600 mt-0.5">
                {selectedCity.rainProbability}%
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-sky-500" /> Humidity
              </div>
              <div className="text-base font-bold text-slate-800 mt-0.5">
                {selectedCity.humidity}%
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-sky-500" /> Wind
              </div>
              <div className="text-base font-bold text-slate-800 mt-0.5">
                {selectedCity.windSpeedKmh} km/h
              </div>
            </div>
          </div>

          {/* 3-Day Outlook */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-bold text-slate-700">3-Day Forecast:</span>
            {selectedCity.threeDayOutlook.map((day) => (
              <div key={day.day} className="flex items-center gap-1.5 text-slate-600">
                <span className="font-bold text-slate-900">{day.day}:</span>
                <span>{day.condition}</span>
                <span className="font-semibold text-slate-800">
                  {day.min}° – {day.max}°C
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Weather Widgets Grid: Wind, Humidity, Atmospheric Pressure, UV & Visibility */}
        <WeatherWidgetGrid city={selectedCity} />

        {/* 3 Status Cards (Budhigandaki Danger Alert Highlighted) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          
          {/* Active Flood Alert Card */}
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-black text-red-600 uppercase tracking-wider">
                #FLOOD_DANGER_EXCEEDED
              </div>
              <h3 className="font-bold text-red-950 text-sm mt-0.5">Budhigandaki River at Arughat</h3>
              <p className="text-red-900 mt-1 leading-relaxed font-medium">
                Live Gauge: <strong className="text-red-700 font-black">8.85 m</strong> (Danger Limit: 7.80m, Rising). Evacuation alert active for Arughat, Salyantar & Benighat riverbanks.
              </p>
              <button
                onClick={() => handleTickerLocationSelect({ lat: 28.04, lng: 84.81, stationName: 'Budhigandaki River at Arughat' })}
                className="inline-flex items-center gap-1 mt-2 font-bold text-red-700 hover:text-red-900 underline cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>#FocusBudhigandakiOnMap →</span>
              </button>
            </div>
          </div>

          {/* Sun Times */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Sunrise className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                #KathmanduEphemeris
              </div>
              <h3 className="font-bold text-amber-900 text-sm mt-0.5">Sun Times Today</h3>
              <div className="text-amber-800 mt-1 space-y-0.5">
                <div>Sunrise: <strong>{EPHEMERIS_DATA.sunrise}</strong></div>
                <div>Sunset: <strong>{EPHEMERIS_DATA.sunset}</strong></div>
              </div>
              <div className="text-amber-700 text-[11px] mt-1">{EPHEMERIS_DATA.daylightDuration} daylight</div>
            </div>
          </div>

          {/* Mountains */}
          <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-4 flex items-start gap-3">
            <Mountain className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-sky-700 uppercase tracking-wider">
                #HimalayanSummits
              </div>
              <h3 className="font-bold text-sky-900 text-sm mt-0.5">Mt. Everest Summit</h3>
              <p className="text-sky-800 mt-1 leading-relaxed">
                Summit (8,848m): <strong>-28°C</strong> with 48 knot westerly winds. Extreme wind chill (-46°C).
              </p>
              <Link href="/mountains" className="inline-block mt-2 font-semibold text-sky-800 underline">
                View mountain weather →
              </Link>
            </div>
          </div>
        </div>

        {/* Dedicated Sections Navigation Quick Links */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-100 rounded-xl text-xs font-semibold text-slate-700">
          <span className="text-slate-500 font-bold">Dedicated Portals:</span>
          <Link href="/hydrology" className="hover:text-sky-600 underline">#Rivers (336 Stations)</Link>
          <Link href="/rainfall" className="hover:text-sky-600 underline">#Rainfall (518 Gauges)</Link>
          <Link href="/mountains" className="hover:text-sky-600 underline">#Mountains (9,000m Winds)</Link>
          <Link href="/trekking" className="hover:text-sky-600 underline">#Trekking (High Passes)</Link>
          <Link href="/radar" className="hover:text-sky-600 underline">#Radar (4 Doppler Scans)</Link>
          <Link href="/bulletins" className="hover:text-sky-600 underline">#Bulletins (3-Day)</Link>
        </div>

        {/* Browser Push Notification Manager */}
        <FloodNotificationManager />

        {/* Dedicated 'Flood Hazard Map' Section */}
        <div ref={mapSectionRef} className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="text-xs font-black text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>#FloodHazardMap #InundationGIS #RealTimeZones</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
                  <span>Nepal River Basin Flood Hazard Map</span>
                  {dangerRivers.length > 0 && (
                    <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>1 Basin in Active Danger</span>
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  High-resolution flood risk polygons overlaid onto OpenStreetMap. Select any risk corridor to inspect inundation depths, return period models, and evacuation directives.
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedHazardZoneId('zone-budhigandaki-extreme');
                  handleTickerLocationSelect({
                    lat: 28.04,
                    lng: 84.81,
                    stationName: 'Budhigandaki River at Arughat',
                  });
                }}
                className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-xs transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Zoom to Budhigandaki Danger (8.85m)</span>
              </button>
            </div>

            {/* Quick Risk Zone Selectors */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Select Flood Hazard Risk Corridor to Inspect on Map:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                {FLOOD_HAZARD_ZONES.map((zone) => {
                  const isSelected = selectedHazardZoneId === zone.id;
                  const isExtreme = zone.severity === 'EXTREME_DANGER';
                  const isWarning = zone.severity === 'HIGH_WARNING';

                  return (
                    <button
                      key={zone.id}
                      onClick={() => {
                        setSelectedHazardZoneId(zone.id);
                        setFocusLocation({
                          lat: zone.center[0],
                          lng: zone.center[1],
                          stationName: zone.name,
                        });
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? isExtreme
                            ? 'bg-red-50 border-red-500 ring-2 ring-red-200'
                            : 'bg-amber-50 border-amber-500 ring-2 ring-amber-200'
                          : isExtreme
                          ? 'bg-red-50/50 border-red-200 hover:border-red-300'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-black uppercase">
                        <span className={isExtreme ? 'text-red-700' : isWarning ? 'text-amber-700' : 'text-slate-600'}>
                          {isExtreme ? 'Zone 1: Extreme Danger' : isWarning ? 'Zone 2: Warning' : 'Zone 3: Watch'}
                        </span>
                        <span className="font-mono text-slate-500">Risk: {zone.riskScore}/100</span>
                      </div>
                      <div className="font-bold text-slate-900 text-xs mt-1 leading-snug">
                        {zone.name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {zone.basin} · {zone.districts.join(', ')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* The OpenStreetMap with overlaid polygons */}
            <OpenStreetMap
              focusLocation={focusLocation}
              focusZoneId={selectedHazardZoneId}
              showHazardsByDefault={true}
            />
          </div>
        </div>

        {/* 19 Cities Forecast Grid */}
        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Major Cities Across Nepal</h2>
            <p className="text-xs text-slate-500">
              Click any city to view its detailed forecast above.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredCities.map((city) => (
              <div
                key={city.id}
                onClick={() => {
                  setSelectedCity(city);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-white border border-slate-200 hover:border-sky-400 rounded-xl p-3.5 shadow-2xs transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{city.name}</h3>
                    <div className="text-[11px] text-slate-500">{city.conditionEn}</div>
                  </div>
                  <div className="text-xl font-black text-sky-600">
                    {Math.round(city.currentTemp)}°
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
                  <span>{city.fromTemp}° – {city.toTemp}°C</span>
                  <span className="font-semibold text-sky-600">{city.rainProbability}% rain</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* River Flood Levels Grid with Trend Arrows and Short-Term Forecasts */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Key River Water Levels</h2>
              <p className="text-xs text-slate-500">Real-time water meters with 3-hour trend forecasts across Nepal</p>
            </div>
            <Link href="/hydrology" className="text-xs font-semibold text-sky-600 hover:underline">
              All 336 Stations →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {/* Budhigandaki River Card First in Red with Trend Indicator & Forecast Change */}
            {budhigandaki && budhigandakiTrend && (
              <div
                onClick={() => {
                  setSelectedChartRiver(budhigandaki);
                  handleTickerLocationSelect({ lat: budhigandaki.latitude, lng: budhigandaki.longitude, stationName: budhigandaki.name });
                  setSelectedHazardZoneId('zone-budhigandaki-extreme');
                }}
                className={`p-3.5 bg-red-50/90 border-2 rounded-xl cursor-pointer hover:bg-red-100 transition-colors shadow-2xs flex flex-col justify-between ${
                  selectedChartRiver.id === budhigandaki.id
                    ? 'border-red-600 ring-2 ring-red-300'
                    : 'border-red-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-red-600">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>DANGER EXCEEDED (+{(budhigandaki.waterLevel - budhigandaki.danger_level).toFixed(2)}m)</span>
                    </span>
                    <span className="flex items-center gap-0.5">
                      <ArrowUpRight className="w-4 h-4 animate-pulse" />
                      <span>RISING</span>
                    </span>
                  </div>
                  <div className="font-black text-slate-900 text-sm mt-1">{budhigandaki.name}</div>
                  <div className="text-red-800 text-[11px] mb-2">{budhigandaki.basin} Basin · {budhigandaki.district}</div>
                  
                  <div className="flex items-baseline justify-between">
                    <span className="text-red-900 font-semibold">Live Water:</span>
                    <div className="flex items-center gap-1">
                      <ArrowUpRight className="w-5 h-5 text-red-600 animate-pulse" />
                      <span className="text-xl font-black text-red-600">{budhigandaki.waterLevel} m</span>
                    </div>
                  </div>

                  {/* Short-Term Forecast Percentage Change */}
                  <div className="mt-2.5 pt-2 border-t border-red-200 flex items-center justify-between text-[11px]">
                    <span className="text-red-800 font-semibold">3h Forecast:</span>
                    <span className="font-extrabold text-red-700 bg-red-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" />
                      <span>+{budhigandakiTrend.changePercent}% · Risk Intensifying</span>
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 mt-2.5 pt-2 border-t border-red-200 text-[11px]">
                  <div className="flex justify-between text-red-700 font-semibold">
                    <span>Danger Limit: {budhigandaki.danger_level}m</span>
                    <span>Est. 3h: <strong>{budhigandakiTrend.projectedLevel}m</strong></span>
                  </div>
                  <div className="text-center font-bold text-red-700 hover:underline pt-1">
                    {selectedChartRiver.id === budhigandaki.id ? 'Showing 7-Day Trend Below' : 'View 7-Day Trend Chart →'}
                  </div>
                </div>
              </div>
            )}

            {/* Other Rivers with Trend Arrows & Forecast Change */}
            {RIVER_STATIONS.filter((r) => r.id !== 120).slice(0, 5).map((river) => {
              const rTrend = computeRiverTrendForecast(river);
              const isRWarning = river.waterLevel >= river.warning_level;
              const isSelected = selectedChartRiver.id === river.id;

              return (
                <div
                  key={river.id}
                  onClick={() => {
                    setSelectedChartRiver(river);
                    handleTickerLocationSelect({ lat: river.latitude, lng: river.longitude, stationName: river.name });
                  }}
                  className={`p-3 bg-slate-50 border rounded-xl hover:border-sky-300 transition-colors cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-sky-500 ring-2 ring-sky-200 bg-sky-50/30'
                      : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="font-bold text-slate-900">{river.name}</div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1 font-black text-base text-sky-600">
                          {rTrend.direction === 'RISING' ? (
                            <ArrowUpRight className="w-4 h-4 text-amber-600" />
                          ) : rTrend.direction === 'FALLING' ? (
                            <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Minus className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{river.waterLevel} m</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-slate-500 text-[11px] mb-2">{river.basin} Basin · {river.district}</div>

                    {/* Short-Term Forecast Change */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">3h Forecast:</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded-md text-[10px] flex items-center gap-1 ${
                        rTrend.riskAssessment === 'INTENSIFYING'
                          ? 'bg-amber-100 text-amber-800'
                          : rTrend.riskAssessment === 'SUBSIDING'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {rTrend.direction === 'RISING' ? (
                          <ArrowUpRight className="w-3 h-3 text-amber-600" />
                        ) : rTrend.direction === 'FALLING' ? (
                          <ArrowDownRight className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Minus className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{rTrend.direction === 'RISING' ? '+' : ''}{rTrend.changePercent}% ({rTrend.riskAssessment.toLowerCase()})</span>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-2.5 pt-2 border-t border-slate-100 text-[11px]">
                    <div className="flex justify-between text-slate-500">
                      <span>Warn: {river.warning_level}m</span>
                      <span>Est. 3h: <strong className="text-slate-700">{rTrend.projectedLevel}m</strong></span>
                    </div>
                    <div className="text-center font-bold text-sky-600 hover:underline pt-1">
                      {isSelected ? 'Showing 7-Day Trend Below' : 'View 7-Day Trend Chart →'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 7-Day Historical Trend Chart (Recharts) for Selected River */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">
                  7-Day Historical Flood Pattern for:
                </span>
                <span className="font-extrabold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {selectedChartRiver.name} ({selectedChartRiver.waterLevel}m)
                </span>
              </div>
              <button
                onClick={() => setShowRiverTrendChart(!showRiverTrendChart)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                {showRiverTrendChart ? 'Minimize Chart ▲' : 'Expand 7-Day Chart ▼'}
              </button>
            </div>

            {showRiverTrendChart && (
              <River7DayTrendChart station={selectedChartRiver} />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
