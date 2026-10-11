import {bubbleGeometry,bubbleTarget,type BubbleGeometry} from '../lib/comic';
import type {Element,Scene} from '../lib/model';
import {renderRuns} from './rich-text';
const ns='http://www.w3.org/2000/svg';
export type BubbleView={svg:SVGSVGElement;text:HTMLSpanElement;clip:HTMLDivElement;selection:HTMLDivElement;geometry:BubbleGeometry|null;update:(scene:Scene,time:number,text:string,selected?:boolean)=>void;overflow:()=>boolean};
/** Shared safe DOM renderer used by playback and offscreen export. */
export function createBubble(node:HTMLElement,e:Element,w:number,h:number,projectW:number,projectH:number):BubbleView{
 node.style.overflow='visible';node.style.borderRadius='0';node.style.pointerEvents='none';node.style.textDecoration='none';
 const svg=document.createElementNS(ns,'svg');svg.classList.add('bubble-outline');svg.setAttribute('aria-hidden','true');Object.assign(svg.style,{position:'absolute',overflow:'visible',pointerEvents:'none'});
 const path=document.createElementNS(ns,'path');path.classList.add('bubble-body');path.style.pointerEvents='visiblePainted';svg.append(path);
 const dots=document.createElementNS(ns,'g');svg.append(dots);
 const clip=document.createElement('div');clip.className='bubble-text-clip';Object.assign(clip.style,{position:'absolute',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',boxSizing:'border-box',pointerEvents:'auto',whiteSpace:'pre-wrap',overflowWrap:'anywhere'});
 const text=document.createElement('span');Object.assign(text.style,{display:'block',width:'100%',flex:'none'});clip.append(text);
 const selection=document.createElement('div');selection.className='bubble-selection';Object.assign(selection.style,{position:'absolute',pointerEvents:'none',boxSizing:'border-box',border:'4px dashed #ffd082'});selection.hidden=true;
 node.append(svg,clip,selection);
 const view:BubbleView={svg,text,clip,selection,geometry:null,overflow:()=>text.scrollHeight>clip.clientHeight+1||text.scrollWidth>clip.clientWidth+1,update(scene,time,visibleText,selected=false){
  const b=e.bubble!,geometry=bubbleGeometry(b,w,h,bubbleTarget(e,scene,time,projectW,projectH));view.geometry=geometry;
  const margin=e.borderColor==='none'?0:e.borderWidth/2,bounds={x:geometry.bounds.x-margin,y:geometry.bounds.y-margin,width:geometry.bounds.width+2*margin,height:geometry.bounds.height+2*margin};
  svg.setAttribute('viewBox',`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);svg.setAttribute('width',String(bounds.width));svg.setAttribute('height',String(bounds.height));Object.assign(svg.style,{left:bounds.x+'px',top:bounds.y+'px',width:bounds.width+'px',height:bounds.height+'px'});
  path.setAttribute('d',geometry.path);path.setAttribute('fill',e.fillColor==='none'?'none':e.fillColor);path.setAttribute('stroke',e.borderColor==='none'?'none':e.borderColor);path.setAttribute('stroke-width',String(e.borderWidth));path.setAttribute('stroke-linejoin','round');
  dots.replaceChildren();for(const dot of geometry.dots){const c=document.createElementNS(ns,'circle');for(const key of ['x','y','r'] as const)c.setAttribute(key==='x'?'cx':key==='y'?'cy':'r',String(dot[key]));c.setAttribute('fill',e.fillColor==='none'?'none':e.fillColor);c.setAttribute('stroke',e.borderColor==='none'?'none':e.borderColor);c.setAttribute('stroke-width',String(e.borderWidth));c.style.pointerEvents='visiblePainted';dots.append(c);}
  Object.assign(clip.style,{left:geometry.text.x+'px',top:geometry.text.y+'px',width:geometry.text.width+'px',height:geometry.text.height+'px',lineHeight:String(b.lineHeight)});
  if(text.dataset.visibleText!==visibleText){renderRuns(text,e,visibleText);text.dataset.visibleText=visibleText;}
  Object.assign(selection.style,{left:bounds.x+'px',top:bounds.y+'px',width:bounds.width+'px',height:bounds.height+'px'});selection.hidden=!selected;
 }};
 return view;
}
