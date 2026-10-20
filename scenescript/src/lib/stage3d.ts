/** Small declarative 3D vocabulary. No scripts, URLs or external models are executed. */
export const expressions3D=['neutral','happy','sad','angry','surprised','blink'] as const;
export type Expression3D=typeof expressions3D[number];
export type ActorExpression3D={expression:Expression3D;at:number;duration:number;intensity:number;blend:number};
export const defaultActorExpression3D=():ActorExpression3D=>({expression:'neutral',at:0,duration:1,intensity:1,blend:.2});
export type FacePose3D=Record<Exclude<Expression3D,'neutral'>,number>;
export type Character3D={expression:Expression3D;style:'classic'|'robot'|'pixel'|'brick';name:string;bodyColor:string;headColor:string;limbColor:string;accentColor:string;height:number};
export type Stage3D={name:string;skyColor:string;groundColor:string;blockColor:string};
export type ActorAction3D={type:'idle'|'walk'|'wave'|'turn';at:number;duration:number;toX:number|null;toZ:number|null;rotation:number|null;target:string;faceMovement:boolean;blend:number;easing:'linear'|'ease-in-out'};
export const defaultActorAction3D=():ActorAction3D=>({type:'idle',at:0,duration:1,toX:null,toZ:null,rotation:null,target:'',faceMovement:false,blend:.3,easing:'ease-in-out'});
export type ActorSpeech3D={source:'scene'|'project';strength:number};
export const defaultActorSpeech3D=():ActorSpeech3D=>({source:'scene',strength:1});
export type Actor3D={speech:ActorSpeech3D|null;expressions:ActorExpression3D[];actions:ActorAction3D[];id:string;character:string;x:number;z:number;toX:number;toZ:number;rotation:number;scale:number;action:'idle'|'walk'|'wave';at:number;duration:number};
export type StageCamera3D={yaw:number;pitch:number;distance:number;targetX:number;targetY:number;targetZ:number;orbit:number};
export type Shot3D={stage:string;camera:StageCamera3D;actors:Actor3D[]};
export const defaultCharacter3D=():Character3D=>({expression:'neutral',style:'classic',name:'Robot',bodyColor:'#36a9e1',headColor:'#dde7ed',limbColor:'#64748b',accentColor:'#ffe066',height:3});
export const defaultStage3D=():Stage3D=>({name:'Block plaza',skyColor:'#a7d9f5',groundColor:'#78a653',blockColor:'#e6bd7a'});
export const defaultStageCamera3D=():StageCamera3D=>({yaw:20,pitch:18,distance:18,targetX:0,targetY:1.6,targetZ:0,orbit:0});
export const defaultActor3D=(character:string,id='actor'):Actor3D=>({speech:null,expressions:[],actions:[],id,character,x:0,z:0,toX:0,toZ:0,rotation:0,scale:1,action:'idle',at:0,duration:4});
const object=(v:unknown,p:string)=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error(p+': expected object');return v as Record<string,unknown>;};
const keys=(v:Record<string,unknown>,names:string[],p:string)=>{for(const k of Object.keys(v))if(!names.includes(k))throw new Error(p+'.'+k+': unknown field');};
const text=(v:unknown,p:string,max=200)=>{if(typeof v!=='string'||v.length>max)throw new Error(p+': expected text (max '+max+')');return v;};
const identifier=(v:unknown,p:string)=>{const s=text(v,p,100);if(!/^[A-Za-z0-9_-]+$/.test(s))throw new Error(p+': invalid identifier');return s;};
const number=(v:unknown,p:string,min:number,max:number)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error(p+': expected number '+min+'–'+max);return v;};
const color=(v:unknown,p:string)=>{const s=text(v,p,7);if(!/^#[a-f\d]{6}$/i.test(s))throw new Error(p+': expected #RRGGBB');return s;};
export function parseCharacter3D(value:unknown,path='character'):Character3D{
 const v=object(value,path),d=defaultCharacter3D();keys(v,Object.keys(d),path);
 const style=v.style===undefined?d.style:v.style;if(!['classic','robot','pixel','brick'].includes(style as string))throw new Error(path+'.style: classic, robot, pixel, brick');
 const expression=v.expression===undefined?d.expression:v.expression;if(!expressions3D.includes(expression as Expression3D))throw new Error(path+'.expression: '+expressions3D.join(', '));
 return {expression:expression as Expression3D,style:style as Character3D['style'],name:text(v.name===undefined?d.name:v.name,path+'.name'),bodyColor:color(v.bodyColor===undefined?d.bodyColor:v.bodyColor,path+'.bodyColor'),headColor:color(v.headColor===undefined?d.headColor:v.headColor,path+'.headColor'),limbColor:color(v.limbColor===undefined?d.limbColor:v.limbColor,path+'.limbColor'),accentColor:color(v.accentColor===undefined?d.accentColor:v.accentColor,path+'.accentColor'),height:number(v.height===undefined?d.height:v.height,path+'.height',1,6)};
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
  const rawActions=get('actions',[]);if(!Array.isArray(rawActions)||rawActions.length>64)throw new Error(p+'.actions: expected array (max 64)');let previousEnd=0;
  const actions:ActorAction3D[]=rawActions.map((item,j)=>{
   const path=p+'.actions['+j+']',v=object(item,path),d=defaultActorAction3D();keys(v,Object.keys(d),path);const read=(k:string,f:unknown)=>v[k]===undefined?f:v[k];
   const type=read('type','idle');if(!['idle','walk','wave','turn'].includes(type as string))throw new Error(path+'.type: idle, walk, wave, turn');
   const start=number(read('at',previousEnd),path+'.at',0,duration-.01+1e-9),span=number(v.duration,path+'.duration',.01,Math.min(3600,duration-start+1e-9));
   if(start<previousEnd-1e-9)throw new Error(path+'.at: actions must be ordered and non-overlapping');previousEnd=start+span;
   const nullable=(key:string,min:number,max:number)=>read(key,null)===null?null:number(v[key],path+'.'+key,min,max);
   const toX=nullable('toX',-20,20),toZ=nullable('toZ',-20,20),rotation=nullable('rotation',-360,360),target=text(read('target',''),path+'.target',100);
   if(target)identifier(target,path+'.target');const faceMovement=read('faceMovement',type==='walk'&&!target&&rotation===null);if(typeof faceMovement!=='boolean')throw new Error(path+'.faceMovement: expected boolean');
   if(type!=='walk'&&(toX!==null||toZ!==null||faceMovement))throw new Error(path+': toX/toZ/faceMovement require walk');
   if(Number(Boolean(target))+Number(rotation!==null)+Number(faceMovement)>1)throw new Error(path+': choose only one of target, rotation or faceMovement');
   if(type==='turn'&&!target&&rotation===null)throw new Error(path+': turn requires target or rotation');
   const easing=read('easing','ease-in-out');if(!['linear','ease-in-out'].includes(easing as string))throw new Error(path+'.easing: linear, ease-in-out');
   return {type:type as ActorAction3D['type'],at:start,duration:span,toX,toZ,rotation,target,faceMovement,blend:number(read('blend',.3),path+'.blend',0,2),easing:easing as ActorAction3D['easing']};
  });
  const rawExpressions=get('expressions',[]);if(!Array.isArray(rawExpressions)||rawExpressions.length>64)throw new Error(p+'.expressions: expected array (max 64)');let expressionEnd=0;
  const expressions:ActorExpression3D[]=rawExpressions.map((item,j)=>{
   const path=p+'.expressions['+j+']',v=object(item,path),d=defaultActorExpression3D();keys(v,Object.keys(d),path);
   const expression=v.expression===undefined?d.expression:v.expression;if(!expressions3D.includes(expression as Expression3D))throw new Error(path+'.expression: '+expressions3D.join(', '));
   const at=number(v.at===undefined?expressionEnd:v.at,path+'.at',0,duration-.01+1e-9),span=number(v.duration,path+'.duration',.01,Math.min(3600,duration-at+1e-9));
   if(at<expressionEnd-1e-9)throw new Error(path+'.at: expressions must be ordered and non-overlapping');expressionEnd=at+span;
   return {expression:expression as Expression3D,at,duration:span,intensity:number(v.intensity===undefined?d.intensity:v.intensity,path+'.intensity',0,1),blend:number(v.blend===undefined?d.blend:v.blend,path+'.blend',0,2)};
  });
  let speech:ActorSpeech3D|null=null;
  if(a.speech!==undefined&&a.speech!==null){
   const path=p+'.speech',v=object(a.speech,path);keys(v,['source','strength'],path);
   const source=v.source===undefined?'scene':v.source;if(source!=='scene'&&source!=='project')throw new Error(path+'.source: scene, project');
   speech={source,strength:number(v.strength===undefined?1:v.strength,path+'.strength',0,3)};
  }
  return {speech,expressions,actions,id,character,x,z,toX:number(get('toX',x),p+'.toX',-20,20),toZ:number(get('toZ',z),p+'.toZ',-20,20),rotation:number(get('rotation',0),p+'.rotation',-360,360),scale:number(get('scale',1),p+'.scale',.25,3),action:action as Actor3D['action'],at,duration:span};
 });for(const [i,actor] of actors.entries())for(const [j,action] of actor.actions.entries())if(action.target&&(action.target===actor.id||!actors.some(a=>a.id===action.target)))throw new Error(path+'.actors['+i+'].actions['+j+'].target: missing or self actor target');
 return {stage,camera,actors};
}
/** Pure absolute-time pose: seeking backwards is identical to playing forwards. */
export function actor3DPose(a:Actor3D,time:number,actors:readonly Actor3D[]=[a]){
 if(a.actions?.length)return sequence3DPose(a,time,actors);
 const t=Math.max(0,Math.min(a.duration,time-a.at)),p=t/a.duration,active=time>=a.at&&time<a.at+a.duration;
 const ramp=Math.max(0,Math.min(1,t/.3,(a.duration-t)/.3));
 const move=a.action==='walk',swing=move&&active?Math.sin(t*7)*.6*ramp:0,wave=a.action==='wave'&&active;
 return {x:a.x+(a.toX-a.x)*p,z:a.z+(a.toZ-a.z)*p,rotation:a.rotation*Math.PI/180,leftArm:swing,rightArm:wave&&ramp>0?-Math.PI*.8*ramp:(swing?-swing:0),leftLeg:swing?-swing:0,rightLeg:swing,wave:wave?Math.sin(t*9)*.22*Math.max(0,ramp):0,bob:move&&active?Math.abs(Math.sin(t*7))*.07*ramp:Math.sin(time*1.6)*.015};
}
const clamp3D=(n:number)=>Math.max(0,Math.min(1,n));
const smooth3D=(n:number)=>{const p=clamp3D(n);return p*p*(3-2*p);};
const ease3D=(a:ActorAction3D,p:number)=>a.easing==='linear'?clamp3D(p):smooth3D(p);
/** Only position is sampled for targets: mutual facing never recurses through orientation. */
export function actor3DPosition(a:Actor3D,time:number){
 let x=a.x,z=a.z;
 if(!a.actions?.length){const p=clamp3D((time-a.at)/a.duration);return {x:x+(a.toX-x)*p,z:z+(a.toZ-z)*p};}
 for(const action of a.actions){if(time<action.at)break;if(action.type==='walk'){const p=ease3D(action,(time-action.at)/action.duration);x+=((action.toX??x)-x)*p;z+=((action.toZ??z)-z)*p;}if(time<action.at+action.duration)break;}
 return {x,z};
}
const shortest3D=(from:number,to:number)=>{const tau=2*Math.PI;return ((to-from+Math.PI)%tau+tau)%tau-Math.PI;};
function sequence3DPose(a:Actor3D,time:number,actors:readonly Actor3D[]){
 const position=actor3DPosition(a,time);let rotation=a.rotation*Math.PI/180,x=a.x,z=a.z,active:ActorAction3D|undefined;
 for(const action of a.actions){
  if(time<action.at)break;const end=action.at+action.duration,sample=Math.min(time,end),elapsed=sample-action.at,p=ease3D(action,elapsed/action.duration),toX=action.type==='walk'?(action.toX??x):x,toZ=action.type==='walk'?(action.toZ??z):z;
  const currentX=x+(toX-x)*p,currentZ=z+(toZ-z)*p;let goal:number|undefined;
  if(action.rotation!==null)goal=action.rotation*Math.PI/180;
  else if(action.target){const target=actors.find(t=>t.id===action.target);if(target){const point=actor3DPosition(target,sample),dx=point.x-currentX,dz=point.z-currentZ;if(Math.hypot(dx,dz)>1e-8)goal=Math.atan2(dx,dz);}}
  else if(action.faceMovement&&Math.hypot(toX-x,toZ-z)>1e-8)goal=Math.atan2(toX-x,toZ-z);
  if(goal!==undefined){const blend=Math.min(action.blend,action.duration/2),amount=action.type==='turn'?p:blend>0?smooth3D(elapsed/blend):1;rotation+=shortest3D(rotation,goal)*amount;}
  x=toX;z=toZ;if(time<end){active=action;break;}
 }
 const t=active?time-active.at:0,blend=active?Math.min(active.blend,active.duration/2):0,envelope=active?(blend>0?smooth3D(Math.min(t/blend,(active.duration-t)/blend)):1):0;
 const walk=active?.type==='walk',wave=active?.type==='wave',swing=walk?Math.sin(t*7)*.6*envelope:0,idleBob=Math.sin(time*1.6)*.015;
 return {...position,rotation,leftArm:swing,rightArm:wave?-Math.PI*.8*envelope:(swing?-swing:0),leftLeg:swing?-swing:0,rightLeg:swing,wave:wave?Math.sin(t*9)*.22*envelope:0,bob:idleBob+(walk?Math.abs(Math.sin(t*7))*.07*envelope:0)};
}
/** Independent, absolute-time face track. Each event returns to the character's base face. */
export function actor3DFace(a:Actor3D,time:number,base:Expression3D='neutral'):FacePose3D{
 const pose:FacePose3D={happy:0,sad:0,angry:0,surprised:0,blink:0};if(base!=='neutral')pose[base]=1;
 const event=a.expressions?.find(e=>time>=e.at&&time<e.at+e.duration);if(!event)return pose;
 const blend=Math.min(event.blend,event.duration/2),elapsed=time-event.at;
 const weight=event.intensity*(blend>0?smooth3D(Math.min(elapsed/blend,(event.duration-elapsed)/blend)):1);
 if(event.expression==='blink'){pose.blink+=(1-pose.blink)*weight;return pose;}
 for(const key of Object.keys(pose) as (keyof FacePose3D)[])pose[key]=pose[key]*(1-weight)+(key===event.expression?weight:0);
 return pose;
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
