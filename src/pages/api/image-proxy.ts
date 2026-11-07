import type { APIRoute } from 'astro';

const ALLOWED_HOSTS = ['dhm.gov.np', 'hydrology.gov.np'];

function isAllowedHost(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

export const GET: APIRoute = async ({ request, redirect }) => {
  const reqUrl = new URL(request.url);
  const targetUrl = reqUrl.searchParams.get('url');

  if (!targetUrl || !isAllowedHost(targetUrl)) {
    return new Response(JSON.stringify({ error: 'Invalid or disallowed image URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const upstreamRes = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NepalWeatherEdgeBot/1.0; +https://weather.topnepali.com)',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    }).finally(() => clearTimeout(timeout));

    if (!upstreamRes.ok) {
      // Fallback: 302 redirect to original upstream image
      return redirect(targetUrl, 302);
    }

    const contentType = (upstreamRes.headers.get('content-type') || '').toLowerCase();
    const contentLengthHeader = upstreamRes.headers.get('content-length');
    const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
    const MAX_IMAGE_BYTES = 5242880; // 5MB (5,242,880 bytes)

    // Prevent unbounded memory buffering: verify image content-type and check length before buffering
    if (!contentType.startsWith('image/') || contentLength > MAX_IMAGE_BYTES) {
      return redirect(targetUrl, 302);
    }

    const body = await upstreamRes.arrayBuffer();

    // Guard against chunked transfers without content-length header
    if (body.byteLength > MAX_IMAGE_BYTES) {
      return redirect(targetUrl, 302);
    }

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType || 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        'X-Proxied-By': 'NepalWeather-EdgeCache',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    // On proxy failure, redirect to upstream origin so browser renders image directly
    return redirect(targetUrl, 302);
  }
};
