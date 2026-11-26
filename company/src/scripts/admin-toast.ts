/** One accessible toast, also usable above a native modal dialog. */
export function createAdminToast(toast:HTMLElement,message:HTMLElement,close:HTMLButtonElement){
 let timer:number|undefined;
 const clearTimer=()=>{if(timer!==undefined){window.clearTimeout(timer);timer=undefined;}};
 function hide(){clearTimer();toast.hidden=true;message.textContent='';}
 function schedule(){
  clearTimer();
  // All notifications dismiss after three seconds, paused on hover or keyboard focus.
  if(!toast.hidden&&!toast.matches(':hover')&&!toast.contains(document.activeElement))timer=window.setTimeout(hide,3000);
 }
 close.addEventListener('click',()=>{
  const modal=toast.closest('dialog');hide();
  // Never leave keyboard focus inside a now-hidden toast.
  [...(modal||document.getElementById('jt-admin')!).querySelectorAll<HTMLElement>('input,button')].find(element=>element.getClientRects().length&&!element.matches(':disabled'))?.focus();
 });
 toast.addEventListener('pointerenter',clearTimer);toast.addEventListener('pointerleave',schedule);
 toast.addEventListener('focusin',clearTimer);toast.addEventListener('focusout',()=>queueMicrotask(schedule));
 document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',()=>{if(dialog.contains(toast)){hide();document.body.append(toast);}}));
 return {hide,show(text:string,error=false){
  if(!text){hide();return;}
  clearTimer();toast.dataset.kind=error?'error':'success';
  // Restart the visual countdown when a visible toast is replaced.
  toast.hidden=true;void toast.offsetWidth;
  toast.setAttribute('role',error?'alert':'status');toast.setAttribute('aria-live',error?'assertive':'polite');
  (document.querySelector('dialog[open]')||document.body).append(toast);
  message.textContent=text;toast.hidden=false;schedule();
 }};
}
