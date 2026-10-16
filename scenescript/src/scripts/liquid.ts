import type {Element} from '../lib/model';
import {liquidState} from '../lib/liquid';
const ns='http://www.w3.org/2000/svg';
type View={svg:SVGSVGElement;content:HTMLDivElement;noise:SVGFETurbulenceElement;displace:SVGFEDisplacementMapElement;style:string;width:number;height:number};
const views=new WeakMap<HTMLElement,View>();
/** Inline SVG keeps filters self-contained for recording and SVG-based video export. */
export function updateLiquid(node:HTMLElement,e:Element,time:number,width:number,height:number){
 let view=views.get(node);
 if(!e.liquid.enabled||e.liquid.strength===0){
  if(view){node.append(...Array.from(view.content.childNodes));view.svg.remove();const original=document.createElement('div');original.style.cssText=view.style;for(const key of ['background','border','border-radius','overflow'])node.style.setProperty(key,original.style.getPropertyValue(key));views.delete(node);}
  return;
 }
 if(!view){
  const computed=getComputedStyle(node);
  const originalStyle=node.style.cssText,svg=document.createElementNS(ns,'svg'),defs=document.createElementNS(ns,'defs'),filter=document.createElementNS(ns,'filter'),noise=document.createElementNS(ns,'feTurbulence'),displace=document.createElementNS(ns,'feDisplacementMap');
  const id='liquid-'+crypto.randomUUID();filter.id=id;
  filter.setAttribute('filterUnits','userSpaceOnUse');filter.setAttribute('x','-64');filter.setAttribute('y','-64');filter.setAttribute('width',String(width+128));filter.setAttribute('height',String(height+128));filter.setAttribute('color-interpolation-filters','sRGB');
  noise.setAttribute('type','fractalNoise');noise.setAttribute('numOctaves','2');noise.setAttribute('seed','17');noise.setAttribute('result','noise');
  displace.setAttribute('in','SourceGraphic');displace.setAttribute('in2','noise');displace.setAttribute('xChannelSelector','R');displace.setAttribute('yChannelSelector','G');
  filter.append(noise,displace);defs.append(filter);
  const foreign=document.createElementNS(ns,'foreignObject'),content=document.createElement('div');
  foreign.setAttribute('width',String(width));foreign.setAttribute('height',String(height));foreign.setAttribute('filter',`url(#${id})`);
  // Preserve the original clipping, shape fill/border and flex text layout inside the filter.
  content.style.cssText=originalStyle;
  Object.assign(content.style,{position:'relative',left:'0',top:'0',width:'100%',height:'100%',transform:'none',transformOrigin:'0 0',opacity:'1',mixBlendMode:'normal',visibility:'visible',pointerEvents:'auto',outline:'none',display:computed.display,alignItems:computed.alignItems,justifyContent:computed.justifyContent,whiteSpace:computed.whiteSpace,boxSizing:computed.boxSizing,overflow:computed.overflow});
  content.append(...Array.from(node.childNodes));foreign.append(content);svg.append(defs,foreign);
  svg.classList.add('liquid-svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('aria-hidden','true');
  Object.assign(svg.style,{position:'absolute',inset:'0',width:'100%',height:'100%',overflow:'visible',display:'block',flexShrink:'0',pointerEvents:'none'});
  Object.assign(node.style,{background:'none',border:'0',borderRadius:'0',overflow:'visible'});
  node.append(svg);view={svg,content,noise,displace,style:originalStyle,width,height};views.set(node,view);
 }
 const state=liquidState(e.liquid,time-e.at);
 view.noise.setAttribute('baseFrequency',state.frequency);view.displace.setAttribute('scale',String(state.strength));
}
