import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const url = context.url;
  const host = url.hostname.toLowerCase();
  const isProd = host === 'weather.topnepali.com';

  // 1. In-memory trailing slash normalization (Zero redirect hops)
  if (url.pathname !== '/' && url.pathname.endsWith('/')) {
    const cleanPath = url.pathname.slice(0, -1);
    return context.rewrite(cleanPath);
  }

  const response = await next();

  // 2. Multi-domain governance & No-Index on non-production hosts (GEMINI.md Rule #3)
  if (!isProd) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  }

  // 3. Cloudflare Edge Cache-Control Strategy
  const pathname = url.pathname;

  if (pathname.startsWith('/api/refresh')) {
    // Always bypass cache for manual/cron revalidation triggers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  } else if (pathname.startsWith('/api/image-proxy')) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400'
    );
  } else if (pathname.startsWith('/api/data')) {
    // API data: Browser caches 30s, Cloudflare Edge caches 5 min, SWR 10 min
    response.headers.set(
      'Cache-Control',
      'public, max-age=30, s-maxage=300, stale-while-revalidate=600'
    );
  } else if (
    pathname.startsWith('/_astro/') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.ico')
  ) {
    // Static immutable hashed assets: 1 year cache
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (!response.headers.has('Cache-Control')) {
    // SSR HTML Pages: Browser caches 1 min, Cloudflare Edge caches 10 mins, SWR 20 mins
    response.headers.set(
      'Cache-Control',
      'public, max-age=60, s-maxage=600, stale-while-revalidate=1200'
    );
  }

  return response;
});
