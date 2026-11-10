import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {initializeEmailLogin} from '../src/scripts/email-login';
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
for(const page of ['operator','administration'])for(const lang of ['en','de','es','fr'])test(`email code controls, session rotation and completion: ${page}/${lang}`,async()=>{
 const dom=new JSDOM(readFileSync(new URL(`../dist/${page}/index.html`,import.meta.url),'utf8'),{url:'http://localhost/'+page,pretendToBeVisual:true});
 dom.window.document.documentElement.lang=lang;
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:dom.window.document,configurable:true});
 const calls:any[]=[],tokens:string[]=[];let authenticated=0;
 try{
  dom.window.document.querySelector<HTMLElement>('.admin-login-shell')!.hidden=false;
  const d=dom.window.document,form=d.querySelector<HTMLFormElement>('#login')!,code=d.querySelector<HTMLInputElement>('#email-login-code')!,panel=d.querySelector<HTMLElement>('#email-login-challenge')!,verify=panel.querySelector<HTMLButtonElement>('[data-email-verify]')!;
  const helper=initializeEmailLogin({form,csrf:value=>tokens.push(value),authenticated:async()=>{authenticated++;},send:async(path,body)=>{calls.push({path,body});return {csrf:'rotated'};}});
  assert.equal(helper.begin({}),false);
  assert.ok(helper.begin({twoFactorRequired:true,csrf:'pending',expiresAt:new Date(Date.now()+300_000).toISOString(),resendAt:new Date(Date.now()+60_000).toISOString()}));
  assert.equal(authenticated,0);assert.equal(d.getElementById('login-status')!.textContent,'');assert.equal(panel.hidden,false);assert.equal(d.activeElement,code);assert.equal(code.autocomplete,'one-time-code');assert.ok(verify.disabled);assert.ok(panel.querySelector<HTMLButtonElement>('[data-email-resend]')!.disabled);assert.equal(d.querySelector<HTMLInputElement>('#login input[type=password]')!.disabled,true);
  code.value='12345';code.dispatchEvent(new dom.window.Event('input'));assert.ok(verify.disabled);
  code.value='012345';code.dispatchEvent(new dom.window.Event('input'));assert.equal(verify.disabled,false);
  form.dispatchEvent(new dom.window.Event('submit',{cancelable:true,bubbles:true}));assert.equal(code.value,'');verify.click();await tick();
  assert.deepEqual(calls,[{path:'/login/verify',body:{code:'012345'}}]);assert.equal(authenticated,1);assert.deepEqual(tokens,['pending','rotated']);assert.equal(panel.hidden,true);assert.equal(helper.pending(),false);
 }finally{dom.window.dispatchEvent(new dom.window.Event('pagehide'));if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');dom.window.close();}
});
test('incorrect codes, retry, resend, cancel, expiry and stale replies never grant access',async()=>{
 const dom=new JSDOM(readFileSync(new URL('../dist/operator/index.html',import.meta.url),'utf8'),{url:'http://localhost/operator',pretendToBeVisual:true});const d=dom.window.document;
 const original=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:d,configurable:true});
 try{
  let behavior='incorrect',completed=0,resolve:((value:any)=>void)|undefined;const paths:string[]=[];
  const helper=initializeEmailLogin({form:d.querySelector('#login')!,csrf:()=>{},authenticated:async()=>{completed++;},send:async(path)=>{paths.push(path);if(behavior==='incorrect')throw {code:'LOGIN_CODE_INVALID',status:400};if(behavior==='stale')return new Promise(r=>resolve=r);return {twoFactorRequired:true,expiresAt:new Date(Date.now()+300_000).toISOString(),resendAt:new Date(Date.now()+60_000).toISOString()};}});
  const code=d.querySelector<HTMLInputElement>('#email-login-code')!,verify=d.querySelector<HTMLButtonElement>('[data-email-verify]')!,resend=d.querySelector<HTMLButtonElement>('[data-email-resend]')!,cancel=d.querySelector<HTMLButtonElement>('[data-email-cancel]')!;
  const state=()=>({twoFactorRequired:true,expiresAt:new Date(Date.now()+300_000).toISOString(),resendAt:new Date(Date.now()-1000).toISOString()});
  helper.begin(state());code.value='000123';code.dispatchEvent(new dom.window.Event('input'));verify.click();await tick();assert.match(d.querySelector('#login-status')!.textContent!,/incorrect/);assert.ok(helper.pending());assert.equal(completed,0);
  behavior='success';resend.click();await tick();assert.equal(paths.at(-1),'/login/resend');assert.ok(resend.disabled);cancel.click();await tick();assert.equal(paths.at(-1),'/login/cancel');assert.equal(helper.pending(),false);
  helper.begin({...state(),expiresAt:new Date(Date.now()-100).toISOString()});assert.ok(verify.disabled);assert.ok(resend.disabled);assert.equal(cancel.disabled,false);helper.clear();
  behavior='stale';helper.begin(state());code.value='123456';code.dispatchEvent(new dom.window.Event('input'));verify.click();dom.window.dispatchEvent(new dom.window.Event('pagehide'));resolve!({csrf:'stale'});await tick();assert.equal(completed,0);assert.equal(helper.pending(),false);assert.equal(code.value,'');
 }finally{dom.window.dispatchEvent(new dom.window.Event('pagehide'));if(original)Object.defineProperty(globalThis,'document',original);else Reflect.deleteProperty(globalThis,'document');dom.window.close();}
});
