import { languages } from '../lib/i18n';
import { sitemapResponse } from '../lib/sitemap';
export function GET({ site }: { site: URL | undefined }) {
 if (!site) throw new Error('Missing site');
 const url = (lang: string) => new URL('/'+lang+'/',site);
 return sitemapResponse(languages.map(lang => ({url:url(lang),alternatives:[...languages.map(language => ({language,url:url(language)})),{language:'x-default',url:url('en')}]})));
}
