import {defaultBubble,parseBubble,parseAnchors,type Bubble,type Anchors} from './comic.ts';
import {parseNarration,validateAudioData,type AudioAsset,type Narration} from './audio.ts';
import {parseMotionPath,motionPathState,type MotionPath} from './motion-path.ts';
import {parseVideo,validateVideoData,defaultVideo,type VideoAsset,type VideoSettings} from './video.ts';
import {parseMusic,type Music} from './music.ts';
import {parseSimulation,defaultSimulation,type Simulation} from './simulation.ts';
import {parseGradient,type Gradient} from './gradient.ts';
import {validateSvg,svgSource} from './svg.ts';
export const formats = { landscape: [1920,1080], portrait: [1080,1920], square: [1080,1080] } as const;
export const fonts = ['Arial','Georgia','Verdana','Courier New'] as const;
export const animations = ['none','fade','slide-left','slide-up','zoom','typewriter','pan'] as const;
export const exitAnimations=['none','fade','slide-left','slide-right','slide-up','slide-down','zoom-out'] as const;
export const shapeTypes=['rectangle','ellipse','triangle','diamond','star','arrow'] as const;
export type Asset = { name:string; data:string };
export type TextRun = {text:string} & Partial<Pick<Element,'font'|'fontSize'|'color'|'bold'|'italic'|'underline'|'strikethrough'>>;
export type Element = {
 id:string; name:string; type:'text'|'image'|'shape'|'simulation'|'video'|'bubble'; bubble:Bubble|null; anchors:Anchors; until:number|null; exitAnimation:typeof exitAnimations[number]; exitDuration:number; video:VideoSettings|null; text:string; runs:TextRun[]; asset:string; x:number; y:number; width:number; height:number;
 simulation:Simulation|null; color:string; fillGradient:Gradient|null; fillColor:string; borderColor:string; borderWidth:number; shapeType:typeof shapeTypes[number]; borderStyle:'solid'|'dashed'|'dotted'|'double'; font:typeof fonts[number]; fontSize:number; align:'left'|'center'|'right'; bold:boolean; italic:boolean; underline:boolean; strikethrough:boolean;
 opacity:number; rotation:number; radius:number; fit:'cover'|'contain';
 motionPath:MotionPath|null; animation:typeof animations[number]; at:number; animationDuration:number;
};
export const sceneTransitions=['none','fade','crossfade','slide-left','slide-right','slide-up','slide-down','wipe-left','wipe-right','wipe-up','wipe-down','zoom-in','zoom-out','through-black'] as const;
export type Scene = {narration:Narration|null; id:string; name:string; duration:number; background:string; backgroundEnabled:boolean; backgroundOpacity:number; backgroundGradient:Gradient|null; backgroundAsset:string; transition:typeof sceneTransitions[number]; transitionDuration:number; elements:Element[] };
export type Project = { version:'1.0'; title:string; description:string; hashtags:string; thumbnail:Asset|null; audios:Record<string,AudioAsset>; narration:Narration|null; audioDucking:boolean; format:keyof typeof formats; backgroundSimulation:Simulation|null; backgroundVideo:VideoSettings|null; videos:Record<string,VideoAsset>; music:Music|null; assets:Record<string,Asset>; scenes:Scene[] };
export const MAX_FILE_BYTES = 160 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export function newElement(type:Element['type'], id:string = crypto.randomUUID()):Element {
 return {id,name:'',type,bubble:type==='bubble'?defaultBubble():null,anchors:{},until:null,exitAnimation:'none',exitDuration:.5,motionPath:null,video:type==='video'?defaultVideo():null,simulation:type==='simulation'?defaultSimulation():null,text:type==='bubble'?'Hello!':type==='text'?'Your story starts here.':'',runs:[],asset:'',x:10,y:type==='bubble'?10:35,width:type==='bubble'?40:80,height:type==='bubble'?24:30,color:type==='bubble'?'#222222':type==='shape'?'#b86445':'#ffffff',fillGradient:null,fillColor:type==='shape'?'#b86445':'#ffffff',borderColor:type==='bubble'?'#222222':'none',borderWidth:4,shapeType:'rectangle',borderStyle:'solid',font:'Arial',fontSize:type==='bubble'?48:90,align:'center',bold:false,italic:false,underline:false,strikethrough:false,opacity:1,rotation:0,radius:0,fit:'contain',animation:'fade',at:0,animationDuration:1};
}
export function newScene(id:string = crypto.randomUUID()):Scene {
 return {narration:null,id,name:'Scene',duration:5,background:'#263b42',backgroundEnabled:true,backgroundOpacity:1,backgroundGradient:null,backgroundAsset:'',transition:'fade',transitionDuration:0.5,elements:[]};
}
export function demoProject():Project {
 const first = newScene('intro'); first.name='A new idea';
 const title=newElement('text','headline');title.text='Your idea.\nYour stage.';title.font='Georgia';title.animation='slide-up';first.elements=[title];
 const second=newScene('outro');second.name='Make it move';second.background='#684d45';
 const text=newElement('text','outro-text');text.text='Tell your story.\nOne scene at a time.';text.fontSize=72;text.animation='typewriter';text.animationDuration=2;second.elements=[text];
 return {version:'1.0',title:'My SceneScript',description:'',hashtags:'',thumbnail:null,audios:{},narration:null,audioDucking:false,format:'landscape',backgroundSimulation:null,backgroundVideo:null,videos:{},music:null,assets:{},scenes:[first,second]};
}
function obj(v:unknown,path:string):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error(`${path}: expected object`);return v as Record<string,unknown>;}
function str(v:unknown,path:string,max=10000):string {if(typeof v!=='string'||v.length>max)throw new Error(`${path}: expected text (max ${max})`);return v;}
function num(v:unknown,path:string,min:number,max:number):number {if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error(`${path}: expected number ${min}–${max}`);return v;}
function one<T extends string>(v:unknown,values:readonly T[],path:string):T {if(!values.includes(v as T))throw new Error(`${path}: ${values.join(', ')}`);return v as T;}
function color(v:unknown,path:string):string {const s=str(v,path,7);if(!/^#[0-9a-f]{6}$/i.test(s))throw new Error(`${path}: expected #RRGGBB`);return s;}
function keys(o:Record<string,unknown>,allowed:string[],path:string){for(const k of Object.keys(o))if(!allowed.includes(k))throw new Error(`${path}.${k}: unknown field`);}
function id(v:unknown,path:string){const s=str(v,path,100);if(!/^[a-zA-Z0-9_-]+$/.test(s))throw new Error(`${path}: invalid identifier`);return s;}
export function validateImage(data:unknown,path='image'):string {
 const s=str(data,path,Math.ceil(MAX_IMAGE_BYTES/3)*4+100);
 if(s.startsWith('data:image/svg+xml;')){validateSvg(svgSource(s));return s;}
 if(!/^data:image\/(png|jpeg|webp);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s)||s.split(',')[1].length===0)throw new Error(`${path}: expected PNG, JPEG or WebP base64 data URL`);
 const payload=s.split(',')[1];
 const bytes=payload.length/4*3-(payload.endsWith('==')?2:payload.endsWith('=')?1:0);
 if(bytes>MAX_IMAGE_BYTES)throw new Error(`${path}: maximum 8 MiB`);
 return s;
}
export function parseProject(input:string):Project {
 if(new TextEncoder().encode(input).length>MAX_FILE_BYTES)throw new Error('JSON: maximum 160 MiB');
 const p=obj(JSON.parse(input),'project');keys(p,['version','title','description','hashtags','thumbnail','audios','narration','audioDucking','format','backgroundSimulation','backgroundVideo','videos','music','assets','scenes'],'project');
 if(p.version!=='1.0')throw new Error('version: expected 1.0');
 const assets:Record<string,Asset>=Object.create(null);const raw=obj(p.assets??{},'assets');
 if(Object.keys(raw).length>100)throw new Error('assets: maximum 100');
 for(const [key,value] of Object.entries(raw)){id(key,'asset ID');const a=obj(value,`assets.${key}`);keys(a,['name','data'],`assets.${key}`);assets[key]={name:str(a.name,`${key}.name`,200),data:validateImage(a.data,`${key}.data`)};}
 let thumbnail:Asset|null=null;
 if(p.thumbnail!==undefined&&p.thumbnail!==null){const a=obj(p.thumbnail,'thumbnail');keys(a,['name','data'],'thumbnail');const data=validateImage(a.data,'thumbnail.data');if(!/^data:image\/(png|jpeg|webp);base64,/.test(data))throw new Error('thumbnail.data: expected PNG, JPEG or WebP');thumbnail={name:str(a.name,'thumbnail.name',200),data};}
 const videos:Record<string,VideoAsset>=Object.create(null);const rawVideos=obj(p.videos??{},'videos');if(Object.keys(rawVideos).length>30)throw new Error('videos: maximum 30');
 for(const [key,value] of Object.entries(rawVideos)){id(key,'video ID');const a=obj(value,'videos.'+key);keys(a,['name','data','duration'],'videos.'+key);videos[key]={name:str(a.name,key+'.name',200),data:validateVideoData(a.data,key+'.data'),duration:num(a.duration,key+'.duration',.001,86400)};}
 const audios:Record<string,AudioAsset>=Object.create(null);const rawAudios=obj(p.audios??{},'audios');if(Object.keys(rawAudios).length>30)throw new Error('audios: maximum 30');
 for(const [key,value] of Object.entries(rawAudios)){id(key,'audio ID');const a=obj(value,'audios.'+key);keys(a,['name','data','duration'],'audios.'+key);audios[key]={name:str(a.name,key+'.name',200),data:validateAudioData(a.data,key+'.data'),duration:num(a.duration,key+'.duration',.001,3600)};}
 if(p.audioDucking!==undefined&&typeof p.audioDucking!=='boolean')throw new Error('audioDucking: expected boolean');
 const ref=(v:unknown,path:string)=>{const s=str(v,path,100);if(s&&!Object.hasOwn(assets,s))throw new Error(`${path}: missing asset ${s}`);return s;};
 if(!Array.isArray(p.scenes)||!p.scenes.length||p.scenes.length>100)throw new Error('scenes: expected 1–100 scenes');
 const sceneIds=new Set<string>(),elementIds=new Set<string>();
 const scenes:Scene[]=p.scenes.map((value,i)=>{
  const path=`scenes[${i}]`,s=obj(value,path),d=newScene('scene');keys(s,Object.keys(d),path);
  const sid=id(s.id,`${path}.id`);if(sceneIds.has(sid))throw new Error(`${path}: duplicate ID`);sceneIds.add(sid);
  if(typeof (s.backgroundEnabled??true)!=='boolean')throw new Error(path+'.backgroundEnabled: expected boolean');
  const duration=num(s.duration??d.duration,`${path}.duration`,0.1,3600);
  if(!Array.isArray(s.elements)||s.elements.length>100)throw new Error(`${path}.elements: expected array (max 100)`);
  const elements=s.elements.map((value,j)=>{
   const ep=`${path}.elements[${j}]`,e=obj(value,ep),type=one(e.type,['text','image','shape','simulation','video','bubble'] as const,`${ep}.type`),defaults=newElement(type,'element');keys(e,Object.keys(defaults),ep);
   const merged={...defaults,...e};const simulation=parseSimulation(merged.simulation,ep+'.simulation');if(type==='simulation'&&!simulation)throw new Error(ep+'.simulation: required for simulation element'); const eid=id(e.id,`${ep}.id`);if(elementIds.has(eid))throw new Error(`${ep}: duplicate ID`);elementIds.add(eid);
   for(const key of ['bold','italic','underline','strikethrough'] as const)if(typeof merged[key]!=='boolean')throw new Error(`${ep}.${key}: expected boolean`);
   if(!Array.isArray(merged.runs)||merged.runs.length>2000)throw new Error(`${ep}.runs: expected array (max 2000)`);
   const runs:TextRun[]=merged.runs.map((value,index)=>{
    const path=`${ep}.runs[${index}]`,r=obj(value,path);keys(r,['text','font','fontSize','color','bold','italic','underline','strikethrough'],path);
    const run:TextRun={text:str(r.text,`${path}.text`)};
    if(r.font!==undefined)run.font=one(r.font,fonts,`${path}.font`);
    if(r.fontSize!==undefined)run.fontSize=num(r.fontSize,`${path}.fontSize`,1,500);
    if(r.color!==undefined)run.color=color(r.color,`${path}.color`);
    for(const k of ['bold','italic','underline','strikethrough'] as const)if(r[k]!==undefined){if(typeof r[k]!=='boolean')throw new Error(`${path}.${k}: expected boolean`);run[k]=r[k];}
    return run;
   });
   const at=num(merged.at,ep+'.at',0,duration),until=merged.until===null?null:num(merged.until,ep+'.until',0,duration);
   if(until!==null&&until<=at)throw new Error(ep+'.until: must be greater than at');
   const bubble=parseBubble(merged.bubble,ep+'.bubble');if(type==='bubble'&&!bubble)throw new Error(ep+'.bubble: required for bubble element');
   const anchors=parseAnchors(merged.anchors,ep+'.anchors');
   const text=runs.length?str(runs.map(r=>r.text).join(''),`${ep}.text`):str(merged.text,`${ep}.text`);
   return {id:eid,bubble,anchors,until,exitAnimation:one(merged.exitAnimation,exitAnimations,ep+'.exitAnimation'),exitDuration:num(merged.exitDuration,ep+'.exitDuration',.01,3600),motionPath:parseMotionPath(merged.motionPath,duration,ep+'.motionPath'),video:parseVideo(merged.video,videos,ep+'.video'),simulation,name:str(merged.name,`${ep}.name`,200),type,text,runs,asset:ref(merged.asset,`${ep}.asset`),
    x:num(merged.x,`${ep}.x`,-100,100),y:num(merged.y,`${ep}.y`,-100,100),width:num(merged.width,`${ep}.width`,0.1,200),height:num(merged.height,`${ep}.height`,0.1,200),
    fillGradient:parseGradient(merged.fillGradient,ep+'.fillGradient'),color:color(merged.color,`${ep}.color`),fillColor:(e.fillColor??(type==='bubble'?defaults.fillColor:merged.color))==='none'?'none':color(e.fillColor??(type==='bubble'?defaults.fillColor:merged.color),`${ep}.fillColor`),borderColor:merged.borderColor==='none'?'none':color(merged.borderColor,`${ep}.borderColor`),borderWidth:num(merged.borderWidth,`${ep}.borderWidth`,0,500),shapeType:one(merged.shapeType,shapeTypes,`${ep}.shapeType`),borderStyle:one(merged.borderStyle,['solid','dashed','dotted','double'] as const,`${ep}.borderStyle`),font:one(merged.font,fonts,`${ep}.font`),fontSize:num(merged.fontSize,`${ep}.fontSize`,1,500),align:one(merged.align,['left','center','right'] as const,`${ep}.align`),bold:merged.bold,italic:merged.italic,underline:merged.underline,strikethrough:merged.strikethrough,
    opacity:num(merged.opacity,`${ep}.opacity`,0,1),rotation:num(merged.rotation,`${ep}.rotation`,-360,360),radius:num(merged.radius,`${ep}.radius`,0,1000),fit:one(merged.fit,['cover','contain'] as const,`${ep}.fit`),
    animation:one(merged.animation,animations,`${ep}.animation`),at,animationDuration:num(merged.animationDuration,`${ep}.animationDuration`,0.01,3600)};
  });
  for(const e of elements)if(e.bubble?.tail.mode==='anchor'){
   const target=elements.find(v=>v.id===e.bubble!.tail.element);
   if(!target||!Object.hasOwn(target.anchors,e.bubble.tail.anchor))throw new Error(path+'.elements: missing speaker element/anchor');
  }
  return {narration:parseNarration(s.narration,audios,duration,path+'.narration'),id:sid,name:str(s.name??d.name,`${path}.name`,200),duration,backgroundEnabled:(s.backgroundEnabled??true) as boolean,backgroundOpacity:num(s.backgroundOpacity??1,path+'.backgroundOpacity',0,1),backgroundGradient:parseGradient(s.backgroundGradient,path+'.backgroundGradient'),background:color(s.background??d.background,`${path}.background`),backgroundAsset:ref(s.backgroundAsset??'',`${path}.backgroundAsset`),transition:one(s.transition??d.transition,sceneTransitions,`${path}.transition`),transitionDuration:num(s.transitionDuration??d.transitionDuration,`${path}.transitionDuration`,0.01,3600),elements};
 });
 const backgroundSimulation=parseSimulation(p.backgroundSimulation,'backgroundSimulation');
 for(const [i,s] of scenes.entries())if(s.elements.reduce((n,e)=>n+(e.type==='simulation'?e.simulation!.count:0),backgroundSimulation?.count??0)>5000)throw new Error('scenes['+i+']: maximum 5000 simulated particles including project background');
 return {audios,narration:parseNarration(p.narration,audios,scenes.reduce((n,s)=>n+s.duration,0)),audioDucking:(p.audioDucking??false) as boolean,thumbnail,videos,backgroundVideo:parseVideo(p.backgroundVideo,videos,'backgroundVideo'),music:parseMusic(p.music,scenes.reduce((n,s)=>n+s.duration,0)),backgroundSimulation,version:'1.0',title:str(p.title,'title',200),description:str(p.description===undefined?'':p.description,'description',5000),hashtags:str(p.hashtags===undefined?'':p.hashtags,'hashtags',2000),format:one(p.format,['landscape','portrait','square'] as const,'format'),assets,scenes};
}
export function locateTime(project:Project,time:number):{index:number;local:number;ended:boolean}{
 let offset=0;for(let i=0;i<project.scenes.length;i++){const duration=project.scenes[i].duration;if(time<offset+duration)return {index:i,local:Math.max(0,time-offset),ended:false};offset+=duration;}
 return {index:project.scenes.length-1,local:project.scenes.at(-1)!.duration,ended:true};
}
export function animationState(e:Element,time:number,width=1920,height=1080,sceneDuration=Infinity){
 const motion=e.motionPath?motionPathState(e.motionPath,time,width,height):null;
 const progress=Math.min(1,Math.max(0,(time-e.at)/e.animationDuration));const eased=1-(1-progress)**3;
 const end=e.until??sceneDuration,span=Math.max(0,end-e.at),exitLength=Math.min(e.exitDuration,span);
 const exit=e.exitAnimation==='none'||!Number.isFinite(end)?0:exitLength>0?Math.min(1,Math.max(0,(time-(end-exitLength))/exitLength)):time>=end?1:0,out=1-(1-exit)**3;
 const pose={motionX:motion?motion.x*width/100:0,motionY:motion?motion.y*height/100:0,rotation:e.rotation+(motion?.angle??0),
 slideX:(e.animation==='slide-left'?(1-eased)*80:0)+(e.exitAnimation==='slide-left'?-80*out:e.exitAnimation==='slide-right'?80*out:0),
 slideY:(e.animation==='slide-up'?(1-eased)*80:0)+(e.exitAnimation==='slide-up'?-80*out:e.exitAnimation==='slide-down'?80*out:0),
 scale:(e.animation==='zoom'?0.7+0.3*eased:e.animation==='pan'?1+0.1*progress:1)*(e.exitAnimation==='zoom-out'?1-.3*out:1)};
 return {pose,visible:time>=e.at&&(e.until===null||time<e.until),opacity:e.opacity*(e.animation==='fade'?progress:1)*(e.exitAnimation==='fade'?1-exit:1),
 transform:`${motion?`translate(${pose.motionX}px, ${pose.motionY}px) `:''}rotate(${pose.rotation}deg) translate(${pose.slideX}px, ${pose.slideY}px) scale(${pose.scale})`,
 text:e.animation==='typewriter'?Array.from(e.text).slice(0,Math.floor(Array.from(e.text).length*progress)).join(''):e.text};
}

// Incoming transitions occupy the start of the new scene; no extra timeline time.
export function sceneTransitionState(scene:Scene,local:number){
 const progress=Math.min(1,Math.max(0,local/scene.transitionDuration));
 const direction=scene.transition.split('-')[1];
 const x=direction==='left'?1:direction==='right'?-1:0,y=direction==='up'?1:direction==='down'?-1:0;
 const incoming=scene.transition==='zoom-in'?`scale(${0.7+0.3*progress})`:scene.transition==='zoom-out'?`scale(${1.3-0.3*progress})`:scene.transition.startsWith('slide-')?`translate(${x*(1-progress)*100}%, ${y*(1-progress)*100}%)`:'none';
 const outgoing=scene.transition.startsWith('slide-')?`translate(${-x*progress*100}%, ${-y*progress*100}%)`:'none';
 const rest=(1-progress)*100;
 const clip=scene.transition.startsWith('wipe-')?`inset(${direction==='up'?rest:0}% ${direction==='right'?rest:0}% ${direction==='down'?rest:0}% ${direction==='left'?rest:0}%)`:'none';
 return {progress,incoming,outgoing,clip,opacity:scene.transition==='through-black'?Math.max(0,progress*2-1):scene.transition==='crossfade'||scene.transition.startsWith('zoom-')?progress:1,outgoingOpacity:scene.transition==='through-black'?Math.max(0,1-progress*2):1};
}
