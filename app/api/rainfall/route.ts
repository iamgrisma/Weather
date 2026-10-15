import { NextRequest, NextResponse } from 'next/server';
import { ALL_518_RAINFALL_STATIONS, computeRainfallStatus } from '@/lib/dhm-data';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const basin = searchParams.get('basin');
  const district = searchParams.get('district');
  const statusFilter = searchParams.get('status')?.toUpperCase();
  const search = searchParams.get('search')?.toLowerCase();
  const sortMode = searchParams.get('sort') || 'active_first';

  // 1. Dynamically compute rainfall status and anomaly rank
  let list = ALL_518_RAINFALL_STATIONS.map((st) => {
    const computedStatus = computeRainfallStatus(st.latest_value, st.averages.interval24h);
    // Anomaly score: higher for extreme/heavy, higher for active ongoing rain
    let anomalyScore = 0;
    if (computedStatus === 'EXTREME') anomalyScore = 1000 + st.averages.interval24h;
    else if (computedStatus === 'HEAVY') anomalyScore = 500 + st.averages.interval24h;
    else if (computedStatus === 'MODERATE') anomalyScore = 200 + st.averages.interval24h;
    else if (st.latest_value > 0 || st.averages.interval24h > 0) anomalyScore = 50 + st.averages.interval24h;

    return {
      ...st,
      status: computedStatus,
      isOngoingActivity: anomalyScore > 50,
      anomalyScore,
    };
  });

  // 2. Filters
  if (basin && basin !== 'all') {
    list = list.filter((s) => s.basin.toLowerCase() === basin.toLowerCase());
  }

  if (district && district !== 'all') {
    list = list.filter((s) => s.district.toLowerCase() === district.toLowerCase());
  }

  if (statusFilter && statusFilter !== 'ALL') {
    list = list.filter((s) => s.status === statusFilter);
  }

  if (search) {
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(search) ||
        s.district.toLowerCase().includes(search) ||
        s.basin.toLowerCase().includes(search)
    );
  }

  // 3. User requested: Ongoing activity / Heavy rain / Non-normal changes highlighted and shown FIRST!
  if (sortMode === 'active_first') {
    list.sort((a, b) => b.anomalyScore - a.anomalyScore);
  } else if (sortMode === 'elevation') {
    list.sort((a, b) => b.elevation - a.elevation);
  } else if (sortMode === 'alphabetical') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const totalFiltered = list.length;
  const totalPages = Math.ceil(totalFiltered / limit);
  const startIndex = (page - 1) * limit;
  const paginatedStations = list.slice(startIndex, startIndex + limit);

  const activeRainCount = list.filter((s) => s.latest_value > 0 || s.averages.interval24h > 5).length;
  const heavyRainCount = list.filter((s) => s.status === 'HEAVY' || s.status === 'EXTREME').length;

  return NextResponse.json({
    status: 'success',
    endpoint: '/api/rainfall',
    total: ALL_518_RAINFALL_STATIONS.length,
    filteredTotal: totalFiltered,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    activeRainCount,
    heavyRainCount,
    timestamp: new Date().toISOString(),
    stations: paginatedStations,
  }, {
    headers: {
      'Cache-Control': 'public, max-age=15, s-maxage=30',
    },
  });
}
