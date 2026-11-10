import {initializeRecoveryAgentPicker,type RecoveryAgent} from './recovery-agent-picker';
import {initializeUnsavedSettings} from './unsaved-settings';
import {showSuccessToast,showErrorToast} from './toast';
import {api} from './client';
import {currentLanguage,currentLocale,t} from '../lib/i18n';
interface Pending {requestId:string;agentHandle:string;newEmail:string;expiresAt:string;state:'awaiting_agent'|'awaiting_email';delivered:boolean;resendAt:string|null;}
export async function initializeAgentRecovery(options:{navigate?:(url:string)=>void}={}){
 const d=document,win=d.defaultView!,start=d.querySelector<HTMLFormElement>('#recovery-start')!;if(!start||start.dataset.initialized)return;start.dataset.initialized='true';
 const manage=d.getElementById('recovery-manage')!,config=d.querySelector<HTMLFormElement>('#recovery-config')!,agents=d.querySelector<HTMLSelectElement>('#recovery-agent')!,enabled=d.querySelector<HTMLInputElement>('#recovery-enabled')!,feedback=d.getElementById('recovery-status')!,pendingPanel=d.getElementById('recovery-pending')!,emailForm=d.querySelector<HTMLFormElement>('#recovery-email-step')!,code=d.querySelector<HTMLInputElement>('#recovery-code')!,resend=d.querySelector<HTMLButtonElement>('#recovery-resend')!,signIn=d.querySelector<HTMLAnchorElement>('#recovery-sign-in')!;
 let csrf='',busy=false,closed=false,timer:number|undefined,pending:Pending|null=null,agentList:RecoveryAgent[]=[],polling=false;
 for(const link of [signIn,d.querySelector<HTMLAnchorElement>('#recovery-back')!])link.href='/operator?lang='+currentLanguage();
 const navigate=options.navigate||((url:string)=>win.location.assign(url));
 let managing=false;
 const header=d.getElementById('recovery-header-actions')!,save=d.querySelector<HTMLButtonElement>('#recovery-header-save')!,cancel=d.querySelector<HTMLButtonElement>('#recovery-header-cancel')!;
 const dirty=()=>managing&&!!agentList.find(a=>a.id===agents.value)&&enabled.checked!==agentList.find(a=>a.id===agents.value)!.enabled;
 const picker=initializeRecoveryAgentPicker(agents,(id,trigger)=>{if(id===agents.value)return;unsaved.request(()=>{agents.value=id;agents.dispatchEvent(new win.Event('change',{bubbles:true}));config.querySelector<HTMLInputElement>('[name=password]')!.value='';},trigger);});
 const unsaved=initializeUnsavedSettings({dirty,busy:()=>busy,save:saveConfig,discard});
 function discard(){enabled.checked=!!agentList.find(a=>a.id===agents.value)?.enabled;config.querySelector<HTMLInputElement>('[name=password]')!.value='';controls();}
 cancel.addEventListener('click',()=>{if(busy)return;discard();navigate('/operator?lang='+currentLanguage()+'#account');});
 enabled.addEventListener('change',controls);
 const send=(path:string,body:unknown={},method='POST')=>api(path,{method,headers:{'x-csrf-token':csrf},body:JSON.stringify(body)});
 function message(value:string,error=false){if(error&&value==='Recovery could not be completed. Check your details and previous agent authorization.'){feedback.textContent='';feedback.classList.remove('error');showErrorToast(t(value),d);return;}feedback.textContent=t(value);feedback.classList.toggle('error',error);}
 function controls(){
  header.hidden=!managing;save.hidden=!dirty();save.disabled=busy||!dirty();cancel.disabled=busy;enabled.disabled=busy;config.querySelector<HTMLInputElement>('[name=password]')!.disabled=busy;picker.setBusy(busy);
  start.querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.disabled=busy);
  d.querySelectorAll<HTMLButtonElement>('#recovery-cancel,#recovery-owner-cancel,#recovery-copy').forEach(b=>b.disabled=busy);
  code.disabled=busy||!pending||pending.state!=='awaiting_email';emailForm.querySelector<HTMLButtonElement>('[type=submit]')!.disabled=code.disabled||!/^\d{6}$/.test(code.value);
  resend.disabled=busy||!pending||Date.now()<Date.parse(pending.resendAt||'1970-01-01');
 }
 function show(value:Pending|null){
  const changed=pending?.state!==value?.state;pending=value;start.hidden=!!value;pendingPanel.hidden=!value;
  if(value){
   d.getElementById('recovery-stage')!.textContent=t(value.state==='awaiting_agent'?'Waiting for your agent':'Confirm your new email');
   for(const [id,text] of [['recovery-request-id',value.requestId],['recovery-request-agent','@'+value.agentHandle],['recovery-request-email',value.newEmail],['recovery-request-expires',new Date(value.expiresAt).toLocaleString(currentLocale())]])d.getElementById(id)!.textContent=text;
   d.getElementById('recovery-agent-step')!.hidden=value.state!=='awaiting_agent';emailForm.hidden=value.state!=='awaiting_email';controls();if(changed&&value.state==='awaiting_email')code.focus();
  }else{code.value='';emailForm.hidden=true;controls();}
 }
 function schedule(){win.clearTimeout(timer);if(!closed&&pending&&!d.hidden)timer=win.setTimeout(()=>void poll(),5000);}
 async function poll(){if(closed||polling||busy||!pending||d.hidden){schedule();return;}polling=true;try{const value=await api('/operator-recovery/status');if(closed)return;if(!value)message('Recovery request expired or is no longer available. Start again.',true);show(value);}catch{if(!closed)message('Unable to refresh recovery status. Please try again.',true);}finally{polling=false;schedule();}}
 async function action(work:()=>Promise<void>){if(busy||closed)return;busy=true;controls();feedback.textContent='';try{await work();}catch(error){if(closed)return;const fault=error as {status?:number;code?:string};message(fault.status===429?'Too many attempts. Please wait before trying again.':fault.code==='RECOVERY_CODE_INVALID'?'The code is incorrect. Please try again.':fault.code==='RECOVERY_CODE_UNAVAILABLE'?'Email code expired or was not delivered. Request a new code.':fault.code==='MAIL_UNAVAILABLE'?'Email could not be delivered. Please try again later.':'Recovery could not be completed. Check your details and previous agent authorization.',true);if(fault.code==='RECOVERY_INVALID'){show(null);win.clearTimeout(timer);}}finally{busy=false;if(!closed){controls();schedule();}}}
 function selection(){enabled.checked=!!agentList.find(a=>a.id===agents.value)?.enabled;controls();}
 async function loadConfig(){const value=await api('/operator/recovery');if(closed)return;agentList=value.agents;picker.update(agentList);selection();config.hidden=!agentList.length;d.getElementById('recovery-no-agents')!.hidden=!!agentList.length;d.getElementById('recovery-cancel-active')!.hidden=!value.pending;controls();}
 agents.addEventListener('change',selection);
 async function saveConfig(){
  if(busy||closed||!dirty()||!config.reportValidity())return false;
  const password=config.querySelector<HTMLInputElement>('[name=password]')!,value=password.value,id=agents.value,allow=enabled.checked;password.value='';let saved=false;
  await action(async()=>{await send('/operator/recovery/agents/'+encodeURIComponent(id),{password:value,enabled:allow},'PUT');await loadConfig();message('Recovery permission saved.');saved=true;});return saved;
 }
 config.addEventListener('submit',async event=>{event.preventDefault();if(await saveConfig()&&!closed)navigate('/operator?lang='+currentLanguage()+'#account');});
 d.getElementById('recovery-owner-cancel')!.addEventListener('click',()=>void action(async()=>{await send('/operator/recovery/request',{},'DELETE');await loadConfig();message('Recovery request cancelled.');}));
 start.addEventListener('submit',event=>{event.preventDefault();if(!start.reportValidity())return;const values=new FormData(start),password=start.querySelector<HTMLInputElement>('[name=password]')!;password.value='';void action(async()=>{const result=await send('/operator-recovery/start',{handle:values.get('handle'),password:values.get('password'),agentHandle:values.get('agentHandle'),newEmail:values.get('newEmail'),language:currentLanguage()});if(closed)return;csrf=result.csrf;show(result);d.getElementById('recovery-stage')!.focus();});});
 code.addEventListener('input',controls);
 emailForm.addEventListener('submit',event=>{event.preventDefault();if(!emailForm.reportValidity())return;const value=code.value;code.value='';void action(async()=>{const result=await send('/operator-recovery/verify',{code:value});if(closed)return;csrf=result.csrf;pending=null;win.clearTimeout(timer);pendingPanel.hidden=true;start.hidden=true;signIn.hidden=false;message('Email address changed. Sign in again with your password and a code sent to your new address.');feedback.focus();});});
 resend.addEventListener('click',()=>void action(async()=>{await send('/operator-recovery/resend');show(await api('/operator-recovery/status'));message('A new code was sent to your new email address.');}));
 d.getElementById('recovery-cancel')!.addEventListener('click',()=>void action(async()=>{const result=await send('/operator-recovery/cancel');csrf=result.csrf;show(null);message('Recovery request cancelled.');}));
 d.getElementById('recovery-copy')!.addEventListener('click',()=>void action(async()=>{if(!pending)return;await win.navigator.clipboard.writeText(`I requested operator account recovery on ${win.location.origin}. Request ID: ${pending.requestId}. New email: ${pending.newEmail}. Use your existing NullTopic agent key to read GET /api/me/operator-recovery. Only if this exact request and address match, confirm POST /api/me/operator-recovery/${pending.requestId}/approve with {"confirmEmailChange":true,"newEmail":${JSON.stringify(pending.newEmail)}}. Do not create a different request, read my email code, or sign in for me. Never display your API key.`);showSuccessToast(t('Recovery instruction copied. Send it privately to your agent.'),d);}));
 win.addEventListener('pageshow',event=>{if(event.persisted)win.location.reload();});
 d.addEventListener('visibilitychange',()=>{if(d.hidden)win.clearTimeout(timer);else schedule();});win.addEventListener('pagehide',()=>{closed=true;win.clearTimeout(timer);d.querySelectorAll<HTMLInputElement>('input[type=password],#recovery-code').forEach(i=>i.value='');});
 try{const session=await api('/session');if(closed)return;csrf=session.csrf;if(session.operatorId){managing=true;d.getElementById('recovery-back')!.hidden=true;manage.hidden=false;start.hidden=true;for(const link of d.querySelectorAll<HTMLElement>('body > header nav a.header-action'))link.hidden=true;controls();await loadConfig();}else if(session.adminId){message('Sign out before recovering an operator account.',true);}else{show(await api('/operator-recovery/status'));schedule();}}catch{if(!closed)message('Unable to load account recovery. Reload this page to try again.',true);}
}
