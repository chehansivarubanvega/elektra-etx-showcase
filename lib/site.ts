/**
 * Absolute site origin for `metadataBase`, sitemap, and Open Graph.
 * Set `NEXT_PUBLIC_SITE_URL` in production (e.g. Vercel env).
 * Falls back to Vercel preview URL, then a sensible default.
 */
export function getSiteUrlString(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'https://www.elektrateq.com';
}

export function getMetadataBaseUrl(): URL {
  return new URL(getSiteUrlString() + '/');
}
