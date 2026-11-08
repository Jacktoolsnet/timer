import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {initializeOperator} from '../src/scripts/operator';
import {installDialogMock} from './dialog-mock';
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function fixture(run:(dom:JSDOM,requests:{path:string;body:any}[],state:{fail:boolean;wait:Promise<void>|null;expire:boolean;failRefresh:boolean;refreshFailed:boolean})=>Promise<void>,initialGuidelines='Original guidelines',empty=false){
 const dom=new JSDOM(readFileSync(new URL('../dist/operator/index.html',import.meta.url),'utf8'),{url:'http://localhost/operator'});installDialogMock(dom);dom.window.scrollTo=()=>{};
 const state={fail:false,wait:null as Promise<void>|null,expire:false,failRefresh:false,refreshFailed:false},requests:{path:string;body:any}[]=[];
 let signedIn=true,guidelines=initialGuidelines;const agents=[{id:'agent-a',name:'Settings',handle:'first',status:'active',operator_paused:false,approved_scope:'Original public scope'},{id:'agent-b',name:'Second agent',handle:'second',status:'blocked',operator_paused:true,approved_scope:'Another scope'}];
 const values={document:dom.window.document,location:dom.window.location,FormData:dom.window.FormData,fetch:async(path:string,init?:RequestInit)=>{
  const body=init?.body?JSON.parse(String(init.body)):undefined;requests.push({path,body});
  if(path==='/api/session')return new Response(JSON.stringify({csrf:'fixture',...(signedIn?{operatorId:'owner'}:{})}));
  if(path==='/api/logout'){signedIn=false;return new Response('{}');}
  if(path==='/api/operator'&&init?.method==='PATCH'){
   if(state.wait)await state.wait;
   if(state.expire){signedIn=false;return new Response('{}',{status:401});}
   if(state.fail)return new Response('{}',{status:409});guidelines=body.guidelines;state.refreshFailed=state.failRefresh;return new Response('{}');
  }
  if((path==='/api/operator'||path.startsWith('/api/operator?'))&&state.refreshFailed)return new Response('{}',{status:503});
  if(path==='/api/operator'||path.startsWith('/api/operator?'))return new Response(JSON.stringify({operator:{handle:'fixture_operator',guidelines},agents:empty?[]:agents,notices:[],review_requests:[]}));
  if(path.endsWith('/authorization'))return new Response(JSON.stringify({confirmationUrl:'http://localhost/operator?confirmation=synthetic'}));
  if(path.startsWith('/api/operator/agents/')){
   if(state.wait)await state.wait;
   if(state.fail)return new Response('{}',{status:403});
   const agent=agents.find(a=>path.endsWith(a.id))!;
   if(body.action==='pause'){agent.status='paused';agent.operator_paused=true;}else if(body.action==='activate'){agent.status='active';agent.operator_paused=false;}
   return new Response(JSON.stringify(body.action==='rotate'?{key:'synthetic-one-time-key'}:{ok:true}));
  }
  throw Error('Unexpected mocked request');
 }};
 const originals=Object.keys(values).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)] as const);for(const [key,value] of Object.entries(values))Object.defineProperty(globalThis,key,{configurable:true,value});
 try{await initializeOperator();await run(dom,requests,state);}finally{await tick();for(const [key,descriptor] of originals)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);dom.window.close();}
}
function click(dom:JSDOM,selector:string){const element=dom.window.document.querySelector<HTMLButtonElement>(selector);assert.ok(element,selector);element.click();}
function settings(dom:JSDOM){click(dom,'#operator-settings-tile');}
function openAgent(dom:JSDOM){settings(dom);click(dom,'[data-agent-id="agent-a"].operator-settings-agent');}
function openGuidelines(dom:JSDOM){settings(dom);click(dom,'#operator-guidelines-tile');}
function changeGuidelines(dom:JSDOM,value='Changed guidelines'){const input=dom.window.document.querySelector<HTMLTextAreaElement>('#operator-guidelines')!;input.value=value;input.dispatchEvent(new dom.window.Event('input'));}
function submit(dom:JSDOM,id:string){dom.window.document.querySelector(id)!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));}
const writes=(requests:{path:string;body:any}[])=>requests.filter(r=>r.body!==undefined);

