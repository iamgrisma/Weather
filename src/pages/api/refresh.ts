import type { APIRoute } from 'astro';
import { getEdgeEnv, refreshScopedWithCooldown } from '../../lib/storage/edge-storage';
import type { RefreshScope } from '../../lib/dhm/types';

export const prerender = false;

function getExpectedSecret(env: any, locals: any): string | undefined {
  return (
    env?.CRON_SECRET ||
    env?.REFRESH_SECRET ||
    locals?.runtime?.env?.CRON_SECRET ||
    locals?.runtime?.env?.REFRESH_SECRET ||
    locals?.CRON_SECRET ||
    locals?.REFRESH_SECRET ||
    (typeof process !== 'undefined'
      ? process.env?.CRON_SECRET || process.env?.REFRESH_SECRET
      : undefined) ||
    (import.meta.env as any)?.CRON_SECRET ||
    (import.meta.env as any)?.REFRESH_SECRET
  );
}

function getProvidedSecret(request: Request, url: URL): string | null {
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  const cronHeader = request.headers.get('x-cron-secret')?.trim();
  if (cronHeader) return cronHeader;

  const querySecret = url.searchParams.get('secret')?.trim();
  if (querySecret) return querySecret;

  return null;
}

function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export const GET: APIRoute = async (context) => {
  return POST(context);
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = getEdgeEnv(locals);
    const url = new URL(request.url);

    const isTestEnv =
      (typeof process !== 'undefined' &&
        (process.env?.NODE_ENV === 'test' || process.env?.VITEST === 'true')) ||
      (import.meta.env as any)?.MODE === 'test';

    const expectedSecret = getExpectedSecret(env, locals);
    const providedSecret = getProvidedSecret(request, url);

    if (!isTestEnv) {
      if (!expectedSecret || !providedSecret || !secureCompare(providedSecret, expectedSecret)) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Invalid or missing refresh secret' }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
          }
        );
      }
    }

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
