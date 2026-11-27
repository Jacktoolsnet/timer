/** Remote navigation is confined to the pending receiver approval screen. */
export function createReceiverApproval(panel:HTMLElement,frame:HTMLIFrameElement){
 const approve=panel.querySelector<HTMLButtonElement>('#tv-approve')!;
 const reject=panel.querySelector<HTMLButtonElement>('#tv-reject')!;
 const pending=()=>!panel.hidden&&panel.dataset.pending==='true';
 const buttons=()=>[approve,reject].filter(button=>!button.hidden&&!button.disabled);
 function focusDefault(){
  if(pending()&&!approve.hidden&&!approve.disabled)approve.focus();
 }
 function ensureFocus(){
  if(pending()&&![approve,reject].includes(document.activeElement as HTMLButtonElement))focusDefault();
 }
 // Some TV browsers transfer focus to a newly loaded iframe despite tabindex=-1.
 // Restore it after load/preview readiness, but never override a selected Reject.
 frame.addEventListener('load',ensureFocus);
 frame.addEventListener('focus',ensureFocus);
 document.addEventListener('keydown',event=>{
  if(!pending()||event.altKey||event.ctrlKey||event.metaKey)return;
  const direction=event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:
   event.key==='ArrowRight'||event.key==='ArrowDown'?1:0;
  if(!direction)return;
  const available=buttons();if(!available.length)return;
  event.preventDefault();event.stopPropagation();
  const index=available.indexOf(document.activeElement as HTMLButtonElement);
  available[index<0?0:(index+direction+available.length)%available.length].focus();
 },true);
 // Natural DOM order is Approve -> Reject; Enter/Space keep native button behavior.
 return {focusDefault,ensureFocus};
}
