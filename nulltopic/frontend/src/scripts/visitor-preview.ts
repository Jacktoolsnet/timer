import {currentLanguage,localizeTrustedUI,t} from '../lib/i18n';
import {VISITOR_TERMS_VERSION} from '../lib/visitor-legal-versions';
/** UI-only loopback preview; never a server-side access control or certified CMP. */
export const VISITOR_PREVIEW_KEY='nulltopic.visitor-confirmation.v1';
export const VISITOR_PREVIEW_VERSION=VISITOR_TERMS_VERSION;
export function isVisitorPreviewHost(hostname:string){return ['localhost','127.0.0.1','[::1]'].includes(hostname);}
export function initializeVisitorPreview(){
 const dialog=document.querySelector<HTMLDialogElement>('#visitor-confirmation');
 if(!dialog||!isVisitorPreviewHost(window.location.hostname)||typeof dialog.showModal!=='function')return;
 const form=dialog.querySelector<HTMLFormElement>('form')!,age=dialog.querySelector<HTMLInputElement>('#visitor-age')!,terms=dialog.querySelector<HTMLInputElement>('#visitor-terms')!,confirm=dialog.querySelector<HTMLButtonElement>('#visitor-confirm')!,reopen=document.querySelector<HTMLButtonElement>('#visitor-preview-reopen')!,controls=document.getElementById('visitor-preview-controls')!;
 localizeTrustedUI(dialog);localizeTrustedUI(controls);
 const language=currentLanguage(),suffix=language==='de'?'':'/en';
 dialog.querySelector<HTMLAnchorElement>('[data-visitor-terms]')!.href='/nutzungsbedingungen'+suffix;
 dialog.querySelector<HTMLAnchorElement>('[data-visitor-privacy]')!.href='/datenschutz'+suffix;
 dialog.querySelector<HTMLAnchorElement>('[data-visitor-imprint]')!.href='/impressum?lang='+language;
 controls.hidden=false;
 let returnFocus:HTMLElement|null=null;
 const withdraw=dialog.querySelector<HTMLButtonElement>('#visitor-withdraw')!;
 const sync=()=>{confirm.disabled=!(age.checked&&terms.checked);};
 const read=()=>{try{return localStorage.getItem(VISITOR_PREVIEW_KEY)===VISITOR_PREVIEW_VERSION;}catch{return false;}};
 const open=(review=false)=>{dialog.querySelector<HTMLElement>('#visitor-withdraw-error')!.hidden=true;const accepted=read();age.checked=review&&accepted;terms.checked=review&&accepted;withdraw.hidden=!accepted;sync();if(!dialog.open)dialog.showModal();dialog.querySelector<HTMLElement>('#visitor-confirmation-title')!.focus();};
 form.addEventListener('input',sync);form.addEventListener('change',sync);
 dialog.addEventListener('cancel',event=>event.preventDefault());
 // Chromium may emit a non-cancelable close-watcher event without recent activation.
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.preventDefault();});
 form.addEventListener('submit',event=>{
  event.preventDefault();if(!age.checked||!terms.checked){sync();return;}
  try{localStorage.setItem(VISITOR_PREVIEW_KEY,VISITOR_PREVIEW_VERSION);}catch{/* Continue in memory only when browser storage is blocked. */}
  dialog.close();const target=returnFocus||document.querySelector<HTMLElement>('main h1, main');if(target){if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}
 });
 reopen.addEventListener('click',()=>{returnFocus=reopen;open(true);});
 withdraw.addEventListener('click',()=>{try{localStorage.removeItem(VISITOR_PREVIEW_KEY);}catch{const error=dialog.querySelector<HTMLElement>('#visitor-withdraw-error')!;error.textContent=t('The saved confirmation could not be removed. Please check your browser storage settings.');error.hidden=false;return;}open();});
 const reconcile=()=>{if(read()){if(dialog.open)dialog.close();age.checked=false;terms.checked=false;sync();}else open();};
 // Read actual shared state, not the event payload (which may already be stale).
 window.addEventListener('storage',event=>{if(event.key===VISITOR_PREVIEW_KEY||event.key===null)reconcile();});
 window.addEventListener('pageshow',event=>{if(event.persisted)reconcile();});
 window.addEventListener('pagehide',()=>{age.checked=false;terms.checked=false;sync();});
 if(!read())open();
}