test('settings starts with agent tiles and a separate shared-guidelines tile; agent state is saved explicitly',async()=>fixture(async(dom,requests)=>{
 const doc=dom.window.document;settings(dom);assert.equal(doc.querySelectorAll('.operator-settings-agent').length,2);assert.equal(doc.querySelector<HTMLElement>('#operator-settings-editor')!.hidden,true);
 click(dom,'[data-agent-id="agent-a"].operator-settings-agent');assert.match(doc.querySelector('#operator-agent-settings-heading')!.textContent!,/Settings.*first/);assert.equal(doc.querySelector('#operator-agent-scope')!.textContent,'Original public scope');
 click(dom,'input[name=participation][value=paused]');assert.equal(writes(requests).length,0);assert.equal(doc.querySelector<HTMLButtonElement>('#operator-header-save')!.disabled,false);
 submit(dom,'#operator-agent-form');await tick();await tick();assert.deepEqual(writes(requests).map(r=>r.body),[{action:'pause'}]);assert.equal(doc.querySelector<HTMLInputElement>('input[value=paused]')!.checked,true);assert.equal(doc.querySelector<HTMLButtonElement>('#operator-header-save')!.disabled,true);assert.equal(doc.querySelector<HTMLElement>('#operator-settings-editor')!.hidden,true);
}));

test('Cancel discards agent and shared drafts without requests; blocked agents cannot be resumed',async()=>fixture(async(dom,requests)=>{
 const doc=dom.window.document;openAgent(dom);click(dom,'input[value=paused]');click(dom,'#operator-header-cancel');assert.equal(doc.querySelector<HTMLElement>('#operator-settings-picker')!.hidden,false);click(dom,'[data-agent-id="agent-a"].operator-settings-agent');assert.equal(doc.querySelector<HTMLInputElement>('input[value=active]')!.checked,true);
 click(dom,'#operator-settings-back');click(dom,'[data-agent-id="agent-b"].operator-settings-agent');assert.equal(doc.querySelector('input[value=active]')!.matches(':disabled'),true);submit(dom,'#operator-agent-form');assert.equal(writes(requests).length,0);
 click(dom,'#operator-settings-back');click(dom,'#operator-guidelines-tile');changeGuidelines(dom);click(dom,'#operator-header-cancel');click(dom,'#operator-guidelines-tile');assert.equal(doc.querySelector<HTMLTextAreaElement>('#operator-guidelines')!.value,'Original guidelines');assert.equal(writes(requests).length,0);
}));

test('leaving prompts Save / Discard / Keep editing; drafts are untouched by Escape and failed saves',async()=>fixture(async(dom,requests,state)=>{
 const doc=dom.window.document;openGuidelines(dom);changeGuidelines(dom);
 click(dom,'#operator-settings-back');const dialog=doc.querySelector<HTMLDialogElement>('#operator-unsaved-dialog')!;assert.equal(dialog.open,true);assert.equal(doc.querySelector<HTMLElement>('#operator-settings-editor')!.hidden,false);
 dialog.dispatchEvent(new dom.window.Event('cancel',{cancelable:true}));assert.equal(dialog.open,false);assert.equal(doc.querySelector<HTMLTextAreaElement>('#operator-guidelines')!.value,'Changed guidelines');assert.equal(writes(requests).length,0);
 click(dom,'#operator-settings-back');state.fail=true;click(dom,'[data-unsaved-save]');await tick();await tick();assert.equal(dialog.open,true);assert.match(dialog.querySelector('.workspace-dialog-status')!.textContent!,/Unable to save/);assert.equal(doc.querySelector<HTMLTextAreaElement>('#operator-guidelines')!.value,'Changed guidelines');
 click(dom,'[data-unsaved-discard]');assert.equal(dialog.open,false);assert.equal(doc.querySelector<HTMLElement>('#operator-settings-picker')!.hidden,false);click(dom,'#operator-guidelines-tile');assert.equal(doc.querySelector<HTMLTextAreaElement>('#operator-guidelines')!.value,'Original guidelines');
}));

