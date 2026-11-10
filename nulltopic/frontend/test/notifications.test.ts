import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {installDialogMock} from './dialog-mock';
import {initializeNotifications} from '../src/scripts/notifications';
import {initializeHumanLanguage} from '../src/lib/i18n';
const html=readFileSync(new URL('../dist/notifications/index.html',import.meta.url),'utf8'),tick=()=>new Promise(r=>setTimeout(r,0));
async function fixture(run:(dom:JSDOM,state:any)=>Promise<void>,role='operator',lang='en'){
 const dom=new JSDOM(html,{url:'http://localhost/notifications?lang='+lang,pretendToBeVisual:true});dom.window.document.documentElement.lang=lang;installDialogMock(dom);
 const state:any={calls:[],destinations:[],role,preferences:role==='operator'?{language:'de',registration:true,moderation:true,review:true}:{language:'fr',queue:true}};
 const saved=new Map<string,PropertyDescriptor|undefined>();
 for(const [key,value] of Object.entries({document:dom.window.document,fetch:async(path:string,options?:RequestInit)=>{
  const body=options?.body?JSON.parse(String(options.body)):undefined;state.calls.push({path,body,headers:options?.headers});
  if(path==='/api/session')return Response.json({csrf:'synthetic-csrf',...(role==='operator'?{operatorId:'fixture'}:role==='admin'?{adminId:'fixture',adminRole:'administrator'}:role==='root'?{adminId:'fixture',adminRole:'root'}:{})});
  if(body){if(state.hold)await state.hold;if(state.fail)return Response.json({error:{code:'SYNTHETIC'}},{status:state.fail});state.preferences=body;return Response.json({ok:true});}
  return Response.json(state.preferences);
 }})){saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value});}
 try{initializeHumanLanguage(dom.window.document);await initializeNotifications({navigate:url=>state.destinations.push(url)});await run(dom,state);}
 finally{dom.window.dispatchEvent(new dom.window.Event('pagehide'));dom.window.close();for(const [key,value] of saved){if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key);}}
}
for(const role of ['operator','admin'])for(const lang of ['en','de','es','fr'])test(`notification preferences are scoped, localized and dirty-only: ${role}/${lang}`,async()=>fixture(async(dom,state)=>{
 const d=dom.window.document,header=d.getElementById('notification-header-actions')!,save=d.querySelector<HTMLButtonElement>('#notification-header-save')!,form=d.querySelector<HTMLFormElement>('#notification-config')!;
 assert.equal(d.getElementById('notification-content')!.hidden,false);assert.equal(header.hidden,false);assert.equal(save.hidden,true);assert.equal(save.form,form);assert.ok(header.closest('body > header'));
 assert.equal(form.querySelector<HTMLElement>('[data-notification-role='+role+']')!.hidden,false);assert.equal(form.querySelector<HTMLElement>('[data-notification-role='+(role==='admin'?'operator':'admin')+']')!.hidden,true);
 assert.equal(state.calls.filter((c:any)=>c.body).length,0);for(const button of header.querySelectorAll('button')){assert.equal(button.textContent,'');assert.equal(button.getAttribute('aria-label'),button.getAttribute('data-tooltip'));assert.ok(button.querySelector('svg'));}
 const input=form.querySelector<HTMLInputElement>(role==='operator'?'[name=moderation]':'[name=queue]')!;assert.equal(input.getAttribute('role'),'switch');input.checked=false;input.dispatchEvent(new dom.window.Event('change',{bubbles:true}));assert.equal(save.hidden,false);input.checked=true;input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));assert.equal(save.hidden,true);input.checked=false;input.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
 form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();await tick();assert.equal(save.hidden,true);const call=state.calls.find((c:any)=>c.body);assert.equal(call.path,'/api/'+role+'/notifications');assert.equal(new Headers(call.headers).get('x-csrf-token'),'synthetic-csrf');assert.deepEqual(state.destinations,[(role==='operator'?'/operator':'/administration')+'?lang='+lang+(role==='operator'?'#account':'#overview')]);
},role,lang));
test('notification failures preserve drafts; duplicate saves and dismissal during a save are blocked',async()=>fixture(async(dom,state)=>{
 const d=dom.window.document,input=d.querySelector<HTMLInputElement>('[name=moderation]')!,form=d.querySelector<HTMLFormElement>('#notification-config')!;input.checked=false;input.dispatchEvent(new dom.window.Event('change',{bubbles:true}));state.fail=503;
 form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();await tick();assert.equal(input.checked,false);assert.equal(d.querySelector<HTMLButtonElement>('#notification-header-save')!.hidden,false);assert.ok(d.querySelector('[data-kind=error]'));assert.deepEqual(state.destinations,[]);
 state.fail=0;let release!:()=>void;state.hold=new Promise<void>(r=>release=r);form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));d.querySelector<HTMLButtonElement>('#notification-header-cancel')!.click();assert.equal(state.calls.filter((c:any)=>c.body).length,2);assert.deepEqual(state.destinations,[]);release();await tick();await tick();assert.equal(state.destinations.length,1);
}));
test('notification links use unsaved-changes overlay; cancel explicitly discards without saving',async()=>fixture(async(dom,state)=>{
 const d=dom.window.document,input=d.querySelector<HTMLInputElement>('[name=review]')!;input.checked=false;input.dispatchEvent(new dom.window.Event('change',{bubbles:true}));const link=d.querySelector<HTMLAnchorElement>('body > header a.brand')!;link.click();assert.equal(d.querySelector<HTMLDialogElement>('#operator-unsaved-dialog')!.open,true);d.querySelector<HTMLButtonElement>('[data-dialog-close]')!.click();assert.equal(input.checked,false);d.querySelector<HTMLButtonElement>('#notification-header-cancel')!.click();assert.equal(state.calls.filter((c:any)=>c.body).length,0);assert.deepEqual(state.destinations,['/operator?lang=en#account']);
}));
for(const role of ['anonymous','root'])test('notification settings do not expose preferences to '+role,async()=>fixture(async(dom,state)=>{
 const d=dom.window.document;assert.equal(d.getElementById('notification-content')!.hidden,true);assert.equal(d.getElementById('notification-header-actions')!.hidden,true);assert.equal(state.calls.length,1);assert.ok(d.querySelector<HTMLAnchorElement>('#notification-return')!.href.includes(role==='root'?'/administration?':'/operator?'));
},role));
test('expired notification session clears private drafts and restores sign-in navigation',async()=>fixture(async(dom,state)=>{
 const d=dom.window.document,input=d.querySelector<HTMLInputElement>('[name=review]')!;input.checked=false;input.dispatchEvent(new dom.window.Event('change',{bubbles:true}));state.fail=401;d.querySelector<HTMLFormElement>('#notification-config')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();await tick();assert.equal(d.getElementById('notification-content')!.hidden,true);assert.equal(d.getElementById('notification-header-actions')!.hidden,true);assert.equal(d.querySelector<HTMLAnchorElement>('#notification-return')!.hidden,false);assert.ok(Array.from(d.querySelectorAll<HTMLElement>('body > header nav a.header-action')).every(a=>!a.hidden));
}));

test('notification switches visually replace native checkboxes without removing keyboard access',()=>{const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');assert.match(css,/\.notification-option \.storage-switch input\s*\{[^}]*position:absolute;[^}]*opacity:0/);const dom=new JSDOM(html);for(const input of dom.window.document.querySelectorAll<HTMLInputElement>('#notification-config input')){assert.equal(input.type,'checkbox');assert.equal(input.getAttribute('role'),'switch');assert.equal(input.hasAttribute('tabindex'),false);assert.ok(input.closest('label'));assert.ok(input.nextElementSibling?.matches('.storage-switch-track'));}dom.window.close();});
