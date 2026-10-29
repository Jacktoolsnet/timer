import {parseEffectSites3D,type EffectSite3D} from './effects3d.ts';
import {parseExtrusion3D,type Extrusion3D} from './extrusion3d.ts';
import {parseProfile3D,type Profile3D} from './profile3d.ts';
import {parseTexture3D,type Texture3D} from './texture3d.ts';
/** Declarative, bounded construction vocabulary. No executable code or external URLs. */
export type Vector3D={x:number;y:number;z:number};
export const vector3D=(value=0):Vector3D=>({x:value,y:value,z:value});
export const shapes3D=['group','box','sphere','capsule','cylinder','cone','plane','profile','extrusion'] as const;
export const jointControls3D=['none','mouth','speech','happy','sad','angry','surprised','blink','leftArm','rightArm','leftLeg','rightLeg','wave','bob'] as const;
export const signedJointControls3D=['leftArm','rightArm','leftLeg','rightLeg','wave','bob'] as const;
/** Signed action drivers use target as a calibration gain; the final pose is still clamped. */
export function jointTargetBounds3D(control:string,motion:string,min:number,max:number):[number,number]{
 if(!(signedJointControls3D as readonly string[]).includes(control))return [min,max];
 const bound=motion==='rotation'?3600:motion==='morph'?1:50;return [motion==='scale'||motion==='morph'?0:-bound,bound];
}
export type Joint3D={id:string;motion:'rotation'|'translation'|'scale'|'morph';axis:'x'|'y'|'z';min:number;max:number;value:number;control:typeof jointControls3D[number];target:number;responses:Partial<Record<typeof jointControls3D[number],number>>};
export type Part3D={roundness?:number;smooth?:boolean;extrusion?:Extrusion3D;profile?:Profile3D;texture?:Texture3D;finish?:'standard'|'polished'|'glass';id:string;parent:string;palette:string;instances:Vector3D[];shape:typeof shapes3D[number];position:Vector3D;rotation:Vector3D;pivot:Vector3D;size:Vector3D;color:string;roughness:number;metalness:number;opacity:number;joints:Joint3D[]};
export type JointKey3D={at:number;value:number};
export type JointTrack3D={joint:string;keys:JointKey3D[];easing:'linear'|'ease-in-out'};
export type ModelAnimation3D={duration:number;tracks:JointTrack3D[]};
export type Model3D={effectSites?:EffectSite3D[];parts:Part3D[];animations:Record<string,ModelAnimation3D>};
export type ModelMotion3D={animation:string;at:number;duration:number;speed:number;loop:boolean;blend:number};
export const defaultJoint3D=():Joint3D=>({id:'joint',motion:'rotation',axis:'x',min:-180,max:180,value:0,control:'none',target:180,responses:{}});
export const defaultPart3D=():Part3D=>({id:'part',parent:'',palette:'',instances:[],shape:'box',position:vector3D(),rotation:vector3D(),pivot:vector3D(),size:vector3D(1),color:'#36a9e1',roughness:.78,metalness:.08,opacity:1,joints:[]});
export const defaultModelMotion3D=():ModelMotion3D=>({animation:'',at:0,duration:1,speed:1,loop:false,blend:.2});
const obj=(v:unknown,p:string)=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error(p+': expected object');return v as Record<string,unknown>;};
const fields=(v:Record<string,unknown>,allowed:string[],p:string)=>{for(const k of Object.keys(v))if(!allowed.includes(k))throw new Error(p+'.'+k+': unknown field');};
const num=(v:unknown,p:string,min:number,max:number)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error(p+': expected number '+min+'–'+max+'; received '+(typeof v==='number'?String(v):v===null?'null':typeof v));return v;};
const id=(v:unknown,p:string)=>{if(typeof v!=='string'||v.length>100||!/^[a-zA-Z0-9_-]+$/.test(v))throw new Error(p+': invalid identifier');return v;};
const choice=<T extends string>(v:unknown,values:readonly T[],p:string):T=>{if(!values.includes(v as T))throw new Error(p+': '+values.join(', '));return v as T;};
function vector(v:unknown,p:string,fallback:Vector3D,min:number,max:number):Vector3D{
 const value=v===undefined?{}:obj(v,p);fields(value,['x','y','z'],p);
 return Object.fromEntries((['x','y','z'] as const).map(k=>[k,num(value[k]===undefined?fallback[k]:value[k],p+'.'+k,min,max)])) as Vector3D;
}
export function parseModel3D(value:unknown,path='model'):Model3D|null{
 if(value===undefined||value===null)return null;
 const v=obj(value,path);fields(v,['parts','animations','effectSites'],path);
 if(!Array.isArray(v.parts)||!v.parts.length||v.parts.length>512)throw new Error(path+'.parts: expected 1–512 parts');
 const ids=new Set<string>(),joints=new Map<string,Joint3D>();let jointCount=0;
 const parts:Part3D[]=v.parts.map((value,index)=>{
  const p=path+'.parts['+index+']',v=obj(value,p),d=defaultPart3D();fields(v,[...Object.keys(d),'roundness','smooth','finish','texture','profile','extrusion'],p);
  const get=(key:keyof Part3D)=>v[key]===undefined?d[key]:v[key],partId=id(v.id,p+'.id');if(ids.has(partId))throw new Error(p+'.id: duplicate part');ids.add(partId);
  const parent=get('parent')===''?'':id(v.parent,p+'.parent'),shape=choice(get('shape'),shapes3D,p+'.shape');
  const color=get('color');if(typeof color!=='string'||!/^#[a-f\d]{6}$/i.test(color))throw new Error(p+'.color: expected #RRGGBB');
  const list=get('joints');if(!Array.isArray(list)||list.length>6)throw new Error(p+'.joints: maximum 6');
  const axes=new Set<string>();
  const parsedJoints:Joint3D[]=list.map((value,index)=>{
   const path=p+'.joints['+index+']',v=obj(value,path),d=defaultJoint3D();fields(v,Object.keys(d),path);
   const jointId=id(v.id,path+'.id');if(joints.has(jointId)||++jointCount>256)throw new Error(path+'.id: duplicate joint or maximum 256');
   const motion=choice(v.motion===undefined?d.motion:v.motion,['rotation','translation','scale','morph'],path+'.motion'),axis=choice(v.axis===undefined?d.axis:v.axis,['x','y','z'],path+'.axis'),bound=motion==='rotation'?3600:motion==='morph'?1:50;
   if(motion==='morph'&&(shape!=='profile'||axis!=='y'))throw new Error(path+': morph requires profile shape and axis y');
   if(axes.has(motion+axis))throw new Error(path+': duplicate motion/axis');axes.add(motion+axis);
   const min=num(v.min,path+'.min',motion==='scale'||motion==='morph'?0:-bound,bound),max=num(v.max,path+'.max',min,bound),rest=num(v.value===undefined?(motion==='scale'?1:0):v.value,path+'.value',min,max);
   const responseValues=obj(v.responses===undefined?{}:v.responses,path+'.responses'),responses:Joint3D['responses']={};
   for(const [name,value]of Object.entries(responseValues)){choice(name,jointControls3D,path+'.responses');if(name==='none')throw new Error(path+'.responses.none: no signal');Object.defineProperty(responses,name,{value:num(value,path+'.responses.'+name,min,max),enumerable:true,writable:true,configurable:true});}
   const control=choice(v.control===undefined?'none':v.control,jointControls3D,path+'.control'),[targetMin,targetMax]=jointTargetBounds3D(control,motion,min,max);
   const joint:Joint3D={responses,id:jointId,motion,axis,min,max,value:rest,control,target:num(v.target===undefined?max:v.target,path+'.target',targetMin,targetMax)};joints.set(jointId,joint);return joint;
  });
  const palette=get('palette')===''?'':id(get('palette'),p+'.palette'),rawInstances=get('instances');
  if(!Array.isArray(rawInstances)||rawInstances.length>256)throw new Error(p+'.instances: maximum 256');
  if(shape==='group'&&parsedJoints.some(j=>j.motion==='scale'))throw new Error(p+'.joints: scale affects mesh geometry, not groups');
  if(rawInstances.length&&shape==='profile')throw new Error(p+'.instances: profiles cannot be instanced');
  if(rawInstances.length&&shape==='group')throw new Error(p+'.instances: group nodes cannot be instanced; use geometry parts');
  const instances=rawInstances.map((v,i)=>vector(v,p+'.instances['+i+']',vector3D(),-50,50));
  const extrusion=parseExtrusion3D(v.extrusion,shape,p+'.extrusion');
  const profile=parseProfile3D(v.profile,shape,p+'.profile');
  const texture=parseTexture3D(v.texture,shape,p+'.texture');
  if(v.roundness!==undefined&&(shape!=='box'||typeof v.roundness!=='number'||!Number.isFinite(v.roundness)||v.roundness<0||v.roundness>.49))throw new Error(p+'.roundness: box only, expected number 0–0.49');
  if(v.smooth!==undefined&&typeof v.smooth!=='boolean')throw new Error(p+'.smooth: expected boolean');
  if(v.smooth===true&&!['box','sphere','capsule','cylinder','cone'].includes(shape))throw new Error(p+'.smooth: requires primitive geometry');
  const finish=choice(v.finish===undefined?'standard':v.finish,['standard','polished','glass'],p+'.finish');
  return {...(v.roundness===undefined?{}:{roundness:v.roundness as number}),...(v.smooth===true?{smooth:true}:{}),...(extrusion?{extrusion}:{}),...(profile?{profile}:{}),...(texture?{texture}:{}),...(finish==='standard'?{}:{finish}),id:partId,parent,palette,instances,shape,color,position:vector(v.position,p+'.position',d.position,-50,50),rotation:vector(v.rotation,p+'.rotation',d.rotation,-360,360),pivot:vector(v.pivot,p+'.pivot',d.pivot,-50,50),size:vector(v.size,p+'.size',d.size,.01,50),roughness:num(get('roughness'),p+'.roughness',0,1),metalness:num(get('metalness'),p+'.metalness',0,1),opacity:num(get('opacity'),p+'.opacity',0,1),joints:parsedJoints};
 });
 if(parts.reduce((n,p)=>n+(p.extrusion?[p.extrusion.contour,...p.extrusion.holes].reduce((m,r)=>m+r.length,0):0),0)>16000)throw new Error(path+': maximum 16000 extrusion points per model');
 const parents=new Map(parts.map(p=>[p.id,p.parent]));
 for(const part of parts){let current=part.id;const seen=new Set<string>();while(current){if(!parents.has(current))throw new Error(path+'.parts.'+part.id+'.parent: missing part '+current);if(seen.has(current))throw new Error(path+'.parts.'+part.id+'.parent: hierarchy cycle');if(seen.size>=32)throw new Error(path+'.parts: maximum hierarchy depth 32');seen.add(current);current=parents.get(current)!;}}
 const raw=v.animations===undefined?{}:obj(v.animations,path+'.animations'),animations:Model3D['animations']={};let keyCount=0;
 if(Object.keys(raw).length>16)throw new Error(path+'.animations: maximum 16');
 for(const [name,value] of Object.entries(raw)){
  id(name,path+'.animations');const p=path+'.animations.'+name,v=obj(value,p);fields(v,['duration','tracks'],p);const duration=num(v.duration,p+'.duration',.01,3600);
  if(!Array.isArray(v.tracks)||!v.tracks.length||v.tracks.length>64)throw new Error(p+'.tracks: expected 1–64');
  const used=new Set<string>();const tracks:JointTrack3D[]=v.tracks.map((value,index)=>{
   const path=p+'.tracks['+index+']',v=obj(value,path);fields(v,['joint','keys','easing'],path);const joint=id(v.joint,path+'.joint'),definition=joints.get(joint);
   if(!definition||used.has(joint))throw new Error(path+'.joint: missing or duplicate joint');used.add(joint);
   if(!Array.isArray(v.keys)||!v.keys.length||v.keys.length>64)throw new Error(path+'.keys: expected 1–64');let last=-1;
   const keys=v.keys.map((value,index)=>{const p=path+'.keys['+index+']',v=obj(value,p);fields(v,['at','value'],p);if(++keyCount>4096)throw new Error(path+': maximum 4096 keys per model');
    const at=num(v.at,p+'.at',0,duration);if(index===0&&at!==0||at<=last)throw new Error(p+'.at: first key at 0, then strictly increasing');last=at;
    return {at,value:num(v.value,p+'.value',definition.min,definition.max)};
   });return {joint,keys,easing:choice(v.easing===undefined?'linear':v.easing,['linear','ease-in-out'],path+'.easing')};
  });Object.defineProperty(animations,name,{value:{duration,tracks},enumerable:true,writable:true,configurable:true});
 }
 const effectSites=parseEffectSites3D(v.effectSites,parts,path+'.effectSites');
 return {...(effectSites.length?{effectSites}:{}),parts,animations};
}
export function modelJoints3D(model:Model3D|null){return new Map(model?.parts.flatMap(p=>p.joints.map(j=>[j.id,j] as const))??[]);}
export function parseJointValues3D(value:unknown,model:Model3D|null,path:string):Record<string,number>{
 const v=obj(value===undefined?{}:value,path),available=modelJoints3D(model),out:Record<string,number>={};
 for(const [name,value]of Object.entries(v)){const joint=available.get(name);if(!joint)throw new Error(path+'.'+name+': missing joint');Object.defineProperty(out,name,{value:num(value,path+'.'+name,joint.min,joint.max),enumerable:true,writable:true,configurable:true});}return out;
}
export function parseModelMotions3D(value:unknown,model:Model3D|null,duration:number,path:string):ModelMotion3D[]{
 const list=value===undefined?[]:value;if(!Array.isArray(list)||list.length>64)throw new Error(path+': maximum 64 motions');let end=0;
 return list.map((value,index)=>{
  const p=path+'['+index+']',v=obj(value,p),d=defaultModelMotion3D();fields(v,Object.keys(d),p);
  const animation=id(v.animation,p+'.animation');if(!model||!Object.hasOwn(model.animations,animation))throw new Error(p+'.animation: missing animation');
  const at=num(v.at===undefined?end:v.at,p+'.at',0,duration-.01+1e-9),span=num(v.duration,p+'.duration',.01,duration-at+1e-9);if(at<end-1e-9)throw new Error(p+'.at: ordered non-overlapping motions required');end=at+span;
  const loop=v.loop===undefined?false:v.loop;if(typeof loop!=='boolean')throw new Error(p+'.loop: expected boolean');
  return {animation,at,duration:span,loop,speed:num(v.speed===undefined?1:v.speed,p+'.speed',.01,10),blend:num(v.blend===undefined?.2:v.blend,p+'.blend',0,2)};
 });
}
const smooth=(n:number)=>{const x=Math.max(0,Math.min(1,n));return x*x*(3-2*x);};
/** Absolute-time evaluation, no mutation, integration, or playback-history state. */
export function modelPose3D(model:Model3D,overrides:Record<string,number>,motions:readonly ModelMotion3D[],time:number,controls:Partial<Record<typeof jointControls3D[number],number>>={}):Map<string,number>{
 const definitions=modelJoints3D(model),values=new Map<string,number>();for(const [id,joint]of definitions)values.set(id,Object.hasOwn(overrides,id)?overrides[id]:joint.value);
 const event=motions.find(m=>time>=m.at&&time<m.at+m.duration);
 if(event){
  const clip=model.animations[event.animation],elapsed=time-event.at,clock=elapsed*event.speed;
  const local=event.loop?clock%clip.duration:Math.min(clock,clip.duration),blend=Math.min(event.blend,event.duration/2),weight=blend?smooth(Math.min(elapsed/blend,(event.duration-elapsed)/blend)):1;
  for(const track of clip.tracks){let left=track.keys[0],right=left;for(const key of track.keys){if(key.at>local){right=key;break;}left=right=key;}
   let f=right.at>left.at?(local-left.at)/(right.at-left.at):0;if(track.easing==='ease-in-out')f=smooth(f);
   const base=values.get(track.joint)!;values.set(track.joint,base+(left.value+(right.value-left.value)*f-base)*weight);
  }
 }
 const weight=(signal:typeof jointControls3D[number])=>signal==='none'?0:Math.max(['leftArm','rightArm','leftLeg','rightLeg','wave','bob'].includes(signal)?-1:0,Math.min(1,controls[signal]??0));
 for(const [id,joint]of definitions){const base=values.get(id)!;let value=base;
  for(const [signal,target]of Object.entries(joint.responses))value+=(target!-base)*weight(signal as typeof jointControls3D[number]);
  value+=(joint.target-value)*weight(joint.control);values.set(id,Math.max(joint.min,Math.min(joint.max,value)));
 }
 return values;
}
/** Conservative framing radius, including nested translations, pivot offsets and joint travel. */
export function modelRadius3D(model:Model3D):number{
 const parts=new Map(model.parts.map(p=>[p.id,p]));let radius=1;
 for(const part of model.parts){let reach=part.shape==='profile'?Math.hypot(part.size.x/2,part.size.y,part.size.z/2):Math.hypot(part.size.x,part.size.y,part.size.z)/2;for(const j of part.joints)if(j.motion==='scale')reach*=Math.max(1,j.max);reach+=Math.max(0,...part.instances.map(p=>Math.hypot(p.x,p.y,p.z)));if(part.extrusion)reach*=1.1;let current:Part3D|undefined=part;
  while(current){reach+=Math.hypot(current.position.x,current.position.y,current.position.z)+2*Math.hypot(current.pivot.x,current.pivot.y,current.pivot.z);for(const joint of current.joints)if(joint.motion==='translation')reach+=Math.max(Math.abs(joint.min),Math.abs(joint.max));current=parts.get(current.parent);}radius=Math.max(radius,reach);
 }return radius;
}

export const modelPartCount3D=(model:Model3D|null)=>model?.parts.reduce((sum,p)=>sum+Math.max(1,p.instances.length),0)??0;
