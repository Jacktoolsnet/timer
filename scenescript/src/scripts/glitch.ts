import type {Element} from '../lib/model';
import {glitchState} from '../lib/glitch';
const ns='http://www.w3.org/2000/svg';
type View={svg:SVGSVGElement;content:HTMLDivElement;style:string;bands:SVGFEOffsetElement[];red:SVGFEOffsetElement;blue:SVGFEOffsetElement};
const views=new WeakMap<HTMLElement,View>();
/** Self-contained filter, shared by preview, recording, historical ghosts and export. */
export function updateGlitch(node:HTMLElement,e:Element,time:number,width:number,height:number){
 const g=e.glitch;let view=views.get(node);
 if(!g.enabled||(g.strength===0&&g.channelShift===0)){
  if(view){
   node.append(...Array.from(view.content.childNodes));view.svg.remove();
   const original=document.createElement('div');original.style.cssText=view.style;
   for(const key of ['background','border','border-radius','overflow'])node.style.setProperty(key,original.style.getPropertyValue(key));
   views.delete(node);
  }return;
 }
 if(!view){
  const computed=getComputedStyle(node),style=node.style.cssText,svg=document.createElementNS(ns,'svg'),defs=document.createElementNS(ns,'defs'),filter=document.createElementNS(ns,'filter'),foreign=document.createElementNS(ns,'foreignObject'),content=document.createElement('div');
  const id='glitch-'+crypto.randomUUID(),margin=192;filter.id=id;
  filter.setAttribute('filterUnits','userSpaceOnUse');filter.setAttribute('primitiveUnits','userSpaceOnUse');filter.setAttribute('color-interpolation-filters','sRGB');
  for(const [key,value] of Object.entries({x:-margin,y:-margin,width:width+margin*2,height:height+margin*2}))filter.setAttribute(key,String(value));
  const bands:SVGFEOffsetElement[]=[],merge=document.createElementNS(ns,'feMerge');merge.setAttribute('result','bands');
  for(let index=0;index<g.bands;index++){
   const offset=document.createElementNS(ns,'feOffset'),input=document.createElementNS(ns,'feMergeNode');
   offset.setAttribute('in','SourceGraphic');offset.setAttribute('result','band-'+index);offset.setAttribute('dy','0');
   for(const [key,value] of Object.entries({x:-margin,y:index*height/g.bands-(index===0?margin:0),width:width+margin*2,height:height/g.bands+(index===0?margin:0)+(index===g.bands-1?margin:0)}))offset.setAttribute(key,String(value));
   filter.append(offset);bands.push(offset);input.setAttribute('in','band-'+index);merge.append(input);
  }
  filter.append(merge);
  const base=g.strength>0?'bands':'SourceGraphic';
  for(const [name,values] of [
   ['red','1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0'],
   ['green','0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0'],
   ['blue','0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0']
  ]){
   const matrix=document.createElementNS(ns,'feColorMatrix');matrix.setAttribute('in',base);matrix.setAttribute('type','matrix');matrix.setAttribute('values',values);matrix.setAttribute('result',name);filter.append(matrix);
  }
  const red=document.createElementNS(ns,'feOffset'),blue=document.createElementNS(ns,'feOffset');
  red.setAttribute('in','red');red.setAttribute('dy','0');red.setAttribute('result','red-shift');
  blue.setAttribute('in','blue');blue.setAttribute('dy','0');blue.setAttribute('result','blue-shift');filter.append(red,blue);
  const rg=document.createElementNS(ns,'feBlend'),rgb=document.createElementNS(ns,'feBlend');
  rg.setAttribute('in','red-shift');rg.setAttribute('in2','green');rg.setAttribute('mode','screen');rg.setAttribute('result','rg');
  rgb.setAttribute('in','rg');rgb.setAttribute('in2','blue-shift');rgb.setAttribute('mode','screen');rgb.setAttribute('result','rgb');filter.append(rg,rgb);
  const output=document.createElementNS(ns,'feMerge'),choice=document.createElementNS(ns,'feMergeNode');choice.setAttribute('in',g.channelShift>0?'rgb':base);output.append(choice);filter.append(output);defs.append(filter);
  foreign.setAttribute('width',String(width));foreign.setAttribute('height',String(height));foreign.setAttribute('filter',`url(#${id})`);foreign.style.overflow='visible';
  content.style.cssText=style;
  Object.assign(content.style,{position:'relative',left:'0',top:'0',width:'100%',height:'100%',transform:'none',transformOrigin:'0 0',opacity:'1',mixBlendMode:'normal',filter:'none',clipPath:'none',visibility:'visible',pointerEvents:'auto',outline:'none',display:computed.display,alignItems:computed.alignItems,justifyContent:computed.justifyContent,whiteSpace:computed.whiteSpace,boxSizing:computed.boxSizing,overflow:computed.overflow});
  content.append(...Array.from(node.childNodes));foreign.append(content);svg.append(defs,foreign);svg.classList.add('glitch-svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('aria-hidden','true');
  Object.assign(svg.style,{position:'absolute',inset:'0',width:'100%',height:'100%',overflow:'visible',display:'block',flexShrink:'0',pointerEvents:'none'});
  Object.assign(node.style,{background:'none',border:'0',borderRadius:'0',overflow:'visible'});node.append(svg);
  view={svg,content,style,bands,red,blue};views.set(node,view);
 }
 const state=glitchState(g,time-e.at);
 view.bands.forEach((offset,index)=>offset.setAttribute('dx',String(state.shifts[index])));
 view.red.setAttribute('dx',String(state.red));view.blue.setAttribute('dx',String(state.blue));
}
