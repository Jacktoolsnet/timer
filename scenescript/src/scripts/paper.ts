import type {Element} from '../lib/model';
import {paperGrain,paperInset,paperPolygon} from '../lib/paper';
/** Static, code-native paper sheet. Original child nodes remain live for animations. */
export function renderPaper(node:HTMLElement,e:Element,width:number,height:number){
 const p=e.paper;if(!p.enabled)return;
 const computed=getComputedStyle(node),style=node.style.cssText;
 const sheet=document.createElement('div'),content=document.createElement('div');sheet.dataset.paperSheet='';
 Object.assign(sheet.style,{position:'absolute',inset:'0',background:p.color,clipPath:paperPolygon(p,width,height),overflow:'hidden',pointerEvents:'auto'});
 content.dataset.paperContent='';content.style.cssText=style;
 const inset=paperInset(p,width,height);
 Object.assign(content.style,{position:'absolute',left:inset+'px',top:inset+'px',width:Math.max(1,width-inset*2)+'px',height:Math.max(1,height-inset*2)+'px',transform:'none',transformOrigin:'0 0',opacity:'1',mixBlendMode:'normal',filter:'none',visibility:'visible',outline:'none',display:computed.display||'flex',alignItems:computed.alignItems||'center',justifyContent:computed.justifyContent||node.style.justifyContent||'center',whiteSpace:computed.whiteSpace||'pre-wrap',boxSizing:computed.boxSizing||'border-box',overflow:computed.overflow||'hidden'});
 // Scale the original local canvas rather than reflowing text or stretching SVG contours.
 const source=document.createElement('div');source.style.cssText=content.style.cssText;
 const scale=Math.min(Math.max(1,width-inset*2)/width,Math.max(1,height-inset*2)/height);
 Object.assign(source.style,{left:(Math.max(1,width-inset*2)-width*scale)/2+'px',top:(Math.max(1,height-inset*2)-height*scale)/2+'px',width:width+'px',height:height+'px',transform:`scale(${scale})`});
 source.append(...Array.from(node.childNodes));content.style.background='none';content.style.border='0';content.style.borderRadius='0';content.append(source);sheet.append(content);
 if(p.texture>0){
  const grain=document.createElement('div');grain.dataset.paperGrain='';
  Object.assign(grain.style,{position:'absolute',inset:'0',backgroundImage:paperGrain(p.seed),backgroundSize:'64px 64px',opacity:String(p.texture),pointerEvents:'none'});sheet.append(grain);
 }
 Object.assign(node.style,{background:'none',border:'0',borderRadius:'0',overflow:'visible',filter:p.shadow>0?`drop-shadow(${p.shadow*.3}px ${p.shadow*.5}px ${p.shadow}px rgba(0,0,0,.35))`:'none'});
 node.append(sheet);
}
