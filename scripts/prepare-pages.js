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
if (fs.existsSync(path.join(rootDir, 'public'))) {
  const pubFiles = fs.readdirSync(path.join(rootDir, 'public'));
  pubFiles.forEach((asset) => {
    const pubPath = path.join(rootDir, 'public', asset);
    if (fs.statSync(pubPath).isFile()) {
      fs.copyFileSync(pubPath, path.join(distDir, asset));
      console.log(`[prepare-pages] Copied ${asset} to dist/ root`);
    }
  });
}

// 1.2 Copy all directory index.html files to flat .html files alongside them
// (e.g. dist/about/index.html -> dist/about.html) WITHOUT deleting the directory!
// This allows Cloudflare Pages to serve /about with 200 OK (no 308 redirect)
// while keeping directory assets intact for Astro manifest!
function copyDirectoryIndexToFlatHtml(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && !['_astro', 'server', 'client'].includes(entry.name)) {
      const fullPath = path.join(dir, entry.name);
      copyDirectoryIndexToFlatHtml(fullPath);
      const indexPath = path.join(fullPath, 'index.html');
      const flatHtml = `${fullPath}.html`;
      if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, flatHtml);
        console.log(`[prepare-pages] Created flat ${path.relative(distDir, flatHtml)} alongside index.html`);
      }
    }
  }
}
copyDirectoryIndexToFlatHtml(distDir);

// Remove _redirects completely (Zero Redirection policy)
[path.join(clientDir, '_redirects'), path.join(distDir, '_redirects')].forEach((f) => {
  if (fs.existsSync(f)) {
    fs.rmSync(f, { force: true });
    console.log(`[prepare-pages] Removed ${path.basename(f)} (zero redirects policy)`);
  }
});

// 2. Create _worker.js pointing to server/entry.mjs with ASSETS fallback and isolated cron triggers
const workerFile = path.join(distDir, '_worker.js');
const workerContent = `import serverEntry from './server/entry.mjs';

export default {
  async fetch(req, env, ctx) {
    globalThis.__CF_ENV__ = env;
    if (env.ASSETS) {
      const url = new URL(req.url);
      if (
        url.pathname === '/favicon.ico' ||
        url.pathname.startsWith('/favicon') ||
        url.pathname.startsWith('/apple-touch-icon') ||
        url.pathname === '/robots.txt' ||
        url.pathname === '/ads.txt' ||
        url.pathname.endsWith('.ico') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.webp')
      ) {
        const assetRes = await env.ASSETS.fetch(req);
        if (assetRes.status < 400) return assetRes;
      }
    }
    return serverEntry.fetch(req, env, ctx);
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
console.log('[prepare-pages] Created dist/_worker.js delegating to serverEntry with static asset support');

// 3. Ensure _routes.json excludes static assets for optimal Cloudflare Edge serving
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
console.log('[prepare-pages] Created dist/_routes.json with static asset exclusions');

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
let assetsIgnore = 'wrangler.json\n.dev.vars\n';
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
  const tomlContent = `name = "topnepali"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "./dist"

[vars]
URL = "https://topnepali.com"
WORDPRESS_URL = "https://wp.topnepali.com"
PUBLIC_GTM_ID = "GTM-MD2NWFJ"
PUBLIC_GA_ID = "G-K2R0GSQE0M"
PUBLIC_ADSENSE_ID = "ca-pub-5410507143596599"
`;
  fs.writeFileSync(wranglerTomlFile, tomlContent);
  console.log('[prepare-pages] Created default wrangler.toml');
}

console.log('[prepare-pages] Cloudflare Pages/Worker bundle preparation complete!');