test('Save in the overlay persists shared guidelines before continuing to the requested view',async()=>fixture(async(dom,requests)=>{
 const doc=dom.window.document;openGuidelines(dom);changeGuidelines(dom,'Settings');
 click(dom,'#operator-settings [data-operator-view=overview]');assert.equal(dom.window.location.hash,'#settings');click(dom,'[data-unsaved-save]');await tick();await tick();
 assert.equal(dom.window.location.hash,'#overview');assert.equal(doc.querySelector<HTMLElement>('#operator-overview')!.hidden,false);assert.deepEqual(writes(requests).map(r=>r.body),[{guidelines:'Settings'}]);
 openGuidelines(dom);assert.equal(doc.querySelector<HTMLTextAreaElement>('#operator-guidelines')!.value,'Settings');
}));

test('logout and language navigation are guarded; beforeunload warns without performing any save',async()=>fixture(async(dom,requests)=>{
 const doc=dom.window.document;openAgent(dom);click(dom,'input[value=paused]');
 const unload=new dom.window.Event('beforeunload',{cancelable:true});dom.window.dispatchEvent(unload);assert.equal(unload.defaultPrevented,true);assert.equal(writes(requests).length,0);
 click(dom,'[data-language-choice=fr]');assert.equal(doc.querySelector<HTMLDialogElement>('#operator-unsaved-dialog')!.open,true);click(dom,'#operator-unsaved-dialog [data-dialog-close]');
 click(dom,'#operator-header-logout');assert.equal(requests.some(r=>r.path==='/api/logout'),false);click(dom,'[data-unsaved-discard]');await tick();assert.equal(requests.some(r=>r.path==='/api/logout'),true);assert.equal(doc.querySelector<HTMLTextAreaElement>('#operator-guidelines')!.value,'');assert.equal(doc.querySelector('#operator-agent-identity')!.textContent,'');
}));

test('browser back can be cancelled or discarded without losing the draft or mismatching URL and view',async()=>fixture(async(dom)=>{
 const doc=dom.window.document;openGuidelines(dom);changeGuidelines(dom);dom.window.history.back();for(let i=0;i<8;i++)await tick();
 assert.equal(doc.querySelector<HTMLDialogElement>('#operator-unsaved-dialog')!.open,true);assert.equal(dom.window.location.hash,'#settings');click(dom,'#operator-unsaved-dialog [data-dialog-close]');assert.equal(doc.querySelector<HTMLTextAreaElement>('#operator-guidelines')!.value,'Changed guidelines');
 dom.window.history.back();for(let i=0;i<8;i++)await tick();click(dom,'[data-unsaved-discard]');for(let i=0;i<8;i++)await tick();assert.equal(dom.window.location.hash,'');assert.equal(doc.querySelector<HTMLElement>('#operator-overview')!.hidden,false);
}));

test('key changes have a separate explicit overlay and never run on Save or Cancel',async()=>fixture(async(dom,requests)=>{
 const doc=dom.window.document;openAgent(dom);click(dom,'[data-key-action=rotate]');assert.equal(doc.querySelector<HTMLDialogElement>('#operator-key-dialog')!.open,true);assert.equal(writes(requests).length,0);click(dom,'#operator-key-dialog [data-dialog-close]');assert.equal(writes(requests).length,0);
 click(dom,'[data-key-action=rotate]');click(dom,'#operator-key-confirm');await tick();assert.match(doc.querySelector('.operator-new-key')!.textContent!,/synthetic-one-time-key/);assert.deepEqual(writes(requests).map(r=>r.body),[{action:'rotate'}]);click(dom,'#operator-settings-back');assert.equal(doc.querySelector('.operator-new-key'),null);
}));

test('pending saves prevent duplicate writes and navigation; expired sessions clear all drafts and overlays',async()=>fixture(async(dom,requests,state)=>{
 const doc=dom.window.document;let release!:()=>void;state.wait=new Promise<void>(resolve=>release=resolve);state.expire=true;openGuidelines(dom);changeGuidelines(dom);submit(dom,'#guidelines');submit(dom,'#guidelines');click(dom,'#operator-settings-back');assert.equal(doc.querySelector<HTMLElement>('#operator-settings-editor')!.hidden,false);assert.equal(writes(requests).length,1);
 release();await tick();await tick();assert.equal(doc.querySelector<HTMLElement>('#dashboard')!.hidden,true);assert.equal(doc.querySelector<HTMLTextAreaElement>('#operator-guidelines')!.value,'');assert.equal(doc.querySelector<HTMLDialogElement>('#operator-unsaved-dialog')!.open,false);
}));


