/** Stable JSON values; labels follow the app locale. Existing free-text values remain valid. */
const languages=[['en','English'],['de','German'],['es','Spanish'],['fr','French'],['it','Italian'],['pt','Portuguese'],['nl','Dutch'],['pl','Polish'],['cs','Czech'],['da','Danish'],['sv','Swedish'],['no','Norwegian'],['fi','Finnish'],['el','Greek'],['tr','Turkish'],['uk','Ukrainian'],['ru','Russian'],['ar','Arabic'],['hi','Hindi'],['zh','Chinese'],['ja','Japanese'],['ko','Korean']] as const;
export function videoLanguageForLocale(locale:string){return languages.find(([code])=>code===locale.toLowerCase().split('-')[0])?.[1]??'English';}
export function videoLanguageOptions(locale:string,current:string):[string,string][]{
 let display:Intl.DisplayNames;try{display=new Intl.DisplayNames([locale||'en'],{type:'language'});}catch{display=new Intl.DisplayNames(['en'],{type:'language'});}
 const options:[string,string][]=languages.map(([code,name])=>{
  const native=new Intl.DisplayNames([code],{type:'language'}).of(code)??name,label=display.of(code)??name;
  const aliases=[code,name,native,label].map(s=>s.toLocaleLowerCase());
  return [aliases.includes(current.toLocaleLowerCase())?current:name,label];
 });
 // Imported plans may use regional variants, custom values, or an empty field.
 if(!options.some(([value])=>value===current))options.push([current,current||'—']);return options;
}

/** Resolve saved English/native/UI language names once, not per voice/language. */
let languageAliases:Map<string,string>|undefined;
export function videoLanguageCode(value:string):string|null{
 if(!languageAliases){languageAliases=new Map();for(const [code,name]of languages){languageAliases.set(code,code);languageAliases.set(name.toLowerCase(),code);for(const locale of new Set(['en','de','es','fr',code])){const label=new Intl.DisplayNames([locale],{type:'language'}).of(code);if(label)languageAliases.set(label.toLowerCase(),code);}}}
 return languageAliases.get(value.trim().toLowerCase())??null;
}
