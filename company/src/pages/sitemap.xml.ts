import { sitemapResponse } from '../lib/sitemap';
import { languages } from '../lib/i18n';
import { toolGuides } from '../lib/tool-guides';
export function GET({ site }: { site: URL | undefined }) {
  if (!site) throw new Error('Configure astro.config.mjs site for the sitemap.');
  // Root negotiates browser language; legal originals remain noindex.
  const url=(lang:string)=>new URL('/'+lang+'/',site);
  const entries = languages.map(lang=>({url:url(lang),alternatives:[...languages.map(language=>({language,url:url(language)})),{language:'x-default',url:url('en')}]}));
  const guides=['timer',...toolGuides.map(guide=>guide.slug)];
  const guideEntries=guides.flatMap(slug=>languages.map(lang=>({
    url:new URL('/'+lang+'/tools/'+slug+'/',site),
    alternatives:[...languages.map(language=>({language,url:new URL('/'+language+'/tools/'+slug+'/',site)})),{language:'x-default',url:new URL('/en/tools/'+slug+'/',site)}],
  })));
  return sitemapResponse([...entries,...guideEntries]);
}
