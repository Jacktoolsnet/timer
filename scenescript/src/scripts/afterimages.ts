import {updatePrint} from './print';
import {updateGlitch} from './glitch';
import {updateReveal} from './reveal';
import {isParticleExit} from '../lib/particles';
import type {Asset,Element,Scene} from '../lib/model';
import {afterimageSamples} from '../lib/afterimages';
import {sceneAfterimageState,sceneElementState} from '../lib/groups';
import {renderShape,updateShapeDrawing} from './shapes';
import {renderRuns} from './rich-text';
import {createSvgImage,seekSvg} from './svg-image';
import {createCropImage} from './crop-image';
import {renderPaper} from './paper';
import {updateLiquid} from './liquid';
import {updateParticles} from './particles';
type Ghost=ReturnType<typeof createGhost>;
type View={host:HTMLElement;key:string;ghosts:Map<number,{container:HTMLElement;ghost:Ghost}>};
const views=new WeakMap<HTMLElement,View>();
function createGhost(e:Element,assets:Record<string,Asset>,w:number,h:number,onReady?:()=>void){
 const node=document.createElement('div'),width=e.width*w/100,height=e.height*h/100;
 node.className='scene-element';node.dataset.afterimageElement=e.id;
 Object.assign(node.style,{position:'absolute',left:'0',top:'0',width:width+'px',height:height+'px',overflow:'hidden',boxSizing:'border-box',display:'flex',alignItems:'center',whiteSpace:'pre-wrap',fontFamily:e.font,fontSize:e.fontSize+'px',fontWeight:e.bold?'700':'400',fontStyle:e.italic?'italic':'normal',color:e.color,textAlign:e.align,justifyContent:e.align==='left'?'flex-start':e.align==='right'?'flex-end':'center',borderRadius:e.radius+'px',pointerEvents:'none',transformOrigin:'0 0'});
 let text:HTMLSpanElement|undefined,svg:SVGSVGElement|undefined,ready=Promise.resolve();
 if(e.type==='shape')renderShape(node,e,width,height);
 else if(e.type==='text'){text=document.createElement('span');text.style.width='100%';node.append(text);}
 else if(e.type==='image'&&assets[e.asset]){
  const data=assets[e.asset].data;
  if(e.crop){const crop=createCropImage(data,e.fit,e.crop);svg=crop.svg;node.append(svg);ready=crop.ready;}
  else if(data.startsWith('data:image/svg+xml;')){svg=createSvgImage(data,e.fit);node.append(svg);}
  else{const image=document.createElement('img');image.src=data;Object.assign(image.style,{width:'100%',height:'100%',objectFit:e.fit,display:'block'});node.append(image);ready=image.decode();}
 }
 renderPaper(node,e,width,height);
 let latest:{state:ReturnType<typeof sceneAfterimageState>;scene:Scene;opacity:number}|undefined;
 const ghost={node,ready,update(state:ReturnType<typeof sceneAfterimageState>,scene:Scene,sceneOpacity:number){
  latest={state,scene,opacity:sceneOpacity};
  node.style.visibility=state.visible?'visible':'hidden';node.style.transform='none';
  // Ghosts use normal compositing. The main element retains its chosen exposure mode.
  node.style.opacity=String(state.opacity*sceneOpacity*(e.exposure.enabled?e.exposure.strength:1));
  if(text&&text.dataset.visibleText!==state.text){renderRuns(text,e,state.text);text.dataset.visibleText=state.text;}
  if(e.type==='shape')updateShapeDrawing(node,e,state.sampleTime);
  seekSvg(svg,state.sampleTime-e.at);updateLiquid(node,e,state.sampleTime,width,height);updateGlitch(node,e,state.sampleTime,width,height);updatePrint(node,e,width,height);updateReveal(node,e,state.sampleTime,width,height);updateParticles(node,e,state.sampleTime,scene.duration,width,height);
 }};
 // Cropped raster dimensions can arrive after the first update. Rebuild visual
 // effects from the latest requested historical state, never an obsolete frame.
 ghost.ready=ready.then(()=>{
  if(latest)ghost.update(latest.state,latest.scene,latest.opacity);
  if(e.type==='image'&&node.isConnected)onReady?.();
 });
 void ghost.ready.catch(()=>{});return ghost;
}
function tintedContent(container:HTMLElement,e:Element,width:number,height:number){
 const color=e.afterimages.color;
 // Filter only the element's local canvas, not a full-screen surface per ghost.
 // Include margins for paper shadows, liquid displacement and particle travel.
 const margin=2+(e.paper.enabled?e.paper.shadow*4:0)+(e.liquid.enabled?64:0)+(e.glitch.enabled?e.glitch.strength+e.glitch.channelShift:0)+(isParticleExit(e.exitAnimation)?1000:0);
 const regionWidth=width+margin*2,regionHeight=height+margin*2;
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),defs=document.createElementNS(ns,'defs'),filter=document.createElementNS(ns,'filter'),matrix=document.createElementNS(ns,'feColorMatrix'),foreign=document.createElementNS(ns,'foreignObject'),content=document.createElement('div');
 const id='afterimage-tint-'+crypto.randomUUID(),[r,g,b]=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255);
 filter.id=id;filter.setAttribute('color-interpolation-filters','sRGB');filter.setAttribute('filterUnits','userSpaceOnUse');
 for(const [key,value] of Object.entries({x:-margin,y:-margin,width:regionWidth,height:regionHeight}))filter.setAttribute(key,String(value));
 matrix.setAttribute('type','matrix');matrix.setAttribute('values',`0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 1 0`);filter.append(matrix);defs.append(filter);
 for(const [key,value] of Object.entries({x:-margin,y:-margin,width:regionWidth,height:regionHeight}))foreign.setAttribute(key,String(value));
 foreign.setAttribute('filter',`url(#${id})`);
 Object.assign(content.style,{position:'relative',left:margin+'px',top:margin+'px',width:width+'px',height:height+'px',overflow:'visible'});foreign.append(content);svg.append(defs,foreign);
 svg.setAttribute('viewBox',`${-margin} ${-margin} ${regionWidth} ${regionHeight}`);Object.assign(svg.style,{position:'absolute',left:-margin+'px',top:-margin+'px',width:regionWidth+'px',height:regionHeight+'px',overflow:'visible',fill:'none',stroke:'none',pointerEvents:'none'});container.append(svg);return content;
}
/** Shared by editor/export. Bounded reusable ghosts, never recursive trail copies. */
export function updateAfterimages(source:HTMLElement,e:Element,scene:Scene,assets:Record<string,Asset>,time:number,w:number,h:number,sceneOpacity=1,onReady?:()=>void):Promise<void>{
 let view=views.get(source);
 if(!e.afterimages.enabled||e.afterimages.opacity===0){view?.host.remove();views.delete(source);return Promise.resolve();}
 const current=sceneElementState(e,scene,time,w,h),end=e.until??scene.duration;
 const samples=current.visible&&time<end?afterimageSamples(e.afterimages,current.sampleTime,e.at,end):[];
 if(!samples.length){view?.host.remove();views.delete(source);return Promise.resolve();}
 const key=JSON.stringify(e.afterimages)+':'+w+':'+h;
 if(!view||view.key!==key){
  view?.host.remove();
  const host=document.createElement('div');host.dataset.afterimages=e.id;host.setAttribute('aria-hidden','true');host.setAttribute('inert','');
  Object.assign(host.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',overflow:'visible'});
  source.before(host);view={host,key,ghosts:new Map()};views.set(source,view);
  for(let index=e.afterimages.count;index>=1;index--){
   const container=document.createElement('div');container.dataset.afterimageIndex=String(index);
   Object.assign(container.style,{position:'absolute',left:e.x*w/100+'px',top:e.y*h/100+'px',width:e.width*w/100+'px',height:e.height*h/100+'px',transformOrigin:'0 0',pointerEvents:'none',display:'none'});
   host.append(container);const parent=e.afterimages.tint?tintedContent(container,e,e.width*w/100,e.height*h/100):container;
   const ghost=createGhost(e,assets,w,h,onReady);parent.append(ghost.node);view.ghosts.set(index,{container,ghost});
  }
 }
 for(const {container} of view.ghosts.values())container.style.display='none';
 const pending:Promise<void>[]=[];
 for(const sample of samples){
  const item=view.ghosts.get(sample.index)!;item.container.style.display='block';item.container.style.opacity=String(sample.opacity);
  item.container.dataset.afterimageTime=String(sample.time);
  const past=sceneAfterimageState(e,scene,sample.time,time,w,h);item.container.style.transform=past.transform;
  item.ghost.update(past,scene,sceneOpacity);pending.push(item.ghost.ready);
 }
 return Promise.all(pending).then(()=>{});
}
