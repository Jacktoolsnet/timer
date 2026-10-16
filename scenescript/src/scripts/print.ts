import type {Element} from '../lib/model';
import {printPattern} from '../lib/print';
const ns='http://www.w3.org/2000/svg';
type View={svg:SVGSVGElement;content:HTMLDivElement;style:string};
const views=new WeakMap<HTMLElement,View>();
/** Self-contained filter, shared by preview, recording, historical ghosts and export. */
export function updatePrint(node:HTMLElement,e:Element,width:number,height:number){
 const g=e.print;let view=views.get(node);
 if(!g.enabled||g.strength===0){
  if(view){
   node.append(...Array.from(view.content.childNodes));view.svg.remove();
   const original=document.createElement('div');original.style.cssText=view.style;
   for(const key of ['background','border','border-radius','overflow'])node.style.setProperty(key,original.style.getPropertyValue(key));
   views.delete(node);
  }return;
 }
 if(!view){
  const computed=getComputedStyle(node),style=node.style.cssText,svg=document.createElementNS(ns,'svg'),defs=document.createElementNS(ns,'defs'),filter=document.createElementNS(ns,'filter'),foreign=document.createElementNS(ns,'foreignObject'),content=document.createElement('div');
  const id='print-'+crypto.randomUUID(),margin=192;filter.id=id;
  filter.setAttribute('filterUnits','userSpaceOnUse');filter.setAttribute('primitiveUnits','userSpaceOnUse');filter.setAttribute('color-interpolation-filters','sRGB');
  for(const [key,value] of Object.entries({x:-margin,y:-margin,width:width+margin*2,height:height+margin*2}))filter.setAttribute(key,String(value));
  const add=(name:string,attrs:Record<string,string>)=>{const n=document.createElementNS(ns,name);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);filter.append(n);return n;};
  add('feImage',{href:'data:image/svg+xml;base64,'+btoa(printPattern(g,width+margin*2,height+margin*2)),x:String(-margin),y:String(-margin),width:String(width+margin*2),height:String(height+margin*2),preserveAspectRatio:'none',result:'pattern'});
  // Opaque luminance avoids introducing a paper rectangle into transparent source areas.
  add('feColorMatrix',{in:'SourceGraphic',type:'matrix',values:'.2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 0 1',result:'gray'});
  add('feComposite',{in:'gray',in2:'pattern',operator:'arithmetic',k1:'0',k2:'1',k3:'1',k4:'-.5',result:'screen'});
  const threshold=add('feComponentTransfer',{in:'screen',result:'binary'});
  for(const channel of ['R','G','B']){const f=document.createElementNS(ns,'feFunc'+channel);f.setAttribute('type','discrete');f.setAttribute('tableValues','0 1');threshold.append(f);}
  const colors=add('feComponentTransfer',{in:'binary',result:'colored'});
  ['R','G','B'].forEach((channel,i)=>{const f=document.createElementNS(ns,'feFunc'+channel);f.setAttribute('type','table');f.setAttribute('tableValues',`${parseInt(g.ink.slice(1+i*2,3+i*2),16)/255} ${parseInt(g.paper.slice(1+i*2,3+i*2),16)/255}`);colors.append(f);});
  add('feComposite',{in:'colored',in2:'SourceAlpha',operator:'in',result:'printed'});
  add('feComposite',{in:'printed',in2:'SourceGraphic',operator:'arithmetic',k1:'0',k2:String(g.strength),k3:String(1-g.strength),k4:'0'});defs.append(filter);
  foreign.setAttribute('width',String(width));foreign.setAttribute('height',String(height));foreign.setAttribute('filter',`url(#${id})`);foreign.style.overflow='visible';
  content.style.cssText=style;
  Object.assign(content.style,{position:'relative',left:'0',top:'0',width:'100%',height:'100%',transform:'none',transformOrigin:'0 0',opacity:'1',mixBlendMode:'normal',filter:'none',clipPath:'none',visibility:'visible',pointerEvents:'auto',outline:'none',display:computed.display,alignItems:computed.alignItems,justifyContent:computed.justifyContent,whiteSpace:computed.whiteSpace,boxSizing:computed.boxSizing,overflow:computed.overflow});
  content.append(...Array.from(node.childNodes));foreign.append(content);svg.append(defs,foreign);svg.classList.add('print-svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('aria-hidden','true');
  Object.assign(svg.style,{position:'absolute',inset:'0',width:'100%',height:'100%',overflow:'visible',display:'block',flexShrink:'0',pointerEvents:'none'});
  Object.assign(node.style,{background:'none',border:'0',borderRadius:'0',overflow:'visible'});node.append(svg);
  view={svg,content,style};views.set(node,view);
 }
}
