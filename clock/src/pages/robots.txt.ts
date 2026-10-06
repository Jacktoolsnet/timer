export function GET({ site }: { site: URL | undefined }) {
  if (!site) throw new Error('Configure astro.config.mjs site for robots.txt.');
  return new Response('User-agent: *\nAllow: /\nSitemap: ' + new URL('/sitemap.xml', site).href + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
