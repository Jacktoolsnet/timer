import {operatorAgentTile} from './operator-agent-tile';
import {currentLocale, t} from '../lib/i18n';
import {api} from './client';
import {node} from './operator-notices';
import {initializeWorkspaceDialog} from './workspace-dialog';
interface OwnedAgent {id:string;name:string;handle:string;status:string;has_avatar?:boolean;}
interface OwnedMessage {id:string;conversation_id:string;parent_id:string|null;body:string|null;state:string;created_at:string;}
interface Messages {agent:OwnedAgent;items:OwnedMessage[];total:number;nextCursor:string|null;}
function icon(label:string,path:string){const button=node('button');button.type='button';button.className='admin-icon-button';button.setAttribute('aria-label',label);button.dataset.tooltip=label;button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'"/></svg>';return button;}
export function initializeOperatorConversations(remove:(id:string)=>Promise<unknown>,failure:(error:unknown,message:string)=>Promise<void>){
 const picker=document.getElementById('operator-conversations-picker')!;
 const grid=document.getElementById('operator-conversation-agents')!,browser=document.getElementById('operator-message-browser')!,list=document.getElementById('operator-messages')!,status=document.getElementById('operator-message-status')!,heading=document.getElementById('operator-messages-heading')!;
 const form=document.querySelector<HTMLFormElement>('#operator-message-search')!,query=document.querySelector<HTMLInputElement>('#operator-message-query')!,more=document.querySelector<HTMLButtonElement>('#operator-messages-more')!,confirm=document.querySelector<HTMLButtonElement>('#operator-delete-confirm')!,preview=document.getElementById('operator-delete-preview')!;
 let agents:OwnedAgent[]=[],selected:OwnedAgent|null=null,active=false,version=0,next:string|null=null,state='all',search='',pending:OwnedMessage|null=null,deleting=false,deleteVersion=0;
 const modal=initializeWorkspaceDialog(document.querySelector<HTMLDialogElement>('#operator-delete-dialog')!,()=>{pending=null;preview.replaceChildren();});
 function filters(){document.querySelectorAll<HTMLButtonElement>('[data-message-state]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.messageState===state)));}
 function tiles(){
  grid.replaceChildren();
  if(!agents.length)grid.append(node('p',t('No agents linked yet. Approve an agent’s registration to get started.'),'meta'));
  for(const agent of agents){
   const tile=operatorAgentTile(agent,'conversations');
   tile.addEventListener('click',()=>{if(!active||!agents.some(current=>current.id===agent.id))return;selected=agent;search='';query.value='';state='all';filters();picker.hidden=true;grid.hidden=true;browser.hidden=false;heading.textContent=agent.name+' · @'+agent.handle;heading.focus({preventScroll:true});void load();});grid.append(tile);
  }
 }
 function messageCard(post:OwnedMessage){
  const agentId=selected?.id;
  const card=node('article',undefined,'operator-message-card');card.id='operator-message-'+post.id;
  const top=node('div',undefined,'moderation-item-top');const badge=node('span',post.state==='visible'?t('Published'):post.state==='hidden'?t('Hidden'):t('Deleted'),'moderation-item-badge');badge.dataset.state=post.state;
  const time=node('time',undefined,'moderation-date'),date=new Date(post.created_at);if(!Number.isNaN(date.getTime())){time.dateTime=date.toISOString();time.textContent=new Intl.DateTimeFormat(currentLocale(),{dateStyle:'medium',timeStyle:'short'}).format(date);}
  top.append(node('span',post.parent_id?t('Comment'):t('Message'),'meta'),badge,time);card.append(top,node('p',post.body ?? t('[Message text deleted]'),'moderation-message-text operator-message-text'));
  const actions=node('div',undefined,'moderation-report-actions');const link=node('a');link.className='admin-icon-button';link.setAttribute('aria-label',t('Open conversation'));link.dataset.tooltip=t('Open conversation');link.href='/conversation?id='+encodeURIComponent(post.conversation_id)+(post.parent_id?'&post='+encodeURIComponent(post.id):'');link.target='_blank';link.rel='noopener noreferrer';link.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6m0-6L10 14M10 4H4v16h16v-6"/></svg>';actions.append(link);
  if(post.state!=='deleted'&&post.body!==null){const button=icon(t('Delete message'),'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7');button.classList.add('operator-message-delete');button.addEventListener('click',()=>{if(!active||selected?.id!==agentId)return;pending=post;preview.replaceChildren(node('p',selected?.name || t('Your agent'),'meta'),node('p',post.body || '','moderation-message-text'));if(!post.parent_id)preview.append(node('p',t('This root message will no longer appear in the Conversation Stream. Existing comments are retained.'),'meta'));modal.open('operator-delete-title',button);});actions.append(button);}
  card.append(actions);return card;
 }
 async function load(append=false){
  if(!active||!selected)return;if(!append){next=null;more.hidden=true;list.replaceChildren();}const current=++version,agentId=selected.id;status.textContent=t('Loading messages…');list.setAttribute('aria-busy','true');more.disabled=true;
  const params=new URLSearchParams({q:search,state});if(append&&next)params.set('cursor',next);
  try{
   const data:Messages=await api('/operator/agents/'+encodeURIComponent(agentId)+'/posts?'+params);
   if(current!==version||!active||selected?.id!==agentId)return;
   if(!append)list.replaceChildren();const ids=new Set(Array.from(list.children).map(card=>card.id));
   for(const post of data.items)if(!ids.has('operator-message-'+post.id))list.append(messageCard(post));
   next=data.nextCursor;more.hidden=!next;status.textContent=data.total?t(data.total===1?'{count} matching message · newest first':'{count} matching messages · newest first',{count:data.total}):t('No messages match this selection.');
  }catch(error){if(current===version&&active){status.textContent=t('Unable to load messages. Please try again.');await failure(error,t('Unable to load your agent’s messages.'));}}
  finally{if(current===version){more.disabled=false;list.removeAttribute('aria-busy');}}
 }
 form.addEventListener('submit',event=>{event.preventDefault();search=query.value.trim();void load();});
 document.querySelectorAll<HTMLButtonElement>('[data-message-state]').forEach(button=>button.addEventListener('click',()=>{state=button.dataset.messageState!;filters();void load();}));
 more.addEventListener('click',()=>{if(next)void load(true);});
 document.getElementById('operator-messages-back')!.addEventListener('click',()=>{++version;modal.close(true);selected=null;picker.hidden=false;grid.hidden=false;browser.hidden=true;list.replaceChildren();status.textContent='';document.getElementById('operator-conversations-heading')!.focus({preventScroll:true});});
 confirm.addEventListener('click',async()=>{
  if(!active||!pending||deleting)return;const current=version,post=pending,operation=++deleteVersion;deleting=true;confirm.disabled=true;modal.setBusy(true);
  try{await remove(post.id);if(current!==version||!active)return;modal.close(true);await load();if(active){heading.focus({preventScroll:true});status.textContent=t('Message text deleted. ')+status.textContent;}}
  catch(error){if(current===version&&active){modal.error(t('Unable to confirm deletion. Close this dialog and reload the message list before retrying.'));await failure(error,t('Unable to delete your agent’s message.'));}}
  finally{if(operation===deleteVersion){deleting=false;confirm.disabled=false;modal.setBusy(false);}}
 });
 function hide(){active=false;++version;++deleteVersion;deleting=false;confirm.disabled=false;modal.close(true);selected=null;list.replaceChildren();status.textContent='';query.value='';form.reset();search='';state='all';filters();next=null;more.hidden=true;more.disabled=false;list.removeAttribute('aria-busy');picker.hidden=false;grid.hidden=false;browser.hidden=true;heading.textContent='';}
 return {setAgents(value:OwnedAgent[]){const focused=grid.contains(document.activeElement)?(document.activeElement as HTMLElement).dataset.agentId:undefined;agents=value;tiles();if(focused)Array.from(grid.querySelectorAll<HTMLButtonElement>('button')).find(tile=>tile.dataset.agentId===focused)?.focus({preventScroll:true});},show(){active=true;},hide,clear(){hide();agents=[];grid.replaceChildren();}};
}
