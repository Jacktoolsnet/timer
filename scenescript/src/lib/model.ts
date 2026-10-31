import {parsePublishing,type Publishing} from './publishing.ts';
import {objectSoundScore2D} from './sound2d.ts';
import {parseStage2D,parseLibrary2D,parseObject2D,parseStage2DResource,upgradeLegacy2D,type Object2D,type Stage2DResource,type Stage2D} from './stage2d.ts';
import {parseStoryboard,type Storyboard} from './storyboard.ts';
import {parseMorph,type Morph} from './morph.ts';
import {parseGroup3D,type Group3D} from './group3d.ts';
import {parse3DLibrary,parseCharacter3D,parseStage3D,parseShot3D,type Character3D,type Stage3D,type Shot3D} from './stage3d.ts';
import {utf8ByteLength} from './data-size.ts';
import {defaultLighting,parseLighting,type Lighting} from './lighting.ts';
import {defaultKaleidoscope,parseKaleidoscope,type Kaleidoscope} from './kaleidoscope.ts';
import {defaultPrint,parsePrint,type PrintEffect} from './print.ts';
import {defaultGlitch,parseGlitch,type Glitch} from './glitch.ts';
import {defaultReveal,parseReveal,type Reveal} from './reveal.ts';
import {defaultAfterimages,parseAfterimages,type Afterimages} from './afterimages.ts';
import {defaultStopMotion,parseStopMotion,stopMotionState,type StopMotion} from './stop-motion.ts';
import {defaultPaper,parsePaper,type Paper} from './paper.ts';
import {defaultExposure,parseExposure,type Exposure} from './exposure.ts';
import {defaultLiquid,parseLiquid,type LiquidEffect} from './liquid.ts';
import {isParticleExit} from './particles.ts';
import {defaultTextEffects,parseTextEffects,type TextEffects} from './text-effects.ts';
import {parseCamera,type Camera} from './camera.ts';
import {parseCrop,type Crop} from './crop.ts';
import {parsePlacement} from './groups.ts';
import type {Matrix} from './comic.ts';
import {defaultBubble,parseBubble,parseAnchors,type Bubble,type Anchors} from './comic.ts';
import {parseNarration,validateAudioData,type AudioAsset,type Narration} from './audio.ts';
import {parseMotionPath,motionPathState,type MotionPath} from './motion-path.ts';
import {parseVideo,validateVideoData,defaultVideo,type VideoAsset,type VideoSettings} from './video.ts';
import {parseMusic,type Music} from './music.ts';
import {parseSimulation,defaultSimulation,type Simulation} from './simulation.ts';
import {parseGradient,type Gradient} from './gradient.ts';
import {validateImage} from './image-assets.ts';
import {validateTextureAssets3D} from './texture3d.ts';
export {validateImage,MAX_IMAGE_BYTES} from './image-assets.ts';
export const formats = { landscape: [1920,1080], portrait: [1080,1920], square: [1080,1080] } as const;
// System fonts use local fallbacks; script and seasonal display families are bundled with the site.
export const fonts = ['Arial','Georgia','Verdana','Courier New','Helvetica','Tahoma','Trebuchet MS','Segoe UI','Times New Roman','Palatino Linotype','Garamond','Consolas','Lucida Console','Impact','Arial Black','Comic Sans MS','Allura','Great Vibes','Parisienne','Sacramento','Creepster','Mountains of Christmas'] as const;
export const animations = ['none','fade','slide-left','slide-up','zoom','typewriter','pan','draw'] as const;
export const exitAnimations=['none','fade','slide-left','slide-right','slide-up','slide-down','zoom-out','particles-dust','particles-sparks','particles-confetti'] as const;
export const shapeTypes=['rectangle','ellipse','triangle','diamond','star','arrow'] as const;
export type Asset = { name:string; data:string };
export type TextRun = {text:string} & Partial<Pick<Element,'font'|'fontSize'|'color'|'bold'|'italic'|'underline'|'strikethrough'>>;
export type Element = {
 space:'scene'|'screen'; crop:Crop|null; placement:Matrix|null; id:string; name:string; type:'text'|'image'|'shape'|'simulation'|'video'|'bubble'; bubble:Bubble|null; anchors:Anchors; until:number|null; exitAnimation:typeof exitAnimations[number]; exitDuration:number; video:VideoSettings|null; text:string; runs:TextRun[]; asset:string; x:number; y:number; width:number; height:number;
 lighting:Lighting; kaleidoscope:Kaleidoscope; print:PrintEffect; glitch:Glitch; reveal:Reveal; afterimages:Afterimages; stopMotion:StopMotion; paper:Paper; exposure:Exposure; liquid:LiquidEffect; textGradient:Gradient|null; textEffects:TextEffects; simulation:Simulation|null; color:string; fillGradient:Gradient|null; fillColor:string; borderColor:string; borderWidth:number; shapeType:typeof shapeTypes[number]; borderStyle:'solid'|'dashed'|'dotted'|'double'; font:typeof fonts[number]; fontSize:number; align:'left'|'center'|'right'; bold:boolean; italic:boolean; underline:boolean; strikethrough:boolean;
 opacity:number; rotation:number; radius:number; fit:'cover'|'contain';
 motionPath:MotionPath|null; animation:typeof animations[number]; at:number; animationDuration:number;
};
export const sceneTransitions=['none','fade','crossfade','morph','slide-left','slide-right','slide-up','slide-down','wipe-left','wipe-right','wipe-up','wipe-down','zoom-in','zoom-out','through-black'] as const;
export type Group=Pick<Element,'id'|'name'|'x'|'y'|'rotation'|'opacity'|'animation'|'at'|'until'|'animationDuration'|'exitAnimation'|'exitDuration'|'motionPath'>&{members:string[];pivot:{x:number;y:number}};
export type Scene = {stage2d:Stage2D|null;morph:Morph|null;stage3d:Shot3D|null; camera:Camera|null; groups:Group[]; narration:Narration|null; id:string; name:string; duration:number; background:string; backgroundEnabled:boolean; backgroundOpacity:number; backgroundGradient:Gradient|null; backgroundAsset:string; transition:typeof sceneTransitions[number]; transitionDuration:number; elements:Element[] };
export type Project = { publishing?:Publishing; objects2d:Record<string,Object2D>;stages2d:Record<string,Stage2DResource>;storyboard:Storyboard|null; groups3d:Record<string,Group3D>; characters:Record<string,Character3D>; stages:Record<string,Stage3D>; version:'1.0'; title:string; description:string; firstComment:string; hashtags:string; thumbnail:Asset|null; audios:Record<string,AudioAsset>; narration:Narration|null; audioDucking:boolean; format:keyof typeof formats; backgroundSimulation:Simulation|null; backgroundVideo:VideoSettings|null; videos:Record<string,VideoAsset>; music:Music|null; assets:Record<string,Asset>; scenes:Scene[] };
export const MAX_FILE_BYTES = 160 * 1024 * 1024;
export function newElement(type:Element['type'], id:string = crypto.randomUUID()):Element {
 return {lighting:defaultLighting(),kaleidoscope:defaultKaleidoscope(),print:defaultPrint(),glitch:defaultGlitch(),reveal:defaultReveal(),afterimages:defaultAfterimages(),stopMotion:defaultStopMotion(),paper:defaultPaper(),exposure:defaultExposure(),liquid:defaultLiquid(),textGradient:null,textEffects:defaultTextEffects(),space:'scene',crop:null,placement:null,id,name:'',type,bubble:type==='bubble'?defaultBubble():null,anchors:{},until:null,exitAnimation:'none',exitDuration:.5,motionPath:null,video:type==='video'?defaultVideo():null,simulation:type==='simulation'?defaultSimulation():null,text:type==='bubble'?'Hello!':type==='text'?'Your story starts here.':'',runs:[],asset:'',x:10,y:type==='bubble'?10:35,width:type==='bubble'?40:80,height:type==='bubble'?24:30,color:type==='bubble'?'#222222':type==='shape'?'#b86445':'#ffffff',fillGradient:null,fillColor:type==='shape'?'#b86445':'#ffffff',borderColor:type==='bubble'?'#222222':'none',borderWidth:4,shapeType:'rectangle',borderStyle:'solid',font:'Arial',fontSize:type==='bubble'?48:90,align:'center',bold:false,italic:false,underline:false,strikethrough:false,opacity:1,rotation:0,radius:0,fit:'contain',animation:'fade',at:0,animationDuration:1};
}
export function newScene(id:string = crypto.randomUUID()):Scene {
 return {stage2d:null,morph:null,stage3d:null,camera:null,groups:[],narration:null,id,name:'Scene',duration:5,background:'#263b42',backgroundEnabled:true,backgroundOpacity:1,backgroundGradient:null,backgroundAsset:'',transition:'fade',transitionDuration:0.5,elements:[]};
}
export function demoProject():Project {
 const first = newScene('intro'); first.name='A new idea';
 const title=newElement('text','headline');title.text='Your idea.\nYour stage.';title.font='Georgia';title.animation='slide-up';first.elements=[title];
 const second=newScene('outro');second.name='Make it move';second.background='#684d45';
 const text=newElement('text','outro-text');text.text='Tell your story.\nOne scene at a time.';text.fontSize=72;text.animation='typewriter';text.animationDuration=2;second.elements=[text];
 return {objects2d:{},stages2d:{},storyboard:null,groups3d:{},characters:{},stages:{},version:'1.0',title:'My SceneScript',description:'',firstComment:'',hashtags:'',thumbnail:null,audios:{},narration:null,audioDucking:false,format:'landscape',backgroundSimulation:null,backgroundVideo:null,videos:{},music:null,assets:{},scenes:[first,second]};
}
function obj(v:unknown,path:string):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error(`${path}: expected object`);return v as Record<string,unknown>;}
function str(v:unknown,path:string,max=10000):string {if(typeof v!=='string'||v.length>max)throw new Error(`${path}: expected text (max ${max})`);return v;}
function num(v:unknown,path:string,min:number,max:number):number {if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error(`${path}: expected number ${min}–${max}`);return v;}
function one<T extends string>(v:unknown,values:readonly T[],path:string):T {if(!values.includes(v as T))throw new Error(`${path}: ${values.join(', ')}`);return v as T;}
function color(v:unknown,path:string):string {const s=str(v,path,7);if(!/^#[0-9a-f]{6}$/i.test(s))throw new Error(`${path}: expected #RRGGBB`);return s;}
function keys(o:Record<string,unknown>,allowed:string[],path:string){for(const k of Object.keys(o))if(!allowed.includes(k))throw new Error(`${path}.${k}: unknown field`);}
function id(v:unknown,path:string){const s=str(v,path,100);if(!/^[a-zA-Z0-9_-]+$/.test(s))throw new Error(`${path}: invalid identifier`);return s;}
export function parseProject(input:string):Project {
 if(utf8ByteLength(input)>MAX_FILE_BYTES)throw new Error('JSON: maximum 160 MiB');
 return readProject(JSON.parse(input));
}
/** Validate editor objects without serializing and parsing all embedded media again. */
export function validateProject(input:unknown):Project {
 const project=readProject(input);
 if(projectJsonBytes(project)>MAX_FILE_BYTES)throw new Error('JSON: maximum 160 MiB');
 return project;
}
/** Exact compact JSON size for a validated project; Base64 payloads need no escaping. */
export function projectJsonBytes(project:Project):number {
 let mediaBytes=0;
 const metadata=JSON.stringify(project,(key,value)=>{if(key==='data'&&typeof value==='string'){mediaBytes+=value.length;return '';}return value;});
 return utf8ByteLength(metadata)+mediaBytes;
}
function readProject(input:unknown):Project {
 const p=obj(upgradeLegacy2D(input),'project');keys(p,['publishing','objects2d','stages2d','storyboard','groups3d','characters','stages','version','title','description','firstComment','hashtags','thumbnail','audios','narration','audioDucking','format','backgroundSimulation','backgroundVideo','videos','music','assets','scenes'],'project');
 if(p.version!=='1.0')throw new Error('version: expected 1.0');
 const objects2d=parseLibrary2D(p.objects2d,parseObject2D,'objects2d'),stages2d=parseLibrary2D(p.stages2d,parseStage2DResource,'stages2d');
 const characters=parse3DLibrary(p.characters,parseCharacter3D,'characters'),stages=parse3DLibrary(p.stages,parseStage3D,'stages');
 const groups3d=parse3DLibrary(p.groups3d,(v,p)=>parseGroup3D(v,characters,p),'groups3d');
 const assets:Record<string,Asset>=Object.create(null);const raw=obj(p.assets??{},'assets');
 if(Object.keys(raw).length>100)throw new Error('assets: maximum 100');
 for(const [key,value] of Object.entries(raw)){id(key,'asset ID');const a=obj(value,`assets.${key}`);keys(a,['name','data'],`assets.${key}`);assets[key]={name:str(a.name,`${key}.name`,200),data:validateImage(a.data,`${key}.data`)};}
 validateTextureAssets3D([...Object.values(characters),...Object.values(stages)].map(v=>v.model),assets);
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
   const merged={...defaults,...e};const afterimages=parseAfterimages(merged.afterimages,ep+'.afterimages');if(afterimages.enabled&&!['text','image','shape'].includes(type))throw new Error(ep+'.afterimages: requires text, image or shape');const paper=parsePaper(merged.paper,ep+'.paper');if(paper.enabled&&!['text','image','shape'].includes(type))throw new Error(ep+'.paper: requires text, image or shape');if(typeof merged.exitAnimation==='string'&&isParticleExit(merged.exitAnimation)&&!['text','image','shape'].includes(type))throw new Error(ep+'.exitAnimation: particles require text, image or shape');const simulation=parseSimulation(merged.simulation,ep+'.simulation');if(type==='simulation'&&!simulation)throw new Error(ep+'.simulation: required for simulation element'); const eid=id(e.id,`${ep}.id`);if(elementIds.has(eid))throw new Error(`${ep}: duplicate ID`);elementIds.add(eid);
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
   return {lighting:parseLighting(merged.lighting,ep+'.lighting'),kaleidoscope:parseKaleidoscope(merged.kaleidoscope,ep+'.kaleidoscope'),print:parsePrint(merged.print,ep+'.print'),glitch:parseGlitch(merged.glitch,ep+'.glitch'),reveal:parseReveal(merged.reveal,ep+'.reveal'),afterimages,stopMotion:parseStopMotion(merged.stopMotion,ep+'.stopMotion'),paper,exposure:parseExposure(merged.exposure,ep+'.exposure'),liquid:parseLiquid(merged.liquid,ep+'.liquid'),textGradient:parseGradient(merged.textGradient,ep+'.textGradient'),textEffects:parseTextEffects(merged.textEffects,ep+'.textEffects'),space:one(merged.space,['scene','screen'] as const,ep+'.space'),crop:parseCrop(merged.crop,ep+'.crop'),placement:parsePlacement(merged.placement,ep+'.placement'),id:eid,bubble,anchors,until,exitAnimation:one(merged.exitAnimation,exitAnimations,ep+'.exitAnimation'),exitDuration:num(merged.exitDuration,ep+'.exitDuration',.01,3600),motionPath:parseMotionPath(merged.motionPath,duration,ep+'.motionPath'),video:parseVideo(merged.video,videos,ep+'.video'),simulation,name:str(merged.name,`${ep}.name`,200),type,text,runs,asset:ref(merged.asset,`${ep}.asset`),
    x:num(merged.x,`${ep}.x`,-100,100),y:num(merged.y,`${ep}.y`,-100,100),width:num(merged.width,`${ep}.width`,0.1,200),height:num(merged.height,`${ep}.height`,0.1,200),
    fillGradient:parseGradient(merged.fillGradient,ep+'.fillGradient'),color:color(merged.color,`${ep}.color`),fillColor:(e.fillColor??(type==='bubble'?defaults.fillColor:merged.color))==='none'?'none':color(e.fillColor??(type==='bubble'?defaults.fillColor:merged.color),`${ep}.fillColor`),borderColor:merged.borderColor==='none'?'none':color(merged.borderColor,`${ep}.borderColor`),borderWidth:num(merged.borderWidth,`${ep}.borderWidth`,0,500),shapeType:one(merged.shapeType,shapeTypes,`${ep}.shapeType`),borderStyle:one(merged.borderStyle,['solid','dashed','dotted','double'] as const,`${ep}.borderStyle`),font:one(merged.font,fonts,`${ep}.font`),fontSize:num(merged.fontSize,`${ep}.fontSize`,1,500),align:one(merged.align,['left','center','right'] as const,`${ep}.align`),bold:merged.bold,italic:merged.italic,underline:merged.underline,strikethrough:merged.strikethrough,
    opacity:num(merged.opacity,`${ep}.opacity`,0,1),rotation:num(merged.rotation,`${ep}.rotation`,-360,360),radius:num(merged.radius,`${ep}.radius`,0,1000),fit:one(merged.fit,['cover','contain'] as const,`${ep}.fit`),
    animation:one(merged.animation,animations,`${ep}.animation`),at,animationDuration:num(merged.animationDuration,`${ep}.animationDuration`,0.01,3600)};
  });
  for(const e of elements)if(e.bubble?.tail.mode==='anchor'){
   const target=elements.find(v=>v.id===e.bubble!.tail.element);
   if(!target||!Object.hasOwn(target.anchors,e.bubble.tail.anchor))throw new Error(path+'.elements: missing speaker element/anchor');
  }
  const rawGroups=s.groups===undefined?[]:s.groups;
  if(!Array.isArray(rawGroups)||rawGroups.length>50)throw new Error(path+'.groups: expected array (max 50)');
  const memberIds=new Set<string>(),groupIds=new Set<string>();
  const groups:Group[]=rawGroups.map((value,k)=>{
   const gp=path+'.groups['+k+']',g=obj(value,gp),get=(key:string,fallback:unknown)=>g[key]===undefined?fallback:g[key];keys(g,['id','name','members','pivot','x','y','rotation','opacity','animation','at','until','animationDuration','exitAnimation','exitDuration','motionPath'],gp);
   const gid=id(g.id,gp+'.id');if(groupIds.has(gid)||elements.some(e=>e.id===gid))throw new Error(gp+': duplicate ID');groupIds.add(gid);
   if(!Array.isArray(g.members)||g.members.length<1||g.members.length>100)throw new Error(gp+'.members: expected 1–100 element IDs');
   const members=g.members.map(v=>{const mid=id(v,gp+'.members');if(!elements.some(e=>e.id===mid)||memberIds.has(mid))throw new Error(gp+': missing or multiply grouped element');memberIds.add(mid);return mid;});
   if(new Set(members.map(mid=>elements.find(e=>e.id===mid)!.space)).size>1)throw new Error(gp+'.members: all members must use the same coordinate space');
   const pivot=obj(get('pivot',{x:50,y:50}),gp+'.pivot');keys(pivot,['x','y'],gp+'.pivot');
   const at=num(get('at',0),gp+'.at',0,duration),until=g.until===undefined||g.until===null?null:num(g.until,gp+'.until',0,duration);if(until!==null&&until<=at)throw new Error(gp+'.until: must be greater than at');
   return {id:gid,name:str(get('name','Group'),gp+'.name',200),members,pivot:{x:num(pivot.x,gp+'.pivot.x',-1000,1000),y:num(pivot.y,gp+'.pivot.y',-1000,1000)},x:num(get('x',0),gp+'.x',-1000,1000),y:num(get('y',0),gp+'.y',-1000,1000),rotation:num(get('rotation',0),gp+'.rotation',-360,360),opacity:num(get('opacity',1),gp+'.opacity',0,1),at,until,animation:one(get('animation','none'),animations.filter(a=>a!=='typewriter'&&a!=='draw'),gp+'.animation'),animationDuration:num(get('animationDuration',1),gp+'.animationDuration',.01,3600),exitAnimation:one(get('exitAnimation','none'),exitAnimations.filter(a=>!isParticleExit(a)),gp+'.exitAnimation'),exitDuration:num(get('exitDuration',.5),gp+'.exitDuration',.01,3600),motionPath:parseMotionPath(g.motionPath,duration,gp+'.motionPath')};
  });
  return {stage2d:parseStage2D(s.stage2d,path+'.stage2d',{objects2d,stages2d},duration),morph:parseMorph(s.morph,path+'.morph'),stage3d:parseShot3D(s.stage3d,characters,stages,duration,path+'.stage3d',groups3d),camera:parseCamera(s.camera,duration,path+'.camera'),groups,narration:parseNarration(s.narration,audios,duration,path+'.narration'),id:sid,name:str(s.name??d.name,`${path}.name`,200),duration,backgroundEnabled:(s.backgroundEnabled??true) as boolean,backgroundOpacity:num(s.backgroundOpacity??1,path+'.backgroundOpacity',0,1),backgroundGradient:parseGradient(s.backgroundGradient,path+'.backgroundGradient'),background:color(s.background??d.background,`${path}.background`),backgroundAsset:ref(s.backgroundAsset??'',`${path}.backgroundAsset`),transition:one(s.transition??d.transition,sceneTransitions,`${path}.transition`),transitionDuration:num(s.transitionDuration??d.transitionDuration,`${path}.transitionDuration`,0.01,3600),elements};
 });
 const backgroundSimulation=parseSimulation(p.backgroundSimulation,'backgroundSimulation');
 for(const [i,s] of scenes.entries())if(s.elements.reduce((n,e)=>n+(e.type==='simulation'?e.simulation!.count:0),backgroundSimulation?.count??0)>5000)throw new Error('scenes['+i+']: maximum 5000 simulated particles including project background');
 const result:Project={objects2d,stages2d,storyboard:p.storyboard==null?null:parseStoryboard(p.storyboard,false,one(p.format,Object.keys(formats) as (keyof typeof formats)[],'format')),groups3d,characters,stages,audios,narration:parseNarration(p.narration,audios,scenes.reduce((n,s)=>n+s.duration,0)),audioDucking:(p.audioDucking??false) as boolean,thumbnail,videos,backgroundVideo:parseVideo(p.backgroundVideo,videos,'backgroundVideo'),music:parseMusic(p.music,scenes.reduce((n,s)=>n+s.duration,0)),backgroundSimulation,version:'1.0',title:str(p.title,'title',200),description:str(p.description===undefined?'':p.description,'description',5000),firstComment:str(p.firstComment===undefined?'':p.firstComment,'firstComment',5000),hashtags:str(p.hashtags===undefined?'':p.hashtags,'hashtags',2000),format:one(p.format,['landscape','portrait','square'] as const,'format'),assets,scenes};
 if(p.publishing!==undefined)result.publishing=parsePublishing(p.publishing);
 objectSoundScore2D(result);return result;
}
export function locateTime(project:Project,time:number):{index:number;local:number;ended:boolean}{
 let offset=0;for(let i=0;i<project.scenes.length;i++){const duration=project.scenes[i].duration;if(time<offset+duration)return {index:i,local:Math.max(0,time-offset),ended:false};offset+=duration;}
 return {index:project.scenes.length-1,local:project.scenes.at(-1)!.duration,ended:true};
}
export function animationState(e:Element,time:number,width=1920,height=1080,sceneDuration=Infinity){
 const realTime=time,stepped=stopMotionState(e.stopMotion,e.id,time,e.at,e.until??sceneDuration);time=stepped.time;
 const motion=e.motionPath?motionPathState(e.motionPath,time,width,height):null;
 const progress=Math.min(1,Math.max(0,(time-e.at)/e.animationDuration));const eased=1-(1-progress)**3;
 const end=e.until??sceneDuration,span=Math.max(0,end-e.at),exitLength=Math.min(e.exitDuration,span);
 const exit=e.exitAnimation==='none'||!Number.isFinite(end)?0:exitLength>0?Math.min(1,Math.max(0,(time-(end-exitLength))/exitLength)):time>=end?1:0,out=1-(1-exit)**3;
 const pose={motionX:motion?motion.x*width/100:0,motionY:motion?motion.y*height/100:0,rotation:e.rotation+(motion?.angle??0)+stepped.rotation,
 slideX:stepped.x+(e.animation==='slide-left'?(1-eased)*80:0)+(e.exitAnimation==='slide-left'?-80*out:e.exitAnimation==='slide-right'?80*out:0),
 slideY:stepped.y+(e.animation==='slide-up'?(1-eased)*80:0)+(e.exitAnimation==='slide-up'?-80*out:e.exitAnimation==='slide-down'?80*out:0),
 scale:(e.animation==='zoom'?0.7+0.3*eased:e.animation==='pan'?1+0.1*progress:1)*(e.exitAnimation==='zoom-out'?1-.3*out:1)};
 return {pose,sampleTime:time,visible:realTime>=e.at&&(e.until===null||realTime<e.until),opacity:e.opacity*(e.animation==='fade'?progress:1)*(e.exitAnimation==='fade'?1-exit:1),
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
 return {progress,incoming,outgoing,clip,opacity:scene.transition==='through-black'?Math.max(0,progress*2-1):scene.transition==='crossfade'||scene.transition==='morph'||scene.transition.startsWith('zoom-')?progress:1,outgoingOpacity:scene.transition==='through-black'?Math.max(0,1-progress*2):1};
}
