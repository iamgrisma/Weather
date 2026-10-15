import { NextResponse } from 'next/server';
import {
  RIVER_STATIONS,
  RAINFALL_STATIONS,
  MOUNTAIN_SECTORS,
  MAJOR_CITIES_WEATHER,
  TREKKING_STATIONS,
  SYNOPTIC_BULLETIN,
  EPHEMERIS_DATA,
  RADAR_FEEDS,
} from '@/lib/dhm-data';

export async function GET() {
  const payload = {
    timestamp: new Date().toISOString(),
    status: 'success',
    country: 'Nepal',
    authority: 'Department of Hydrology and Meteorology (DHM) / Meteorological Forecast Division (MFD)',
    riverWatch: RIVER_STATIONS,
    rainfallWatch: RAINFALL_STATIONS,
    mountaineeringWeather: MOUNTAIN_SECTORS,
    cityForecasts: MAJOR_CITIES_WEATHER,
    tourismWeather: TREKKING_STATIONS,
    countryForecast: SYNOPTIC_BULLETIN,
    threeDayBulletin: SYNOPTIC_BULLETIN.threeDayOutlook,
    ephemeris: EPHEMERIS_DATA,
    radarFeeds: RADAR_FEEDS,
  };

  const etag = `W/"dhm-${Date.now().toString(36)}"`;

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=180',
      'ETag': etag,
      'Content-Type': 'application/json',
    },
  });
}
