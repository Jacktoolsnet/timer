import type {Element} from '../lib/model';
import {fragmentState,isParticleExit,particleProgress} from '../lib/particles';
import {seekSvg} from './svg-image';
type FragmentView={host:HTMLElement;signature:string;tiles:HTMLElement[]};
const active=new WeakMap<HTMLElement,FragmentView>();
/** Bounded 8×6 fragment grid. Each tile keeps the source's real colors and alpha. */
export function updateParticles(node:HTMLElement,e:Element,time:number,duration:number,width:number,height:number){
 const previous=active.get(node);
 const remove=()=>{previous?.host.remove();active.delete(node);};
 if(!isParticleExit(e.exitAnimation)){remove();return;}
 const kind=e.exitAnimation;
 const progress=particleProgress(e.at,e.until,duration,e.exitDuration,time);
 if(progress<=0||node.style.visibility==='hidden'){remove();return;}
 const signature=progress===1?'finished':width+':'+height+':'+node.style.cssText+node.innerHTML;
 if(previous&&previous.signature===signature&&previous.host.isConnected){
  previous.tiles.forEach((tile,index)=>{applyMotion(tile,index);tile.querySelectorAll<SVGSVGElement>('svg.scene-svg-image').forEach(svg=>seekSvg(svg,time-e.at));});node.style.visibility='hidden';return;
 }
 remove();
 const host=document.createElement('div');host.dataset.particleOverlay=e.id;
 host.setAttribute('aria-hidden','true');
 host.style.cssText=node.style.cssText;
 Object.assign(host.style,{overflow:'visible',background:'none',border:'0',borderRadius:'0',pointerEvents:'none',display:'block'});
 node.after(host);const tiles:HTMLElement[]=[];active.set(node,{host,signature,tiles});
 // Clones are visual only. Never duplicate document IDs or live controls.
 for(let index=0;index<(progress===1?0:48);index++){
  const col=index%8,row=Math.floor(index/8),x=col*width/8,y=row*height/6;
  const tile=document.createElement('div');
  Object.assign(tile.style,{position:'absolute',left:x+'px',top:y+'px',width:width/8+'px',height:height/6+'px',overflow:'hidden'});
  const copy=node.cloneNode(true) as HTMLElement;copy.classList.remove('selected');copy.removeAttribute('data-element-id');copy.removeAttribute('data-space');
  Object.assign(copy.style,{left:-x+'px',top:-y+'px',transform:'none',transformOrigin:'0 0',opacity:'1',visibility:'visible',pointerEvents:'none',outline:'none'});
  // Remap internal SVG paint/mask references without changing image data or text.
  const ids=new Map<string,string>();
  copy.querySelectorAll('[id]').forEach(n=>{const id=n.id,next='particle-'+crypto.randomUUID();ids.set(id,next);n.id=next;});
  for(const n of [copy,...copy.querySelectorAll('*')])for(const attr of [...n.attributes]){
   let value=attr.value;for(const [id,next] of ids){value=value.split('url(#'+id+')').join('url(#'+next+')');if(value==='#'+id)value='#'+next;}
   if(value!==attr.value)n.setAttribute(attr.name,value);
  }
  tile.append(copy);host.append(tile);tiles.push(tile);applyMotion(tile,index);
  copy.querySelectorAll<SVGSVGElement>('svg.scene-svg-image').forEach(svg=>seekSvg(svg,time-e.at));
 }
 node.style.visibility='hidden';
 function applyMotion(tile:HTMLElement,index:number){
  const state=fragmentState(e.id,index,kind,progress,width,height);
  tile.style.opacity=String(state.opacity);tile.style.transform=`translate(${state.x}px,${state.y}px) rotate(${state.rotation}deg) scale(${state.scale})`;
 }
}
