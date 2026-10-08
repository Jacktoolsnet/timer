import {languages} from '../lib/i18n';
import {sitemapResponse} from '../lib/sitemap';
export function GET({site}:{site:URL|undefined}){
 if(!site)throw new Error('Missing site');
 return sitemapResponse(['','ai/'].flatMap(route=>languages.map(lang=>({url:new URL('/'+lang+'/'+route,site),alternatives:[...languages.map(language=>({language,url:new URL('/'+language+'/'+route,site)})),{language:'x-default',url:new URL('/en/'+route,site)}]}))));
}
