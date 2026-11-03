type Panel='home'|'sound'|'landscape'|'orbit'|'orbit-trail'|'orbit-center'|'flower'|'background';

export function syncAnimationSettings(){
 for(const [summary,selector] of [
  ['animation-current-sound','button[data-visualization][aria-pressed=true] span'],
  ['animation-current-background','button[data-background-mode][aria-pressed=true] span']
 ]){
  const output=document.getElementById(summary),selected=document.querySelector(selector);
  if(output&&selected)output.textContent=selected.textContent;
 }
}

export function animationSettingsActive(){return document.getElementById('animation-settings')?.hidden===false;}

export function installAnimationSettings(activate:(view:'orbit'|'flower'|'landscape')=>void,onOpen:()=>void,onClose:()=>void){
 const surface=document.querySelector<HTMLElement>('#animation-settings')!;
 const opener=document.querySelector<HTMLButtonElement>('#animation-settings-open')!;
 const back=document.querySelector<HTMLButtonElement>('#animation-settings-back')!;
 const title=document.querySelector<HTMLElement>('#animation-settings-title')!;
 const side=surface.closest<HTMLElement>('.flow-side')!;
 let panel:Panel='home';
 const parent=(value:Panel):Panel=>value==='orbit-trail'||value==='orbit-center'?'orbit':value==='orbit'||value==='flower'||value==='landscape'?'sound':'home';
 function show(next:Panel,focus=true){
  panel=next;
  surface.querySelectorAll<HTMLElement>('[data-animation-panel]').forEach(el=>{
   el.hidden=el.dataset.animationPanel!==next;
   if(!el.hidden)title.textContent=el.dataset.panelTitle!;
  });
  back.hidden=next==='home';surface.scrollTop=0;
  if(focus)title.focus({preventScroll:true});
 }
 function close(focus=true){
  if(!animationSettingsActive())return;
  surface.hidden=true;side.classList.remove('animation-settings-active');opener.setAttribute('aria-pressed','false');
  onClose();
  if(focus)opener.focus({preventScroll:true});
 }
 opener.addEventListener('click',()=>{
  if(animationSettingsActive()){close();return;}
  onOpen();show('home',false);syncAnimationSettings();surface.hidden=false;side.classList.add('animation-settings-active');opener.setAttribute('aria-pressed','true');
  document.querySelectorAll<HTMLButtonElement>('[data-pad-mode]').forEach(button=>button.setAttribute('aria-pressed','false'));
 });
 surface.querySelectorAll<HTMLButtonElement>('[data-animation-open]').forEach(button=>button.addEventListener('click',()=>show(button.dataset.animationOpen as Panel)));
 for(const view of ['orbit','flower','landscape'] as const)document.querySelector('#'+view+'-settings-open')!.addEventListener('click',()=>{activate(view);show(view);});
 back.addEventListener('click',()=>show(parent(panel)));
 document.querySelector('#animation-settings-close')!.addEventListener('click',()=>close());
 // Switching to an input mode is ordinary inline navigation, not dismissal of a modal.
 document.querySelectorAll<HTMLButtonElement>('[data-pad-mode]').forEach(button=>button.addEventListener('click',()=>close(false)));
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||!animationSettingsActive()||document.querySelector('dialog[open]'))return;
  event.preventDefault();event.stopPropagation();
  if(panel==='home')close();else show(parent(panel));
 },{capture:true});
}
