import {currentLanguage,localizeTrustedUI,t} from '../lib/i18n';
import {productionAdLocation,PRODUCTION_VISITOR_KEY,PUBLIC_PAGE_PATHS} from '../lib/advertising';
import {VISITOR_TERMS_VERSION} from '../lib/visitor-legal-versions';
/** Browser acknowledgement only: not verified age, a server gate or advertising consent. */
export const VISITOR_PREVIEW_KEY='nulltopic.visitor-confirmation.v1';
export const VISITOR_PREVIEW_VERSION=VISITOR_TERMS_VERSION;
export function isVisitorPreviewHost(hostname:string){return ['localhost','127.0.0.1','[::1]'].includes(hostname);}
export function initializeVisitorPreview(){
 const dialog=document.querySelector<HTMLDialogElement>('#visitor-confirmation');
 const local=isVisitorPreviewHost(window.location.hostname);
 const automatic=PUBLIC_PAGE_PATHS.includes(window.location.pathname.replace(/\/$/,'')||'/')&&(local||(document.body.dataset.productionVisitorConfirmation==='true'&&productionAdLocation(window.location)));
 if(!dialog||typeof dialog.showModal!=='function')return;
 // Manual review works on every page; automatic prompting stays restricted to public shells.
 const storageKey=local?VISITOR_PREVIEW_KEY:PRODUCTION_VISITOR_KEY;
 const notify=()=>window.dispatchEvent(new window.Event('nulltopic:visitor-confirmation'));

 const form=dialog.querySelector<HTMLFormElement>('form')!,age=dialog.querySelector<HTMLInputElement>('#visitor-age')!,terms=dialog.querySelector<HTMLInputElement>('#visitor-terms')!,confirm=dialog.querySelector<HTMLButtonElement>('#visitor-confirm')!,reopen=document.querySelector<HTMLButtonElement>('#visitor-preview-reopen')!,controls=document.getElementById('visitor-preview-controls')!;
 localizeTrustedUI(dialog);localizeTrustedUI(controls);
 const language=currentLanguage(),suffix=language==='de'?'':'/en';
 dialog.querySelector<HTMLAnchorElement>('[data-visitor-terms]')!.href='/nutzungsbedingungen'+suffix;
 dialog.querySelector<HTMLAnchorElement>('[data-visitor-privacy]')!.href='/datenschutz'+suffix;
 dialog.querySelector<HTMLAnchorElement>('[data-visitor-imprint]')!.href='/impressum?lang='+language;
 controls.hidden=controls.dataset.authenticated==='true';
 let returnFocus:HTMLElement|null=null;
 const withdraw=dialog.querySelector<HTMLButtonElement>('#visitor-withdraw')!;
 const sync=()=>{confirm.disabled=!(age.checked&&terms.checked);};
 const read=()=>{try{return localStorage.getItem(storageKey)===VISITOR_PREVIEW_VERSION;}catch{return false;}};
 const open=(review=false)=>{dialog.querySelector<HTMLElement>('#visitor-withdraw-error')!.hidden=true;const accepted=read();age.checked=review&&accepted;terms.checked=review&&accepted;withdraw.hidden=!accepted;sync();if(!dialog.open)dialog.showModal();dialog.querySelector<HTMLElement>('#visitor-confirmation-title')!.focus();};
 form.addEventListener('input',sync);form.addEventListener('change',sync);
 dialog.addEventListener('cancel',event=>event.preventDefault());
 // Chromium may emit a non-cancelable close-watcher event without recent activation.
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.preventDefault();});
 form.addEventListener('submit',event=>{
  event.preventDefault();if(!age.checked||!terms.checked){sync();return;}
  try{localStorage.setItem(storageKey,VISITOR_PREVIEW_VERSION);}catch{/* Continue in memory only when browser storage is blocked. */}
  notify();dialog.close();const target=returnFocus||document.querySelector<HTMLElement>('main h1, main');if(target){if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}
 });
 reopen.addEventListener('click',()=>{returnFocus=reopen;open(true);});
 withdraw.addEventListener('click',()=>{try{localStorage.removeItem(storageKey);}catch{const error=dialog.querySelector<HTMLElement>('#visitor-withdraw-error')!;error.textContent=t('The saved confirmation could not be removed. Please check your browser storage settings.');error.hidden=false;return;}notify();open();});
 const reconcile=()=>{notify();if(read()){if(dialog.open)dialog.close();age.checked=false;terms.checked=false;sync();}else if(automatic||dialog.open)open();};
 // Read actual shared state, not the event payload (which may already be stale).
 window.addEventListener('storage',event=>{if(event.key===storageKey||event.key===null)reconcile();});
 window.addEventListener('pageshow',event=>{if(event.persisted)reconcile();});
 window.addEventListener('pagehide',()=>{age.checked=false;terms.checked=false;sync();});
 if(automatic&&!read())open();
}
