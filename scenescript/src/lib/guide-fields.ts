import {defaultEffectSite3D,defaultEffect3D} from './effects3d.ts';
import {defaultGroup3D,defaultGroupPlacement3D} from './group3d.ts';
import {vec,defaultPathMotion3D} from './path3d.ts';
import {defaultCameraFollow3D} from './camera3d.ts';
import {defaultJoint3D,defaultPart3D,defaultModelMotion3D,vector3D} from './model3d.ts';
import {defaultActorSpeech3D,defaultActorExpression3D,defaultActorAction3D,defaultCharacter3D,defaultStage3D,defaultStageCamera3D,defaultActor3D} from './stage3d.ts';
import schemaJSON from '../../public/schema.json' with {type:'json'};
import {parseProject,newScene,newElement,fonts} from './model.ts';
import {defaultMotionPath} from './motion-path.ts';
import {defaultBubble} from './comic.ts';
import {defaultGradient} from './gradient.ts';
import {defaultSimulation} from './simulation.ts';
import {defaultMusic,presetInstrument} from './music.ts';
import {defaultNarration} from './audio.ts';
import {defaultVideo} from './video.ts';
// JSON Schema supplies structural bounds. Factories supply omitted-field defaults.
// Semantic/asset-dependent constraints are explained separately in the guide.
type Schema={type?:string|string[];properties?:Record<string,Schema>;required?:string[];items?:Schema;additionalProperties?:boolean|Schema;anyOf?:Schema[];oneOf?:Schema[];$ref?:string;enum?:unknown[];const?:unknown;default?:unknown;minimum?:number;maximum?:number;exclusiveMinimum?:number;exclusiveMaximum?:number;minLength?:number;maxLength?:number;pattern?:string;minItems?:number;maxItems?:number;maxProperties?:number};
const schema=schemaJSON as Schema&{$defs:Record<string,Schema>};
const unwrap=(s:Schema):Schema=>s.properties?s:(s.anyOf||s.oneOf||[]).find(v=>v.properties)||s;
const element=newElement('text','documentation'),scene=newScene('documentation');
const root=parseProject(JSON.stringify({version:'1.0',title:'',format:'landscape',scenes:[{id:'documentation',elements:[]}]}));
const defaults:Record<string,unknown>={EffectSite3D:defaultEffectSite3D(),Effect3D:defaultEffect3D(),Group3D:defaultGroup3D(),GroupPlacement3D:defaultGroupPlacement3D('documentation'),GroupSpacing3D:defaultGroup3D().spacing,GroupSize3D:defaultGroup3D().size,GroupJitter3D:vec(),PathVector3D:vec(),Path3D:{closed:false,interpolation:'smooth'},PathMotion3D:defaultPathMotion3D(),CameraFollow3D:defaultCameraFollow3D(),CameraKey3D:{roll:0},Vector3D:vector3D(),Rotation3D:vector3D(),Size3D:vector3D(1),Joint3D:defaultJoint3D(),Part3D:defaultPart3D(),Model3D:{effectSites:[],animations:{}},JointTrack3D:{easing:'linear'},ModelMotion3D:defaultModelMotion3D(),ActorSpeech3D:defaultActorSpeech3D(),ActorExpression3D:defaultActorExpression3D(),ActorAction3D:defaultActorAction3D(),Character3D:defaultCharacter3D(),Stage3D:defaultStage3D(),StageCamera3D:defaultStageCamera3D(),Actor3D:defaultActor3D('documentation'),Shot3D:{effects:[],groups:[],stageJoints:{},stageMotions:[],actors:[],camera:defaultStageCamera3D()},Project:root,Scene:scene,Element:element,MotionPath:defaultMotionPath(),Bubble:defaultBubble(),Gradient:defaultGradient(),Simulation:defaultSimulation(),Music:defaultMusic(),Instrument:{...presetInstrument('pad'),name:undefined},Narration:defaultNarration(),VideoSettings:defaultVideo(),Group:{name:'Group',x:0,y:0,pivot:{x:50,y:50},rotation:0,opacity:1,at:0,until:null,animation:'none',animationDuration:1,exitAnimation:'none',exitDuration:.5,motionPath:null},MusicNote:{velocity:.7}};
const names:Record<string,string>={'Project.assets[]':'ImageAsset','Project.videos[]':'VideoAsset','Project.audios[]':'AudioAsset','Project.thumbnail':'Thumbnail','Project.scenes[]':'Scene','Scene.elements[]':'Element','Element.runs[]':'TextRun','Music.notes[]':'MusicNote','Instrument.partials[]':'Partial','Gradient.stops[]':'ColorStop','Camera.stations[]':'CameraStation','MotionPath.segments[]':'PathSegment'};
for(const key of ['lighting','kaleidoscope','print','glitch','reveal','afterimages','stopMotion','paper','exposure','liquid','textEffects'])names['Element.'+key]=title(key);
const notes:Record<string,string>={'Storyboard.format':'Project.format on legacy project load; landscape otherwise','Group3D.count':'12; points:points.length','Group3D.spacing':'{x:1.3,y:0.5,z:1.5}','Group3D.size':'{x:10,y:0,z:10}','CameraFollow3D.offset':'chase:{x:0,y:3,z:-7}; onboard:{x:0,y:1.6,z:0.6}; track:{x:8,y:4,z:8}','CameraFollow3D.target':'chase/track:{x:0,y:1,z:2}; onboard:{x:0,y:1.6,z:8}','Joint3D.target':'max','Joint3D.value':'0; scale:1','ModelMotion3D.at':'previous motion end, first:0','ActorExpression3D.at':'previous expression end, first:0','ActorAction3D.at':'previous action end, first:0','ActorAction3D.faceMovement':'true for walk without target/rotation, otherwise false','Actor3D.toX':'x','Actor3D.toZ':'z','Actor3D.duration':'min(4, scene.duration-at)','Simulation.size':'5; snow:6; bubbles:18','TextRun.font':'inherit Element.font','TextRun.fontSize':'inherit Element.fontSize','TextRun.color':'inherit Element.color','TextRun.bold':'inherit Element.bold','TextRun.italic':'inherit Element.italic','TextRun.underline':'inherit Element.underline','TextRun.strikethrough':'inherit Element.strikethrough','Element.fontSize':'90; bubble:48','Element.borderColor':'"none"; bubble:"#222222"','Element.text':'by type (§3)','Element.y':'35; bubble:10','Element.width':'80; bubble:40','Element.height':'30; bubble:24','Element.color':'by type (§3)','Element.fillColor':'color; bubble:"#ffffff"','Element.simulation':'by type (§3)','Element.bubble':'by type (§3)','Element.video':'by type (§3)','Music.instruments':'default ensemble (§9)','Instrument.name':'id'};
const types:Record<string,string>={'ActorExpression3D.at':'num[previous expression end..scene.duration-0.01]','ActorExpression3D.duration':'num[0.01..scene.duration-at]','ActorAction3D.at':'num[previous action end..scene.duration-0.01]','ActorAction3D.duration':'num[0.01..scene.duration-at]','Actor3D.at':'num[0..scene.duration-0.01]','Actor3D.duration':'num[0.01..scene.duration-at]','Element.font':'Font','TextRun.font':'Font','Element.at':'num[0..scene.duration]','Element.until':'null | num(at..scene.duration]','Group.at':'num[0..scene.duration]','Group.until':'null | num(at..scene.duration]','MotionPath.start':'num[0..scene.duration]','CameraStation.at':'num[0..scene.duration]','CameraStation.hold':'num[0..scene.duration]','MusicNote.at':'num[0..project.duration]','Narration.at':'num[0..scope.duration]','Narration.start':'num[0..file.duration)','Narration.end':'null | num(start..file.duration]','VideoSettings.start':'num[0..file.duration)','VideoSettings.end':'null | num(start..file.duration]'};
export const guideTypes:{name:string;schema:Schema;fields:string[]}[]=[];
const registered=new Map<Schema,string>();
function title(name:string){return name[0].toUpperCase()+name.slice(1);}
const objectDefault=(d:unknown):Record<string,unknown>=>d&&typeof d==='object'&&!Array.isArray(d)?d as Record<string,unknown>:{};
function register(s:Schema,name:string,d?:unknown){
 s=unwrap(s);if(registered.has(s))return registered.get(s)!;
 registered.set(s,name);defaults[name]??=d;guideTypes.push({name,schema:s,fields:[]});return name;
}
for(const [name,s] of Object.entries(schema.$defs))register(s,title(name));
register(schema,'Project');
function typeOf(s:Schema,path:string,d?:unknown):string{
 if(types[path])return types[path];
 if(s.$ref){const name=title(s.$ref.split('/').at(-1)!);return name+(schema.$defs[s.$ref.split('/').at(-1)!].anyOf?.some(s=>s.type==='null')?' | null':'');}
 const variants=s.anyOf||s.oneOf;if(variants)return variants.map(v=>typeOf(v,path,d)).join(' | ');
 if(Array.isArray(s.type))return s.type.map(t=>typeOf({...s,type:t},path,d)).join(' | ');
 if(s.const!==undefined)return JSON.stringify(s.const);
 if(s.enum)return s.enum.map(v=>JSON.stringify(v)).join(' | ');
 if(s.properties)return register(s,names[path]||path.split('.').map(p=>title(p.replaceAll('[]',''))).join(''),d);
 if(s.type==='array')return `Array<${typeOf(s.items!,path+'[]',Array.isArray(d)?d[0]:undefined)}>[${s.minItems??0}..${s.maxItems??'∞'}]`;
 if(s.type==='object'&&typeof s.additionalProperties==='object')return `Map<ID,${typeOf(s.additionalProperties,path+'[]')}>[0..${s.maxProperties??'∞'}]`;
 if(s.type==='null')return 'null';if(s.type==='boolean')return 'bool';
 if(s.type==='number'||s.type==='integer')return (s.type==='integer'?'int':'num')+(s.minimum!==undefined||s.maximum!==undefined||s.exclusiveMinimum!==undefined||s.exclusiveMaximum!==undefined?`${s.exclusiveMinimum!==undefined?'(':'['}${s.exclusiveMinimum??s.minimum??'-∞'}..${s.exclusiveMaximum??s.maximum??'∞'}${s.exclusiveMaximum!==undefined?')':']'}`:'');
 if(s.type==='string'){
  if(path.endsWith('.data'))return path==='VideoAsset.data'?'VideoData':path==='AudioAsset.data'?'AudioData':path==='Thumbnail.data'?'RasterData':'ImageData';
  if(s.pattern?.includes('#'))return s.pattern.includes('none')?'Color | "none"':'Color';
  if(s.pattern?.includes('a-zA-Z0-9')||s.pattern?.includes('A-Za-z0-9'))return s.pattern.includes('?')?'ID | ""':'ID';
  return 'str'+(s.maxLength!==undefined?`[${s.minLength??0}..${s.maxLength}]`:'');
 }
 throw new Error('Unmapped guide schema: '+path);
}
function defaultOf(s:Schema,d:unknown,path:string){
 if(notes[path])return notes[path];
 const value=s.default!==undefined?s.default:d;if(value===undefined)return undefined;
 if(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length&&!(unwrap(s).required?.length))return '{}';
 return JSON.stringify(value);
}
export function fieldCatalog(){
 const blocks=new Map<string,string>();
 // register() appends nested types while iterating. Every object is expanded exactly once.
 for(const item of guideTypes){const d=objectDefault(defaults[item.name]);item.fields=Object.keys(item.schema.properties!);const lines=item.fields.map(key=>{const s=item.schema.properties![key],path=item.name+'.'+key,required=item.schema.required?.includes(key),type=typeOf(s,path,d[key]),value=required?undefined:defaultOf(s,d[key],path);return `  ${key}${required?'!':''}: ${type}${value!==undefined?' = '+value:''}`;});blocks.set(item.name,`${item.name}\n${lines.join('\n')}`);}
 const first=['Project','Scene','Element','TextRun'];return [...first,...blocks.keys()].filter((n,i,a)=>a.indexOf(n)===i).map(n=>blocks.get(n)).join('\n\n');
}
export const guideFieldCatalog=fieldCatalog();
export const guideFonts=fonts.map(f=>JSON.stringify(f)).join(' | ');
