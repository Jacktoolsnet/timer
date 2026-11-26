/** Receiver-only chrome: fullscreen is best-effort; display never depends on it. */
export function createReceiverControls(controls:HTMLElement){
 const buttons=Array.from(controls.querySelectorAll<HTMLButtonElement>('button'));
 let active=false,idleTimer:number|undefined;
 function requestFullscreen(){
  if(document.fullscreenElement||!document.documentElement.requestFullscreen)return;
  try{void document.documentElement.requestFullscreen().catch(()=>{});}catch{/* Unsupported TV browser. */}
 }
 function reveal(){
  if(!active)return;
  controls.removeAttribute('data-idle');controls.inert=false;
  window.clearTimeout(idleTimer);
  idleTimer=window.setTimeout(()=>{
   if(controls.contains(document.activeElement))(document.activeElement as HTMLElement).blur();
   controls.inert=true;controls.dataset.idle='true';
  },5000);
 }
 document.addEventListener('keydown',event=>{
  if(!active)return;
  const wasIdle=controls.dataset.idle==='true';reveal();
  if(wasIdle){
   buttons[0]?.focus();
   // The first remote key wakes the controls, never accidentally ends the stream.
   if(event.key!=='Escape'){event.preventDefault();event.stopImmediatePropagation();}
   return;
  }
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
   event.preventDefault();
   const index=buttons.indexOf(document.activeElement as HTMLButtonElement);
   const direction=event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1;
   buttons[index<0?0:(index+direction+buttons.length)%buttons.length]?.focus();
  }
 },true);
 document.addEventListener('pointermove',reveal,{passive:true});
 document.addEventListener('pointerdown',reveal,{passive:true});
 controls.addEventListener('focusin',reveal);
 document.addEventListener('fullscreenchange',reveal);
 window.addEventListener('pagehide',()=>window.clearTimeout(idleTimer));
 return {
  requestFullscreen,
  setActive(value:boolean){
   if(active===value)return;active=value;
   if(value){requestFullscreen();reveal();}
   else{window.clearTimeout(idleTimer);controls.inert=false;controls.removeAttribute('data-idle');}
  }
 };
}
