import { languages } from '../lib/i18n';
import { sitemapResponse } from '../lib/sitemap';
export function GET({ site }: { site: URL | undefined }) {
  if (!site) throw new Error('Configure astro.config.mjs site for the sitemap.');
  // Include only canonical, indexable pages, not redirects or noindex legal pages.
  const modes = ['', 'pomodoro', 'training'];
  const url = (language: string, mode: string) => new URL('/' + language + '/' + (mode ? mode + '/' : ''), site);
  return sitemapResponse(modes.flatMap(mode => languages.map(language => ({
    url: url(language, mode),
    alternatives: [
      ...languages.map(alternative => ({ language: alternative, url: url(alternative, mode) })),
      { language: 'x-default', url: url('en', mode) },
    ],
  }))));
}
