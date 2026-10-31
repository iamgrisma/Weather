import type { APIRoute } from 'astro';
import { getEdgeEnv, refreshScopedWithCooldown } from '../../lib/storage/edge-storage';
import type { RefreshScope } from '../../lib/dhm/types';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  return POST(context);
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = getEdgeEnv(locals);
    const url = new URL(request.url);

    // Default to 'all' so a single unified cron ping to /api/refresh updates all feeds
    const rawScope = url.searchParams.get('scope') as RefreshScope | null;
    let scope: RefreshScope = rawScope || 'all';
    const force = url.searchParams.get('force') === 'true';

    try {
      if (request.headers.get('content-type')?.includes('application/json')) {
        const body = await request.json();
        if (body.scope) scope = body.scope;
      }
    } catch {}

    const result = await refreshScopedWithCooldown(scope, env, force);

    // Invalidate Edge Cache Shield (caches.default) when data has updated
    if (result.status === 'updated') {
      try {
        const cache = (globalThis as any).caches?.default;
        if (cache) {
          const purgePaths = ['/', '/ne', '/api/data'];
          if (result.scope === 'river' || result.scope === 'all') purgePaths.push('/river-watch', '/ne/river-watch');
          if (result.scope === 'weather' || result.scope === 'all') purgePaths.push('/weather', '/ne/weather');
          if (result.scope === 'bulletin' || result.scope === 'all') purgePaths.push('/bulletin', '/ne/bulletin');
          if (result.scope === 'cities' || result.scope === 'all') purgePaths.push('/city-forecast', '/ne/city-forecast');
          if (result.scope === 'mountain' || result.scope === 'all') purgePaths.push('/mountaineering', '/ne/mountaineering');
          if (result.scope === 'special' || result.scope === 'all') purgePaths.push('/special-weather', '/ne/special-weather');
          if (result.scope === 'nwp' || result.scope === 'all') purgePaths.push('/nwp', '/ne/nwp');
          if (result.scope === 'press' || result.scope === 'all') purgePaths.push('/press-releases', '/ne/press-releases');

          const origin = url.origin;
          for (const p of purgePaths) {
            try {
              cache.delete(new Request(`${origin}${p}`));
            } catch {}
          }
        }
      } catch (purgeErr) {
        console.warn('[API/refresh] Edge cache purge error:', purgeErr);
      }
    }

    const headers = new Headers({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Refresh-Scope': result.scope,
      'X-Cooldown-Remaining': String(result.cooldownRemainingMinutes),
    });

    // Return lightweight JSON (~150 bytes) for cronjob.org & uptimerobot limits
    const includeFull = url.searchParams.get('full') === 'true';
    const payload = includeFull
      ? result
      : {
          status: result.status,
          scope: result.scope,
          message: result.message,
          cooldownRemainingMinutes: result.cooldownRemainingMinutes,
          lastFetchedAt: result.lastFetchedAt,
          lastCheckedAt: result.lastCheckedAt,
        };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error('API /refresh error:', err);
    return new Response(
      JSON.stringify({
        status: 'error',
        message: err?.message || 'Internal server error during scoped refresh.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
