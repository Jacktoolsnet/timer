/** Small declarative 3D vocabulary. No scripts, URLs or external models are executed. */
export type Character3D={name:string;bodyColor:string;headColor:string;limbColor:string;accentColor:string;height:number};
export type Stage3D={name:string;skyColor:string;groundColor:string;blockColor:string};
export type Actor3D={id:string;character:string;x:number;z:number;toX:number;toZ:number;rotation:number;scale:number;action:'idle'|'walk'|'wave';at:number;duration:number};
export type StageCamera3D={yaw:number;pitch:number;distance:number;targetX:number;targetY:number;targetZ:number;orbit:number};
export type Shot3D={stage:string;camera:StageCamera3D;actors:Actor3D[]};
export const defaultCharacter3D=():Character3D=>({name:'Robot',bodyColor:'#36a9e1',headColor:'#dde7ed',limbColor:'#64748b',accentColor:'#ffe066',height:3});
export const defaultStage3D=():Stage3D=>({name:'Block plaza',skyColor:'#a7d9f5',groundColor:'#78a653',blockColor:'#e6bd7a'});
export const defaultStageCamera3D=():StageCamera3D=>({yaw:20,pitch:18,distance:18,targetX:0,targetY:1.6,targetZ:0,orbit:0});
export const defaultActor3D=(character:string,id='actor'):Actor3D=>({id,character,x:0,z:0,toX:0,toZ:0,rotation:0,scale:1,action:'idle',at:0,duration:4});
const object=(v:unknown,p:string)=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error(p+': expected object');return v as Record<string,unknown>;};
const keys=(v:Record<string,unknown>,names:string[],p:string)=>{for(const k of Object.keys(v))if(!names.includes(k))throw new Error(p+'.'+k+': unknown field');};
const text=(v:unknown,p:string,max=200)=>{if(typeof v!=='string'||v.length>max)throw new Error(p+': expected text (max '+max+')');return v;};
const identifier=(v:unknown,p:string)=>{const s=text(v,p,100);if(!/^[A-Za-z0-9_-]+$/.test(s))throw new Error(p+': invalid identifier');return s;};
const number=(v:unknown,p:string,min:number,max:number)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error(p+': expected number '+min+'–'+max);return v;};
const color=(v:unknown,p:string)=>{const s=text(v,p,7);if(!/^#[a-f\d]{6}$/i.test(s))throw new Error(p+': expected #RRGGBB');return s;};
export function parseCharacter3D(value:unknown,path='character'):Character3D{
 const v=object(value,path),d=defaultCharacter3D();keys(v,Object.keys(d),path);
 return {name:text(v.name===undefined?d.name:v.name,path+'.name'),bodyColor:color(v.bodyColor===undefined?d.bodyColor:v.bodyColor,path+'.bodyColor'),headColor:color(v.headColor===undefined?d.headColor:v.headColor,path+'.headColor'),limbColor:color(v.limbColor===undefined?d.limbColor:v.limbColor,path+'.limbColor'),accentColor:color(v.accentColor===undefined?d.accentColor:v.accentColor,path+'.accentColor'),height:number(v.height===undefined?d.height:v.height,path+'.height',1,6)};
}
export function parseStage3D(value:unknown,path='stage'):Stage3D{
 const v=object(value,path),d=defaultStage3D();keys(v,Object.keys(d),path);
 return {name:text(v.name===undefined?d.name:v.name,path+'.name'),skyColor:color(v.skyColor===undefined?d.skyColor:v.skyColor,path+'.skyColor'),groundColor:color(v.groundColor===undefined?d.groundColor:v.groundColor,path+'.groundColor'),blockColor:color(v.blockColor===undefined?d.blockColor:v.blockColor,path+'.blockColor')};
}
export function parse3DLibrary<T>(value:unknown,parse:(v:unknown,p:string)=>T,path:string):Record<string,T>{
 const v=object(value===undefined?{}:value,path),out:Record<string,T>={};if(Object.keys(v).length>30)throw new Error(path+': maximum 30');
 for(const [id,item] of Object.entries(v)){identifier(id,path);Object.defineProperty(out,id,{value:parse(item,path+'.'+id),enumerable:true,writable:true,configurable:true});}return out;
}
export function parseShot3D(value:unknown,characters:Record<string,Character3D>,stages:Record<string,Stage3D>,duration:number,path='stage3d'):Shot3D|null{
 if(value===undefined||value===null)return null;
 const v=object(value,path);keys(v,['stage','camera','actors'],path);const stage=identifier(v.stage,path+'.stage');if(!Object.hasOwn(stages,stage))throw new Error(path+'.stage: missing stage '+stage);
 const raw=v.camera===undefined?{}:object(v.camera,path+'.camera'),d=defaultStageCamera3D();keys(raw,Object.keys(d),path+'.camera');const camera={...d};
 for(const k of Object.keys(d) as (keyof StageCamera3D)[]){const [min,max]=k==='pitch'?[5,80]:k==='distance'?[5,80]:k==='orbit'?[-30,30]:k==='yaw'?[-360,360]:k==='targetY'?[-5,15]:[-25,25];camera[k]=number(raw[k]===undefined?d[k]:raw[k],path+'.camera.'+k,min,max);}
 const list=v.actors===undefined?[]:v.actors;if(!Array.isArray(list)||list.length>12)throw new Error(path+'.actors: expected array (max 12)');const ids=new Set<string>();
 const actors=list.map((item,i)=>{const p=path+'.actors['+i+']',a=object(item,p),id=identifier(a.id,p+'.id'),character=identifier(a.character,p+'.character');if(ids.has(id))throw new Error(p+': duplicate ID');ids.add(id);if(!Object.hasOwn(characters,character))throw new Error(p+'.character: missing character '+character);keys(a,Object.keys(defaultActor3D(character)),p);
  const get=(k:string,f:unknown)=>a[k]===undefined?f:a[k];const x=number(get('x',0),p+'.x',-20,20),z=number(get('z',0),p+'.z',-20,20),at=number(get('at',0),p+'.at',0,Math.max(0,duration-.01)),span=number(get('duration',Math.min(4,duration-at)),p+'.duration',.01,duration-at),action=get('action','idle');if(!['idle','walk','wave'].includes(action as string))throw new Error(p+'.action: idle, walk, wave');
  return {id,character,x,z,toX:number(get('toX',x),p+'.toX',-20,20),toZ:number(get('toZ',z),p+'.toZ',-20,20),rotation:number(get('rotation',0),p+'.rotation',-360,360),scale:number(get('scale',1),p+'.scale',.25,3),action:action as Actor3D['action'],at,duration:span};
 });return {stage,camera,actors};
}
/** Pure absolute-time pose: seeking backwards is identical to playing forwards. */
export function actor3DPose(a:Actor3D,time:number){
 const t=Math.max(0,Math.min(a.duration,time-a.at)),p=t/a.duration,active=time>=a.at&&time<a.at+a.duration;
 const ramp=Math.max(0,Math.min(1,t/.3,(a.duration-t)/.3));
 const move=a.action==='walk',swing=move&&active?Math.sin(t*7)*.6*ramp:0,wave=a.action==='wave'&&active;
 return {x:a.x+(a.toX-a.x)*p,z:a.z+(a.toZ-a.z)*p,rotation:a.rotation*Math.PI/180,leftArm:swing,rightArm:wave&&ramp>0?-Math.PI*.8*ramp:(swing?-swing:0),leftLeg:swing?-swing:0,rightLeg:swing,wave:wave?Math.sin(t*9)*.22*Math.max(0,ramp):0,bob:move&&active?Math.abs(Math.sin(t*7))*.07*ramp:Math.sin(time*1.6)*.015};
}
export type Resource3D={format:'scenescript-3d-resource';version:'1.0';kind:'character'|'stage';id:string;definition:Character3D|Stage3D};
export const MAX_3D_RESOURCE_BYTES=32*1024;
export function parse3DResource(source:string):Resource3D{
 if(new TextEncoder().encode(source).length>MAX_3D_RESOURCE_BYTES)throw new Error('3D resource: maximum 32 KiB');const v=object(JSON.parse(source),'resource');keys(v,['format','version','kind','id','definition'],'resource');
 if(v.format!=='scenescript-3d-resource'||v.version!=='1.0'||!['character','stage'].includes(v.kind as string))throw new Error('resource: unsupported format, version or kind');
 const kind=v.kind as Resource3D['kind'];return {format:'scenescript-3d-resource',version:'1.0',kind,id:identifier(v.id,'resource.id'),definition:kind==='character'?parseCharacter3D(v.definition):parseStage3D(v.definition)};
}
/** Copy imports preserve the ID bound even when the original already has 100 characters. */
export function unique3DResourceID(preferred:string,library:Record<string,unknown>):string{
 let id=preferred;for(let n=2;Object.hasOwn(library,id);n++){const suffix='_'+n;id=preferred.slice(0,100-suffix.length)+suffix;}return id;
}
