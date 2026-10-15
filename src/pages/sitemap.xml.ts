import type { APIRoute } from 'astro';

export const prerender = false;

const routes = [
  { path: '', priority: '1.0', changefreq: 'hourly' },
  { path: '/river-watch', priority: '0.9', changefreq: 'always' },
  { path: '/weather', priority: '0.9', changefreq: 'hourly' },
  { path: '/nwp', priority: '0.8', changefreq: 'hourly' },
  { path: '/bulletin', priority: '0.8', changefreq: 'hourly' },
  { path: '/mountaineering', priority: '0.8', changefreq: 'hourly' },
  { path: '/city-forecast', priority: '0.8', changefreq: 'hourly' },
  { path: '/special-weather', priority: '0.7', changefreq: 'daily' },
  { path: '/press-releases', priority: '0.7', changefreq: 'daily' },
];

export const GET: APIRoute = () => {
  const baseUrl = 'https://weather.topnepali.com';
  const now = new Date().toISOString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

  for (const r of routes) {
    const enLoc = `${baseUrl}${r.path}`;
    const neLoc = `${baseUrl}/ne${r.path}`;

    // English URL
    xml += `  <url>
    <loc>${enLoc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
    <xhtml:link rel="alternate" hreflang="en" href="${enLoc}"/>
    <xhtml:link rel="alternate" hreflang="ne" href="${neLoc}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${enLoc}"/>
  </url>
`;

    // Nepali URL
    xml += `  <url>
    <loc>${neLoc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
    <xhtml:link rel="alternate" hreflang="ne" href="${neLoc}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${enLoc}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${enLoc}"/>
  </url>
`;
  }

  xml += `</urlset>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=14400',
    },
  });
};
