export type LiquidEffect={enabled:boolean;style:'water'|'melt';strength:number;wavelength:number;speed:number};
export function defaultLiquid():LiquidEffect{return {enabled:false,style:'water',strength:24,wavelength:120,speed:1};}
export function parseLiquid(value:unknown,path:string):LiquidEffect{
 const d=defaultLiquid();if(value===undefined)return d;
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(path+': expected object');
 const o=value as Record<string,unknown>;for(const k of Object.keys(o))if(!Object.hasOwn(d,k))throw new Error(path+'.'+k+': unknown field');
 const v={...d,...o};
 if(typeof v.enabled!=='boolean')throw new Error(path+'.enabled: expected boolean');
 if(v.style!=='water'&&v.style!=='melt')throw new Error(path+'.style: expected water or melt');
 const num=(key:'strength'|'wavelength'|'speed',min:number,max:number)=>{
  const n=v[key];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw new Error(path+'.'+key+': expected number '+min+'–'+max);return n;
 };
 return {enabled:v.enabled,style:v.style,strength:num('strength',0,100),wavelength:num('wavelength',10,500),speed:num('speed',0,5)};
}
/** Driven by element-local timeline time, never wall time or random state. */
export function liquidState(e:LiquidEffect,elapsed:number){
 const phase=Math.max(0,elapsed)*e.speed;
 const x=(1+Math.sin(phase*1.3)*.22)/e.wavelength;
 const y=(1+Math.cos(phase*.9)*.22)/e.wavelength*(e.style==='melt'?.35:1);
 return {frequency:`${x} ${y}`,strength:e.enabled?e.strength*(1+Math.sin(phase*.8)*.15):0};
}
