import {t} from '../lib/i18n';
const active = new WeakMap<Document, () => void>();
export function dismissToast(owner: Document = document) { active.get(owner)?.(); }

/** Palette-aware plain-text feedback; never moves focus when appearing. */
export function showSuccessToast(message: string, owner: Document = document, duration = 3000) {
  return showToast(message,owner,duration,'success');
}
export function showErrorToast(message: string, owner: Document = document, duration = 3000) {
  return showToast(message,owner,duration,'error');
}
function showToast(message:string,owner:Document,duration:number,kind:'success'|'error') {
  dismissToast(owner);
  const win=owner.defaultView!;
  let region=owner.querySelector<HTMLElement>('#toast-region');
  if(!region){region=owner.createElement('div');region.id='toast-region';region.className='toast-region';region.setAttribute('role','status');region.setAttribute('aria-live','polite');region.setAttribute('aria-atomic','true');owner.body.append(region);}
  region.setAttribute('role',kind==='error'?'alert':'status');region.setAttribute('aria-live',kind==='error'?'assertive':'polite');
  const previous=owner.activeElement as HTMLElement|null;
  const toast=owner.createElement('div');toast.className='app-toast';toast.dataset.kind=kind;
  // Only fixed application-owned icon markup is parsed as HTML.
  toast.innerHTML='<span class="app-toast-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg></span><span class="app-toast-message"></span><button class="app-toast-close admin-icon-button" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>';
  if(kind==='error')toast.querySelector('.app-toast-icon svg')!.innerHTML='<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/>';
  const close=toast.querySelector<HTMLButtonElement>('button')!;
  close.setAttribute('aria-label',t('Close'));close.dataset.tooltip=t('Close');
  let timer:number|undefined,closed=false,hovered=false;
  const pause=()=>{win.clearTimeout(timer);timer=undefined;};
  const dismiss=()=>{
    if(closed)return;closed=true;pause();
    const hadFocus=toast.contains(owner.activeElement);toast.remove();active.delete(owner);win.removeEventListener('pagehide',dismiss);
    if(hadFocus&&previous?.isConnected)previous.focus({preventScroll:true});
  };
  const arm=()=>{pause();if(!closed&&!hovered&&!toast.contains(owner.activeElement))timer=win.setTimeout(dismiss,duration);};
  close.addEventListener('click',dismiss);
  toast.addEventListener('pointerenter',()=>{hovered=true;pause();});toast.addEventListener('pointerleave',()=>{hovered=false;arm();});
  toast.addEventListener('focusin',pause);toast.addEventListener('focusout',()=>{win.setTimeout(arm,0);});
  toast.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();dismiss();}});
  active.set(owner,dismiss);win.addEventListener('pagehide',dismiss,{once:true});
  region.append(toast);toast.querySelector('.app-toast-message')!.textContent=message;arm();
  return dismiss;
}
