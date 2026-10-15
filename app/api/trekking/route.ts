import { NextRequest, NextResponse } from 'next/server';
import { TREKKING_STATIONS } from '@/lib/dhm-data';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const corridorParam = searchParams.get('corridor')?.toLowerCase();

  let stations = [...TREKKING_STATIONS];

  if (corridorParam) {
    stations = stations.filter((s) => s.corridor.toLowerCase().includes(corridorParam));
  }

  return NextResponse.json({
    status: 'success',
    endpoint: '/api/trekking',
    totalStations: stations.length,
    timestamp: new Date().toISOString(),
    stations,
  }, {
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=120',
    },
  });
}
