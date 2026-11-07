import {t} from '../lib/i18n';
import {initializeWorkspaceDialog} from './workspace-dialog';

/** Internal navigation can be deferred. Browsers require their native prompt for tab close/reload. */
export function initializeUnsavedSettings(options:{dirty:()=>boolean;busy:()=>boolean;save:()=>Promise<boolean>;discard:()=>void}){
 const doc=document,win=doc.defaultView!,dialog=doc.querySelector<HTMLDialogElement>('#operator-unsaved-dialog')!;
 let pending:(()=>void)|null=null,bypass=false,generation=0;
 const modal=initializeWorkspaceDialog(dialog,()=>{pending=null;});
 const buttons=Array.from(dialog.querySelectorAll<HTMLButtonElement>('button'));
 function request(action:()=>void,trigger?:HTMLElement|null){
  if(options.busy())return;
  if(!options.dirty()){action();return;}
  if(pending)return;
  pending=action;modal.open('operator-unsaved-title',trigger);
 }
 dialog.querySelector('[data-unsaved-save]')!.addEventListener('click',async()=>{
  if(!pending||options.busy())return;const current=generation;modal.setBusy(true);buttons.forEach(button=>button.disabled=true);
  try{
   if(!await options.save()){if(current===generation)modal.error(t('Unable to save your changes. Keep editing or try again.'));return;}
   if(current!==generation)return;const next=pending;modal.close(true);next?.();
  }finally{if(current===generation){modal.setBusy(false);buttons.forEach(button=>button.disabled=false);}}
 });
 dialog.querySelector('[data-unsaved-discard]')!.addEventListener('click',()=>{
  if(options.busy())return;const next=pending;options.discard();modal.close(true);next?.();
 });
 doc.addEventListener('click',event=>{
  if(bypass||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const link=(event.target as Element).closest<HTMLAnchorElement>('a[href]');
  if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self')||link.getAttribute('aria-disabled')==='true')return;
  if(!options.dirty()&&!options.busy())return;
  event.preventDefault();event.stopImmediatePropagation();
  request(()=>{bypass=true;try{link.click();}finally{bypass=false;}},link);
 },true);
 win.addEventListener('beforeunload',event=>{if(options.dirty()||options.busy()){event.preventDefault();Reflect.set(event,'returnValue','');}});
 return {request,clear(){++generation;pending=null;modal.close(true);modal.setBusy(false);buttons.forEach(button=>button.disabled=false);}};
}
