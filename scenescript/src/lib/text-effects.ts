export type TextEffects={outline:{enabled:boolean;color:string;width:number};glow:{enabled:boolean;color:string;intensity:number};shadow:{enabled:boolean;color:string;blur:number;x:number;y:number;opacity:number}};
export function defaultTextEffects():TextEffects{return {outline:{enabled:false,color:'#000000',width:2},glow:{enabled:false,color:'#ff66cc',intensity:16},shadow:{enabled:false,color:'#000000',blur:6,x:4,y:4,opacity:.7}};}
export function parseTextEffects(value:unknown,path:string):TextEffects{
 const defaults=defaultTextEffects();if(value===undefined)return defaults;
 const object=(v:unknown,p:string,allowed:string[])=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error(p+': expected object');const o=v as Record<string,unknown>;for(const k of Object.keys(o))if(!allowed.includes(k))throw new Error(p+'.'+k+': unknown field');return o;};
 const number=(v:unknown,p:string,min:number,max:number)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error(p+': expected number '+min+'–'+max);return v;};
 const color=(v:unknown,p:string)=>{if(typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v))throw new Error(p+': expected #RRGGBB');return v;};
 const enabled=(v:unknown,p:string)=>{if(typeof v!=='boolean')throw new Error(p+': expected boolean');return v;};
 const o=object(value,path,['glow','shadow','outline']);const g={...defaults.glow,...(o.glow===undefined?{}:object(o.glow,path+'.glow',['enabled','color','intensity']))},s={...defaults.shadow,...(o.shadow===undefined?{}:object(o.shadow,path+'.shadow',['enabled','color','blur','x','y','opacity']))};
 const outline={...defaults.outline,...(o.outline===undefined?{}:object(o.outline,path+'.outline',['enabled','color','width']))};
 return {outline:{enabled:enabled(outline.enabled,path+'.outline.enabled'),color:color(outline.color,path+'.outline.color'),width:number(outline.width,path+'.outline.width',0,20)},glow:{enabled:enabled(g.enabled,path+'.glow.enabled'),color:color(g.color,path+'.glow.color'),intensity:number(g.intensity,path+'.glow.intensity',0,100)},shadow:{enabled:enabled(s.enabled,path+'.shadow.enabled'),color:color(s.color,path+'.shadow.color'),blur:number(s.blur,path+'.shadow.blur',0,100),x:number(s.x,path+'.shadow.x',-100,100),y:number(s.y,path+'.shadow.y',-100,100),opacity:number(s.opacity,path+'.shadow.opacity',0,1)}};
}
/** Shared by editor, recording view, rich text and the export renderer. */
export function textEffectsCSS(e:TextEffects,scale=1):string{
 const shadows:string[]=[];const {glow:g,shadow:s}=e;
 if(g.enabled&&g.intensity>0)for(const factor of [.25,.6,1])shadows.push(`0 0 ${g.intensity*factor*scale}px ${g.color}`);
 if(s.enabled&&s.opacity>0){const rgb=[1,3,5].map(i=>parseInt(s.color.slice(i,i+2),16));shadows.push(`${s.x*scale}px ${s.y*scale}px ${s.blur*scale}px rgba(${rgb.join(',')},${s.opacity})`);}
 return shadows.join(', ')||'none';
}

export function textOutlineCSS(e:TextEffects,scale=1):string{
 return e.outline.enabled&&e.outline.width>0?`${e.outline.width*scale}px ${e.outline.color}`:'0px transparent';
}
