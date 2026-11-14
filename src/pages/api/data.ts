import type { APIRoute } from 'astro';
import { getEdgeEnv, getLatestSnapshot } from '../../lib/storage/edge-storage';

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
  try {
    const env = getEdgeEnv(locals);
    const snapshot = await getLatestSnapshot(env);
    const rawType = url.searchParams.get('type') || url.searchParams.get('scope') || 'all';
    const type = rawType.toLowerCase();

    let payload: any = snapshot;
    let dataHash = snapshot.hash;

    if (type === 'river') {
      payload = {
        version: snapshot.version,
        fetchedAt: snapshot.riverWatch?.fetchedAt || snapshot.fetchedAt,
        lastCheckedAt: snapshot.riverWatch?.lastCheckedAt || snapshot.lastCheckedAt,
        source: snapshot.source,
        riverWatch: snapshot.riverWatch,
      };
      dataHash = snapshot.riverWatch?.hash || snapshot.hash;
    } else if (type === 'weather') {
      payload = {
        version: snapshot.version,
        fetchedAt: snapshot.manualWeather?.fetchedAt || snapshot.fetchedAt,
        lastCheckedAt: snapshot.manualWeather?.lastCheckedAt || snapshot.lastCheckedAt,
        source: snapshot.source,
        manualWeather: snapshot.manualWeather,
        countryForecast: snapshot.countryForecast,
      };
      dataHash = snapshot.manualWeather?.hash || snapshot.hash;
    } else if (type === 'cities') {
      payload = {
        version: snapshot.version,
        fetchedAt: snapshot.cityForecasts?.fetchedAt || snapshot.fetchedAt,
        lastCheckedAt: snapshot.cityForecasts?.lastCheckedAt || snapshot.lastCheckedAt,
        source: snapshot.source,
        cityForecasts: snapshot.cityForecasts,
      };
      dataHash = snapshot.cityForecasts?.hash || snapshot.hash;
    } else if (type === 'bulletin') {
      payload = {
        version: snapshot.version,
        fetchedAt: snapshot.threeDayBulletin?.fetchedAt || snapshot.fetchedAt,
        lastCheckedAt: snapshot.threeDayBulletin?.lastCheckedAt || snapshot.lastCheckedAt,
        source: snapshot.source,
        threeDayBulletin: snapshot.threeDayBulletin,
      };
      dataHash = snapshot.threeDayBulletin?.hash || snapshot.hash;
    } else if (type === 'special') {
      payload = {
        version: snapshot.version,
        fetchedAt: snapshot.specialWeather?.fetchedAt || snapshot.fetchedAt,
        lastCheckedAt: snapshot.specialWeather?.lastCheckedAt || snapshot.lastCheckedAt,
        source: snapshot.source,
        specialWeather: snapshot.specialWeather,
      };
      dataHash = snapshot.specialWeather?.hash || snapshot.hash;
    } else if (type === 'mountain') {
      payload = {
        version: snapshot.version,
        fetchedAt: snapshot.mountaineeringWeather?.fetchedAt || snapshot.fetchedAt,
        lastCheckedAt: snapshot.mountaineeringWeather?.lastCheckedAt || snapshot.lastCheckedAt,
        source: snapshot.source,
        mountaineeringWeather: snapshot.mountaineeringWeather,
      };
      dataHash = snapshot.mountaineeringWeather?.hash || snapshot.hash;
    } else if (type === 'tourism') {
      payload = {
        version: snapshot.version,
        fetchedAt: snapshot.tourismWeather?.fetchedAt || snapshot.fetchedAt,
        lastCheckedAt: snapshot.tourismWeather?.lastCheckedAt || snapshot.lastCheckedAt,
        source: snapshot.source,
        tourismWeather: snapshot.tourismWeather,
      };
      dataHash = snapshot.tourismWeather?.hash || snapshot.hash;
    } else if (type === 'nwp') {
      payload = {
        version: snapshot.version,
        fetchedAt: snapshot.nwpModels?.fetchedAt || snapshot.fetchedAt,
        lastCheckedAt: snapshot.nwpModels?.lastCheckedAt || snapshot.lastCheckedAt,
        source: snapshot.source,
        nwpModels: snapshot.nwpModels,
      };
      dataHash = snapshot.nwpModels?.hash || snapshot.hash;
    } else if (type === 'press') {
      payload = {
        version: snapshot.version,
        fetchedAt: snapshot.pressReleases?.fetchedAt || snapshot.fetchedAt,
        lastCheckedAt: snapshot.pressReleases?.lastCheckedAt || snapshot.lastCheckedAt,
        source: snapshot.source,
        pressReleases: snapshot.pressReleases,
      };
      dataHash = snapshot.pressReleases?.hash || snapshot.hash;
    }

    const headers = new Headers({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=480, stale-while-revalidate=600',
      'CDN-Cache-Control': 'public, max-age=480, stale-while-revalidate=600',
      'Cloudflare-CDN-Cache-Control': 'max-age=480, stale-while-revalidate=600',
      'ETag': `"${dataHash}"`,
      'X-Data-Source': snapshot.source,
      'X-Scope': type,
      'X-Fetched-At': new Date(payload.fetchedAt || snapshot.fetchedAt).toISOString(),
    });

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error('API /data error:', err);
    return new Response(
      JSON.stringify({
        error: true,
        message: err?.message || 'Failed to retrieve weather snapshot.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
