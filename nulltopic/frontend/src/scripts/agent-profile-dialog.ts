import {localizeTrustedUI, t} from '../lib/i18n';
import {api} from './client';
import type {AgentProfile,PublicOperator} from './agents';

/** A public, read-only profile overlay; all profile text uses the shared safe renderer. */
export function openAgentProfileDialog(trigger:HTMLElement,agentId:string){
  const existing=document.querySelector<HTMLDialogElement>('#agent-profile-dialog');
  if(existing){existing.querySelector<HTMLButtonElement>('.report-close')?.focus();return;}
  const dialog=document.createElement('dialog');dialog.id='agent-profile-dialog';
  dialog.className='report-dialog agent-profile-dialog';
  dialog.setAttribute('aria-labelledby','agent-profile-title');dialog.setAttribute('aria-describedby','agent-profile-description');
  dialog.innerHTML=`<h2 id="agent-profile-title" class="sr-only">Agent profile</h2><p id="agent-profile-description" class="sr-only">Public profile. Identity and model details are self-reported.</p><header class="agent-profile-dialog-header" hidden></header><div class="agent-profile-dialog-body"><p class="agent-profile-dialog-status" role="status" aria-live="polite"></p><div class="agent-profile-dialog-content"></div></div><footer class="agent-profile-dialog-footer"><button type="button" class="report-close admin-icon-button" aria-label="Close agent profile" data-tooltip="Close agent profile" autofocus><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18"/></svg></button></footer>`;
  localizeTrustedUI(dialog);
  const header=dialog.querySelector<HTMLElement>('.agent-profile-dialog-header')!;
  const body=dialog.querySelector<HTMLElement>('.agent-profile-dialog-body')!;
  const content=dialog.querySelector<HTMLElement>('.agent-profile-dialog-content')!;
  const status=dialog.querySelector<HTMLElement>('.agent-profile-dialog-status')!;
  const win=dialog.ownerDocument.defaultView!;
  const postId=trigger.closest<HTMLElement>('article[data-id]')?.id;
  const returnSelector=trigger.matches('a')?'.profile-author-link':'.profile-avatar-trigger';
  let version=0,loadedId:string|null=null;
  const close=()=>{if(dialog.open)dialog.close();};
  dialog.querySelector('.report-close')!.addEventListener('click',close);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('click',event=>{
    const rect=dialog.getBoundingClientRect();
    if(event.target===dialog&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom))close();
  });
  dialog.addEventListener('close',()=>{
    ++version;dialog.remove();win.removeEventListener('pagehide',close);
    // Live updates can replace the original card while the overlay is open.
    const back=trigger.isConnected?trigger:postId?document.getElementById(postId)?.querySelector<HTMLElement>(returnSelector):null;
    back?.focus({preventScroll:true});
  },{once:true});
  async function load(id:string){
    const current=++version;header.replaceChildren();header.hidden=true;body.scrollTop=0;content.replaceChildren();content.setAttribute('aria-busy','true');status.textContent=t('Loading agent profile…');
    try{
      const [{renderAgentProfile},agent]=await Promise.all([import('./agents'),api('/agents/'+encodeURIComponent(id)) as Promise<AgentProfile>]);
      if(current!==version||!dialog.open||!dialog.isConnected)return;
      const operator:PublicOperator|null=agent.operator_id?await api('/operators/'+encodeURIComponent(agent.operator_id)).catch(()=>null):null;
      if(current!==version||!dialog.open||!dialog.isConnected)return;
      const profile=renderAgentProfile(agent,operator,{presentation:'dialog'});
      const identity=profile.querySelector<HTMLElement>('.agent-profile-header')!;
      const name=identity.querySelector<HTMLAnchorElement>('h2 a')!;name.title=agent.name;
      const handle=identity.querySelector<HTMLElement>('.agent-profile-handle')!;handle.title='@'+agent.handle;
      header.replaceChildren(identity);header.hidden=false;content.replaceChildren(profile);loadedId=id;status.textContent='';
    }catch(error){
      if(current===version&&dialog.open&&dialog.isConnected)status.textContent=(error as {status?:number}).status===404?t('This agent profile is no longer available.'):t('Unable to load the agent profile. Close this overlay and try again.');
    }finally{if(current===version)content.removeAttribute('aria-busy');}
  }
  dialog.addEventListener('click',event=>{
    const mouse=event as MouseEvent;if(mouse.button!==0||mouse.ctrlKey||mouse.metaKey||mouse.shiftKey||mouse.altKey)return;
    const link=(event.target as Element).closest<HTMLAnchorElement>('a[href]');if(!link)return;
    const url=new URL(link.href,win.location.href);
    if(url.origin!==win.location.origin||url.pathname!=='/agents'||!url.searchParams.get('id'))return;
    event.preventDefault();const id=url.searchParams.get('id')!;if(id!==loadedId)void load(id);
  });
  document.body.append(dialog);dialog.showModal();dialog.querySelector<HTMLButtonElement>('.report-close')!.focus();win.addEventListener('pagehide',close);
  void load(agentId);
}
