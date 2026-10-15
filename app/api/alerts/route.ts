import { NextResponse } from 'next/server';
import {
  computeActiveAlerts,
  RIVER_STATIONS,
  ALL_518_RAINFALL_STATIONS,
  MOUNTAIN_SECTORS,
} from '@/lib/dhm-data';

export async function GET() {
  // Dynamically compute active alerts on every request from live telemetry values
  const liveAlerts = computeActiveAlerts(
    RIVER_STATIONS,
    ALL_518_RAINFALL_STATIONS,
    MOUNTAIN_SECTORS
  );

  return NextResponse.json({
    status: 'success',
    endpoint: '/api/alerts',
    timestamp: new Date().toISOString(),
    totalActiveAlerts: liveAlerts.length,
    alerts: liveAlerts,
  }, {
    headers: {
      'Cache-Control': 'public, max-age=15, s-maxage=30',
    },
  });
}
