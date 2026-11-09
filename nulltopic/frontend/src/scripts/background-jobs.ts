import {api} from './client';
import {t,currentLocale} from '../lib/i18n';
type Job={id:'cases'|'conversations';state:'ready'|'running'|'failed'|'overdue';manual_required:boolean;started_at:string|null;finished_at:string|null;last_success_at:string|null;next_run_at:string;retry_at:string|null;affected_count:number|null;error_code:string|null};
type Send=(path:string,body:unknown)=>Promise<any>;
export function clearJobDialogs(){for(const dialog of document.querySelectorAll<HTMLDialogElement>('[data-job-dialog]')){if(dialog.open)dialog.close();dialog.remove();}}
export async function renderBackgroundJobs(section:HTMLElement,send:Send,active:()=>boolean,onError:(error:unknown)=>Promise<void>){
 const list=section.querySelector<HTMLElement>('[data-jobs-list]')!,win=document.defaultView!;let loading=false,delay=30000;
 function text(tag:string,value:string){const node=document.createElement(tag);node.textContent=value;return node;}
 function icon(label:string,path:string){const button=document.createElement('button');button.type='button';button.className='admin-icon-button';button.setAttribute('aria-label',t(label));button.dataset.tooltip=t(label);button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'"/></svg>';return button;}
 function date(value:string|null){return value?new Intl.DateTimeFormat(currentLocale(),{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Berlin'}).format(new Date(value)):t('Never');}
 const names={cases:'Case cleanup',conversations:'Conversation cleanup'};
 const labels={ready:'Ready',running:'Running',failed:'Failed',overdue:'Overdue'};
 async function refresh(){
  if(loading||!active())return;loading=true;
  try{
   const data:{items:Job[];enabled:boolean}=await api('/admin/jobs');if(!active())return;list.replaceChildren();delay=30000;
   if(!data.enabled)list.append(text('p',t('Automatic background tasks are disabled on this server.')));
   for(const job of data.items){
    const card=document.createElement('article');card.className='card background-job';card.dataset.job=job.id;
    const heading=document.createElement('div');heading.className='admin-user-heading';const badge=text('span',t(labels[job.state]));badge.className='job-state';badge.dataset.state=job.state;heading.append(text('h2',t(names[job.id])),badge);card.append(heading);
    const info=document.createElement('dl');for(const [label,value]of [['Last run',date(job.started_at)],['Last successful run',date(job.last_success_at)],['Next scheduled run',date(job.next_run_at)+' · Europe/Berlin'],...(job.retry_at?[['Retry after',date(job.retry_at)]]:[])])info.append(text('dt',t(label)),text('dd',value));card.append(info);
    if(job.affected_count!==null)card.append(text('p',t('Deleted: {count}',{count:job.affected_count})));
    if(job.error_code)card.append(text('p',t(job.error_code==='INTERRUPTED'?'The previous run was interrupted.':'The previous run failed. A retry is scheduled.')));
    const actions=document.createElement('div');actions.className='admin-user-actions';card.append(actions);
    const reload=icon('Refresh tasks','M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1');reload.onclick=()=>void refresh();actions.append(reload);
    if(job.manual_required){const start=icon('Preview manual run','m8 5 11 7-11 7Z');actions.append(start);start.onclick=async()=>{
     if(!active())return;start.disabled=true;
     try{
      const preview:{id:string;count:number}=await send('/admin/jobs/'+job.id+'/preview',{});if(!active())return;
      const dialog=document.createElement('dialog');dialog.dataset.jobDialog='';dialog.className='report-dialog workspace-dialog';const title=text('h2',t('Confirm cleanup'));title.id='job-confirm-title';dialog.setAttribute('aria-labelledby',title.id);
      const note=text('p',t('Eligible for deletion: {count}',{count:preview.count}));const warning=text('p',t('Deletion is permanent. Counts may change; eligibility is checked again when the task runs.'));
      const feedback=text('p','');feedback.setAttribute('role','alert');const footer=document.createElement('footer');footer.className='admin-user-actions';const cancel=icon('Cancel','m6 6 12 12M18 6 6 18'),confirm=icon('Run cleanup now','m8 5 11 7-11 7Z');footer.append(cancel,confirm);dialog.append(title,note,warning,feedback,footer);document.body.append(dialog);dialog.showModal();cancel.focus();let busy=false;
      cancel.onclick=()=>dialog.close();dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});dialog.addEventListener('close',()=>{dialog.remove();if(start.isConnected)start.focus();});
      confirm.onclick=async()=>{if(busy||!active())return;busy=true;confirm.disabled=cancel.disabled=true;dialog.setAttribute('aria-busy','true');feedback.textContent=t('Running');
       try{await send('/admin/jobs/'+job.id+'/run',{previewId:preview.id});dialog.close();await refresh();}
       catch(error){await onError(error);if(active()){feedback.textContent=t('Unable to run the task. Close this dialog and prepare a fresh preview.');busy=false;cancel.disabled=false;dialog.removeAttribute('aria-busy');}}
      };
     }catch(error){await onError(error);if(active()){const message=text('p',t('Unable to prepare the task. Refresh and try again.'));message.role='alert';card.append(message);}}
     finally{start.disabled=false;}
    };}
    const history=document.createElement('details');history.append(text('summary',t('Recent runs')));card.append(history);let loaded=false;
    history.ontoggle=async()=>{if(!history.open||loaded||!active())return;loaded=true;try{
     const rows:{source:string;started_at:string;status:string;affected_count:number|null;error_code:string|null}[]=await api('/admin/jobs/'+job.id+'/history');if(!active())return;
     if(!rows.length)history.append(text('p',t('No runs yet.')));
     for(const row of rows)history.append(text('p',date(row.started_at)+' · '+t(row.source==='manual'?'Manual':row.source==='cli'?'Command line':'Automatic')+' · '+t(row.status==='succeeded'?'Succeeded':row.status==='running'?'Running':'Failed')+(row.affected_count===null?'':' · '+t('Deleted: {count}',{count:row.affected_count}))));
    }catch(error){loaded=false;await onError(error);if(active())history.append(text('p',t('Unable to load this section. Please try again.')));}};
    list.append(card);
   }
  }catch(error){delay=Math.min(delay*2,300000);await onError(error);if(active())list.replaceChildren(text('p',t('Unable to load this section. Please try again.')));}
  finally{loading=false;}
 }
 list.replaceChildren(text('p',t('Loading requests…')));await refresh();
 function later(){win.setTimeout(async()=>{if(!active())return;if(!document.hidden&&!document.querySelector('[data-job-dialog]'))await refresh();later();},delay);}
 later();
}
