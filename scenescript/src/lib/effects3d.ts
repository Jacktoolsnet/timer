import {vec,norm,vector3DInput,record3D,fields3D,numeric3D,type V3} from './path3d.ts';
/** Object-neutral effect anchors and absolute-time events; no executable payloads. */
export type EffectSite3D={id:string;part:string;position:V3;direction:V3;radius:number;debris:string[];fireColor:string;smokeColor:string;sparkColor:string};
export type Effect3D={actor:string;site:string;kind:'burn'|'explode'|'damage';at:number;duration:number;intensity:number;seed:number;result:'none'|'char'|'hide'|'break'};
export const defaultEffectSite3D=():EffectSite3D=>({id:'site',part:'part',position:vec(),direction:vec(0,1,0),radius:1,debris:[],fireColor:'#ff8638',smokeColor:'#343d49',sparkColor:'#fff0b0'});
export const defaultEffect3D=():Effect3D=>({actor:'',site:'site',kind:'explode',at:0,duration:1.5,intensity:1,seed:1,result:'none'});
const id=(v:unknown,p:string)=>{if(typeof v!=='string'||! /^[A-Za-z0-9_-]{1,100}$/.test(v))throw new Error(p+': invalid identifier');return v;};
const color=(v:unknown,p:string)=>{if(typeof v!=='string'||!/^#[a-f\d]{6}$/i.test(v))throw new Error(p+': expected #RRGGBB');return v;};
function choice<T extends string>(v:unknown,values:readonly T[],p:string):T{if(!values.includes(v as T))throw new Error(p+': '+values.join(', '));return v as T;}
export function parseEffectSites3D(value:unknown,parts:readonly {id:string;parent:string}[],path:string):EffectSite3D[]{
 const raw=value===undefined?[]:value;if(!Array.isArray(raw)||raw.length>32)throw new Error(path+': maximum 32 sites');
 const ids=new Set<string>(),available=new Map(parts.map(p=>[p.id,p.parent]));
 return raw.map((item,i)=>{const p=path+'['+i+']',v=record3D(item,p),d=defaultEffectSite3D();fields3D(v,Object.keys(d),p);
  const site=id(v.id,p+'.id'),part=id(v.part,p+'.part');if(ids.has(site))throw new Error(p+'.id: duplicate site');ids.add(site);if(!available.has(part))throw new Error(p+'.part: missing part');
  const direction=vector3DInput(v.direction,p+'.direction',d.direction);if(Math.hypot(direction.x,direction.y,direction.z)<1e-5)throw new Error(p+'.direction: expected nonzero vector');
  const debris=v.debris??[];if(!Array.isArray(debris)||debris.length>24)throw new Error(p+'.debris: maximum 24 part IDs');
  const selected=new Set<string>();for(const name of debris){id(name,p+'.debris');if(selected.has(name))throw new Error(p+'.debris: duplicate part');selected.add(name);let current=name;while(current&&current!==part)current=available.get(current)??'';if(current!==part)throw new Error(p+'.debris: must reference the site part or its descendants');}
  return {id:site,part,position:vector3DInput(v.position,p+'.position'),direction:norm(direction),radius:numeric3D(v.radius??d.radius,p+'.radius',.01,20),debris:[...selected],fireColor:color(v.fireColor??d.fireColor,p+'.fireColor'),smokeColor:color(v.smokeColor??d.smokeColor,p+'.smokeColor'),sparkColor:color(v.sparkColor??d.sparkColor,p+'.sparkColor')};
 });
}
export function parseEffects3D(value:unknown,sites:(actor:string)=>readonly EffectSite3D[]|undefined,duration:number,path:string):Effect3D[]{
 const raw=value===undefined?[]:value;if(!Array.isArray(raw)||raw.length>32)throw new Error(path+': maximum 32 events');
 return raw.map((item,i)=>{const p=path+'['+i+']',v=record3D(item,p),d=defaultEffect3D();fields3D(v,Object.keys(d),p);
  const actor=v.actor===undefined?'':v.actor===''?'':id(v.actor,p+'.actor'),site=id(v.site,p+'.site'),available=sites(actor);
  if(!available)throw new Error(p+'.actor: missing actor');if(!available.some(s=>s.id===site))throw new Error(p+'.site: missing effect site on target model');
  const seed=numeric3D(v.seed??d.seed,p+'.seed',0,4294967295);if(!Number.isInteger(seed))throw new Error(p+'.seed: expected integer');
  // Negative at carries the SAME event across a cut. Result persists until the
  // scene ends, even after particles die; no previous playback is required.
  return {actor,site,kind:choice(v.kind??d.kind,['burn','explode','damage'],p+'.kind'),at:numeric3D(v.at??d.at,p+'.at',-86400,duration),duration:numeric3D(v.duration??d.duration,p+'.duration',.01,3600),intensity:numeric3D(v.intensity??d.intensity,p+'.intensity',.1,4),seed,result:choice(v.result??d.result,['none','char','hide','break'],p+'.result')};
 });
}
export function effectState3D(e:Effect3D,time:number){
 const age=time-e.at,started=age>=0,active=started&&age<e.duration,progress=Math.max(0,Math.min(1,age/e.duration));
 return {age,started,active,progress,result:started&&(e.kind!=='burn'||age>=e.duration)?e.result:'none' as Effect3D['result']};
}
/** Counter-based randomness: identical seeds are identical after any seek. */
export function effectRandom3D(seed:number,index:number,channel=0){let h=(seed^Math.imul(index+1,0x9e3779b9)^Math.imul(channel+1,0x85ebca6b))>>>0;h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);return ((h^(h>>>16))>>>0)/4294967296;}

export function effectDebrisState3D(e:Effect3D,time:number){
 const at=e.at+(e.kind==='burn'?e.duration:0),duration=e.kind==='burn'?1.5:e.duration,age=time-at;
 return {at,duration,age,active:e.result==='break'&&age>=0&&age<duration};
}
