import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = ({ url }) => {
  const host = url.hostname;
  const isProduction = host === 'weather.topnepali.com';

  const body = isProduction
    ? `User-agent: *
Allow: /

Sitemap: https://weather.topnepali.com/sitemap.xml
`
    : `User-agent: *
Disallow: /
`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
