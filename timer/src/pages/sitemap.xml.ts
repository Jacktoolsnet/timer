import { languages } from '../lib/i18n';
export function GET({ site }: { site: URL | undefined }) {
  const base = site ?? new URL('https://timer.jacktools.net');
  const urls = languages.flatMap(lang => ['','pomodoro','training'].map(mode => {
    const alternatives = languages.map(l => '<xhtml:link rel="alternate" hreflang="' + l + '" href="' + new URL('/' + l + '/' + (mode ? mode + '/' : ''), base) + '"/>').join('');
    return '<url><loc>' + new URL('/' + lang + '/' + (mode ? mode + '/' : ''), base) + '</loc>' + alternatives + '<xhtml:link rel="alternate" hreflang="x-default" href="' + new URL('/en/' + (mode ? mode + '/' : ''), base) + '"/></url>';
  })).join('');
  return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' + urls + '</urlset>', { headers: { 'Content-Type': 'application/xml' } });
}
