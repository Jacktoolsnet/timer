import type {Element} from '../lib/model';
import {lightingMap,lightingState,lightingShadowMargin} from '../lib/lighting';
const ns='http://www.w3.org/2000/svg';
type View={svg:SVGSVGElement;content:HTMLDivElement;style:string;map:SVGElement;offset:SVGElement;signature:string;margin:number};
const views=new WeakMap<HTMLElement,View>();
/** Self-contained filter, shared by preview, recording, historical ghosts and export. */
export function updateLighting(node:HTMLElement,e:Element,time:number,width:number,height:number){
 const g=e.lighting;let view=views.get(node);
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
  const id='lighting-'+crypto.randomUUID(),margin=2+(e.paper.enabled?e.paper.shadow*4:0)+(e.liquid.enabled?64:0)+(e.glitch.enabled?e.glitch.strength+e.glitch.channelShift:0)+lightingShadowMargin(g);filter.id=id;
  filter.setAttribute('filterUnits','userSpaceOnUse');filter.setAttribute('primitiveUnits','userSpaceOnUse');filter.setAttribute('color-interpolation-filters','sRGB');
  for(const [key,value] of Object.entries({x:-margin,y:-margin,width:width+margin*2,height:height+margin*2}))filter.setAttribute(key,String(value));
  const add=(name:string,attrs:Record<string,string>)=>{const n=document.createElementNS(ns,name);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);filter.append(n);return n;};
  const map=add('feImage',{x:String(-margin),y:String(-margin),width:String(width+margin*2),height:String(height+margin*2),preserveAspectRatio:'none',result:'light-map'});
  // Make source RGB opaque before multiplying, then restore its original alpha once.
  add('feColorMatrix',{in:'SourceGraphic',type:'matrix',values:'1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0 1',result:'opaque'});
  add('feBlend',{in:'opaque',in2:'light-map',mode:'multiply',result:'relit'});
  add('feComposite',{in:'relit',in2:'SourceAlpha',operator:'in',result:'lit'});
  add('feGaussianBlur',{in:'SourceAlpha',stdDeviation:String(g.shadowBlur),result:'blur'});
  const offset=add('feOffset',{in:'blur',result:'shifted'});
  add('feFlood',{'flood-color':g.shadowColor,'flood-opacity':String(g.shadowOpacity*g.strength),result:'shadow-color'});
  add('feComposite',{in:'shadow-color',in2:'shifted',operator:'in',result:'shadow'});
  const merge=add('feMerge',{});for(const input of ['shadow','lit']){const n=document.createElementNS(ns,'feMergeNode');n.setAttribute('in',input);merge.append(n);}defs.append(filter);
  foreign.setAttribute('width',String(width));foreign.setAttribute('height',String(height));foreign.setAttribute('filter',`url(#${id})`);foreign.style.overflow='visible';
  content.style.cssText=style;
  Object.assign(content.style,{position:'relative',left:'0',top:'0',width:'100%',height:'100%',transform:'none',transformOrigin:'0 0',opacity:'1',mixBlendMode:'normal',filter:'none',clipPath:'none',visibility:'visible',pointerEvents:'auto',outline:'none',display:computed.display,alignItems:computed.alignItems,justifyContent:computed.justifyContent,whiteSpace:computed.whiteSpace,boxSizing:computed.boxSizing,overflow:computed.overflow});
  content.append(...Array.from(node.childNodes));foreign.append(content);svg.append(defs,foreign);svg.classList.add('lighting-svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('aria-hidden','true');
  Object.assign(svg.style,{position:'absolute',inset:'0',width:'100%',height:'100%',overflow:'visible',display:'block',flexShrink:'0',pointerEvents:'none'});
  Object.assign(node.style,{background:'none',border:'0',borderRadius:'0',overflow:'visible'});node.append(svg);
  view={svg,content,style,map,offset,signature:'',margin};views.set(node,view);
 }
 const state=lightingState(g,time-e.at,width,height),data=lightingMap(g,state,width,height,view.margin);
 if(view.signature!==data){view.map.setAttribute('href','data:image/svg+xml;base64,'+btoa(data));view.signature=data;}
 view.offset.setAttribute('dx',String(state.dx));view.offset.setAttribute('dy',String(state.dy));

}
