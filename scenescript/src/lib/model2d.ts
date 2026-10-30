/** Declarative, bounded vector puppets and layered sets. No scripts, URLs or SVG execution. */
export type Paint2D=string|null;
export const properties2D=['x','y','rotation','scaleX','scaleY','opacity'] as const;
export type Property2D=typeof properties2D[number];
export type PathCommand2D={op:'M'|'L'|'Q'|'C'|'Z';values:number[]};
export type Part2D={
 id:string;parent:string|null;shape:'group'|'rectangle'|'ellipse'|'polygon'|'path'|'text';
 x:number;y:number;rotation:number;scaleX:number;scaleY:number;pivotX:number;pivotY:number;
 width:number;height:number;radius:number;fill:Paint2D;stroke:Paint2D;strokeWidth:number;opacity:number;
 points:number[];path:PathCommand2D[];text:string;fontSize:number;
 rotationMin:number;rotationMax:number;parallax:number;layer:'background'|'foreground';
};
export type Clip2D={duration:number;loop:boolean;tracks:{part:string;property:Property2D;keys:{at:number;value:number;easing:'linear'|'smooth'|'step'}[]}[]};
export type Model2D={width:number;height:number;originX:number;originY:number;parts:Part2D[];animations:Record<string,Clip2D>};
const object=(v:unknown,p:string):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error(p+': expected object');return v as Record<string,unknown>;};
const keys=(o:Record<string,unknown>,allowed:string[],p:string)=>{for(const k of Object.keys(o))if(!allowed.includes(k))throw Error(p+'.'+k+': unknown field');};
const num=(v:unknown,p:string,min:number,max:number)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(p+': expected '+min+'–'+max);return v;};
const text=(v:unknown,p:string,max=200)=>{if(typeof v!=='string'||v.length>max)throw Error(p+': expected text, max '+max);return v;};
const id=(v:unknown,p:string)=>{const s=text(v,p,100);if(!/^[a-zA-Z0-9_-]+$/.test(s))throw Error(p+': invalid ID');return s;};
const one=<T extends string>(v:unknown,choices:readonly T[],p:string):T=>{if(!choices.includes(v as T))throw Error(p+': '+choices.join('|'));return v as T;};
const list=(v:unknown,p:string,max:number)=>{if(!Array.isArray(v)||v.length>max)throw Error(p+': expected array, max '+max);return v as unknown[];};
const paint=(v:unknown,p:string):Paint2D=>{if(v===null)return null;const s=text(v,p);if(!/^#[\da-f]{6}$/i.test(s)&&s!=='$color'&&s!=='$accent')throw Error(p+': #RRGGBB, $color, $accent or null');return s;};
export function defaultPart2D(id='part'):Part2D{return {id,parent:null,shape:'rectangle',x:0,y:0,rotation:0,scaleX:1,scaleY:1,pivotX:0,pivotY:0,width:100,height:100,radius:0,fill:'#79a8cb',stroke:null,strokeWidth:0,opacity:1,points:[],path:[],text:'',fontSize:24,rotationMin:-360,rotationMax:360,parallax:1,layer:'background'};}
export function parseModel2D(value:unknown,path='model2d'):Model2D{
 const raw=object(value,path);keys(raw,['width','height','originX','originY','parts','animations'],path);
 let budget=0,textBudget=0,textArea=0;
 const parts=list(raw.parts,path+'.parts',256).map((value,i)=>{
  const p=path+'.parts['+i+']',raw=object(value,p);keys(raw,Object.keys(defaultPart2D()),p);const o={...defaultPart2D(),...raw},out=defaultPart2D(id(raw.id,p+'.id'));
  out.parent=o.parent===null?null:id(o.parent,p+'.parent');out.shape=one(o.shape,['group','rectangle','ellipse','polygon','path','text'],p+'.shape');
  for(const key of ['x','y','pivotX','pivotY'] as const)out[key]=num(o[key],p+'.'+key,-8192,8192);
  for(const key of ['width','height'] as const)out[key]=num(o[key],p+'.'+key,.01,4096);
  for(const key of ['rotation','rotationMin','rotationMax'] as const)out[key]=num(o[key],p+'.'+key,-3600,3600);
  if(out.rotationMin>out.rotationMax||out.rotation<out.rotationMin||out.rotation>out.rotationMax)throw Error(p+': rotation outside joint limits');
  for(const key of ['scaleX','scaleY'] as const)out[key]=num(o[key],p+'.'+key,-10,10);
  out.radius=num(o.radius,p+'.radius',0,2048);out.opacity=num(o.opacity,p+'.opacity',0,1);
  out.fill=paint(o.fill,p+'.fill');out.stroke=paint(o.stroke,p+'.stroke');out.strokeWidth=num(o.strokeWidth,p+'.strokeWidth',0,100);
  out.text=text(o.text,p+'.text',500);textBudget+=out.text.length;if(textBudget>4000)throw Error(path+': text budget exceeded');out.fontSize=num(o.fontSize,p+'.fontSize',1,200);if(out.shape==='text'){const area=out.text.length*out.fontSize*out.fontSize;textArea+=area;if(area>262144||textArea>2000000)throw Error(path+': text rendering budget exceeded');}
  out.parallax=num(o.parallax,p+'.parallax',0,2);out.layer=one(o.layer,['background','foreground'],p+'.layer');
  out.points=list(o.points,p+'.points',1024).map(v=>num(v,p+'.points',-8192,8192));
  if(out.shape==='polygon'&&(out.points.length<6||out.points.length%2))throw Error(p+': polygon requires coordinate pairs (3+ vertices)');
  out.path=list(o.path,p+'.path',512).map((v,i)=>{const cp=p+'.path['+i+']',c=object(v,cp);keys(c,['op','values'],cp);const op=one(c.op,['M','L','Q','C','Z'],cp+'.op'),values=list(c.values??[],cp+'.values',6).map(v=>num(v,cp,-8192,8192));if(values.length!==({M:2,L:2,Q:4,C:6,Z:0}[op]))throw Error(cp+': invalid command arity');return {op,values};});
  if(out.shape==='path'&&(!out.path.length||out.path[0].op!=='M'))throw Error(p+': path must start with M');
  budget+=out.path.length+out.points.length+1;if(budget>8192)throw Error(path+': geometry budget exceeded');
  return out;
 });
 if(!parts.some(p=>p.shape!=='group'))throw Error(path+': visible geometry required');
 const ids=new Map(parts.map(p=>[p.id,p]));if(ids.size!==parts.length)throw Error(path+': duplicate part IDs');
 for(const part of parts){let node:Part2D|undefined=part;const seen=new Set<string>();while(node?.parent){if(seen.has(node.id))throw Error(path+': cyclic hierarchy');seen.add(node.id);node=ids.get(node.parent);if(!node)throw Error(path+': missing parent');if(seen.size>32)throw Error(path+': hierarchy too deep');}}
 const animations:Record<string,Clip2D>=Object.create(null),clips=object(raw.animations??{},path+'.animations');
 if(Object.keys(clips).length>32)throw Error(path+': maximum 32 clips');
 let keyBudget=0;
 for(const [name,value]of Object.entries(clips)){
  id(name,path+'.animations');const p=path+'.animations.'+name,c=object(value,p);keys(c,['duration','loop','tracks'],p);
  const duration=num(c.duration,p+'.duration',.01,120);if(c.loop!==undefined&&typeof c.loop!=='boolean')throw Error(p+'.loop: expected boolean');
  const used=new Set<string>(),tracks=list(c.tracks,p+'.tracks',256).map(v=>{
   const tr=object(v,p);keys(tr,['part','property','keys'],p);const part=id(tr.part,p),property=one(tr.property,properties2D,p),target=ids.get(part);if(!target)throw Error(p+': missing track part');
   const key=part+':'+property;if(used.has(key))throw Error(p+': duplicate track');used.add(key);
   const frames=list(tr.keys,p+'.keys',256).map(v=>{const k=object(v,p);keys(k,['at','value','easing'],p);const bounds=property==='opacity'?[0,1]:property==='rotation'?[target.rotationMin,target.rotationMax]:property==='scaleX'||property==='scaleY'?[-10,10]:[-8192,8192];return {at:num(k.at,p+'.at',0,duration),value:num(k.value,p+'.value',bounds[0],bounds[1]),easing:one(k.easing??'smooth',['linear','smooth','step'],p)};});
   keyBudget+=frames.length;if(!frames.length||keyBudget>8192||frames.some((f,i)=>i>0&&f.at<=frames[i-1].at))throw Error(p+': empty, unsorted or excessive keyframes');
   return {part,property,keys:frames};
  });
  animations[name]={duration,loop:c.loop===true,tracks};
 }
 return {width:num(raw.width??240,path+'.width',1,4096),height:num(raw.height??320,path+'.height',1,4096),originX:num(raw.originX??120,path+'.originX',-4096,4096),originY:num(raw.originY??320,path+'.originY',-4096,4096),parts,animations};
}
/** Absolute time sampling: replay, seeking and export never depend on previous poses. */
export function poseModel2D(model:Model2D,clip:string|null,time:number){
 const pose=new Map(model.parts.map(p=>[p.id,{x:p.x,y:p.y,rotation:p.rotation,scaleX:p.scaleX,scaleY:p.scaleY,opacity:p.opacity}]));
 const animation=clip?model.animations[clip]:undefined;if(!animation)return pose;
 const t=animation.loop?((time%animation.duration)+animation.duration)%animation.duration:Math.max(0,Math.min(time,animation.duration));
 for(const track of animation.tracks){
  const frames=track.keys;let a=frames[0],value=a.value;
  if(t>=frames.at(-1)!.at)value=frames.at(-1)!.value;
  else for(const b of frames.slice(1)){if(t<=a.at)break;if(t<=b.at){if(t===b.at){value=b.value;break;}let q=(t-a.at)/(b.at-a.at);if(a.easing==='step')q=t<b.at?0:1;else if(a.easing==='smooth')q=q*q*(3-2*q);value=a.value+(b.value-a.value)*q;break;}a=b;}
  pose.get(track.part)![track.property]=value;
 }
 return pose;
}

/** Explicit blank construction resource, not a substitute for a missing AI result. */
export function defaultModel2D(setting=false):Model2D{
 return parseModel2D(setting?{width:960,height:540,originX:0,originY:0,parts:[
  {id:'background',shape:'rectangle',width:960,height:540,fill:'$accent',parallax:0},
  {id:'floor',shape:'rectangle',y:435,width:960,height:105,fill:'$color'}
 ]}:{width:240,height:320,originX:120,originY:320,parts:[
  {id:'body',shape:'rectangle',x:40,y:80,width:160,height:240,radius:28,fill:'$color',stroke:'$accent',strokeWidth:3}
 ]});
}

/** Idle plus independent action clips; later clips override only properties they actually animate. */
export function poseClipsModel2D(model:Model2D,clips:{clip:string;time:number}[]){
 const pose=poseModel2D(model,null,0);
 for(const {clip,time}of clips){
  const animation=model.animations[clip];if(!animation)continue;
  const sampled=poseModel2D(model,clip,time);
  for(const track of animation.tracks)pose.get(track.part)![track.property]=sampled.get(track.part)![track.property];
 }
 return pose;
}
