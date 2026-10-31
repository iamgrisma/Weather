import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const clientDir = path.join(distDir, 'client');
const serverDir = path.join(distDir, 'server');
const dotWranglerDir = path.join(rootDir, '.wrangler');
const serverWranglerJson = path.join(serverDir, 'wrangler.json');

if (process.env.DEPLOY_TARGET === 'node') {
  console.log('[prepare-pages] DEPLOY_TARGET is node, skipping Cloudflare Pages bundle preparation.');
  process.exit(0);
}

console.log('[prepare-pages] Adapting Astro build for Cloudflare Pages Advanced Mode...');

// 1. Copy client assets to root of dist/
if (fs.existsSync(clientDir)) {
  const items = fs.readdirSync(clientDir);
  for (const item of items) {
    const src = path.join(clientDir, item);
    const dest = path.join(distDir, item);
    fs.cpSync(src, dest, { recursive: true, force: true });
  }
  console.log(`[prepare-pages] Copied static client assets to dist/ root (${items.length} items)`);
}

// 1.1 Ensure root-level public files are present at dist/ root
const publicDir = path.join(rootDir, 'public');
const publicFileNames = fs.existsSync(publicDir) ? new Set(fs.readdirSync(publicDir)) : new Set();
if (fs.existsSync(publicDir)) {
  publicFileNames.forEach((asset) => {
    const pubPath = path.join(publicDir, asset);
    if (fs.statSync(pubPath).isFile()) {
      fs.copyFileSync(pubPath, path.join(distDir, asset));
      console.log(`[prepare-pages] Copied ${asset} to dist/ root`);
    }
  });
}

// 1.2 Clean up any stale SSR route HTML files/directories to guarantee Cloudflare Worker SSR invocation
// Dynamic routes must NEVER have static .html files in dist/, otherwise Cloudflare Pages serves stale files!
const ssrRoutes = [
  'index',
  'weather',
  'river-watch',
  'bulletin',
  'city-forecast',
  'mountaineering',
  'special-weather',
  'nwp',
  'press-releases',
  'ne/index',
  'ne/weather',
  'ne/river-watch',
  'ne/bulletin',
  'ne/city-forecast',
  'ne/mountaineering',
  'ne/special-weather',
  'ne/nwp',
  'ne/press-releases'
];

ssrRoutes.forEach((route) => {
  const flatHtml = path.join(distDir, `${route}.html`);
  const dirHtml = path.join(distDir, route, 'index.html');
  const dir = path.join(distDir, route);

  if (fs.existsSync(flatHtml)) {
    fs.rmSync(flatHtml, { force: true });
    console.log(`[prepare-pages] Pruned stale SSR static HTML: ${route}.html`);
  }
  if (fs.existsSync(dirHtml)) {
    fs.rmSync(dirHtml, { force: true });
    console.log(`[prepare-pages] Pruned stale SSR directory index: ${route}/index.html`);
  }
  if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
  }
});

// Remove _redirects completely (Zero Redirection policy)
[path.join(clientDir, '_redirects'), path.join(distDir, '_redirects')].forEach((f) => {
  if (fs.existsSync(f)) {
    fs.rmSync(f, { force: true });
    console.log(`[prepare-pages] Removed ${path.basename(f)} (zero redirects policy)`);
  }
});

