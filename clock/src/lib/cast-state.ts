import {colorSchemes} from './engine';
import type {SeasonalLocation} from './seasonal-location';

export const CAST_NAMESPACE='urn:x-cast:net.jacktools.clock';
export type CastState={
 version:1; type:'settings'; settings:Record<string,string|number|boolean>;
 appearance:{palette:string;style:string;theme:string;fontSize:string};
 language:string; location:SeasonalLocation|null;
};
/** Only known settings are accepted; no arbitrary CSS, HTML, URLs or local storage. */
export function validateCastState(input:unknown,defaults:Record<string,string|number|boolean>,form:HTMLFormElement):CastState|null{
 try{
  const value=(typeof input==='string'?JSON.parse(input):input) as CastState;
  if(!value||value.version!==1||value.type!=='settings'||!value.settings||!value.appearance)return null;
  const settings:CastState['settings']={};
  for(const [key,fallback] of Object.entries(defaults)){
   const next=value.settings[key];
   if(typeof next!==typeof fallback)return null;
   if(typeof next==='number'){
    if(!Number.isInteger(next)||next<0||next>100)return null;
   }else if(typeof next==='string'){
    const field=form.elements.namedItem(key) as HTMLSelectElement;
    if(key!=='zone'&&!(key==='view'&&['combined','analogFlip','binaryDigital','binaryFlip'].includes(next))&&![...field.options].some(o=>o.value===next))return null;
   }
   settings[key]=next;
  }
  settings.awake=false;
  // The sender resolves "local" before sending: the TV must not choose its own zone.
  if(settings.zone==='local')return null;
  new Intl.DateTimeFormat('en',{timeZone:String(settings.zone)}).format();
  const a=value.appearance;
  if(!(colorSchemes as readonly string[]).includes(a.palette)||!['warm','minimal','technical','soft'].includes(a.style)||!['light','dark'].includes(a.theme)||!['0','1','2','3'].includes(a.fontSize)||!['de','en','es','fr'].includes(value.language))return null;
  let location:SeasonalLocation|null=null;
  if(value.location!==null){
   const {latitude,longitude}=value.location;
   if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)return null;
   location={latitude,longitude};
  }
  return {version:1,type:'settings',settings,appearance:{palette:a.palette,style:a.style,theme:a.theme,fontSize:a.fontSize},language:value.language,location};
 }catch{return null;}
}
