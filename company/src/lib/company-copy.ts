import copy from './company-copy.json';
import type { Language } from './i18n';
export function companyTranslator(lang: Language) {
 return (text: string): string => {
  if (lang === 'de') return text;
  const entry = (copy as Record<string,Record<string,string>>)[text];
  if (!entry?.[lang]) throw new Error('Missing company translation: '+lang+' / '+text);
  return entry[lang];
 };
}
export function localizedToolUrl(url: string, lang: Language) {
 return url.replace('/de/', '/'+lang+'/');
}
