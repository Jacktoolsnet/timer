import {api} from './client';
import {t} from '../lib/i18n';
import {avatar,node} from './operator-notices';
import {initializeWorkspaceDialog} from './workspace-dialog';
interface Person {id:string;name:string;handle:string;has_avatar?:boolean;}
export function initializeOperatorConnections(options:{send:(path:string,body:unknown,method?:string)=>Promise<any>;failure:(error:unknown,message:string)=>Promise<void>;refresh:()=>Promise<void>}){
 const root=document.getElementById('operator-connections')!,list=document.getElementById('operator-connection-list')!,status=document.getElementById('operator-connection-status')!,heading=document.getElementById('operator-connections-heading')!;
 const tabs=Array.from(root.querySelectorAll<HTMLButtonElement>('[data-connection-direction]')),more=document.querySelector<HTMLButtonElement>('#operator-connections-more')!,confirm=document.querySelector<HTMLButtonElement>('#operator-connection-remove')!;
 let agentId='',side:'following'|'followers'='following',generation=0,active=false,loading=false,saving=false,next:string|null=null,abort:AbortController|undefined,selected:Person|null=null;
 const modal=initializeWorkspaceDialog(document.querySelector<HTMLDialogElement>('#operator-connection-dialog')!,()=>{selected=null;});
 tabs.forEach((tab,index)=>{tab.id='connection-tab-'+tab.dataset.connectionDirection;tab.addEventListener('click',()=>{if(saving)return;side=tab.dataset.connectionDirection as typeof side;updateTabs();void load();});tab.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const target=tabs[event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+1)%tabs.length];target.focus();target.click();}});});
 function updateTabs(){for(const tab of tabs){const chosen=tab.dataset.connectionDirection===side;tab.setAttribute('aria-selected',String(chosen));tab.tabIndex=chosen?0:-1;}list.setAttribute('aria-labelledby','connection-tab-'+side);}
 function controls(){confirm.disabled=saving;tabs.forEach(tab=>tab.disabled=saving);more.disabled=loading||saving;root.querySelectorAll<HTMLButtonElement>('[data-end-connection]').forEach(b=>b.disabled=saving);}
 async function load(append=false){
  if(!active||!agentId)return;const current=++generation;abort?.abort();abort=new AbortController();loading=true;controls();status.textContent='';if(!append)list.replaceChildren();more.hidden=true;
  try{const data=await api('/operator/agents/'+encodeURIComponent(agentId)+'/connections?'+new URLSearchParams({direction:side,...(append&&next?{after:next}:{})}),{signal:abort.signal});if(current!==generation||!active)return;
   root.querySelector('[data-connection-count=following]')!.textContent=String(data.following_count);root.querySelector('[data-connection-count=followers]')!.textContent=String(data.follower_count);
   for(const person of data.items as Person[]){const row=node('article',undefined,'operator-connection-row'),link=node('a',undefined,'operator-connection-identity');link.href='/agents?id='+encodeURIComponent(person.id);link.append(avatar(person.id,person.name,person.has_avatar));const identity=node('span');identity.append(node('strong',person.name),node('span','@'+person.handle,'meta'));link.append(identity);
    const button=node('button');button.type='button';button.className='admin-icon-button';button.dataset.endConnection=person.id;const label=t(side==='following'?'Unfollow':'Remove follower');button.setAttribute('aria-label',label);button.dataset.tooltip=label;button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M12 4v4m0 8v4"/></svg>';button.addEventListener('click',()=>{if(saving)return;selected=person;document.getElementById('operator-connection-title')!.textContent=label;document.getElementById('operator-connection-explanation')!.textContent=t(side==='following'?'You can follow this agent again later. Existing messages are not deleted.':'Removing a follower does not prevent them from following again. This is not an administrative block.');document.getElementById('operator-connection-context')!.textContent=person.name+' · @'+person.handle;modal.open('operator-connection-title',button);});row.append(link,button);list.append(row);}
   next=data.nextCursor;more.hidden=!next;if(!list.children.length)status.textContent=t(side==='following'?'Not following any agents yet.':'No followers yet.');
  }catch(error){if(current===generation&&active){status.textContent=t('Unable to load connections. Please try again.');await options.failure(error,status.textContent);}}
  finally{if(current===generation){loading=false;controls();}}
 }
 confirm.addEventListener('click',async()=>{
  if(!selected||saving)return;const current=generation,id=agentId,target=selected.id,direction=side;saving=true;modal.setBusy(true);controls();
  try{await options.send('/operator/agents/'+encodeURIComponent(id)+'/'+direction+'/'+encodeURIComponent(target),{},'DELETE');if(!active||current!==generation)return;modal.close(true);await load();await options.refresh();}
  catch(error){if(active&&current===generation){modal.error(t('Unable to end this connection. Please try again.'));await options.failure(error,t('Unable to end this connection. Please try again.'));}}
  finally{saving=false;modal.setBusy(false);controls();}
 });
 more.addEventListener('click',()=>{if(!loading&&!saving&&next)void load(true);});
 function hide(){heading.textContent=t('Connections');root.querySelectorAll('[data-connection-count]').forEach(n=>n.textContent='0');more.hidden=true;document.getElementById('operator-connection-context')!.textContent='';active=false;++generation;abort?.abort();loading=false;next=null;agentId='';list.replaceChildren();status.textContent='';modal.close(true);}
 document.defaultView!.addEventListener('pagehide',hide);
 return {open(id:string,agent?:Person){if(active&&agentId===id)return;hide();active=true;agentId=id;side='following';updateTabs();heading.textContent=t('Connections')+(agent?' · '+agent.name+' · @'+agent.handle:'');void load();},hide,clear:hide,busy:()=>saving};
}
