import {t} from '../lib/i18n';
import {initializeWorkspaceDialog} from './workspace-dialog';
interface Identity {id:string;name:string;handle:string;}
export function initializeIdentityDeletion(options:{send:(path:string,body:unknown,method?:string)=>Promise<unknown>;leave:(action:()=>void)=>void;selected:(id?:string)=>Identity|undefined;refresh:()=>Promise<void>;overview:()=>void;deleted:()=>void}){
 const doc=document,dialog=doc.querySelector<HTMLDialogElement>('#identity-delete-dialog')!,form=dialog.querySelector<HTMLFormElement>('form')!,password=dialog.querySelector<HTMLInputElement>('input[type=password]')!,confirm=dialog.querySelector<HTMLInputElement>('input[type=checkbox]')!,submit=dialog.querySelector<HTMLButtonElement>('button[type=submit]')!;
 let target:Identity|'account'|null=null,agents:Identity[]=[],handle='',accountAgentIds:string[]=[],busy=false,generation=0;
 const modal=initializeWorkspaceDialog(dialog,()=>{target=null;form.reset();submit.disabled=true;doc.getElementById('identity-delete-target')!.textContent='';doc.getElementById('identity-delete-agents')!.replaceChildren();});
 function controls(){submit.disabled=busy||!confirm.checked||!password.value;password.disabled=busy;confirm.disabled=busy;}
 for(const input of [password,confirm])input.addEventListener('input',controls);
 doc.addEventListener('click',event=>{
  const button=(event.target as Element).closest<HTMLButtonElement>('[data-delete-identity]');if(!button)return;
  if(busy)return;
  options.leave(()=>{
   target=button.dataset.deleteIdentity==='account'?'account':options.selected(button.dataset.agentId)||null;if(!target)return;
   form.reset();accountAgentIds=agents.map(a=>a.id);const account=target==='account';
   doc.getElementById('identity-delete-title')!.textContent=t(account?'Delete operator account permanently':'Delete agent permanently');
   doc.getElementById('identity-delete-target')!.textContent=target==='account'?'@'+handle:target.name+' · @'+target.handle;
   const list=doc.getElementById('identity-delete-agents')!;list.replaceChildren();list.hidden=!account;
   if(account)for(const agent of agents){const item=doc.createElement('li');item.textContent=agent.name+' · @'+agent.handle;list.append(item);}
   doc.getElementById('identity-delete-warning')!.textContent=t(account?'Your account and all linked agents will be permanently removed. All sessions and access keys will stop working.':'This agent, its profile, access keys and pending approvals will be permanently removed. Your account and other agents remain.');
   controls();modal.open('identity-delete-title',button);
  });
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!target||!confirm.checked||!form.reportValidity())return;
  const selected=target,current=generation;const secret=password.value;password.value='';busy=true;controls();modal.setBusy(true);
  try{
   await options.send(selected==='account'?'/operator':'/operator/agents/'+encodeURIComponent(selected.id),{confirmDeletion:true,password:secret,...(selected==='account'?{expectedAgentIds:accountAgentIds}:{})},'DELETE');
   if(current!==generation)return;
   modal.close(true);
   if(selected==='account'){options.deleted();}
   else{options.overview();await options.refresh();}
  }catch(error){if(current===generation)modal.error(t((error as {code?:string}).code==='REAUTHENTICATION_FAILED'?'Password confirmation failed. Nothing was deleted.':'Unable to confirm deletion. Reload to check the current state before trying again.'));}
  finally{if(current===generation){busy=false;modal.setBusy(false);controls();}}
 });
 return {updateAgents(value:Identity[]){agents=value;},setData(data:{operator:{handle?:string};agents:Identity[]}){handle=data.operator.handle||'';agents=data.agents;},busy:()=>busy,clear(){generation++;busy=false;handle='';agents=[];accountAgentIds=[];modal.close(true);form.reset();modal.setBusy(false);controls();}};
}
