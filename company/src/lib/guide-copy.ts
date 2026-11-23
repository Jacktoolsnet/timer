import copy from './guide-copy.json' with { type: 'json' };
import type { Language } from './i18n';
import { toolGuides, type ToolGuide } from './tool-guides';
import { localizedToolUrl } from './company-copy';

/** No fallback: an incomplete translation must fail the build, not publish mixed copy. */
export function guideTranslator(lang: Language) {
 return (text: string): string => {
  if (lang === 'de') return text;
  const entry = (copy as Record<string,Record<string,string>>)[text];
  if (entry?.[lang]) return entry[lang];
  throw new Error('Missing guide translation: '+lang+' / '+text);
 };
}
export function localizedGuides(lang: Language): ToolGuide[] {
 const t=guideTranslator(lang);
 const translate=(value:unknown,key=''):unknown=>{
  if(typeof value==='string') return ['slug','id'].includes(key)?value:key==='url'?localizedToolUrl(value,lang):t(value);
  if(Array.isArray(value)) return value.map(item=>translate(item));
  if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,translate(v,k)]));
  return value;
 };
 return translate(toolGuides) as ToolGuide[];
}
