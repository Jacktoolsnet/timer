import {installDialogMock} from './dialog-mock';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {initializeAgentRecovery} from '../src/scripts/agent-recovery';
import {initializeHumanLanguage} from '../src/lib/i18n';
const html=readFileSync(new URL('../dist/operator-recovery/index.html',import.meta.url),'utf8'),tick=()=>new Promise(r=>setTimeout(r,0));
async function fixture(run:(dom:JSDOM,state:any)=>Promise<void>,signedIn=false,lang='en',initial:any=null){
 const dom=new JSDOM(html,{url:'http://localhost/operator-recovery',pretendToBeVisual:true});dom.window.document.documentElement.lang=lang;installDialogMock(dom);
 const state:any={destinations:[],calls:[],pending:initial,signedIn,enabled:false,approvals:false};
 const saved=new Map<string,PropertyDescriptor|undefined>();
 const values={document:dom.window.document,FormData:dom.window.FormData,fetch:async(path:string,options?:RequestInit)=>{
  const body=options?.body?JSON.parse(String(options.body)):undefined;state.calls.push({path,body});let value:any={};
  if(path==='/api/session')value={csrf:'synthetic-csrf',...(signedIn?{operatorId:'fixture'}:{})};
  else if(path==='/api/operator/recovery')value={agents:[{id:'agent',name:'Literal <script>name</script>',handle:'helper',enabled:state.enabled,has_avatar:false},{id:'image-agent',name:'Image Agent',handle:'image_agent',enabled:false,has_avatar:true}],pending:state.approvals};
  else if(path==='/api/operator/recovery/agents/agent'){if(state.failConfig)return new Response(JSON.stringify({error:{code:'UNAUTHORIZED'}}),{status:401});state.enabled=body.enabled;value={ok:true};}
  else if(path==='/api/operator-recovery/status')value=state.pending;
  else if(path==='/api/operator-recovery/start'){if(state.failRecovery)return new Response(JSON.stringify({error:{code:'RECOVERY_UNAVAILABLE'}}),{status:409});state.pending={requestId:'synthetic-request',agentHandle:'helper',newEmail:body.newEmail,expiresAt:new Date(Date.now()+1800000).toISOString(),state:'awaiting_agent',resendAt:null,delivered:false};value={...state.pending,csrf:'pending-csrf'};}
  else if(path==='/api/operator-recovery/verify'){if(state.failCode)return new Response(JSON.stringify({error:{code:'RECOVERY_CODE_INVALID'}}),{status:400});state.pending=null;value={ok:true,csrf:'done-csrf'};}
  else if(path==='/api/operator-recovery/cancel'){state.pending=null;value={csrf:'cancelled'};}
  return new Response(JSON.stringify(value));
 }};
 for(const [key,value] of Object.entries(values)){saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true});}
 try{initializeHumanLanguage(dom.window.document);await initializeAgentRecovery({navigate:url=>state.destinations.push(url)});await run(dom,state);}finally{dom.window.dispatchEvent(new dom.window.Event('pagehide'));dom.window.close();for(const [key,value] of saved){if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key);}}
}
for(const lang of ['en','de','es','fr'])test('recovery setup is explicit, password protected and localized: '+lang,async()=>fixture(async(dom,state)=>{
 const d=dom.window.document;assert.equal(d.getElementById('recovery-manage')!.hidden,false);assert.equal(d.getElementById('recovery-start')!.hidden,true);assert.equal(d.querySelector<HTMLInputElement>('#recovery-enabled')!.checked,false);assert.equal(state.calls.filter((v:any)=>v.body).length,0);
 assert.equal(d.querySelector('#recovery-agent option')!.textContent,'Literal <script>name</script> · @helper');assert.equal(d.querySelector('#recovery-agent script'),null);
 const form=d.querySelector<HTMLFormElement>('#recovery-config')!,password=form.querySelector<HTMLInputElement>('[name=password]')!;password.value='synthetic-password';d.querySelector<HTMLInputElement>('#recovery-enabled')!.checked=true;form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();await tick();assert.equal(state.enabled,true);assert.equal(password.value,'');assert.equal(state.calls.find((v:any)=>v.path.endsWith('/agents/agent')).body.password,'synthetic-password');
 for(const b of d.querySelectorAll('.agent-recovery-card button.admin-icon-button')){assert.equal(b.textContent,'');assert.equal(b.getAttribute('data-tooltip'),b.getAttribute('aria-label'));}
},true,lang));
test('password request grants only a pending view, clears secrets, cancels and resumes without creating another request',async()=>fixture(async(dom,state)=>{
 const d=dom.window.document,form=d.querySelector<HTMLFormElement>('#recovery-start')!;
 for(const [name,value] of Object.entries({handle:'fixture',password:'synthetic-password',agentHandle:'helper',newEmail:'new@example.invalid'}))form.querySelector<HTMLInputElement>('[name='+name+']')!.value=value;
 form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();await tick();
 assert.equal(state.calls.filter((v:any)=>v.path.endsWith('/start')).length,1);assert.equal(form.querySelector<HTMLInputElement>('[name=password]')!.value,'');assert.equal(d.getElementById('recovery-pending')!.hidden,false);assert.equal(d.getElementById('recovery-manage')!.hidden,true);assert.equal(d.querySelector<HTMLInputElement>('#recovery-code')!.disabled,true);assert.equal(d.getElementById('recovery-request-email')!.textContent,'new@example.invalid');assert.equal(state.calls.some((v:any)=>v.path==='/api/operator'),false);
 d.querySelector<HTMLButtonElement>('#recovery-cancel')!.click();await tick();assert.equal(form.hidden,false);assert.equal(d.querySelector<HTMLInputElement>('#recovery-code')!.value,'');
}));

