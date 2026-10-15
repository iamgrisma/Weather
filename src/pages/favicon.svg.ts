import type { APIRoute } from 'astro';

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="8" fill="#0284c7"/>
  <circle cx="21" cy="11" r="3" fill="#f59e0b"/>
  <path d="M6 24l5-7 3.5 4.5 4.5-6.5 7 9H6z" fill="#ffffff"/>
  <path d="M12 24l4-5.5 3 4 2-2.5 3 4H12z" fill="#93c5fd" opacity="0.6"/>
</svg>`;

export const GET: APIRoute = async () => {
  return new Response(svgContent, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
    },
  });
};