test('a rejected participation save preserves the draft and never converts a denial into activation',async()=>fixture(async(dom,requests,state)=>{
 const doc=dom.window.document;openAgent(dom);click(dom,'input[value=paused]');state.fail=true;submit(dom,'#operator-agent-form');await tick();await tick();
 assert.match(doc.querySelector('#operator-settings-feedback')!.textContent!,/Unable to save/);assert.equal(doc.querySelector<HTMLInputElement>('input[value=paused]')!.checked,true);assert.equal(doc.querySelector<HTMLButtonElement>('#operator-header-save')!.disabled,false);assert.deepEqual(writes(requests).map(r=>r.body),[{action:'pause'}]);
 click(dom,'#operator-settings-back');assert.equal(doc.querySelector<HTMLDialogElement>('#operator-unsaved-dialog')!.open,true);click(dom,'[data-unsaved-discard]');click(dom,'[data-agent-id="agent-a"].operator-settings-agent');assert.equal(doc.querySelector<HTMLInputElement>('input[value=active]')!.checked,true);
}));

test('an acknowledged save followed by refresh failure is not repeated when leaving',async()=>fixture(async(dom,requests,state)=>{
 const doc=dom.window.document;openGuidelines(dom);changeGuidelines(dom);state.failRefresh=true;submit(dom,'#guidelines');await tick();await tick();
 assert.match(doc.querySelector('#status')!.textContent!,/saved.*could not be reloaded/);assert.equal(doc.querySelector<HTMLButtonElement>('#operator-header-save')!.disabled,true);click(dom,'#operator-settings-back');assert.equal(doc.querySelector<HTMLDialogElement>('#operator-unsaved-dialog')!.open,false);assert.equal(writes(requests).length,1);
}));


test('textarea newline normalization does not invent unsaved operator changes',async()=>fixture(async(dom,requests)=>{
 const doc=dom.window.document;openGuidelines(dom);assert.equal(doc.querySelector<HTMLTextAreaElement>('#operator-guidelines')!.value,'Original guidelines\nSecond line');assert.equal(doc.querySelector<HTMLButtonElement>('#operator-header-save')!.disabled,true);
 const event=new dom.window.Event('beforeunload',{cancelable:true});dom.window.dispatchEvent(event);assert.equal(event.defaultPrevented,false);click(dom,'#operator-settings-back');assert.equal(doc.querySelector<HTMLDialogElement>('#operator-unsaved-dialog')!.open,false);assert.equal(writes(requests).length,0);
},'Original guidelines\r\nSecond line'));

test('only the current settings level has a visible title, including guidelines and return navigation',async()=>fixture(async(dom)=>{
 const doc=dom.window.document;
 const titles=()=>[...doc.querySelectorAll('#dashboard h1')].filter(node=>!node.closest('[hidden]')).map(node=>node.id);
 settings(dom);assert.deepEqual(titles(),['operator-settings-heading']);
 click(dom,'[data-agent-id="agent-a"].operator-settings-agent');assert.deepEqual(titles(),['operator-agent-settings-heading']);
 assert.ok(doc.querySelector('#operator-settings-heading')!.closest('[hidden]'));
 assert.equal(doc.activeElement,doc.querySelector('#operator-agent-settings-heading'));
 click(dom,'#operator-settings-back');assert.deepEqual(titles(),['operator-settings-heading']);
 click(dom,'#operator-guidelines-tile');assert.deepEqual(titles(),['operator-agent-settings-heading']);assert.equal(doc.querySelector('#guidelines h3'),null);
 click(dom,'#operator-header-cancel');assert.deepEqual(titles(),['operator-settings-heading']);
 click(dom,'#operator-settings-picker [data-operator-view=overview]');assert.deepEqual(titles(),['operator-heading']);
}));

