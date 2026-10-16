export type Afterimages={enabled:boolean;count:number;spacing:number;opacity:number;tint:boolean;color:string};
export function defaultAfterimages():Afterimages{return {enabled:false,count:4,spacing:.08,opacity:.45,tint:false,color:'#66ccff'};}
export function parseAfterimages(value:unknown,path:string):Afterimages{
 const d=defaultAfterimages();if(value===undefined)return d;
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(path+': expected object');
 const o=value as Record<string,unknown>;for(const key of Object.keys(o))if(!Object.hasOwn(d,key))throw new Error(path+'.'+key+': unknown field');
 const v={...d,...o};for(const key of ['enabled','tint'] as const)if(typeof v[key]!=='boolean')throw new Error(path+'.'+key+': expected boolean');
 if(typeof v.color!=='string'||!/^#[0-9a-f]{6}$/i.test(v.color))throw new Error(path+'.color: expected #RRGGBB');
 const num=(key:'count'|'spacing'|'opacity',min:number,max:number)=>{
  const n=v[key];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||(key==='count'&&!Number.isInteger(n)))throw new Error(path+'.'+key+': expected '+(key==='count'?'integer':'number')+' '+min+'–'+max);return n;
 };
 return {enabled:v.enabled,count:num('count',1,8),spacing:num('spacing',.01,1),opacity:num('opacity',0,1),tint:v.tint,color:v.color};
}
/** Oldest first; no stored playback history, no samples before the element begins. */
export function afterimageSamples(e:Afterimages,time:number,at:number,end:number){
 if(!e.enabled||e.opacity===0||time<at||time>=end)return [];
 const samples:{index:number;time:number;opacity:number}[]=[];
 for(let index=e.count;index>=1;index--){
  const past=time-index*e.spacing;if(past<at-1e-9)continue;
  samples.push({index,time:Math.max(at,past),opacity:e.opacity*(e.count+1-index)/(e.count+1)});
 }
 return samples;
}
