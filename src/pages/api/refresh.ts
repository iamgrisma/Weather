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

    // Read scope from query param or JSON body
    let scope: RefreshScope = (url.searchParams.get('scope') as RefreshScope) || 'river';
    const force = url.searchParams.get('force') === 'true';

    try {
      if (request.headers.get('content-type')?.includes('application/json')) {
        const body = await request.json();
        if (body.scope) scope = body.scope;
      }
    } catch {}

    const result = await refreshScopedWithCooldown(scope, env, force);

    const headers = new Headers({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Refresh-Scope': result.scope,
      'X-Cooldown-Remaining': String(result.cooldownRemainingMinutes),
    });

    return new Response(JSON.stringify(result), {
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