test('resumed email confirmation handles wrong codes then completes without a normal login',async()=>fixture(async(dom,state)=>{
 const d=dom.window.document,form=d.querySelector<HTMLFormElement>('#recovery-email-step')!,code=d.querySelector<HTMLInputElement>('#recovery-code')!;
 assert.equal(form.hidden,false);assert.equal(state.calls.some((v:any)=>v.path.endsWith('/start')),false);assert.equal(d.getElementById('recovery-manage')!.hidden,true);
 state.failCode=true;code.value='012345';code.dispatchEvent(new dom.window.Event('input'));form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();assert.equal(code.value,'');assert.match(d.getElementById('recovery-status')!.textContent!,/incorrect/);assert.equal(form.hidden,false);
 state.failCode=false;code.value='987654';code.dispatchEvent(new dom.window.Event('input'));form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();assert.equal(d.getElementById('recovery-pending')!.hidden,true);assert.equal(d.getElementById('recovery-sign-in')!.hidden,false);assert.equal(d.getElementById('recovery-start')!.hidden,true);assert.equal(state.calls.some((v:any)=>v.path==='/api/login'||v.path==='/api/operator'),false);
},false,'en',{requestId:'resume-request',agentHandle:'helper',newEmail:'new@example.invalid',expiresAt:new Date(Date.now()+600000).toISOString(),state:'awaiting_email',delivered:true,resendAt:null}));

test('recovery request separates guidance from labelled fields and retains the explicit accessible send action',async()=>fixture(async(dom)=>{
 const d=dom.window.document,form=d.querySelector<HTMLFormElement>('#recovery-start')!,description=form.querySelector('.recovery-start-description')!,fields=form.querySelector('.recovery-start-fields')!;
 assert.ok(description.querySelector('svg[aria-hidden=true]'));assert.equal(description.querySelectorAll('ol li').length,3);assert.equal(description.querySelectorAll('input').length,0);assert.equal(fields.querySelectorAll('input[required]').length,4);
 const button=fields.querySelector<HTMLButtonElement>('button[type=submit]')!;assert.equal(button.getAttribute('aria-label'),'Request account recovery');assert.equal(button.dataset.tooltip,button.getAttribute('aria-label'));assert.ok(button.querySelector('svg'));assert.equal(button.form,form);
}));

test('agent handle has a fixed separated @ prefix, excluded from the submitted value',async()=>fixture(async(dom)=>{
 const d=dom.window.document,input=d.querySelector<HTMLInputElement>('#recovery-agent-handle')!,prefix=input.parentElement!.querySelector('.handle-prefix')!;
 assert.equal(prefix.textContent,'@');assert.equal(prefix.getAttribute('aria-hidden'),'true');assert.equal(prefix.hasAttribute('contenteditable'),false);assert.equal(d.querySelector<HTMLLabelElement>('label[for=recovery-agent-handle]')!.control,input);
 input.value='faden';assert.equal(input.checkValidity(),true);assert.equal(new dom.window.FormData(input.form!).get('agentHandle'),'faden');input.value='';assert.equal(prefix.textContent,'@');
}));


test('unavailable recovery is displayed as an error toast rather than inline text',async()=>fixture(async(dom,state)=>{
 const d=dom.window.document,form=d.querySelector<HTMLFormElement>('#recovery-start')!;state.failRecovery=true;
 for(const [name,value] of Object.entries({handle:'fixture',password:'synthetic-password',agentHandle:'helper',newEmail:'new@example.invalid'}))form.querySelector<HTMLInputElement>('[name='+name+']')!.value=value;
 form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();await tick();
 assert.equal(d.getElementById('recovery-status')!.textContent,'');assert.equal(d.querySelector<HTMLElement>('.app-toast')!.dataset.kind,'error');assert.equal(d.querySelector('.app-toast-message')!.textContent,'Recovery could not be completed. Check your details and previous agent authorization.');assert.equal(d.querySelector('#toast-region')!.getAttribute('role'),'alert');assert.equal(form.querySelector<HTMLInputElement>('[name=password]')!.value,'');
 d.querySelector<HTMLButtonElement>('.app-toast-close')!.click();assert.equal(d.querySelector('.app-toast'),null);
}));


