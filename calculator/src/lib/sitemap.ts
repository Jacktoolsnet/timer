/** Static sitemap XML: absolute canonical URLs, escaped values and readable output. */
export type SitemapEntry = { url: URL; alternatives?: { language: string; url: URL }[] };
function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}
export function sitemapResponse(entries: SitemapEntry[]): Response {
  const multilingual = entries.some(entry => entry.alternatives?.length);
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' + (multilingual ? ' xmlns:xhtml="http://www.w3.org/1999/xhtml"' : '') + '>',
  ];
  for (const entry of entries) {
    lines.push('  <url>', '    <loc>' + escapeXml(entry.url.href) + '</loc>');
    for (const alternative of entry.alternatives ?? []) {
      lines.push('    <xhtml:link rel="alternate" hreflang="' + escapeXml(alternative.language) + '" href="' + escapeXml(alternative.url.href) + '" />');
    }
    lines.push('  </url>');
  }
  lines.push('</urlset>', '');
  return new Response(lines.join('\n'), {headers: {'Content-Type': 'application/xml; charset=utf-8'}});
}
