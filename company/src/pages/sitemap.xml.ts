import { sitemapResponse } from '../lib/sitemap';
export function GET({ site }: { site: URL | undefined }) {
  if (!site) throw new Error('Configure astro.config.mjs site for the sitemap.');
  // Legal documents and the 404 page are noindex and intentionally excluded.
  return sitemapResponse([{ url: new URL('/', site) }]);
}