// 2. Create _worker.js delegating to server/entry.mjs with Edge Cache API Shield & scheduled crons
const workerFile = path.join(distDir, '_worker.js');
const workerContent = `import serverEntry from './server/entry.mjs';

const STATIC_EXT_REGEX = /\\.(svg|ico|png|jpg|jpeg|webp|woff2?|ttf|eot|css|js|txt|xml|xsl|json|map)$/i;

export default {
  async fetch(req, env, ctx) {
    globalThis.__CF_ENV__ = env;
    const url = new URL(req.url);

    // Static Asset Fast-Path:
    // Serve static bundle assets from Cloudflare Pages ASSETS binding directly.
    const isStaticAsset = url.pathname.startsWith('/_astro/') ||
      url.pathname === '/favicon.ico' ||
      url.pathname === '/robots.txt' ||
      url.pathname === '/ads.txt' ||
      STATIC_EXT_REGEX.test(url.pathname);

    if ((req.method === 'GET' || req.method === 'HEAD') && isStaticAsset && env.ASSETS) {
      try {
        const assetRes = await env.ASSETS.fetch(req);
        if (assetRes && assetRes.status === 200) {
          return assetRes;
        }
      } catch (e) {}
    }

    // Edge Cache API Shield (GEMINI.md Rule 8): Query caches.default before SSR execution (0ms CPU)
    if ((req.method === 'GET' || req.method === 'HEAD') && !url.pathname.startsWith('/api/')) {
      try {
        const cache = caches.default;
        const cachedRes = await cache.match(req);
        if (cachedRes) {
          const resHeaders = new Headers(cachedRes.headers);
          resHeaders.set('x-worker-cache', 'HIT');
          if (req.method === 'HEAD') {
            return new Response(null, {
              status: cachedRes.status,
              statusText: cachedRes.statusText,
              headers: resHeaders,
            });
          }
          return new Response(cachedRes.body, {
            status: cachedRes.status,
            statusText: cachedRes.statusText,
            headers: resHeaders,
          });
        }
      } catch (cErr) {}
    }

    const res = await serverEntry.fetch(req, env, ctx);

    // Write successful public HTML responses into caches.default (0ms CPU for future visits)
    if (req.method === 'GET' && res && res.status === 200 && !url.pathname.startsWith('/api/')) {
      try {
        const cc = res.headers.get('cache-control') || '';
        const cl = res.headers.get('content-length');
        if (!cc.includes('no-store') && !cc.includes('private') && !cc.includes('max-age=0') && cl !== '0') {
          const cache = caches.default;
          const resClone = res.clone();
          try { resClone.headers.delete('Set-Cookie'); } catch (e) {}
          if (ctx && typeof ctx.waitUntil === 'function') {
            ctx.waitUntil(cache.put(req, resClone));
          } else {
            await cache.put(req, resClone);
          }
        }
      } catch (cPutErr) {}
    }

    return res;
  },

  async scheduled(event, env, ctx) {
    globalThis.__CF_ENV__ = env;
    const now = new Date();
    const minute = now.getUTCMinutes();
    const hour = now.getUTCHours();
    
    // Always sync critical river flood stations (every 10m)
    const scopes = ['river'];
    if (minute % 20 === 0) scopes.push('special');
    if (minute % 30 === 0) scopes.push('weather');
    if (minute === 0) scopes.push('press');
    if (hour % 6 === 0 && minute === 0) scopes.push('nwp');

    for (const scope of scopes) {
      console.log(\`[Cloudflare Cron] Running scheduled scope '\${scope}'\`);
      const refreshReq = new Request(\`https://weather.topnepali.com/api/refresh?scope=\${scope}&force=true\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      ctx.waitUntil(serverEntry.fetch(refreshReq, env, ctx));
    }
  }
};
`;
fs.writeFileSync(workerFile, workerContent);
console.log('[prepare-pages] Created dist/_worker.js delegating cleanly to serverEntry with Edge Cache API Shield');

// 3. Ensure _routes.json excludes static assets so Pages Functions handles all SSR routes
const routesJsonFile = path.join(distDir, '_routes.json');
const routes = {
  version: 1,
  include: ['/*'],
  exclude: [
    '/_astro/*',
    '/favicon.ico',
    '/favicon.svg',
    '/favicon-16x16.png',
    '/favicon-32x32.png',
    '/apple-touch-icon.png',
    '/sitemap.xsl',
    '/ads.txt'
  ]
};
fs.writeFileSync(routesJsonFile, JSON.stringify(routes, null, 2));
console.log('[prepare-pages] Created dist/_routes.json with static asset exclusions (SSR Worker handles content)');

// 3.1 Create _headers file for static asset caching
const headersFile = path.join(distDir, '_headers');
const headersContent = `/_astro/*
  Cache-Control: public, max-age=31536000, immutable
  X-Content-Type-Options: nosniff

/*.png
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400

/*.ico
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400

/*.svg
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400

/*.webp
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400
`;
fs.writeFileSync(headersFile, headersContent);
console.log('[prepare-pages] Created dist/_headers for optimal edge CDN caching');

// 4. Update .assetsignore for Cloudflare Pages (do not ignore _worker.js or server)
const assetsIgnoreFile = path.join(distDir, '.assetsignore');
let assetsIgnore = 'wrangler.json\n.dev.vars\nserver/**\n_worker.js\n';
fs.writeFileSync(assetsIgnoreFile, assetsIgnore);
console.log('[prepare-pages] Cleaned dist/.assetsignore (ensures _worker.js and assets are recognized)');

// 5. Clean up .wrangler and dist/server/wrangler.json to prevent validation errors
if (fs.existsSync(dotWranglerDir)) {
  fs.rmSync(dotWranglerDir, { recursive: true, force: true });
}
if (fs.existsSync(serverWranglerJson)) {
  fs.rmSync(serverWranglerJson, { force: true });
}

// 6. Ensure wrangler.toml exists
const wranglerTomlFile = path.join(rootDir, 'wrangler.toml');
if (!fs.existsSync(wranglerTomlFile)) {
  const tomlContent = `name = "weather"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "./dist"

[vars]
SITE_URL = "https://weather.topnepali.com"

[[kv_namespaces]]
binding = "WEATHER_KV"
id = "78c19571147c453aaa7d40b01beabe56"

[[d1_databases]]
binding = "WEATHER_DB"
database_name = "weather-db"
database_id = "adf3fcc7-642f-4e85-9182-eac62ac2af82"
`;
  fs.writeFileSync(wranglerTomlFile, tomlContent);
  console.log('[prepare-pages] Created default wrangler.toml');
}

console.log('[prepare-pages] Cloudflare Pages/Worker bundle preparation complete!');
