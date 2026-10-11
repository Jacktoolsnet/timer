import {pathPoint,type MotionPath,type Point} from '../lib/motion-path';
import type {Element} from '../lib/model';
/** Editing overlay only. Coordinates are relative to the element's base position. */
export function renderMotionPath(stage:HTMLElement,e:Element,w:number,h:number,update:(m:MotionPath)=>void,finish:()=>void){
 const m=e.motionPath!;const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('motion-path-overlay');svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('aria-hidden','true');
 const xy=(p:Point)=>`${(e.x+p.x)*w/100},${(e.y+p.y)*h/100}`;
 const line=document.createElementNS(ns,'polyline');line.setAttribute('points',Array.from({length:129},(_,i)=>xy(pathPoint(m,i/128))).join(' '));line.classList.add('motion-path-line');svg.append(line);
 if(m.type==='bezier'){const guide=document.createElementNS(ns,'polyline');guide.setAttribute('points',[m.from,m.control1,m.control2,m.to].map(xy).join(' '));guide.classList.add('motion-path-guides');svg.append(guide);}
 const points:[string,Point][]=m.type==='ellipse'?[['center',m.center],['radiusX',{x:m.center.x+m.radiusX,y:m.center.y}],['radiusY',{x:m.center.x,y:m.center.y+m.radiusY}]]:m.type==='bezier'?[['from',m.from],['control1',m.control1],['control2',m.control2],['to',m.to]]:[['from',m.from],['to',m.to]];
 const r=12*w/Math.max(1,stage.getBoundingClientRect().width);
 for(const [key,p] of points){const c=document.createElementNS(ns,'circle');c.setAttribute('cx',String((e.x+p.x)*w/100));c.setAttribute('cy',String((e.y+p.y)*h/100));c.setAttribute('r',String(r));c.dataset.pathPoint=key;svg.append(c);
  c.onpointerdown=event=>{
   if(event.button!==0)return;event.preventDefault();event.stopPropagation();const original=structuredClone(m),rect=stage.getBoundingClientRect(),sx=event.clientX,sy=event.clientY,id=event.pointerId;
   const move=(ev:PointerEvent)=>{if(ev.pointerId!==id)return;ev.preventDefault();const dx=(ev.clientX-sx)/rect.width*100,dy=(ev.clientY-sy)/rect.height*100,next=structuredClone(original);
    if(key==='radiusX')next.radiusX=Math.max(.1,Math.min(200,original.radiusX+dx));
    else if(key==='radiusY')next.radiusY=Math.max(.1,Math.min(200,original.radiusY+dy));
    else next[key as 'from'|'to'|'control1'|'control2'|'center']={x:Math.max(-200,Math.min(200,p.x+dx)),y:Math.max(-200,Math.min(200,p.y+dy))};update(next);
   };
   const end=(ev:PointerEvent)=>{if(ev.pointerId!==id)return;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end);finish();};
   window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);
  };
 }
 stage.append(svg);
}
