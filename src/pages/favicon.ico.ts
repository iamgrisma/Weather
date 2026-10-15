import type { APIRoute } from 'astro';

const icoBase64 = 'AAABAAEAEBAAAAEAIABABAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAADHhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC////////////////////////////////////////////x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv///////////////////////////////////////////8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL////////////////////////////////////////////HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC////////////////////////////////////////////x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv///////////////////////////////////////////8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL////////////////////////////////////////////HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC////////////////////////////////////////////x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv///////////////////////////////////////////8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/x4QC/8eEAv/HhAL/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

export const GET: APIRoute = async () => {
  const binary = Uint8Array.from(atob(icoBase64), (c) => c.charCodeAt(0));
  return new Response(binary, {
    status: 200,
    headers: {
      'Content-Type': 'image/x-icon',
      'Cache-Control': 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
    },
  });
};
