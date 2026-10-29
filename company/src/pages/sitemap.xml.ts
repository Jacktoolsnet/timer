import { sitemapResponse } from '../lib/sitemap';
import { languages } from '../lib/i18n';
export function GET({ site }: { site: URL | undefined }) {
  if (!site) throw new Error('Configure astro.config.mjs site for the sitemap.');
  // Root negotiates browser language; legal originals remain noindex.
  const url=(lang:string)=>new URL('/'+lang+'/',site);
  return sitemapResponse(languages.map(lang=>({url:url(lang),alternatives:[...languages.map(language=>({language,url:url(language)})),{language:'x-default',url:url('en')}]})));
}
