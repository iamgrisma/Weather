import { NextRequest, NextResponse } from 'next/server';
import { MOUNTAIN_SECTORS } from '@/lib/dhm-data';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sectorParam = searchParams.get('sector')?.toLowerCase();

  let sectors = [...MOUNTAIN_SECTORS];

  if (sectorParam) {
    sectors = sectors.filter((s) => s.id.toLowerCase() === sectorParam);
  }

  // Prioritize sectors with active hazard warnings or high wind advisories
  sectors.sort((a, b) => {
    const aHasHazard = a.hazardAlert ? 1 : 0;
    const bHasHazard = b.hazardAlert ? 1 : 0;
    return bHasHazard - aHasHazard;
  });

  return NextResponse.json({
    status: 'success',
    endpoint: '/api/mountains',
    totalSectors: sectors.length,
    timestamp: new Date().toISOString(),
    sectors,
  }, {
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=120',
    },
  });
}
