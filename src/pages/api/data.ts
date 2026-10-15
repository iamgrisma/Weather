import type { APIRoute } from 'astro';
import { getEdgeEnv, getLatestSnapshot } from '../../lib/storage/edge-storage';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    const env = getEdgeEnv(locals);
    const snapshot = await getLatestSnapshot(env);

    const headers = new Headers({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=180, stale-while-revalidate=600',
      'ETag': `"${snapshot.hash}"`,
      'X-Data-Source': snapshot.source,
      'X-Fetched-At': new Date(snapshot.fetchedAt).toISOString(),
    });

    return new Response(JSON.stringify(snapshot), {
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