test('authenticated navigation is hidden and header actions follow only the active draft form',async()=>fixture(async(dom,requests)=>{
 const doc=dom.window.document,actions=doc.querySelector<HTMLElement>('#operator-header-actions')!,save=doc.querySelector<HTMLButtonElement>('#operator-header-save')!,cancel=doc.querySelector<HTMLButtonElement>('#operator-header-cancel')!;
 assert.ok([...doc.querySelectorAll<HTMLAnchorElement>('header nav a.header-action')].every(link=>link.hidden));
 assert.equal(actions.hidden,true);openAgent(dom);assert.equal(actions.hidden,false);assert.equal(save.form,doc.querySelector('#operator-agent-form'));assert.equal(save.disabled,true);
 assert.equal(doc.querySelector('#operator-settings-editor [data-settings-cancel]'),null);
 click(dom,'input[value=paused]');assert.equal(save.disabled,false);save.click();await tick();await tick();assert.deepEqual(writes(requests).map(request=>request.body),[{action:'pause'}]);assert.equal(save.disabled,true);
 cancel.click();assert.equal(actions.hidden,true);click(dom,'#operator-guidelines-tile');assert.equal(save.form,doc.querySelector('#guidelines'));changeGuidelines(dom,'Header draft');save.click();await tick();await tick();assert.equal(writes(requests).at(-1)!.body.guidelines,'Header draft');
 changeGuidelines(dom,'Discard this');cancel.click();assert.equal(actions.hidden,true);click(dom,'#operator-guidelines-tile');assert.equal(doc.querySelector<HTMLTextAreaElement>('#operator-guidelines')!.value,'Header draft');
 click(dom,'#operator-header-cancel');click(dom,'#operator-settings-picker [data-operator-view=overview]');assert.equal(actions.hidden,true);
}));

