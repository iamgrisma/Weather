import { NextRequest, NextResponse } from 'next/server';
import { RIVER_STATIONS, RAINFALL_STATIONS, generateHistoricalTimeSeries } from '@/lib/dhm-data';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const seriesIdStr = searchParams.get('series_id');
  const dateFrom = searchParams.get('date_from') || '2026-10-01';
  const dateTo = searchParams.get('date_to') || '2026-10-11';

  if (!seriesIdStr) {
    return NextResponse.json(
      { error: 'Missing required query parameter: series_id' },
      { status: 400 }
    );
  }

  const seriesId = parseInt(seriesIdStr, 10);
  const river = RIVER_STATIONS.find((r) => r.series_id === seriesId);
  const rainfall = RAINFALL_STATIONS.find((r) => r.series_id === seriesId);

  const baseLevel = river ? river.waterLevel : (rainfall ? rainfall.latest_value + 1.2 : 3.5);
  const warningLevel = river ? river.warning_level : 5.0;
  const dangerLevel = river ? river.danger_level : 6.0;

  const result = generateHistoricalTimeSeries(seriesId, baseLevel, warningLevel, dangerLevel, 2);

  return NextResponse.json({
    ...result,
    station_name: river ? river.name : (rainfall ? rainfall.name : `Series #${seriesId}`),
    date_from: dateFrom,
    date_to: dateTo,
  });
}
