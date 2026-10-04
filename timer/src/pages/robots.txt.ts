export function GET({ site }: { site: URL | undefined }) {
  return new Response('User-agent: *\nAllow: /\nSitemap: ' + new URL('/sitemap.xml', site) + '\n');
}
