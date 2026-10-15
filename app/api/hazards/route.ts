import { NextRequest, NextResponse } from 'next/server';
import { FLOOD_HAZARD_ZONES, RIVER_STATIONS, computeRiverTrendForecast } from '@/lib/dhm-data';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const severityFilter = searchParams.get('severity')?.toUpperCase();
  const basinFilter = searchParams.get('basin')?.toLowerCase();

  let zones = FLOOD_HAZARD_ZONES.map((zone) => {
    const associatedRiver = RIVER_STATIONS.find((r) => r.id === zone.associatedRiverId);
    const trend = associatedRiver ? computeRiverTrendForecast(associatedRiver) : undefined;

    return {
      ...zone,
      associatedRiver: associatedRiver
        ? {
            id: associatedRiver.id,
            name: associatedRiver.name,
            waterLevel: associatedRiver.waterLevel,
            dangerLevel: associatedRiver.danger_level,
            warningLevel: associatedRiver.warning_level,
            steady: associatedRiver.steady,
            isDangerExceeded: associatedRiver.waterLevel >= associatedRiver.danger_level,
            trendForecast: trend,
          }
        : null,
    };
  });

  if (severityFilter) {
    zones = zones.filter((z) => z.severity === severityFilter);
  }

  if (basinFilter && basinFilter !== 'all') {
    zones = zones.filter((z) => z.basin.toLowerCase() === basinFilter);
  }

  return NextResponse.json({
    status: 'success',
    timestamp: new Date().toISOString(),
    totalZones: zones.length,
    activeDangerZones: zones.filter((z) => z.severity === 'EXTREME_DANGER').length,
    zones,
  });
}
