export const exposureModes=['screen','multiply','overlay','soft-light','lighten'] as const;
export type Exposure={enabled:boolean;mode:typeof exposureModes[number];strength:number};
export function defaultExposure():Exposure{return {enabled:false,mode:'screen',strength:.65};}
export function parseExposure(value:unknown,path:string):Exposure{
 const d=defaultExposure();if(value===undefined)return d;
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(path+': expected object');
 const o=value as Record<string,unknown>;for(const key of Object.keys(o))if(!Object.hasOwn(d,key))throw new Error(path+'.'+key+': unknown field');
 const v={...d,...o};
 if(typeof v.enabled!=='boolean')throw new Error(path+'.enabled: expected boolean');
 if(!(exposureModes as readonly unknown[]).includes(v.mode))throw new Error(path+'.mode: expected '+exposureModes.join(', '));
 if(typeof v.strength!=='number'||!Number.isFinite(v.strength)||v.strength<0||v.strength>1)throw new Error(path+'.strength: expected number 0–1');
 return {enabled:v.enabled,mode:v.mode as Exposure['mode'],strength:v.strength};
}
/** Mix with lower layers in the same scene; existing fades/opacity still apply. */
export function exposureCSS(e:Exposure,opacity:number){
 return {mixBlendMode:e.enabled?e.mode:'normal',opacity:String(opacity*(e.enabled?e.strength:1))};
}
