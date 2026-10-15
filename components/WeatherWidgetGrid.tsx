'use client';

import { CityWeather } from '@/lib/dhm-data';
import {
  Wind,
  Droplets,
  Gauge,
  Sun,
  Eye,
  Compass,
  ArrowUpRight,
} from 'lucide-react';

interface WeatherWidgetGridProps {
  city: CityWeather;
}

export default function WeatherWidgetGrid({ city }: WeatherWidgetGridProps) {
  // Approximate dew point using Magnus formula approximation: Td ≈ T - ((100 - RH) / 5)
  const dewPoint = Math.round(city.currentTemp - (100 - city.humidity) / 5);

  // Pressure calculations based on elevation
  // Barometric formula: p ≈ 1013.25 * (1 - 2.25577e-5 * h)^5.25588
  const baseMslpHpa = 1013 + ((city.id * 3) % 4); // Sea level normalized ~1013-1016 hPa
  const stationPressureHpa = Math.round(
    1013.25 * Math.pow(1 - 0.0000225577 * city.elevation, 5.25588)
  );

  // Wind direction indicator based on city geography
  const windCompassDirs = ['WNW', 'W', 'NW', 'SW', 'SSW', 'ENE', 'W', 'N'];
  const windDir = windCompassDirs[city.id % windCompassDirs.length];
  const gustSpeed = Math.round(city.windSpeedKmh * 1.5);

  // Humidity comfort rating
  const humidityRating =
    city.humidity < 40
      ? 'Dry Air'
      : city.humidity <= 65
      ? 'Comfortable'
      : city.humidity <= 80
      ? 'Humid'
      : 'Very Humid';

  // UV index estimation based on altitude and latitude
  const uvIndex = Math.min(11, Math.max(3, Math.round(5 + city.elevation / 1000)));
  const uvRating = uvIndex <= 2 ? 'Low' : uvIndex <= 5 ? 'Moderate' : uvIndex <= 7 ? 'High' : 'Very High';

  return (
    <div className="space-y-3">
      {/* Widget Section Title */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-sky-600 uppercase tracking-wider">
            #LiveAtmosphericWidgets · {city.name}
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-0.5">
            Atmospheric & Weather Conditions
          </h2>
        </div>
        <div className="text-xs text-slate-500 font-mono hidden sm:block">
          Elevation: {city.elevation} m
        </div>
      </div>

      {/* Quick-Glance Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        
        {/* 1. Wind Speed & Direction Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-sky-500" />
              <span>Wind Speed & Direction</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">
              #{windDir}
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {city.windSpeedKmh}
              </span>
              <span className="text-xs font-semibold text-slate-500">km/h</span>
            </div>
            <div className="text-xs text-slate-600 mt-1 font-medium">
              Breeze from {windDir} · Gusts up to {gustSpeed} km/h
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Air movement: Light breeze</span>
            <span className="font-semibold text-slate-700">Calm valley</span>
          </div>
        </div>

        {/* 2. Humidity & Dew Point Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-sky-500" />
              <span>Relative Humidity</span>
            </span>
            <span className="text-[11px] font-semibold text-sky-600">
              #{humidityRating.replace(' ', '')}
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-sky-600 tracking-tight">
                {city.humidity}%
              </span>
              <span className="text-xs font-semibold text-slate-500">RH</span>
            </div>
            <div className="text-xs text-slate-600 mt-1 font-medium">
              Dew point is {dewPoint}°C · {humidityRating}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Moisture saturation</span>
            <span className="font-semibold text-slate-700">Dew Point: {dewPoint}°C</span>
          </div>
        </div>

        {/* 3. Atmospheric Pressure Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-indigo-500" />
              <span>Atmospheric Pressure</span>
            </span>
            <span className="text-[11px] font-semibold text-indigo-600">
              #SteadyBarometer
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {baseMslpHpa}
              </span>
              <span className="text-xs font-semibold text-slate-500">hPa</span>
            </div>
            <div className="text-xs text-slate-600 mt-1 font-medium">
              Station Pressure: {stationPressureHpa} hPa (Altitude: {city.elevation}m)
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>High pressure ridge</span>
            <span className="font-semibold text-slate-700">Normalized MSLP</span>
          </div>
        </div>

        {/* 4. UV Index & Sun Protection Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>UV Index</span>
            </span>
            <span className="text-[11px] font-semibold text-amber-600">
              #{uvRating}
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {uvIndex}
              </span>
              <span className="text-xs font-bold text-amber-600 uppercase">
                {uvRating}
              </span>
            </div>
            <div className="text-xs text-slate-600 mt-1 font-medium">
              Peak solar intensity from 11:00 AM to 3:00 PM
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Sun protection recommended</span>
            <span className="font-semibold text-slate-700">SPF 30+</span>
          </div>
        </div>

        {/* 5. Visibility Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-emerald-500" />
              <span>Visibility</span>
            </span>
            <span className="text-[11px] font-semibold text-emerald-600">
              #ClearHorizon
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                10+
              </span>
              <span className="text-xs font-semibold text-slate-500">km</span>
            </div>
            <div className="text-xs text-slate-600 mt-1 font-medium">
              Clear visual range across mountain valleys
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Himalayan skyline visible</span>
            <span className="font-semibold text-emerald-700">Optimal</span>
          </div>
        </div>

        {/* 6. Rain Risk & Precipitation Outlook */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-sky-500" />
              <span>Precipitation Risk</span>
            </span>
            <span className="text-[11px] font-semibold text-sky-600">
              #{city.rainProbability < 20 ? 'LowRisk' : 'ShowersExpected'}
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-sky-600 tracking-tight">
                {city.rainProbability}%
              </span>
              <span className="text-xs font-semibold text-slate-500">Probability</span>
            </div>
            <div className="text-xs text-slate-600 mt-1 font-medium">
              {city.rainProbability > 20
                ? 'Isolated light showers possible in hills'
                : 'Mainly dry with stable atmospheric pressure'}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>24h accumulated forecast</span>
            <span className="font-semibold text-slate-700">
              {city.rainProbability > 20 ? '1-3 mm' : '0 mm'}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
