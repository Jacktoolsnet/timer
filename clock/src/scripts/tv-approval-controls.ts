/** Remote navigation is confined to the pending receiver approval screen. */
export function createReceiverApproval(panel:HTMLElement,frame:HTMLIFrameElement){
 const approve=panel.querySelector<HTMLButtonElement>('#tv-approve')!;
 const reject=panel.querySelector<HTMLButtonElement>('#tv-reject')!;
 const pending=()=>!panel.hidden&&panel.dataset.pending==='true';
 const buttons=()=>[approve,reject].filter(button=>!button.hidden&&!button.disabled);
 let selected=approve,paint:number|undefined,retries:number[]=[];
 function cancelRecovery(){
  if(paint!==undefined)window.cancelAnimationFrame(paint);
  paint=undefined;retries.forEach(window.clearTimeout);retries=[];
 }
 function focusSelected(){
  if(!pending()||document.hidden||approve.disabled||reject.disabled)return;
  const available=buttons();
  const target=available.includes(selected)?selected:available[0];
  // Wait for the receiver layout to become focusable on slower TV browsers.
  if(target&&target.getClientRects().length)target.focus();
 }
 function ensureFocusOnce(){
  if(!pending())return;
  const current=document.activeElement as HTMLButtonElement;
  if(buttons().includes(current)){selected=current;return;}
  focusSelected();
 }
 function ensureFocus(){
  cancelRecovery();if(!pending())return;ensureFocusOnce();
  // A focus() immediately after un-hiding or loading an iframe may be ignored.
  // Recover after paint as well, without overriding an intentionally chosen Reject.
  paint=window.requestAnimationFrame(()=>{paint=undefined;ensureFocusOnce();});
  retries=[100,350,1000].map(delay=>window.setTimeout(ensureFocusOnce,delay));
 }
 function focusDefault(){selected=approve;ensureFocus();}
 function reset(){cancelRecovery();selected=approve;}
 panel.addEventListener('focusin',event=>{
  if(event.target===approve)selected=approve;else if(event.target===reject)selected=reject;
 });
 frame.addEventListener('load',ensureFocus);
 frame.addEventListener('focus',ensureFocus);
 window.addEventListener('focus',ensureFocus);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)ensureFocus();});
 window.addEventListener('pagehide',cancelRecovery);
 document.addEventListener('keydown',event=>{
  if(!pending()||event.altKey||event.ctrlKey||event.metaKey||approve.disabled||reject.disabled)return;
  const available=buttons();if(!available.length)return;
  const current=document.activeElement as HTMLButtonElement;
  const remoteSelect=['Select','Accept','OK'].includes(event.key);
  if(remoteSelect||(['Enter',' '].includes(event.key)&&!available.includes(current))){
   // Some remotes send OK while the browser has lost DOM focus entirely.
   // This remains an explicit user action, never an automatic approval.
   event.preventDefault();event.stopPropagation();
   if(available.includes(current))selected=current;
   focusSelected();
   (available.includes(selected)?selected:available[0]).click();
   return;
  }
  const direction=event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:
   event.key==='ArrowRight'||event.key==='ArrowDown'?1:0;
  if(!direction)return;
  event.preventDefault();event.stopPropagation();
  const index=available.indexOf(current);
  selected=available[index<0?0:(index+direction+available.length)%available.length];
  selected.focus();
 },true);
 // Natural DOM order is Approve -> Reject; focused Enter/Space stay native.
 return {focusDefault,ensureFocus,reset};
}
