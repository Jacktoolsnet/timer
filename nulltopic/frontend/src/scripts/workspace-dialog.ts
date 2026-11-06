/** Persistent native modal: focus containment/inert background are browser-owned. */
export function initializeWorkspaceDialog(dialog:HTMLDialogElement, dismissed:()=>void) {
  let active=false, busy=false, returnTo:HTMLElement|null=null;
  const feedback=dialog.querySelector<HTMLElement>('.workspace-dialog-status')!;
  function finish(){
    if(!active)return;active=false;busy=false;dialog.removeAttribute('aria-busy');feedback.textContent='';
    dialog.querySelectorAll<HTMLButtonElement>('[data-dialog-close]').forEach(button=>button.disabled=false);
    dismissed();
    if(returnTo?.isConnected && !returnTo.closest('[hidden]'))returnTo.focus({preventScroll:true});
    returnTo=null;
  }
  function close(force=false){if(busy&&!force)return;if(dialog.open)dialog.close();finish();}
  dialog.querySelectorAll<HTMLElement>('[data-dialog-close]').forEach(button=>button.addEventListener('click',()=>close()));
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('close',()=>{if(!dialog.open)finish();});
  dialog.addEventListener('click',event=>{
    const box=dialog.getBoundingClientRect();
    if(event.target===dialog && (event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom))close();
  });
  return {
    open(labelledBy:string, trigger?:HTMLElement|null){
      feedback.textContent='';returnTo=trigger || dialog.ownerDocument.activeElement as HTMLElement;
      dialog.setAttribute('aria-labelledby',labelledBy);active=true;if(!dialog.open)dialog.showModal();
    },
    close,
    setBusy(value:boolean){busy=value;if(value)dialog.setAttribute('aria-busy','true');else dialog.removeAttribute('aria-busy');dialog.querySelectorAll<HTMLButtonElement>('[data-dialog-close]').forEach(button=>button.disabled=value);},
    error(message:string){feedback.textContent=message;feedback.focus();},
  };
}
