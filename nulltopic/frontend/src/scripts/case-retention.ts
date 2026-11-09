import {api} from './client';
import {t,currentLocale} from '../lib/i18n';
import type {PostImage} from './post-image';
import {renderCaseEvidence,type CaseEvidence} from './case-evidence';
type Retention={case_id:string;closed_at:string|null;delete_after:string|null;hold_reason:string|null;review_due_at:string;review_due:boolean};
export function clearCaseRetention(){for(const dialog of document.querySelectorAll<HTMLDialogElement>('[data-retention-dialog]')){if(dialog.open)dialog.close();dialog.remove();}}
type Send=(path:string,body:unknown,method?:string)=>Promise<any>;
export async function renderCaseRetention(section:HTMLElement,send:Send,active:()=>boolean,onError:(error:unknown)=>Promise<void>=async()=>{}){
 const list=section.querySelector<HTMLElement>('[data-retention-list]')!;
 list.replaceChildren();let cursor:string|null=null,loading=false;
 const status=document.createElement('p');status.role='status';list.append(status);
 const more=button('Load more cases','M12 5v14m-7-7h14');
 function date(value:string|null){return value?new Intl.DateTimeFormat(currentLocale(),{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):t('Not scheduled');}
 function text(tag:string,value:string){const el=document.createElement(tag);el.textContent=value;return el;}
 function button(label:string,path:string){const el=document.createElement('button');el.type='button';el.className='admin-icon-button';el.setAttribute('aria-label',t(label));el.dataset.tooltip=t(label);el.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'"/></svg>';return el;}
 async function load(){
  if(loading||!active())return;loading=true;more.disabled=true;status.textContent=t('Loading requests…');
  try{
   const data:{items:Retention[];nextCursor:string|null}=await api('/admin/case-retention'+(cursor?'?cursor='+cursor:''));
   if(!active())return;
   for(const row of data.items){
    const card=document.createElement('details');card.className='card moderation-case';
    const summary=document.createElement('summary');summary.textContent=t(row.hold_reason?'Retention hold':row.closed_at?'Closed case':'Open case')+' · '+row.case_id;card.append(summary);
    const info=document.createElement('dl');
    for(const [key,value]of [['Final closure',date(row.closed_at)],['Scheduled deletion',date(row.delete_after)],['Next review',date(row.review_due_at)]])info.append(text('dt',t(key)),text('dd',value));
    card.append(info);if(row.review_due)card.append(text('p',t('Review due')));
    if(row.hold_reason)card.append(text('p',row.hold_reason));
    const evidence=document.createElement('div');card.append(evidence);let fetched=false;
    card.addEventListener('toggle',async()=>{if(!card.open||fetched||!active())return;fetched=true;try{
     const data:{image?:PostImage|null;id:string;captured_at:string;evidence:CaseEvidence;audit:{action:string;reason:string;created_at:string}[]}=await api('/admin/cases/'+row.case_id);
     if(!active())return;evidence.append(renderCaseEvidence({...data.evidence,image:data.image,id:data.id,captured_at:data.captured_at}));
     for(const event of data.audit)evidence.append(text('p',date(event.created_at)+' · '+t(event.action==='hold'?'Retention hold':event.action==='release'?'Hold released':'Review recorded')+' · '+event.reason));
    }catch(error){await onError(error);if(active())evidence.textContent=t('Unable to load this section. Please try again.');fetched=false;}});
    const actions=document.createElement('div');actions.className='admin-user-actions';card.append(actions);
    for(const action of ['review','hold',...(row.hold_reason?['release']:[])] as const){
     const label=action==='review'?'Record retention review':action==='hold'?'Set retention hold':'Release retention hold';
     const trigger=button(label,action==='hold'?'M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5Z':action==='release'?'m6 6 12 12M18 6 6 18':'m5 12 4 4L19 6');actions.append(trigger);
     trigger.addEventListener('click',()=>{
      const dialog=document.createElement('dialog');dialog.className='report-dialog workspace-dialog';dialog.dataset.retentionDialog='';
      const title=text('h2',t(label));title.id='retention-dialog-title';dialog.setAttribute('aria-labelledby',title.id);
      const form=document.createElement('form'),labelEl=document.createElement('label'),reason=document.createElement('textarea');reason.required=true;reason.maxLength=1000;labelEl.textContent=t('Reason');labelEl.append(reason);
      const feedback=text('p','');feedback.setAttribute('role','alert');
      const close=button('Cancel','m6 6 12 12M18 6 6 18');const save=button('Save changes','m5 12 4 4L19 6');save.type='submit';
      const footer=document.createElement('footer');footer.className='admin-user-actions';footer.append(close,save);
      form.append(labelEl,feedback,footer);dialog.append(title,text('p',t(action==='release'?'Releasing a hold does not restart the retention period. An overdue closed case can be deleted by the next cleanup.':'Only retain case data while it is needed. A hold requires a concrete reason and another review within 30 days.')),form);document.body.append(dialog);dialog.showModal();reason.focus();let busy=false;
      dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});dialog.addEventListener('close',()=>{dialog.remove();trigger.focus();});close.onclick=()=>dialog.close();
      form.addEventListener('submit',async event=>{event.preventDefault();if(busy||!active()||!reason.value.trim())return;busy=true;save.disabled=close.disabled=true;
       try{await send('/admin/cases/'+row.case_id+'/retention',{action,reason:reason.value.trim()});dialog.close();if(active())await renderCaseRetention(section,send,active,onError);}
       catch(error){await onError(error);feedback.textContent=t('Unable to save changes. Please try again.');busy=false;save.disabled=close.disabled=false;}
      });
     });
    }
    list.insertBefore(card,more.isConnected?more:null);
   }
   cursor=data.nextCursor;more.hidden=!cursor;if(!more.isConnected)list.append(more);status.textContent=data.items.length?'':t('No moderation cases.');
  }catch(error){await onError(error);if(active())status.textContent=t('Unable to load this section. Please try again.');}
  finally{loading=false;more.disabled=false;}
 }
 more.onclick=()=>void load();await load();
}