test('avatar picker is keyboard accessible, literal, supports image fallback and does not create a draft on selection',async()=>fixture(async(dom,state)=>{
 const d=dom.window.document,trigger=d.querySelector<HTMLButtonElement>('#recovery-agent-trigger')!,list=d.getElementById('recovery-agent-options')!,save=d.querySelector<HTMLButtonElement>('#recovery-header-save')!;
 assert.equal(save.hidden,true);assert.equal(d.getElementById('recovery-header-actions')!.hidden,false);assert.equal(d.getElementById('recovery-header-cancel')!.hidden,false);assert.equal(save.form,d.getElementById('recovery-config'));assert.ok(trigger.textContent!.includes('Literal <script>name</script>'));assert.equal(trigger.querySelector('script'),null);assert.equal(trigger.querySelector('.moderation-author-avatar')!.textContent,'L');
 trigger.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));assert.equal(list.hidden,false);assert.equal(trigger.getAttribute('aria-expanded'),'true');const options=list.querySelectorAll<HTMLButtonElement>('[role=option]');assert.equal(d.activeElement,options[0]);
 options[0].dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));assert.equal(d.activeElement,options[1]);options[1].click();assert.equal(list.hidden,true);assert.equal(d.activeElement,trigger);assert.equal(d.querySelector<HTMLSelectElement>('#recovery-agent')!.value,'image-agent');assert.equal(save.hidden,true);assert.equal(state.calls.filter((v:any)=>v.body).length,0);
 const img=trigger.querySelector('img')!;assert.equal(img.getAttribute('src'),'/api/agents/image-agent/avatar');img.dispatchEvent(new dom.window.Event('error'));assert.equal(trigger.querySelector('img'),null);assert.equal(trigger.querySelector('.moderation-author-avatar')!.textContent,'I');
},true));

test('save only appears for a permission change, failed save preserves the draft, and switching agents prompts before discarding',async()=>fixture(async(dom,state)=>{
 const d=dom.window.document,enabled=d.querySelector<HTMLInputElement>('#recovery-enabled')!,save=d.querySelector<HTMLButtonElement>('#recovery-header-save')!,form=d.querySelector<HTMLFormElement>('#recovery-config')!;
 assert.equal(save.hidden,true);enabled.checked=true;enabled.dispatchEvent(new dom.window.Event('change'));assert.equal(save.hidden,false);enabled.checked=false;enabled.dispatchEvent(new dom.window.Event('change'));assert.equal(save.hidden,true);
 enabled.checked=true;enabled.dispatchEvent(new dom.window.Event('change'));d.querySelector<HTMLButtonElement>('#recovery-agent-trigger')!.click();d.querySelectorAll<HTMLButtonElement>('#recovery-agent-options [role=option]')[1].click();assert.equal(d.querySelector<HTMLDialogElement>('#operator-unsaved-dialog')!.open,true);assert.equal(d.querySelector<HTMLSelectElement>('#recovery-agent')!.value,'agent');d.querySelector<HTMLButtonElement>('[data-dialog-close]')!.click();
 state.failConfig=true;form.querySelector<HTMLInputElement>('[name=password]')!.value='synthetic-password';form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();await tick();assert.equal(save.hidden,false);assert.equal(enabled.checked,true);assert.deepEqual(state.destinations,[]);state.failConfig=false;
 form.querySelector<HTMLInputElement>('[name=password]')!.value='synthetic-password';form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();await tick();assert.equal(state.enabled,true);assert.equal(save.hidden,true);assert.equal(form.querySelector<HTMLInputElement>('[name=password]')!.value,'');
 assert.equal(form.querySelector('button[type=submit]'),null);assert.ok(save.closest('body > header'));assert.deepEqual(state.destinations,['/operator?lang=en#account']);
},true));


test('signed-in recovery management separates explanation and settings without moving header actions',async()=>fixture(async(dom)=>{
 const d=dom.window.document,manage=d.getElementById('recovery-manage')!,description=manage.querySelector('.recovery-start-description')!,fields=manage.querySelector('.recovery-start-fields')!;
 assert.ok(description.querySelector('.recovery-illustration'));assert.equal(description.querySelector('input,select,form'),null);assert.ok(fields.contains(d.getElementById('recovery-config')));assert.ok(fields.contains(d.getElementById('recovery-no-agents')));assert.ok(fields.contains(d.getElementById('recovery-cancel-active')));assert.ok(d.getElementById('recovery-header-save')!.closest('body > header'));
},true));
