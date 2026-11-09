import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {installDialogMock} from './dialog-mock';
import {initializeIdentityDeletion} from '../src/scripts/identity-deletion';
import {localizeTrustedUI,translate} from '../src/lib/i18n';
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function fixture(run:(dom:JSDOM,control:ReturnType<typeof initializeIdentityDeletion>,calls:any[],state:any)=>Promise<void>,language='en'){
 const dom=new JSDOM(readFileSync(new URL('../dist/operator/index.html',import.meta.url),'utf8'),{url:'http://localhost/operator'});installDialogMock(dom);dom.window.document.documentElement.lang=language;
 const original=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:dom.window.document,configurable:true});
 const calls:any[]=[],state={refresh:0,overview:0,deleted:0,wait:null as Promise<void>|null,fail:false};
 try{
  localizeTrustedUI(dom.window.document);
  const control=initializeIdentityDeletion({send:async(path,body,method)=>{calls.push({path,body,method});if(state.wait)await state.wait;if(state.fail)throw {code:'REAUTHENTICATION_FAILED'};return {ok:true};},leave:action=>action(),selected:()=>({id:'agent-a',handle:'faden',name:'<img src=x>'}),refresh:async()=>{state.refresh++;},overview:()=>{state.overview++;},deleted:()=>{state.deleted++;}});
  control.setData({operator:{handle:'owner'},agents:[{id:'agent-a',handle:'faden',name:'<img src=x>'},{id:'agent-b',handle:'second',name:'Second'}]});
  await run(dom,control,calls,state);control.clear();
 }finally{if(original)Object.defineProperty(globalThis,'document',original);else Reflect.deleteProperty(globalThis,'document');dom.window.close();}
}
for(const language of ['en','de','es','fr'] as const)test('identity deletion dialog is localized, explicit and cancellable: '+language,async()=>fixture(async(dom,_control,calls)=>{
 const d=dom.window.document;d.querySelector<HTMLButtonElement>('[data-delete-identity=agent]')!.click();
 const dialog=d.querySelector<HTMLDialogElement>('#identity-delete-dialog')!,submit=dialog.querySelector<HTMLButtonElement>('[type=submit]')!,password=dialog.querySelector<HTMLInputElement>('[type=password]')!,toggle=dialog.querySelector<HTMLInputElement>('[type=checkbox]')!;
 assert.ok(dialog.open);assert.equal(d.getElementById('identity-delete-title')!.textContent,translate('Delete agent permanently',language));assert.equal(d.getElementById('identity-delete-target')!.textContent,'<img src=x> · @faden');assert.equal(dialog.querySelector('img'),null);assert.equal(toggle.getAttribute('role'),'switch');assert.ok(submit.disabled);
 password.value='synthetic-password';password.dispatchEvent(new dom.window.Event('input'));assert.ok(submit.disabled);toggle.checked=true;toggle.dispatchEvent(new dom.window.Event('input'));assert.equal(submit.disabled,false);
 assert.equal(dialog.querySelector('.report-actions')!.firstElementChild!.getAttribute('data-dialog-close'),'');dialog.querySelector<HTMLButtonElement>('[data-dialog-close]')!.click();assert.equal(dialog.open,false);assert.equal(password.value,'');assert.equal(calls.length,0);
},language));
test('identity deletion blocks duplicates and dismissal, clears passwords and returns to overview only on success',async()=>fixture(async(dom,control,calls,state)=>{
 const d=dom.window.document,dialog=d.querySelector<HTMLDialogElement>('#identity-delete-dialog')!,form=dialog.querySelector('form')!,password=dialog.querySelector<HTMLInputElement>('[type=password]')!,toggle=dialog.querySelector<HTMLInputElement>('[type=checkbox]')!;
 d.querySelector<HTMLButtonElement>('[data-delete-identity=agent]')!.click();let release!:()=>void;state.wait=new Promise<void>(resolve=>release=resolve);password.value='synthetic-password';toggle.checked=true;form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));assert.equal(calls.length,1);assert.equal(password.value,'');assert.equal(control.busy(),true);dialog.querySelector<HTMLButtonElement>('[data-dialog-close]')!.click();assert.equal(dialog.open,true);release();await tick();assert.deepEqual(calls[0],{path:'/operator/agents/agent-a',method:'DELETE',body:{confirmDeletion:true,password:'synthetic-password'}});assert.equal(state.refresh,1);assert.equal(state.overview,1);assert.equal(dialog.open,false);
}));
test('failed reauthentication stays in the dialog without a refresh or deletion claim',async()=>fixture(async(dom,_control,calls,state)=>{
 const d=dom.window.document,dialog=d.querySelector<HTMLDialogElement>('#identity-delete-dialog')!;state.fail=true;d.querySelector<HTMLButtonElement>('[data-delete-identity=agent]')!.click();dialog.querySelector<HTMLInputElement>('[type=password]')!.value='incorrect';dialog.querySelector<HTMLInputElement>('[type=checkbox]')!.checked=true;dialog.querySelector('form')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();assert.equal(calls.length,1);assert.equal(state.refresh,0);assert.equal(dialog.open,true);assert.match(dialog.querySelector('.workspace-dialog-status')!.textContent!,/Nothing was deleted/);assert.equal(dialog.querySelector<HTMLInputElement>('[type=password]')!.value,'');
}));
test('account deletion names every linked agent and clears the session through its completion handler',async()=>fixture(async(dom,_control,calls,state)=>{
 const d=dom.window.document,dialog=d.querySelector<HTMLDialogElement>('#identity-delete-dialog')!;d.querySelector<HTMLButtonElement>('[data-delete-identity=account]')!.click();assert.equal(d.getElementById('identity-delete-target')!.textContent,'@owner');assert.equal(d.querySelectorAll('#identity-delete-agents li').length,2);dialog.querySelector<HTMLInputElement>('[type=password]')!.value='synthetic-password';dialog.querySelector<HTMLInputElement>('[type=checkbox]')!.checked=true;dialog.querySelector('form')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();assert.equal(calls[0].path,'/operator');assert.deepEqual(calls[0].body.expectedAgentIds,['agent-a','agent-b']);assert.equal(state.deleted,1);assert.equal(state.refresh,0);assert.equal(dialog.open,false);
}));
test('session clearing discards a late destructive response and all sensitive dialog state',async()=>fixture(async(dom,control,_calls,state)=>{
 const d=dom.window.document,dialog=d.querySelector<HTMLDialogElement>('#identity-delete-dialog')!;d.querySelector<HTMLButtonElement>('[data-delete-identity=agent]')!.click();let release!:()=>void;state.wait=new Promise<void>(resolve=>release=resolve);dialog.querySelector<HTMLInputElement>('[type=password]')!.value='synthetic-password';dialog.querySelector<HTMLInputElement>('[type=checkbox]')!.checked=true;dialog.querySelector('form')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));control.clear();release();await tick();assert.equal(state.refresh,0);assert.equal(dialog.open,false);assert.equal(control.busy(),false);
}));
