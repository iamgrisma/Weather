/**
 * Helper to route remote DHM & Hydrology assets through edge image cache
 */
export function getProxiedImageUrl(originalUrl?: string | null): string {
  if (!originalUrl) return '';
  if (originalUrl.startsWith('/api/image-proxy')) return originalUrl;
  if (originalUrl.includes('dhm.gov.np') || originalUrl.includes('hydrology.gov.np')) {
    return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
  }
  return originalUrl;
}
