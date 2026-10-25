import type { APIRoute } from 'astro';

export const prerender = true;

const ADS_TXT = `google.com, pub-5410507143596599, DIRECT, f08c47fec0942fa0
ezoic.ai, dbf5a1854ebbfd3400f48fcd724aac5a, DIRECT
ezoic.co.uk, dbf5a1854ebbfd3400f48fcd724aac5a, DIRECT
themediagrid.com, Q19AKF, DIRECT, 35d5010d7789b49d
sonobi.com, 192ecdea01, RESELLER, d1a215d9eb5aee9e
google.com, pub-6644558441501035, DIRECT, f08c47fec0942fa0
google.com, pub-1175987143200523, RESELLER, f08c47fec0942fa0
`;

export const GET: APIRoute = () => {
  return new Response(ADS_TXT, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
    },
  });
};
