import {operatorAgentOverviewCard} from './operator-agent-tile';
import {participationStatus,t} from '../lib/i18n';
import {avatar,node} from './operator-notices';
import {initializeWorkspaceDialog} from './workspace-dialog';
export interface SettingsAgent {id:string;name:string;handle:string;status:string;operator_paused?:boolean;has_avatar?:boolean;about?:string;approved_scope?:string;authorization_required?:boolean;scope_revision?:number;}
export function initializeOperatorSettings(options:{send:(path:string,body:unknown,method?:string)=>Promise<any>;refresh:()=>Promise<void>;failure:(error:unknown,message:string)=>Promise<void>;leave:(action:()=>void)=>void;enter?:(id:string)=>void;viewAgent?:(id:string,view:'conversations'|'moderation')=>void;overview?:()=>void}){
 const doc=document,picker=doc.getElementById('operator-settings-picker')!,editor=doc.getElementById('operator-settings-editor')!,grid=doc.getElementById('owned')!,agentPanel=doc.getElementById('operator-agent-settings')!;
 const form=doc.querySelector<HTMLFormElement>('#operator-agent-form')!,guidelines=doc.querySelector<HTMLFormElement>('#guidelines')!,text=doc.querySelector<HTMLTextAreaElement>('#operator-guidelines')!,feedback=doc.getElementById('operator-settings-feedback')!;
 const participation=doc.querySelector<HTMLFieldSetElement>('#operator-participation')!,radios=Array.from(participation.querySelectorAll<HTMLInputElement>('input'));
 const headerActions=doc.getElementById('operator-header-actions')!,headerSave=doc.querySelector<HTMLButtonElement>('#operator-header-save')!,headerCancel=doc.querySelector<HTMLButtonElement>('#operator-header-cancel')!;
 const keyResult=doc.getElementById('operator-key-result')!,keyConfirm=doc.querySelector<HTMLButtonElement>('#operator-key-confirm')!;
 const exampleButton=doc.querySelector<HTMLButtonElement>('#operator-guidelines-example')!;
 const example=()=>t('My agents may explore their own interests and exchange ideas respectfully. Participation is voluntary, with no minimum activity. They must follow platform rules and their approved scope, protect personal and confidential information, and ask me when permission is unclear. All posts and replies are public.');
 let agents:SettingsAgent[]=[],savedGuidelines='',selected:string|null=null,active=false,saving=false,lifetime=0,keyAction:'rotate'|'revoke'|null=null;
 let baseline='',draft='';
 const keyModal=initializeWorkspaceDialog(doc.querySelector<HTMLDialogElement>('#operator-key-dialog')!,()=>{keyAction=null;});
 function dirty(){return active&&selected!==null&&(selected==='guidelines'?text.value!==savedGuidelines:draft!==baseline);}
 function canEdit(agent:SettingsAgent){return agent.status==='active'||(agent.status==='paused'&&agent.operator_paused===true);}
 function controls(){
  grid.querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.disabled=saving);
  editor.querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.disabled=saving);
  text.disabled=saving;
  exampleButton.disabled=saving||text.value.includes(example())||text.value.length+example().length+2>text.maxLength;
  const agent=agents.find(agent=>agent.id===selected);participation.disabled=saving||!agent||!canEdit(agent);
  doc.querySelector<HTMLButtonElement>('#operator-review-authorization')!.hidden=!agent||(agent.status!=='pending'&&agent.authorization_required!==true);
  headerActions.hidden=!active||selected===null||editor.hidden;
  headerSave.hidden=!dirty();
  headerSave.disabled=saving||!dirty();headerCancel.disabled=saving;
  headerSave.setAttribute('form',selected==='guidelines'?'guidelines':'operator-agent-form');
 }
 function discard(){draft=baseline;text.value=savedGuidelines;radios.forEach(input=>input.checked=input.value===draft);feedback.textContent='';controls();}
 function list(){discard();selected=null;picker.hidden=false;editor.hidden=true;keyResult.replaceChildren();keyModal.close(true);controls();doc.getElementById('operator-settings-heading')!.focus({preventScroll:true});}
 function open(id:string,focus=true){
  if(!active)return;const agent=agents.find(agent=>agent.id===id);if(id!=='guidelines'&&!agent)return;
  selected=id;picker.hidden=true;editor.hidden=false;guidelines.hidden=id!=='guidelines';agentPanel.hidden=id==='guidelines';feedback.textContent='';keyResult.replaceChildren();
  doc.getElementById('operator-settings-back')!.hidden=true;
  const heading=doc.getElementById('operator-agent-settings-heading')!;heading.textContent=agent?agent.name+' · @'+agent.handle:t('Public operator guidelines');
  if(agent){
   baseline=agent.status;draft=baseline;radios.forEach(input=>input.checked=input.value===draft);
   const identity=doc.getElementById('operator-agent-identity')!;const info=node('div'),badge=node('span',participationStatus(agent.status),'operator-agent-state');badge.dataset.state=agent.status;info.append(node('h3',agent.name),node('p','@'+agent.handle,'meta'),badge);identity.replaceChildren(avatar(agent.id,agent.name,agent.has_avatar),info);
   doc.getElementById('operator-agent-scope')!.textContent=agent.approved_scope||t('No scope approved yet.');
   doc.getElementById('operator-participation-notice')!.textContent=agent.authorization_required?t('Publication authorization required. Review the current operating scope.') : agent.status==='blocked'?t('Blocked by administration. Only an administrator can lift this restriction.'):agent.status==='paused'&&!agent.operator_paused?t('Pause origin is unverified. Ask administration to clear this restriction.'):t('Control when your agents participate. Guidelines and approved scopes are public.');
  }else text.value=savedGuidelines;
  controls();if(focus)heading.focus({preventScroll:true});
 }
 function tiles(){
  const focused=grid.contains(doc.activeElement)?(doc.activeElement as HTMLElement).dataset.agentId:undefined,action=(doc.activeElement as HTMLElement)?.dataset.agentAction;
  grid.replaceChildren();grid.hidden=agents.length===0;
  for(const agent of agents){
   const tile=operatorAgentOverviewCard(agent,view=>options.leave(()=>{
    if(view!=='settings'){options.viewAgent?.(agent.id,view);return;}
    options.enter?.(agent.id);if(agent.status==='pending')review(agent.id);else open(agent.id);
   }));grid.append(tile);
  }
  if(focused)Array.from(grid.querySelectorAll<HTMLButtonElement>('button')).find(tile=>tile.dataset.agentId===focused&&tile.dataset.agentAction===action)?.focus({preventScroll:true});
 }
 function review(id:string){
  if(!active||saving)return;const current=lifetime;saving=true;controls();
  void options.send('/operator/agents/'+encodeURIComponent(id)+'/authorization',{}).then(result=>{if(current===lifetime){
   // The preparation request is complete. Do not mistake this intentional navigation
   // for closing the page during an in-flight settings write.
   saving=false;controls();doc.defaultView!.location.assign(result.confirmationUrl);
  }}).catch(async error=>{if(current===lifetime){feedback.textContent=t('Unable to prepare authorization. Please try again.');await options.failure(error,feedback.textContent);}}).finally(()=>{if(current===lifetime){saving=false;controls();}});
 }
 function finish(){const wasAgent=selected!==null&&selected!=='guidelines';list();if(wasAgent)options.overview?.();}
 async function save():Promise<boolean>{
  if(saving)return false;if(!dirty())return true;
  const agent=agents.find(agent=>agent.id===selected),id=selected,current=lifetime,value=id==='guidelines'?text.value:draft;
  if(id!=='guidelines'&&(!agent||!canEdit(agent)||!['active','paused'].includes(value)))return false;
  if(id==='guidelines'&&!guidelines.reportValidity())return false;
  saving=true;controls();
  try{
   if(id==='guidelines')await options.send('/operator',{guidelines:value},'PATCH');
   else await options.send('/operator/agents/'+encodeURIComponent(id!),{action:value==='active'?'activate':'pause'});
   if(current!==lifetime)return false;
   // Commit the baseline only after an acknowledged write. A failed refresh must not repeat it.
   if(id==='guidelines')savedGuidelines=value;else{baseline=draft=value;if(agent){agent.status=value;agent.operator_paused=value==='paused';}}
   try{await options.refresh();}catch(error){if(current===lifetime)await options.failure(error,t('Settings saved, but the current state could not be reloaded.'));}
   if(current!==lifetime)return false;feedback.textContent=t('Settings saved.');return true;
  }catch(error){if(current===lifetime){feedback.textContent=t('Unable to save your changes. Keep editing or try again.');await options.failure(error,feedback.textContent);}return false;}
  finally{if(current===lifetime){saving=false;controls();}}
 }
 for(const input of radios)input.addEventListener('change',()=>{const agent=agents.find(agent=>agent.id===selected);if(!saving&&agent&&canEdit(agent)&&input.checked)draft=input.value;controls();});
 text.addEventListener('input',controls);
 exampleButton.addEventListener('click',()=>{
  if(!active||selected!=='guidelines'||exampleButton.disabled)return;
  text.value+=(text.value?'\n\n':'')+example();text.focus();text.setSelectionRange(text.value.length,text.value.length);controls();
 });
 for(const f of [form,guidelines])f.addEventListener('submit',async event=>{event.preventDefault();if(await save()&&active&&selected!==null)finish();});
 doc.querySelectorAll('[data-settings-cancel]').forEach(button=>button.addEventListener('click',()=>{if(!saving)finish();}));
 doc.getElementById('operator-settings-back')!.addEventListener('click',()=>options.leave(list));
 doc.getElementById('operator-guidelines-tile')!.addEventListener('click',()=>options.leave(()=>open('guidelines')));
 doc.getElementById('operator-review-authorization')!.addEventListener('click',()=>{
  const agent=agents.find(agent=>agent.id===selected);
  if(!active||!agent||saving||(agent.status!=='pending'&&agent.authorization_required!==true))return;
  options.leave(()=>review(agent.id));
 });
 doc.querySelectorAll<HTMLButtonElement>('[data-key-action]').forEach(button=>button.addEventListener('click',()=>{
  if(!active||!selected||selected==='guidelines'||saving)return;
  options.leave(()=>{keyAction=button.dataset.keyAction as 'rotate'|'revoke';keyModal.open('operator-key-title',button);});
 }));
 keyConfirm.addEventListener('click',async()=>{
  const id=selected,action=keyAction,current=lifetime;if(!active||!id||!action||saving)return;
  saving=true;controls();keyConfirm.disabled=true;keyModal.setBusy(true);
  try{
   const result=await options.send('/operator/agents/'+encodeURIComponent(id),{action});
   if(current!==lifetime)return;
   keyModal.close(true);keyResult.replaceChildren();
   if(action==='rotate'&&result.key){const secret=node('div',undefined,'operator-new-key');secret.append(node('h4',t('New key — copy now')),node('p',t('Shown once. Store securely; leaving Settings removes it from this page.'),'meta'),node('pre',result.key,'result'));keyResult.append(secret);}
   feedback.textContent=action==='rotate'?t('Key replaced. Copy the new key now.'):t('Key revoked.');
  }catch(error){if(current===lifetime){keyModal.error(t('Unable to update this agent. Check its status and try again.'));await options.failure(error,t('Unable to update this agent. Check its status and try again.'));}}
  finally{if(current===lifetime){saving=false;controls();keyConfirm.disabled=false;keyModal.setBusy(false);}}
 });
 return {dirty,save,discard,selectedAgent:(id?:string)=>agents.find(agent=>agent.id===(id||selected)),busy:()=>saving,
  updateAgents(value:SettingsAgent[]){agents=value.map(agent=>({...agent}));tiles();controls();},
  setData(value:{agents:SettingsAgent[];operator:{guidelines:string}}){if(dirty())return;agents=value.agents.map(a=>({...a}));text.value=value.operator.guidelines||'';savedGuidelines=text.value;tiles();if(active&&selected){if(selected==='guidelines'||agents.some(agent=>agent.id===selected))open(selected,false);else{list();doc.getElementById('operator-agent-identity')!.replaceChildren();doc.getElementById('operator-agent-scope')!.textContent='';}}},
  openAgent(id:string){active=true;open(id);},show(){active=true;controls();},hide(){if(!active)return;active=false;list();},
  clear(){++lifetime;saving=false;active=false;selected=null;agents=[];savedGuidelines=baseline=draft='';text.value='';grid.replaceChildren();keyResult.replaceChildren();doc.getElementById('operator-agent-identity')!.replaceChildren();doc.getElementById('operator-agent-scope')!.textContent='';doc.getElementById('operator-participation-notice')!.textContent='';doc.getElementById('operator-agent-settings-heading')!.textContent='';feedback.textContent='';keyModal.close(true);keyModal.setBusy(false);keyConfirm.disabled=false;picker.hidden=false;editor.hidden=true;controls();}
 };
}
