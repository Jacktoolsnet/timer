/** Focus controls are hidden explicitly and restored by user activity. */
let focused=document.body.classList.contains('focus-view');
const pointers=new Set<number>();
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let orbitMotion:Animation|undefined;
const controlMotions:Animation[]=[];
const ghosts:HTMLElement[]=[];
function clearControlMotion(){
 controlMotions.splice(0).forEach(animation=>animation.cancel());
 ghosts.splice(0).forEach(ghost=>ghost.remove());
}
function setIdle(idle:boolean){
 if(document.body.classList.contains('focus-idle')===idle)return;
 const orbit=document.querySelector<HTMLElement>('.orbit-wrap')!;
 const focused=document.body.classList.contains('focus-view');
 // Capture the current visual position before cancelling, allowing smooth reversals.
 const from=orbit.getBoundingClientRect();
 orbitMotion?.cancel();orbitMotion=undefined;clearControlMotion();
 const animate=focused&&!reduced.matches&&!document.hidden;
 const controls=[...document.querySelectorAll<HTMLElement>('.sound-top,.flow-side')];
 if(animate&&idle){
  controls.forEach(control=>{
   const rect=control.getBoundingClientRect(),style=getComputedStyle(control);
   const ghost=control.cloneNode(true) as HTMLElement;
   ghost.className='focus-control-ghost';ghost.removeAttribute('id');
   ghost.querySelectorAll('[id]').forEach(element=>element.removeAttribute('id'));
   ghost.setAttribute('aria-hidden','true');ghost.inert=true;
   Object.assign(ghost.style,{position:'fixed',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',display:style.display,boxSizing:'border-box',zIndex:'50',pointerEvents:'none',margin:'0'});
   // A cloned canvas has no bitmap; preserve the drawing while fading it away.
   const originals=control.querySelectorAll('canvas');
   ghost.querySelectorAll('canvas').forEach((canvas,i)=>{canvas.getContext('2d')?.drawImage(originals[i],0,0);});
   document.body.append(ghost);ghosts.push(ghost);
   const animation=ghost.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(12px)'}],{duration:280,easing:'ease-out',fill:'forwards'});
   animation.onfinish=()=>ghost.remove();controlMotions.push(animation);
  });
 }
 document.body.classList.toggle('focus-idle',idle);
 document.body.classList.toggle('focus-cursor-hidden',idle);
 if(!animate)return;
 const to=orbit.getBoundingClientRect();
 if(from.width&&to.width){
  orbitMotion=orbit.animate([
   {transformOrigin:'0 0',transform:'translate('+(from.left-to.left)+'px,'+(from.top-to.top)+'px) scale('+(from.width/to.width)+','+(from.height/to.height)+')'},
   {transformOrigin:'0 0',transform:'translate(0,0) scale(1)'}
  ],{duration:700,easing:'cubic-bezier(.22,1,.36,1)'});
 }
 if(!idle){
  controls.forEach(control=>{
   controlMotions.push(control.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,easing:'cubic-bezier(.22,1,.36,1)'}));
  });
 }
}
window.addEventListener('resize',()=>{orbitMotion?.cancel();clearControlMotion();});
reduced.addEventListener('change',()=>{orbitMotion?.cancel();clearControlMotion();});
function activity(){
 setIdle(false);document.body.classList.remove('focus-cursor-hidden');
}
document.querySelector('#hide-focus-controls')?.addEventListener('click',()=>{
 if(document.body.classList.contains('focus-view')){
  (document.activeElement as HTMLElement|null)?.blur();
  setIdle(true);
 }
});

document.addEventListener('pointermove',activity,{passive:true});
document.addEventListener('pointerdown',e=>{
 const wasIdle=document.body.classList.contains('focus-idle');
 pointers.add(e.pointerId);activity();
 // The first touch wakes the controls instead of accidentally editing a note.
 if(wasIdle){e.preventDefault();e.stopPropagation();}
},{capture:true});
function pointerEnd(e:PointerEvent){pointers.delete(e.pointerId);activity();}
document.addEventListener('pointerup',pointerEnd,{passive:true});
document.addEventListener('pointercancel',pointerEnd,{passive:true});
document.addEventListener('keydown',activity);
document.addEventListener('wheel',activity,{passive:true});
document.addEventListener('visibilitychange',()=>{pointers.clear();activity();});
window.addEventListener('blur',()=>{pointers.clear();activity();});
new MutationObserver(()=>{
 const next=document.body.classList.contains('focus-view');
 if(next!==focused){focused=next;if(!next){orbitMotion?.cancel();clearControlMotion();}activity();}
}).observe(document.body,{attributes:true,attributeFilter:['class']});
document.querySelectorAll('dialog').forEach(dialog=>{
 dialog.addEventListener('close',activity);
 new MutationObserver(activity).observe(dialog,{attributes:true,attributeFilter:['open']});
});
if(focused)activity();
export {};
