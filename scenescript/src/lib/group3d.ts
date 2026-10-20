import {vec,add,mul,eulerFrame3D,localVector3D,record3D,fields3D,numeric3D,vector3DInput,type V3,type Frame3D} from './path3d.ts';
import {modelPartCount3D} from './model3d.ts';
import type {Character3D} from './stage3d.ts';
export type Group3D={name:string;characters:string[];layout:'grid'|'scatter'|'points';count:number;columns:number;spacing:V3;size:V3;points:V3[];seed:number;jitter:V3;rotation:number;rotationVariation:number;scale:number;scaleVariation:number;animation:string;speed:number;speedVariation:number;phase:number};
export type GroupPlacement3D={id:string;group:string;x:number;y:number;z:number;rotation:number;scale:number;timeOffset:number};
export const defaultGroup3D=():Group3D=>({name:'Group',characters:[],layout:'grid',count:12,columns:6,spacing:vec(1.3,.5,1.5),size:vec(10,0,10),points:[],seed:1,jitter:vec(),rotation:0,rotationVariation:0,scale:1,scaleVariation:0,animation:'',speed:1,speedVariation:0,phase:0});
export const defaultGroupPlacement3D=(group:string,id='group'):GroupPlacement3D=>({id,group,x:0,y:0,z:0,rotation:0,scale:1,timeOffset:0});
const identifier=(v:unknown,p:string)=>{if(typeof v!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(v))throw new Error(p+': expected ID');return v;};
const integer=(v:unknown,p:string,min:number,max:number)=>{const n=numeric3D(v,p,min,max);if(!Number.isInteger(n))throw new Error(p+': expected integer');return n;};
export function parseGroup3D(value:unknown,characters:Record<string,Character3D>,path='group'):Group3D{
 const v=record3D(value,path),d=defaultGroup3D();fields3D(v,Object.keys(d),path);const get=(k:keyof Group3D)=>v[k]===undefined?d[k]:v[k];
 const name=get('name');if(typeof name!=='string'||name.length>200)throw new Error(path+'.name: expected text (max 200)');
 const sources=get('characters');if(!Array.isArray(sources)||!sources.length||sources.length>16)throw new Error(path+'.characters: expected 1–16 character IDs');const refs=sources.map((id,i)=>identifier(id,path+'.characters['+i+']'));if(new Set(refs).size!==refs.length)throw new Error(path+'.characters: duplicate ID');for(const id of refs)if(!Object.hasOwn(characters,id))throw new Error(path+'.characters: missing character '+id);
 const layout=get('layout');if(layout!=='grid'&&layout!=='scatter'&&layout!=='points')throw new Error(path+'.layout: grid, scatter, points');
 const raw=get('points');if(!Array.isArray(raw)||raw.length>256)throw new Error(path+'.points: maximum 256');const points=raw.map((v,i)=>vector3DInput(v,path+'.points['+i+']'));
 const count=integer(v.count===undefined&&layout==='points'?points.length:get('count'),path+'.count',1,256);if(layout==='points'&&count!==points.length)throw new Error(path+'.count: must equal points.length');if(layout!=='points'&&points.length)throw new Error(path+'.points: requires layout points');
 const vector=(key:'spacing'|'size'|'jitter')=>{const result=vector3DInput(v[key],path+'.'+key,d[key]);for(const k of ['x','y','z'] as const)numeric3D(result[k],path+'.'+key+'.'+k,key==='spacing'?-50:0,key==='jitter'?10:50);return result;};
 const animation=get('animation');if(typeof animation!=='string'||animation!==''&&!/^[A-Za-z0-9_-]{1,100}$/.test(animation))throw new Error(path+'.animation: expected clip ID or empty');for(const id of refs)if(animation&&!Object.hasOwn(characters[id].model?.animations??{},animation))throw new Error(path+'.animation: missing clip '+animation+' in '+id);
 return {name,characters:refs,layout,count,points,columns:integer(get('columns'),path+'.columns',1,256),spacing:vector('spacing'),size:vector('size'),jitter:vector('jitter'),seed:integer(get('seed'),path+'.seed',0,4294967295),rotation:numeric3D(get('rotation'),path+'.rotation',-360,360),rotationVariation:numeric3D(get('rotationVariation'),path+'.rotationVariation',0,180),scale:numeric3D(get('scale'),path+'.scale',.25,3),scaleVariation:numeric3D(get('scaleVariation'),path+'.scaleVariation',0,.5),animation,speed:numeric3D(get('speed'),path+'.speed',.01,10),speedVariation:numeric3D(get('speedVariation'),path+'.speedVariation',0,.5),phase:numeric3D(get('phase'),path+'.phase',0,3600)};
}
export function parseGroupPlacements3D(value:unknown,groups:Record<string,Group3D>,path='groups'):GroupPlacement3D[]{
 const raw=value===undefined?[]:value;if(!Array.isArray(raw)||raw.length>16)throw new Error(path+': maximum 16');const ids=new Set<string>();
 return raw.map((item,i)=>{const p=path+'['+i+']',v=record3D(item,p),id=identifier(v.id,p+'.id'),group=identifier(v.group,p+'.group'),d=defaultGroupPlacement3D(group,id);fields3D(v,Object.keys(d),p);if(ids.has(id))throw new Error(p+'.id: duplicate ID');ids.add(id);if(!Object.hasOwn(groups,group))throw new Error(p+'.group: missing group '+group);const get=(k:keyof GroupPlacement3D)=>v[k]===undefined?d[k]:v[k];return {id,group,x:numeric3D(get('x'),p+'.x',-50,50),y:numeric3D(get('y'),p+'.y',-50,50),z:numeric3D(get('z'),p+'.z',-50,50),rotation:numeric3D(get('rotation'),p+'.rotation',-360,360),scale:numeric3D(get('scale'),p+'.scale',.25,3),timeOffset:numeric3D(get('timeOffset'),p+'.timeOffset',-3600,3600)};});
}
export type GroupMember3D={character:string;position:V3;rotation:number;scale:number;speed:number;phase:number};
const layouts=new WeakMap<Group3D,readonly GroupMember3D[]>();
/** Seeded once per immutable definition, never Math.random() or per-frame randomness. */
export function groupMembers3D(group:Group3D):readonly GroupMember3D[]{
 const cached=layouts.get(group);if(cached)return cached;let state=group.seed>>>0;
 const random=()=>{state=(state+0x6D2B79F5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;},signed=()=>random()*2-1;
 const members=Array.from({length:group.count},(_,i)=>{
  const character=group.characters[Math.floor(random()*group.characters.length)],row=Math.floor(i/group.columns),col=i%group.columns;
  let position=group.layout==='points'?group.points[i]:group.layout==='scatter'?vec(signed()*group.size.x/2,signed()*group.size.y/2,signed()*group.size.z/2):vec((col-(Math.min(group.columns,group.count)-1)/2)*group.spacing.x,row*group.spacing.y,row*group.spacing.z);
  position=add(position,vec(signed()*group.jitter.x,signed()*group.jitter.y,signed()*group.jitter.z));
  return {character,position,rotation:group.rotation+signed()*group.rotationVariation,scale:group.scale*(1+signed()*group.scaleVariation),speed:group.speed*(1+signed()*group.speedVariation),phase:random()*group.phase};
 });layouts.set(group,members);return members;
}
export function groupMemberFrame3D(member:GroupMember3D,placement:GroupPlacement3D):Frame3D{
 const parent=eulerFrame3D(0,placement.rotation*Math.PI/180,0),frame=eulerFrame3D(0,(placement.rotation+member.rotation)*Math.PI/180,0);return {...frame,position:add(vec(placement.x,placement.y,placement.z),localVector3D(parent,mul(member.position,placement.scale)))};
}
/** Every copy (including instanced parts) counts, even when a template happens to be hidden. */
export function groupBudget3D(placements:readonly GroupPlacement3D[],groups:Record<string,Group3D>,characters:Record<string,Character3D>,path:string){
 let copies=0,parts=0;for(const placement of placements){const group=groups[placement.group];copies+=group.count;if(copies>256)throw new Error(path+': maximum 256 group members');for(const member of groupMembers3D(group))parts+=modelPartCount3D(characters[member.character].model);}return parts;
}
export function groupAnimationTime3D(member:GroupMember3D,placement:GroupPlacement3D,time:number,duration:number){const local=(time+placement.timeOffset)*member.speed+member.phase;return ((local%duration)+duration)%duration;}
