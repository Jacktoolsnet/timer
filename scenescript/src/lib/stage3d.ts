import {validateImage} from './image-assets.ts';
import {modelTextureIDs3D,validateTextureAssets3D,remapTextureAssets3D} from './texture3d.ts';
import {parseGroup3D,parseGroupPlacements3D,groupBudget3D,type Group3D,type GroupPlacement3D} from './group3d.ts';
import {parsePaths3D,parsePathMotion3D,pathMotionFrame3D,eulerFrame3D,localVector3D,add,vec,type Path3D,type PathMotion3D,type Frame3D} from './path3d.ts';
import {parseCameraRig3D,type CameraRig3D} from './camera3d.ts';
import {presetCharacterModel3D,presetStageModel3D} from './stage3d-presets.ts';
import {parseModel3D,parseJointValues3D,parseModelMotions3D,modelPartCount3D,type Model3D,type ModelMotion3D} from './model3d.ts';
/** Small declarative 3D vocabulary. No scripts, URLs or external models are executed. */
export const expressions3D=['neutral','happy','sad','angry','surprised','blink'] as const;
export type Expression3D=typeof expressions3D[number];
export type ActorExpression3D={expression:Expression3D;at:number;duration:number;intensity:number;blend:number};
export const defaultActorExpression3D=():ActorExpression3D=>({expression:'neutral',at:0,duration:1,intensity:1,blend:.2});
export type FacePose3D=Record<Exclude<Expression3D,'neutral'>,number>;
export type Character3D={model:Model3D|null;expression:Expression3D;style:'classic'|'robot'|'pixel'|'brick';name:string;bodyColor:string;headColor:string;limbColor:string;accentColor:string;height:number};
export type Stage3D={transparentBackground?:boolean;paths?:Record<string,Path3D>;model:Model3D|null;name:string;skyColor:string;groundColor:string;blockColor:string};
export type ActorAction3D={type:'idle'|'walk'|'wave'|'turn';at:number;duration:number;toX:number|null;toZ:number|null;rotation:number|null;target:string;faceMovement:boolean;blend:number;easing:'linear'|'ease-in-out'};
export const defaultActorAction3D=():ActorAction3D=>({type:'idle',at:0,duration:1,toX:null,toZ:null,rotation:null,target:'',faceMovement:false,blend:.3,easing:'ease-in-out'});
export type ActorSpeech3D={source:'scene'|'project';strength:number};
export const defaultActorSpeech3D=():ActorSpeech3D=>({source:'scene',strength:1});
export type Actor3D={path?:PathMotion3D|null;joints:Record<string,number>;motions:ModelMotion3D[];y:number;pitch:number;roll:number;speech:ActorSpeech3D|null;expressions:ActorExpression3D[];actions:ActorAction3D[];id:string;character:string;x:number;z:number;toX:number;toZ:number;rotation:number;scale:number;action:'idle'|'walk'|'wave';at:number;duration:number};
export type StageCamera3D=CameraRig3D&{fov?:number;yaw:number;pitch:number;distance:number;targetX:number;targetY:number;targetZ:number;orbit:number};
export type Shot3D={groups?:GroupPlacement3D[];stageJoints?:Record<string,number>;stageMotions?:ModelMotion3D[];stage:string;camera:StageCamera3D;actors:Actor3D[]};
export const defaultCharacter3D=():Character3D=>({model:null,expression:'neutral',style:'classic',name:'Robot',bodyColor:'#36a9e1',headColor:'#dde7ed',limbColor:'#64748b',accentColor:'#ffe066',height:3});
export const defaultStage3D=():Stage3D=>({paths:{},model:null,name:'Block plaza',skyColor:'#a7d9f5',groundColor:'#78a653',blockColor:'#e6bd7a'});
export const defaultStageCamera3D=():StageCamera3D=>({fov:38,yaw:20,pitch:18,distance:18,targetX:0,targetY:1.6,targetZ:0,orbit:0});
export const defaultActor3D=(character:string,id='actor'):Actor3D=>({path:null,joints:{},motions:[],y:0,pitch:0,roll:0,speech:null,expressions:[],actions:[],id,character,x:0,z:0,toX:0,toZ:0,rotation:0,scale:1,action:'idle',at:0,duration:4});
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
 return {model:parseModel3D(v.model,path+'.model')??presetCharacterModel3D(style as string),expression:expression as Expression3D,style:style as Character3D['style'],name:text(v.name===undefined?d.name:v.name,path+'.name'),bodyColor:color(v.bodyColor===undefined?d.bodyColor:v.bodyColor,path+'.bodyColor'),headColor:color(v.headColor===undefined?d.headColor:v.headColor,path+'.headColor'),limbColor:color(v.limbColor===undefined?d.limbColor:v.limbColor,path+'.limbColor'),accentColor:color(v.accentColor===undefined?d.accentColor:v.accentColor,path+'.accentColor'),height:number(v.height===undefined?d.height:v.height,path+'.height',1,6)};
}
export function parseStage3D(value:unknown,path='stage'):Stage3D{
 const v=object(value,path),d=defaultStage3D();keys(v,[...Object.keys(d),'transparentBackground'],path);
 if(v.transparentBackground!==undefined&&typeof v.transparentBackground!=='boolean')throw new Error(path+'.transparentBackground: expected boolean');
 return {...(v.transparentBackground?{transparentBackground:true}:{}),paths:parsePaths3D(v.paths,path+'.paths'),model:parseModel3D(v.model,path+'.model')??presetStageModel3D(),name:text(v.name===undefined?d.name:v.name,path+'.name'),skyColor:color(v.skyColor===undefined?d.skyColor:v.skyColor,path+'.skyColor'),groundColor:color(v.groundColor===undefined?d.groundColor:v.groundColor,path+'.groundColor'),blockColor:color(v.blockColor===undefined?d.blockColor:v.blockColor,path+'.blockColor')};
}
/** Keep the original plaza size, expanding ground/fog for larger authored paths. */
export function stage3DGroundSize(stage:Stage3D){
 let half=28;for(const path of Object.values(stage.paths??{}))for(const p of path.points)half=Math.max(half,Math.abs(p.x)+8,Math.abs(p.z)+8);return half*2;
}
export function parse3DLibrary<T>(value:unknown,parse:(v:unknown,p:string)=>T,path:string):Record<string,T>{
 const v=object(value===undefined?{}:value,path),out:Record<string,T>={};if(Object.keys(v).length>30)throw new Error(path+': maximum 30');
 for(const [id,item] of Object.entries(v)){identifier(id,path);Object.defineProperty(out,id,{value:parse(item,path+'.'+id),enumerable:true,writable:true,configurable:true});}return out;
}
export function parseShot3D(value:unknown,characters:Record<string,Character3D>,stages:Record<string,Stage3D>,duration:number,path='stage3d',groups3d:Record<string,Group3D>={}):Shot3D|null{
 if(value===undefined||value===null)return null;
 const v=object(value,path);keys(v,['stage','camera','actors','stageJoints','stageMotions','groups'],path);const stage=identifier(v.stage,path+'.stage');if(!Object.hasOwn(stages,stage))throw new Error(path+'.stage: missing stage '+stage);
 const raw=v.camera===undefined?{}:object(v.camera,path+'.camera'),d=defaultStageCamera3D();keys(raw,[...Object.keys(d),'follow','keys'],path+'.camera');const camera={...d,...parseCameraRig3D(raw,duration,path+'.camera')};
 for(const k of ['fov','yaw','pitch','distance','targetX','targetY','targetZ','orbit'] as const){const [min,max]=k==='fov'?[20,110]:k==='pitch'?[5,80]:k==='distance'?[5,80]:k==='orbit'?[-30,30]:k==='yaw'?[-360,360]:k==='targetY'?[-5,15]:[-25,25];camera[k]=number(raw[k]===undefined?d[k]:raw[k],path+'.camera.'+k,min,max);}
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
  const pathMotion=parsePathMotion3D(a.path,stages[stage].paths??{},duration,p+'.path');if(pathMotion&&actions.length)throw new Error(p+': path and actions cannot be combined');
  const model=characters[character].model,joints=parseJointValues3D(a.joints,model,p+'.joints'),motions=parseModelMotions3D(a.motions,model,duration,p+'.motions');
  return {path:pathMotion,joints,motions,y:number(get('y',0),p+'.y',-20,20),pitch:number(get('pitch',0),p+'.pitch',-360,360),roll:number(get('roll',0),p+'.roll',-360,360),speech,expressions,actions,id,character,x,z,toX:number(get('toX',x),p+'.toX',-20,20),toZ:number(get('toZ',z),p+'.toZ',-20,20),rotation:number(get('rotation',0),p+'.rotation',-360,360),scale:number(get('scale',1),p+'.scale',.25,3),action:action as Actor3D['action'],at,duration:span};
 });for(const [i,actor] of actors.entries())for(const [j,action] of actor.actions.entries())if(action.target&&(action.target===actor.id||!actors.some(a=>a.id===action.target)))throw new Error(path+'.actors['+i+'].actions['+j+'].target: missing or self actor target');
 if(camera.follow&&!actors.some(a=>a.id===camera.follow!.actor))throw new Error(path+'.camera.follow.actor: missing actor');
 const model=stages[stage].model,stageJoints=parseJointValues3D(v.stageJoints,model,path+'.stageJoints'),stageMotions=parseModelMotions3D(v.stageMotions,model,duration,path+'.stageMotions');
 const groups=parseGroupPlacements3D(v.groups,groups3d,path+'.groups'),groupParts=groupBudget3D(groups,groups3d,characters,path+'.groups');
 if(groupParts+modelPartCount3D(model)+actors.reduce((sum,a)=>sum+modelPartCount3D(characters[a.character].model),0)>2048)throw new Error(path+': maximum 2048 active 3D parts');
 return {stage,camera,actors,stageJoints,stageMotions,groups};
}
/** Pure absolute-time pose: seeking backwards is identical to playing forwards. */
export function actor3DPose(a:Actor3D,time:number,actors:readonly Actor3D[]=[a],paths:Record<string,Path3D>={}){
 if(a.path){const frame=pathMotionFrame3D(paths,a.path,time);return {x:a.x+frame.position.x,z:a.z+frame.position.z,rotation:a.rotation*Math.PI/180,leftArm:0,rightArm:0,leftLeg:0,rightLeg:0,wave:0,bob:0};}
 if(a.actions?.length)return sequence3DPose(a,time,actors,paths);
 const t=Math.max(0,Math.min(a.duration,time-a.at)),p=t/a.duration,active=time>=a.at&&time<a.at+a.duration;
 const ramp=Math.max(0,Math.min(1,t/.3,(a.duration-t)/.3));
 const move=a.action==='walk',swing=move&&active?Math.sin(t*7)*.6*ramp:0,wave=a.action==='wave'&&active;
 return {x:a.x+(a.toX-a.x)*p,z:a.z+(a.toZ-a.z)*p,rotation:a.rotation*Math.PI/180,leftArm:swing,rightArm:wave&&ramp>0?-Math.PI*.8*ramp:(swing?-swing:0),leftLeg:swing?-swing:0,rightLeg:swing,wave:wave?Math.sin(t*9)*.22*Math.max(0,ramp):0,bob:move&&active?Math.abs(Math.sin(t*7))*.07*ramp:Math.sin(time*1.6)*.015};
}
const clamp3D=(n:number)=>Math.max(0,Math.min(1,n));
const smooth3D=(n:number)=>{const p=clamp3D(n);return p*p*(3-2*p);};
const ease3D=(a:ActorAction3D,p:number)=>a.easing==='linear'?clamp3D(p):smooth3D(p);
/** Only position is sampled for targets: mutual facing never recurses through orientation. */
export function actor3DPosition(a:Actor3D,time:number,paths:Record<string,Path3D>={}){
 if(a.path){const frame=pathMotionFrame3D(paths,a.path,time);return {x:a.x+frame.position.x,z:a.z+frame.position.z};}
 let x=a.x,z=a.z;
 if(!a.actions?.length){const p=clamp3D((time-a.at)/a.duration);return {x:x+(a.toX-x)*p,z:z+(a.toZ-z)*p};}
 for(const action of a.actions){if(time<action.at)break;if(action.type==='walk'){const p=ease3D(action,(time-action.at)/action.duration);x+=((action.toX??x)-x)*p;z+=((action.toZ??z)-z)*p;}if(time<action.at+action.duration)break;}
 return {x,z};
}
const shortest3D=(from:number,to:number)=>{const tau=2*Math.PI;return ((to-from+Math.PI)%tau+tau)%tau-Math.PI;};
function sequence3DPose(a:Actor3D,time:number,actors:readonly Actor3D[],paths:Record<string,Path3D>){
 const position=actor3DPosition(a,time,paths);let rotation=a.rotation*Math.PI/180,x=a.x,z=a.z,active:ActorAction3D|undefined;
 for(const action of a.actions){
  if(time<action.at)break;const end=action.at+action.duration,sample=Math.min(time,end),elapsed=sample-action.at,p=ease3D(action,elapsed/action.duration),toX=action.type==='walk'?(action.toX??x):x,toZ=action.type==='walk'?(action.toZ??z):z;
  const currentX=x+(toX-x)*p,currentZ=z+(toZ-z)*p;let goal:number|undefined;
  if(action.rotation!==null)goal=action.rotation*Math.PI/180;
  else if(action.target){const target=actors.find(t=>t.id===action.target);if(target){const point=actor3DPosition(target,sample,paths),dx=point.x-currentX,dz=point.z-currentZ;if(Math.hypot(dx,dz)>1e-8)goal=Math.atan2(dx,dz);}}
  else if(action.faceMovement&&Math.hypot(toX-x,toZ-z)>1e-8)goal=Math.atan2(toX-x,toZ-z);
  if(goal!==undefined){const blend=Math.min(action.blend,action.duration/2),amount=action.type==='turn'?p:blend>0?smooth3D(elapsed/blend):1;rotation+=shortest3D(rotation,goal)*amount;}
  x=toX;z=toZ;if(time<end){active=action;break;}
 }
 const t=active?time-active.at:0,blend=active?Math.min(active.blend,active.duration/2):0,envelope=active?(blend>0?smooth3D(Math.min(t/blend,(active.duration-t)/blend)):1):0;
 const walk=active?.type==='walk',wave=active?.type==='wave',swing=walk?Math.sin(t*7)*.6*envelope:0,idleBob=Math.sin(time*1.6)*.015;
 return {...position,rotation,leftArm:swing,rightArm:wave?-Math.PI*.8*envelope:(swing?-swing:0),leftLeg:swing?-swing:0,rightLeg:swing,wave:wave?Math.sin(t*9)*.22*envelope:0,bob:idleBob+(walk?Math.abs(Math.sin(t*7))*.07*envelope:0)};
}
/** Full world transform: paths override root motion; static Euler angles are local model corrections. */
export function actor3DFrame(a:Actor3D,time:number,actors:readonly Actor3D[]=[a],paths:Record<string,Path3D>={}):Frame3D{
 const pose=actor3DPose(a,time,actors,paths),local=eulerFrame3D(a.pitch*Math.PI/180,pose.rotation,a.roll*Math.PI/180);
 if(!a.path)return {...local,position:vec(pose.x,a.y,pose.z)};
 const frame=pathMotionFrame3D(paths,a.path,time),position=add(frame.position,vec(a.x,a.y,a.z));
 return a.path.orient?{position,right:localVector3D(frame,local.right),up:localVector3D(frame,local.up),forward:localVector3D(frame,local.forward)}:{...local,position};
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
export type Resource3D={format:'scenescript-3d-resource';version:'1.0';kind:'character'|'stage'|'group';id:string;definition:Character3D|Stage3D|Group3D;characters?:Record<string,Character3D>;assets?:Record<string,{name:string;data:string}>};
export const MAX_3D_RESOURCE_BYTES=32*1024*1024;
const resourceModels3D=(r:Pick<Resource3D,'kind'|'definition'|'characters'>)=>r.kind==='group'?Object.values(r.characters??{}).map(c=>c.model):[(r.definition as Character3D|Stage3D).model];
export function parse3DResource(source:string):Resource3D{
 if(new TextEncoder().encode(source).length>MAX_3D_RESOURCE_BYTES)throw new Error('3D resource: maximum 32 MiB');const v=object(JSON.parse(source),'resource');keys(v,['format','version','kind','id','definition','assets',...(v.kind==='group'?['characters']:[])],'resource');
 if(v.format!=='scenescript-3d-resource'||v.version!=='1.0'||!['character','stage','group'].includes(v.kind as string))throw new Error('resource: unsupported format, version or kind');
 if(new TextEncoder().encode(JSON.stringify({...v,assets:undefined})).length>512*1024)throw new Error('3D resource: geometry maximum 512 KiB');
 const kind=v.kind as Resource3D['kind'],id=identifier(v.id,'resource.id');let result:Resource3D;
 if(kind==='group'){const characters=parse3DLibrary(v.characters,parseCharacter3D,'resource.characters'),definition=parseGroup3D(v.definition,characters,'resource.definition');if(Object.keys(characters).some(id=>!definition.characters.includes(id)))throw new Error('resource.characters: unreferenced dependency');result={format:'scenescript-3d-resource',version:'1.0',kind,id,definition,characters};}
 else result={format:'scenescript-3d-resource',version:'1.0',kind,id,definition:kind==='character'?parseCharacter3D(v.definition):parseStage3D(v.definition)};
 const assets:NonNullable<Resource3D['assets']>=Object.create(null);if(v.assets!==undefined){const raw=object(v.assets,'resource.assets');if(Object.keys(raw).length>100)throw new Error('resource.assets: maximum 100');for(const [id,value]of Object.entries(raw)){identifier(id,'resource.assets');const a=object(value,'resource.assets.'+id);keys(a,['name','data'],'resource.assets.'+id);assets[id]={name:text(a.name,'resource.assets.'+id+'.name'),data:validateImage(a.data,'resource.assets.'+id+'.data')};}}
 const models=resourceModels3D(result),used=new Set(models.flatMap(modelTextureIDs3D));validateTextureAssets3D(models,assets,'resource textures');if(Object.keys(assets).some(id=>!used.has(id)))throw new Error('resource.assets: unreferenced dependency');if(used.size)result.assets=assets;return result;
}
/** Copy imports preserve the ID bound even when the original already has 100 characters. */
export function unique3DResourceID(preferred:string,library:Record<string,unknown>):string{
 let id=preferred;for(let n=2;Object.hasOwn(library,id);n++){const suffix='_'+n;id=preferred.slice(0,100-suffix.length)+suffix;}return id;
}

export type Libraries3D={assets?:Resource3D['assets'];characters:Record<string,Character3D>;stages:Record<string,Stage3D>;groups3d:Record<string,Group3D>};
/** Group exports are self-contained; their referenced object definitions travel with them. */
export function export3DResource(kind:Resource3D['kind'],id:string,library:Libraries3D):Resource3D{
 const definition=(kind==='character'?library.characters:kind==='stage'?library.stages:library.groups3d)[id];if(!definition)throw new Error('resource: missing '+id);
 const characters=kind==='group'?Object.fromEntries((definition as Group3D).characters.map(id=>[id,library.characters[id]])):undefined;
 const ids=new Set(resourceModels3D({kind,definition,characters}).flatMap(modelTextureIDs3D));const assets=ids.size?Object.fromEntries([...ids].map(id=>[id,library.assets?.[id]])):undefined;
 const source=JSON.stringify({format:'scenescript-3d-resource',version:'1.0',kind,id,definition,characters,assets});return parse3DResource(source);
}
/** Transactional merge. Never overwrite unrelated characters when importing a group bundle. */
export function import3DResource(resource:Resource3D,library:Libraries3D,mode:'copy'|'update'){
 validateTextureAssets3D(resourceModels3D(resource),resource.assets??{},'resource textures');
 const next={assets:{...library.assets},characters:{...library.characters},stages:{...library.stages},groups3d:{...library.groups3d}},values=resource.kind==='character'?next.characters:resource.kind==='stage'?next.stages:next.groups3d;
 const id=mode==='copy'?unique3DResourceID(resource.id,values):resource.id;
 if(!Object.hasOwn(values,id)&&Object.keys(values).length>=30)throw new Error('Maximum 30');
 const assetMapping=new Map<string,string>();for(const [key,value]of Object.entries(resource.assets??{})){
  const matching=Object.keys(next.assets).find(id=>next.assets[id].data===value.data),target=matching??unique3DResourceID(key,next.assets);
  if(!Object.hasOwn(next.assets,target)&&Object.keys(next.assets).length>=100)throw new Error('assets: maximum 100');if(!Object.hasOwn(next.assets,target))Object.defineProperty(next.assets,target,{value,enumerable:true,writable:true,configurable:true});assetMapping.set(key,target);
 }
 let definition=resource.kind==='group'?resource.definition:{...resource.definition,model:remapTextureAssets3D((resource.definition as Character3D|Stage3D).model,assetMapping)};

 if(resource.kind==='group'){
  const mapping=new Map<string,string>();for(const [key,original]of Object.entries(resource.characters??{})){
   const value={...original,model:remapTextureAssets3D(original.model,assetMapping)};
   const used=new Set(mapping.values()),source=JSON.stringify(value),same=!used.has(key)&&Object.hasOwn(next.characters,key)&&JSON.stringify(next.characters[key])===source,matching=same?key:Object.keys(next.characters).find(id=>!used.has(id)&&JSON.stringify(next.characters[id])===source),target=matching??unique3DResourceID(key,next.characters);
   if(!Object.hasOwn(next.characters,target)&&Object.keys(next.characters).length>=30)throw new Error('characters: maximum 30');Object.defineProperty(next.characters,target,{value,enumerable:true,writable:true,configurable:true});mapping.set(key,target);
  }definition=parseGroup3D({...definition,characters:(definition as Group3D).characters.map(id=>mapping.get(id)!)},next.characters);
 }
 Object.defineProperty(values,id,{value:definition,enumerable:true,writable:true,configurable:true});return {id,...next};
}
