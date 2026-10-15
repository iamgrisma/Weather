import { NextRequest, NextResponse } from 'next/server';
import { MAJOR_CITIES_WEATHER, EPHEMERIS_DATA } from '@/lib/dhm-data';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cityParam = searchParams.get('city')?.toLowerCase();
  const provinceParam = searchParams.get('province')?.toLowerCase();
  const search = searchParams.get('search')?.toLowerCase();

  let cities = [...MAJOR_CITIES_WEATHER];

  if (cityParam) {
    const singleCity = cities.find((c) => c.name.toLowerCase() === cityParam);
    if (singleCity) {
      return NextResponse.json({
        status: 'success',
        endpoint: '/api/weather',
        city: singleCity,
        ephemeris: EPHEMERIS_DATA,
      });
    }
  }

  if (provinceParam) {
    cities = cities.filter((c) => c.province.toLowerCase().includes(provinceParam));
  }

  if (search) {
    cities = cities.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.province.toLowerCase().includes(search) ||
        c.conditionEn.toLowerCase().includes(search)
    );
  }

  // Ongoing activity / non-normal weather changes (e.g. rain, showers, higher rain probability) prioritized
  cities.sort((a, b) => {
    const aActivity = (a.rainProbability > 20 ? 100 : 0) + (a.icon.includes('rain') ? 50 : 0);
    const bActivity = (b.rainProbability > 20 ? 100 : 0) + (b.icon.includes('rain') ? 50 : 0);
    return bActivity - aActivity;
  });

  return NextResponse.json({
    status: 'success',
    endpoint: '/api/weather',
    totalCities: cities.length,
    timestamp: new Date().toISOString(),
    ephemeris: EPHEMERIS_DATA,
    cities,
  }, {
    headers: {
      'Cache-Control': 'public, max-age=30, s-maxage=60',
    },
  });
}
