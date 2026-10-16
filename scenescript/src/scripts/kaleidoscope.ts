import {copyMediaPixels} from './visual-media';
import type {Element} from '../lib/model';
import {kaleidoscopeState} from '../lib/kaleidoscope';
import {seekSvg} from './svg-image';
type View={host:HTMLDivElement;source:HTMLDivElement;style:string;wedges:HTMLDivElement[];signature:string};
const views=new WeakMap<HTMLElement,View>();
/** Keep one live source (including animation references), with bounded visual-only mirrors. */
export function updateKaleidoscope(node:HTMLElement,e:Element,time:number,width:number,height:number){
 let view=views.get(node);const k=e.kaleidoscope;
 if(!k.enabled){
  if(view){node.append(...Array.from(view.source.childNodes));view.host.remove();const original=document.createElement('div');original.style.cssText=view.style;for(const key of ['background','border','border-radius','overflow'])node.style.setProperty(key,original.style.getPropertyValue(key));views.delete(node);}return;
 }
 if(!view){
  const style=node.style.cssText,computed=getComputedStyle(node),host=document.createElement('div'),source=document.createElement('div'),stash=document.createElement('div');
  host.className='kaleidoscope-view';host.setAttribute('aria-hidden','true');host.setAttribute('inert','');
  Object.assign(host.style,{position:'absolute',inset:'0',width:'100%',height:'100%',overflow:'hidden',pointerEvents:'none'});
  // Offscreen, rather than display:none: SVG clocks, canvas and video keep updating.
  Object.assign(stash.style,{position:'absolute',left:'-100000px',top:'0',width:width+'px',height:height+'px',pointerEvents:'none'});stash.dataset.kaleidoscopeSource='';
  source.style.cssText=style;Object.assign(source.style,{position:'absolute',left:'0',top:'0',width:width+'px',height:height+'px',transform:'none',transformOrigin:'0 0',opacity:'1',mixBlendMode:'normal',filter:'none',clipPath:'none',visibility:'inherit',outline:'none',pointerEvents:'none',display:computed.display,alignItems:computed.alignItems,justifyContent:computed.justifyContent,whiteSpace:computed.whiteSpace,boxSizing:computed.boxSizing,overflow:computed.overflow});
  source.append(...Array.from(node.childNodes));stash.append(source);host.append(stash);
  Object.assign(node.style,{background:'none',border:'0',borderRadius:'0',overflow:'visible'});node.append(host);
  view={host,source,style,wedges:[],signature:''};views.set(node,view);
 }
 const state=kaleidoscopeState(k,time-e.at,width,height);
 // SMIL clocks and media pixels are not represented by innerHTML.
 const media=view.source.querySelector('canvas,video,svg.scene-svg-image animate,svg.scene-svg-image animateTransform,svg.scene-svg-image set');
 const signature=view.source.innerHTML+(media?':'+time+':'+[...view.source.querySelectorAll('video')].map(v=>[v.currentTime,v.readyState,v.videoWidth,v.videoHeight].join(',')).join(','):'');
 const refresh=view.signature!==signature||view.wedges.length!==k.segments;
 if(view.wedges.length!==k.segments){view.wedges.forEach(w=>w.remove());view.wedges=state.wedges.map(()=>{const w=document.createElement('div');w.className='kaleidoscope-wedge';Object.assign(w.style,{position:'absolute',inset:'0',width:'100%',height:'100%',overflow:'hidden',pointerEvents:'none'});view!.host.append(w);return w;});}
 const snapshots=new Map<HTMLCanvasElement|HTMLVideoElement,string>();
 view.wedges.forEach((w,i)=>{
  if(refresh){
   const copy=view!.source.cloneNode(true) as HTMLDivElement;
   const ids=new Map<string,string>();copy.querySelectorAll('[id]').forEach(n=>{const next='kaleidoscope-'+crypto.randomUUID();ids.set(n.id,next);n.id=next;});
   for(const n of [copy,...copy.querySelectorAll('*')])for(const attr of [...n.attributes]){let value=attr.value;for(const [id,next] of ids){value=value.split('url(#'+id+')').join('url(#'+next+')');if(value==='#'+id)value='#'+next;}if(value!==attr.value)n.setAttribute(attr.name,value);}
   copyMediaPixels(view!.source,copy,snapshots);
   w.querySelectorAll('canvas').forEach(c=>{c.width=0;c.height=0;});w.replaceChildren(copy);copy.querySelectorAll<SVGSVGElement>('svg.scene-svg-image').forEach(svg=>seekSvg(svg,time-e.at));
  }
  w.style.clipPath=state.wedges[i].clip;(w.firstElementChild as HTMLElement).style.transform=state.wedges[i].transform;
 });
 view.signature=signature;
}