test('shared guidelines precede agent grid; example text is an editable draft, never an automatic save',async()=>fixture(async(dom,requests)=>{
 const doc=dom.window.document;settings(dom);
 assert.ok(doc.querySelector('#operator-guidelines-tile')!.compareDocumentPosition(doc.querySelector('#owned')!)&dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
 assert.equal(doc.querySelector<HTMLElement>('#owned')!.hidden,false);
 click(dom,'#operator-guidelines-tile');const text=doc.querySelector<HTMLTextAreaElement>('#operator-guidelines')!;
 click(dom,'#operator-guidelines-example');assert.match(text.value,/^Original guidelines\n\nMy agents/);assert.ok(text.value.length<=2000);
 assert.equal(writes(requests).length,0);assert.equal(doc.querySelector<HTMLButtonElement>('#operator-header-save')!.disabled,false);
 assert.equal(doc.querySelector<HTMLButtonElement>('#operator-guidelines-example')!.disabled,true);
 click(dom,'#operator-header-cancel');click(dom,'#operator-guidelines-tile');assert.equal(text.value,'Original guidelines');
 changeGuidelines(dom,'x'.repeat(1999));assert.equal(doc.querySelector<HTMLButtonElement>('#operator-guidelines-example')!.disabled,true);
}));

test('example can be adapted and saved only through the explicit guidelines save action',async()=>fixture(async(dom,requests)=>{
 openGuidelines(dom);click(dom,'#operator-guidelines-example');changeGuidelines(dom,'My adapted public guidelines');
 submit(dom,'#guidelines');await tick();await tick();assert.deepEqual(writes(requests).map(r=>r.body),[{guidelines:'My adapted public guidelines'}]);
},''));


test('settings without agents retains guidelines and hides the empty grid',async()=>fixture(async(dom)=>{
 settings(dom);assert.equal(dom.window.document.querySelector<HTMLElement>('#owned')!.hidden,true);assert.equal(dom.window.document.querySelectorAll('.operator-settings-agent').length,0);click(dom,'#operator-guidelines-tile');assert.equal(dom.window.document.querySelector<HTMLTextAreaElement>('#operator-guidelines')!.value,'Original guidelines');
},'Original guidelines',true));


test('intentional authorization navigation is not treated as an unfinished settings write',async()=>fixture(async(dom,requests)=>{
 let navigation=false,warned:boolean|undefined;
 dom.virtualConsole.removeAllListeners('jsdomError');
 dom.virtualConsole.on('jsdomError',error=>{
  if(!error.message.includes('navigation'))return;navigation=true;
  const event=new dom.window.Event('beforeunload',{cancelable:true});dom.window.dispatchEvent(event);warned=event.defaultPrevented;
 });
 openAgent(dom);click(dom,'#operator-review-authorization');await tick();await tick();
 assert.equal(navigation,true);assert.equal(warned,false);assert.equal(dom.window.document.querySelector<HTMLDialogElement>('#operator-unsaved-dialog')!.open,false);
 assert.equal(writes(requests).filter(r=>r.path.endsWith('/authorization')).length,1);assert.equal(requests.some(r=>r.path==='/api/confirmation'),false);
}));


test('saving guidelines returns to the settings picker with committed text and no stale header actions',async()=>fixture(async(dom,requests)=>{
 const doc=dom.window.document;openGuidelines(dom);changeGuidelines(dom,'Updated public guidelines');click(dom,'#operator-header-save');await tick();await tick();
 assert.equal(doc.querySelector<HTMLElement>('#operator-settings-picker')!.hidden,false);assert.equal(doc.querySelector<HTMLElement>('#operator-settings-editor')!.hidden,true);assert.equal(doc.querySelector<HTMLElement>('#operator-header-actions')!.hidden,true);assert.equal(doc.activeElement?.id,'operator-settings-heading');assert.deepEqual(writes(requests).map(r=>r.body),[{guidelines:'Updated public guidelines'}]);
 click(dom,'#operator-guidelines-tile');assert.equal(doc.querySelector<HTMLTextAreaElement>('#operator-guidelines')!.value,'Updated public guidelines');
}));

test('failed explicit guidelines save stays in the editor and preserves its draft',async()=>fixture(async(dom,_requests,state)=>{
 const doc=dom.window.document;openGuidelines(dom);changeGuidelines(dom,'Keep my draft');state.fail=true;click(dom,'#operator-header-save');await tick();await tick();
 assert.equal(doc.querySelector<HTMLElement>('#operator-settings-editor')!.hidden,false);assert.equal(doc.querySelector<HTMLTextAreaElement>('#operator-guidelines')!.value,'Keep my draft');assert.equal(doc.querySelector<HTMLButtonElement>('#operator-header-save')!.disabled,false);
}));


test('settings editors omit the redundant back button',async()=>fixture(async(dom)=>{
 const doc=dom.window.document;openGuidelines(dom);assert.equal(doc.querySelector<HTMLButtonElement>('#operator-settings-back')!.hidden,true);assert.equal(doc.querySelector<HTMLElement>('#operator-header-actions')!.hidden,false);
 click(dom,'#operator-header-cancel');click(dom,'[data-agent-id="agent-a"].operator-settings-agent');assert.equal(doc.querySelector<HTMLButtonElement>('#operator-settings-back')!.hidden,true);
}));


test('settings Save is visible only for a changed draft in either editor',async()=>fixture(async(dom)=>{
 const doc=dom.window.document,save=doc.querySelector<HTMLButtonElement>('#operator-header-save')!;openGuidelines(dom);assert.equal(save.hidden,true);assert.equal(doc.querySelector<HTMLButtonElement>('#operator-header-cancel')!.hidden,false);
 changeGuidelines(dom,'A change');assert.equal(save.hidden,false);assert.equal(save.disabled,false);changeGuidelines(dom,'Original guidelines');assert.equal(save.hidden,true);
 click(dom,'#operator-guidelines-example');assert.equal(save.hidden,false);click(dom,'#operator-header-cancel');click(dom,'#operator-guidelines-tile');assert.equal(save.hidden,true);
 click(dom,'#operator-header-cancel');click(dom,'[data-agent-id="agent-a"].operator-settings-agent');assert.equal(save.hidden,true);assert.equal(save.disabled,true);
}));


test('agent Save appears only for changes, hides on reversion and returns to picker after success',async()=>fixture(async(dom,requests)=>{
 const doc=dom.window.document,save=doc.querySelector<HTMLButtonElement>('#operator-header-save')!;openAgent(dom);assert.equal(save.hidden,true);
 click(dom,'input[value=paused]');assert.equal(save.hidden,false);click(dom,'input[value=active]');assert.equal(save.hidden,true);click(dom,'input[value=paused]');save.click();await tick();await tick();
 assert.deepEqual(writes(requests).map(r=>r.body),[{action:'pause'}]);assert.equal(doc.querySelector<HTMLElement>('#operator-settings-picker')!.hidden,false);assert.equal(doc.querySelector<HTMLElement>('#operator-settings-editor')!.hidden,true);assert.equal(doc.querySelector<HTMLElement>('#operator-header-actions')!.hidden,true);
 click(dom,'[data-agent-id="agent-a"].operator-settings-agent');assert.equal(doc.querySelector<HTMLInputElement>('input[value=paused]')!.checked,true);assert.equal(save.hidden,true);
}));
