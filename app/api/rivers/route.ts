import { NextRequest, NextResponse } from 'next/server';
import {
  RIVER_STATIONS,
  computeRiverStatus,
  updateRiverWaterLevel,
  computeActiveAlerts,
  ALL_518_RAINFALL_STATIONS,
  MOUNTAIN_SECTORS,
  computeRiverTrendForecast,
} from '@/lib/dhm-data';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const basin = searchParams.get('basin');
  const statusFilter = searchParams.get('status')?.toLowerCase();
  const search = searchParams.get('search')?.toLowerCase();

  // Evaluate each station dynamically based on current water level
  let stations = RIVER_STATIONS.map((r) => {
    const computedStatus = computeRiverStatus(r.waterLevel, r.warning_level, r.danger_level);
    const excessDanger = r.waterLevel >= r.danger_level ? Number((r.waterLevel - r.danger_level).toFixed(2)) : 0;
    const excessWarning = r.waterLevel >= r.warning_level ? Number((r.waterLevel - r.warning_level).toFixed(2)) : 0;
    const forecastTrend = computeRiverTrendForecast(r);

    return {
      ...r,
      status: computedStatus,
      isDanger: r.waterLevel >= r.danger_level,
      isWarning: r.waterLevel >= r.warning_level && r.waterLevel < r.danger_level,
      excessDangerMeters: excessDanger,
      excessWarningMeters: excessWarning,
      forecastTrend,
    };
  });

  if (basin && basin !== 'all') {
    stations = stations.filter((s) => s.basin.toLowerCase() === basin.toLowerCase());
  }

  if (statusFilter) {
    if (statusFilter === 'danger') {
      stations = stations.filter((s) => s.isDanger);
    } else if (statusFilter === 'warning') {
      stations = stations.filter((s) => s.isWarning);
    } else if (statusFilter === 'normal') {
      stations = stations.filter((s) => !s.isDanger && !s.isWarning);
    }
  }

  if (search) {
    stations = stations.filter(
      (s) =>
        s.name.toLowerCase().includes(search) ||
        s.district.toLowerCase().includes(search) ||
        s.basin.toLowerCase().includes(search)
    );
  }

  const dangerCount = stations.filter((s) => s.isDanger).length;
  const warningCount = stations.filter((s) => s.isWarning).length;
  const normalCount = stations.filter((s) => !s.isDanger && !s.isWarning).length;

  return NextResponse.json({
    status: 'success',
    endpoint: '/api/rivers',
    totalStations: stations.length,
    dangerCount,
    warningCount,
    normalCount,
    timestamp: new Date().toISOString(),
    stations,
  }, {
    headers: {
      'Cache-Control': 'public, max-age=15, s-maxage=30',
    },
  });
}

// POST endpoint for interactive level simulation/testing
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stationId, waterLevel } = body;

    if (typeof stationId !== 'number' || typeof waterLevel !== 'number') {
      return NextResponse.json(
        { error: 'Invalid parameters: stationId (number) and waterLevel (number) required.' },
        { status: 400 }
      );
    }

    const updatedAlerts = updateRiverWaterLevel(stationId, waterLevel);
    const updatedStation = RIVER_STATIONS.find((r) => r.id === stationId);

    return NextResponse.json({
      status: 'success',
      message: `Updated station #${stationId} waterLevel to ${waterLevel}m. Status dynamically recomputed.`,
      station: updatedStation,
      activeAlertsCount: updatedAlerts.length,
      alerts: updatedAlerts,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
