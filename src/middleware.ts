import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const url = context.url;
  const host = url.hostname.toLowerCase();
  const isProd = host === 'weather.topnepali.com';

  // 1. In-memory trailing slash normalization (Zero redirect hops)
  if (url.pathname !== '/' && url.pathname.endsWith('/')) {
    const cleanPath = url.pathname.replace(/\/+$/, '') || '/';
    const target = cleanPath + (url.search || '');
    const rewritten = await context.rewrite(target);
    if (!isProd) {
      rewritten.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    }
    return rewritten;
  }

  const response = await next();

  // 2. Multi-domain governance & No-Index on non-production hosts (GEMINI.md Rule #3)
  if (!isProd) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  }

  // 3. Cloudflare Edge Cache-Control Strategy
  const pathname = url.pathname;

  if (pathname.startsWith('/api/refresh')) {
    // Only bypass edge cache if the endpoint explicitly authenticated and emitted no-store
    if (response.headers.get('Cache-Control')?.includes('no-store')) {
      response.headers.delete('CDN-Cache-Control');
      response.headers.delete('Cloudflare-CDN-Cache-Control');
    } else {
      response.headers.set(
        'Cache-Control',
        'public, max-age=60, s-maxage=480, stale-while-revalidate=600'
      );
      response.headers.set('CDN-Cache-Control', 'public, max-age=480, stale-while-revalidate=600');
      response.headers.set('Cloudflare-CDN-Cache-Control', 'max-age=480, stale-while-revalidate=600');
    }
  } else if (pathname.startsWith('/api/image-proxy')) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400'
    );
  } else if (pathname.startsWith('/api/data')) {
    // API data: Browser caches 60s, Cloudflare Edge caches 8 min, SWR 10 min
    response.headers.set(
      'Cache-Control',
      'public, max-age=60, s-maxage=480, stale-while-revalidate=600'
    );
    response.headers.set('CDN-Cache-Control', 'public, max-age=480, stale-while-revalidate=600');
    response.headers.set('Cloudflare-CDN-Cache-Control', 'max-age=480, stale-while-revalidate=600');
  } else if (
    pathname.startsWith('/_astro/') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.svg')
  ) {
    // Static immutable hashed assets: 1 year cache
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    response.headers.set('CDN-Cache-Control', 'public, max-age=31536000, immutable');
    response.headers.set('Cloudflare-CDN-Cache-Control', 'max-age=31536000, immutable');
  } else {
    // SSR HTML Pages: Browser caches 1 min, Cloudflare Edge caches 1 hour (purged on demand when live data updates)
    const isHtml = response.headers.get('content-type')?.includes('text/html');
    if (isHtml || !response.headers.has('Cache-Control')) {
      response.headers.set(
        'Cache-Control',
        'public, max-age=60, s-maxage=3600, stale-while-revalidate=7200'
      );
      response.headers.set('CDN-Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200');
      response.headers.set('Cloudflare-CDN-Cache-Control', 'max-age=3600, stale-while-revalidate=7200');
    }
  }

  return response;
});
