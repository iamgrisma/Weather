import type { APIRoute } from 'astro';
import { getEdgeEnv, refreshStaleScopes, purgeEdgeCacheForScopes } from '../../lib/storage/edge-storage';
import type { RefreshScope } from '../../lib/dhm/types';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals, url }) => {
  try {
    const env = getEdgeEnv(locals);
    const rawScope = url.searchParams.get('scope') as RefreshScope | null;
    const scope: RefreshScope = rawScope || 'all';

    // Anti-DDOS protection on force=true:
    // Only internal scheduled crons or requests with valid CRON_SECRET can force-bypass cooldowns
    const cronSecret = request.headers.get('x-cron-secret') || url.searchParams.get('secret');
    const isAuthorized = Boolean(env.CRON_SECRET && cronSecret === env.CRON_SECRET);
    const force = isAuthorized && url.searchParams.get('force') === 'true';

    const result = await refreshStaleScopes(env, scope, force);

    // Invalidate Edge Cache Shield for routes whose data actually updated
    if (result.updatedScopes.length > 0) {
      purgeEdgeCacheForScopes(url.origin, result.updatedScopes);
    }

    const headers = new Headers({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': force
        ? 'no-store, no-cache, must-revalidate'
        : 'public, max-age=60, s-maxage=480, stale-while-revalidate=600',
      'X-Refresh-Status': result.status,
    });

    if (!force) {
      headers.set('CDN-Cache-Control', 'public, max-age=480, stale-while-revalidate=600');
      headers.set('Cloudflare-CDN-Cache-Control', 'max-age=480, stale-while-revalidate=600');
    }

    const includeFull = url.searchParams.get('full') === 'true';
    const payload = includeFull
      ? result
      : {
          success: true,
          status: result.status,
          message: result.message,
          refreshedAt: result.refreshedAt,
          updatedScopes: result.updatedScopes,
          unchangedScopes: result.unchangedScopes,
          freshScopes: result.freshScopes,
          cooldowns: result.cooldowns,
        };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error('API /refresh error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        status: 'error',
        error: err?.message || 'Failed to refresh data',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
};

export const POST: APIRoute = async (context) => {
  return GET(context);
};
