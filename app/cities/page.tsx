'use client';

import { useState, useMemo } from 'react';
import {
  MAJOR_CITIES_WEATHER,
  EPHEMERIS_DATA,
  CityWeather,
} from '@/lib/dhm-data';
import {
  Building2,
  Sunrise,
  Sunset,
  Search,
  Droplets,
  Wind,
  CloudRain,
  Sun,
  Clock,
  ArrowUpDown,
} from 'lucide-react';

export default function CitiesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'active_first' | 'rain' | 'temp-desc' | 'temp-asc' | 'name'>('active_first');

  const filteredCities = useMemo(() => {
    let result = MAJOR_CITIES_WEATHER.filter((city) =>
      city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      city.province.toLowerCase().includes(searchTerm.toLowerCase()) ||
      city.conditionEn.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortBy === 'active_first') {
      result.sort((a, b) => {
        const aActivity = (a.rainProbability > 20 ? 100 : 0) + (a.icon.includes('rain') ? 50 : 0) + (a.rainProbability);
        const bActivity = (b.rainProbability > 20 ? 100 : 0) + (b.icon.includes('rain') ? 50 : 0) + (b.rainProbability);
        return bActivity - aActivity;
      });
    } else if (sortBy === 'temp-desc') {
      result.sort((a, b) => b.currentTemp - a.currentTemp);
    } else if (sortBy === 'temp-asc') {
      result.sort((a, b) => a.currentTemp - b.currentTemp);
    } else if (sortBy === 'rain') {
      result.sort((a, b) => b.rainProbability - a.rainProbability);
    } else {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [searchTerm, sortBy]);

  return (
    <div className="w-full pb-16 space-y-8">
      {/* Friendly Header */}
      <section className="bg-white border-b border-slate-200/90 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-sky-600 font-semibold mb-2">
            <Building2 className="w-4 h-4" />
            <span>NEPAL METROPOLITAN WEATHER FORECASTS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            19 Major Cities Weather & Sunrise/Sunset
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-3xl leading-relaxed">
            Multi-day temperature projections, rain probabilities, and atmospheric conditions across all 7 provinces of Nepal.
          </p>

          {/* Clean Ephemeris Box */}
          <div className="mt-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 gap-2">
              <h2 className="font-bold text-slate-800 text-sm">Kathmandu Solar Ephemeris & Daylight</h2>
              <span className="text-xs text-slate-500 font-medium">{EPHEMERIS_DATA.location}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-600 flex items-center justify-center shrink-0">
                  <Sunrise className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-slate-500 font-medium text-[11px]">Sunrise</div>
                  <div className="text-base font-extrabold text-slate-900">{EPHEMERIS_DATA.sunrise}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100/70 text-orange-600 flex items-center justify-center shrink-0">
                  <Sunset className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-slate-500 font-medium text-[11px]">Sunset</div>
                  <div className="text-base font-extrabold text-slate-900">{EPHEMERIS_DATA.sunset}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100/70 text-sky-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-slate-500 font-medium text-[11px]">Daylight Duration</div>
                  <div className="text-sm font-bold text-slate-900">{EPHEMERIS_DATA.daylightDuration}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100/70 text-indigo-600 flex items-center justify-center shrink-0">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-slate-500 font-medium text-[11px]">Golden Hour</div>
                  <div className="text-sm font-bold text-slate-900">{EPHEMERIS_DATA.goldenHourEvening}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search your city (e.g. Pokhara, Biratnagar, Jumla)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-sky-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-lg text-slate-700 px-3 py-1.5 text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="name">City Name (A-Z)</option>
              <option value="temp-desc">Warmest First</option>
              <option value="temp-asc">Coolest First</option>
              <option value="rain">Chance of Rain</option>
            </select>
          </div>
        </div>

        {/* City Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCities.map((city) => (
            <div
              key={city.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-sky-300 transition-all"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                      {city.province}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                      {city.name}
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-sky-600">
                      {Math.round(city.currentTemp)}°<span className="text-lg font-light text-slate-400">C</span>
                    </div>
                  </div>
                </div>

                {/* Weather description */}
                <div className="my-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-xs font-bold text-slate-800">
                    {city.conditionEn}
                  </div>
                  <div className="text-xs text-sky-700 font-medium mt-0.5">
                    {city.conditionNp}
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 text-xs mb-4">
                  <div className="bg-slate-50 p-2.5 rounded-lg text-center">
                    <div className="text-[10px] text-slate-500">High / Low</div>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {city.toTemp}° / {city.fromTemp}°
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg text-center">
                    <div className="text-[10px] text-slate-500">Rain Chance</div>
                    <div className="font-bold text-sky-600 mt-0.5">
                      {city.rainProbability}%
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg text-center">
                    <div className="text-[10px] text-slate-500">Humidity</div>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {city.humidity}%
                    </div>
                  </div>
                </div>

                {/* 3-Day Forecast */}
                <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-400">3-Day Forecast</div>
                  {city.threeDayOutlook.map((day) => (
                    <div key={day.day} className="flex items-center justify-between text-slate-600 text-xs">
                      <span className="font-bold text-slate-700">{day.day}</span>
                      <span>{day.condition}</span>
                      <span className="font-semibold text-slate-900">{day.min}° – {day.max}°C</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Elevation: {city.elevation} m</span>
                <span>Wind: {city.windSpeedKmh} km/h</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
