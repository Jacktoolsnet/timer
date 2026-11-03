type Panel='home'|'sound'|'orbit'|'background';

export function syncAnimationSettings(){
 for(const [summary,selector] of [
  ['animation-current-sound','button[data-visualization][aria-pressed=true] span'],
  ['animation-current-background','button[data-background-mode][aria-pressed=true] span']
 ]){
  const output=document.getElementById(summary),selected=document.querySelector(selector);
  if(output&&selected)output.textContent=selected.textContent;
 }
}

export function installAnimationSettings(activateOrbit:()=>void){
 const dialog=document.querySelector<HTMLDialogElement>('#animation-settings-dialog')!;
 const opener=document.querySelector<HTMLButtonElement>('#animation-settings-open')!;
 const back=document.querySelector<HTMLButtonElement>('#animation-settings-back')!;
 const title=document.querySelector<HTMLElement>('#animation-settings-title')!;
 let panel:Panel='home';
 function show(next:Panel,focus=true){
  panel=next;
  dialog.querySelectorAll<HTMLElement>('[data-animation-panel]').forEach(el=>{
   el.hidden=el.dataset.animationPanel!==next;
   if(!el.hidden)title.textContent=el.dataset.panelTitle!;
  });
  back.hidden=next==='home';dialog.scrollTop=0;
  if(focus)title.focus({preventScroll:true});
 }
 opener.addEventListener('click',()=>{
  show('home',false);syncAnimationSettings();dialog.showModal();opener.setAttribute('aria-expanded','true');
  dialog.querySelector<HTMLButtonElement>('[data-animation-open=sound]')!.focus({preventScroll:true});
 });
 dialog.querySelectorAll<HTMLButtonElement>('[data-animation-open]').forEach(button=>button.addEventListener('click',()=>show(button.dataset.animationOpen as Panel)));
 document.querySelector('#orbit-settings-open')!.addEventListener('click',()=>{activateOrbit();show('orbit');});
 back.addEventListener('click',()=>show(panel==='orbit'?'sound':'home'));
 document.querySelector('#animation-settings-close')!.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{opener.setAttribute('aria-expanded','false');opener.focus({preventScroll:true});});
 dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const r=dialog.getBoundingClientRect();
  if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();
 });
}
