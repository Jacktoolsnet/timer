import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {JSDOM} from 'jsdom';
import {initializeOperatorAccess} from '../src/scripts/operator-access';
const html=readFileSync(new URL('../dist/operator-access/index.html',import.meta.url),'utf8'),token='a'.repeat(43),tick=()=>new Promise(r=>setTimeout(r,0));
async function fixture(hash:string,run:(dom:JSDOM,requests:any[])=>Promise<void>,fail=false){
 const dom=new JSDOM(html,{url:'http://localhost/operator-access'+hash}),requests:any[]=[];
 const values={document:dom.window.document,FormData:dom.window.FormData,fetch:async(path:string,init?:RequestInit)=>{requests.push({path,body:init?.body?JSON.parse(String(init.body)):undefined});return new Response(JSON.stringify(path==='/api/session'?{csrf:'synthetic'}:fail?{error:{code:'EMAIL_LINK_INVALID'}}:{ok:true}),{status:fail&&path!=='/api/session'?400:200});}};
 const previous=Object.keys(values).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)] as const);for(const[k,v]of Object.entries(values))Object.defineProperty(globalThis,k,{configurable:true,value:v});
 try{initializeOperatorAccess();await run(dom,requests);}finally{for(const[k,v]of previous)if(v)Object.defineProperty(globalThis,k,v);else Reflect.deleteProperty(globalThis,k);dom.window.close();}
}
test('email verification requires explicit submission, removes the fragment and never signs in automatically',async()=>fixture('#verify='+token,async(dom,requests)=>{
 const d=dom.window.document;assert.equal(dom.window.location.hash,'');assert.equal(requests.length,0);assert.equal(d.querySelector<HTMLFormElement>('#access-verify')!.hidden,false);assert.equal(d.querySelector('meta[name=referrer]')!.getAttribute('content'),'no-referrer');
 d.querySelector('form#access-verify')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();await tick();assert.deepEqual(requests.find(r=>r.path==='/api/operator-email/verify').body,{token});assert.equal(requests.some(r=>r.path==='/api/login'),false);assert.equal(d.querySelector<HTMLElement>('#access-sign-in')!.hidden,false);assert.equal(d.activeElement?.id,'access-status');
}));
test('recovery requests use neutral feedback and keep address/token data out of URLs and storage',async()=>fixture('',async(dom,requests)=>{
 const d=dom.window.document;d.querySelector<HTMLInputElement>('#access-email')!.value='synthetic@example.invalid';d.querySelector('#access-request')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();await tick();assert.deepEqual(requests.find(r=>r.path==='/api/operator-email/password-reset').body,{email:'synthetic@example.invalid',language:'en'});assert.match(d.querySelector('#access-status')!.textContent!,/If an eligible account exists/);assert.equal(dom.window.location.href,'http://localhost/operator-access');assert.equal(dom.window.localStorage.length,0);
}));
test('password reset checks confirmation, clears both passwords and offers recovery after an invalid link',async()=>fixture('#reset='+token,async(dom,requests)=>{
 const d=dom.window.document,password=d.querySelector<HTMLInputElement>('#reset-password')!,repeat=d.querySelector<HTMLInputElement>('#reset-password-repeat')!,form=d.querySelector('#access-reset')!;
 password.value='synthetic-password';repeat.value='different-password';form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();assert.equal(requests.length,0);assert.equal(repeat.validity.customError,true);
 repeat.value=password.value;repeat.dispatchEvent(new dom.window.Event('input'));form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();await tick();const sent=requests.find(r=>r.path==='/api/operator-email/reset').body;assert.deepEqual(sent,{token,password:'synthetic-password',language:'en'});assert.equal(password.value,'');assert.equal(repeat.value,'');assert.match(d.querySelector('#access-status')!.textContent!,/invalid, expired/);assert.equal(d.querySelector<HTMLElement>('#access-new-link')!.hidden,false);
},true));

test('account access offers two labelled SVG submit actions instead of a dropdown',async()=>fixture('',async(dom,requests)=>{
 const d=dom.window.document,form=d.querySelector<HTMLFormElement>('#access-request')!,buttons=Array.from(form.querySelectorAll<HTMLButtonElement>('button[type=submit]'));
 assert.equal(form.querySelector('select'),null);assert.equal(buttons.length,2);assert.deepEqual(buttons.map(b=>b.value),['password-reset','verification']);
 assert.ok(buttons.every(b=>b.querySelector('svg[aria-hidden=true]')&&b.querySelector('span')?.textContent));assert.equal(form.textContent!.includes('For privacy, the response does not reveal'),false);
 d.querySelector<HTMLInputElement>('#access-email')!.value='synthetic@example.invalid';buttons[1].click();assert.ok(buttons.every(b=>b.disabled));buttons[0].click();await tick();await tick();
 assert.deepEqual(requests.filter(r=>r.path.startsWith('/api/operator-email/')).map(r=>r.path),['/api/operator-email/verification']);assert.ok(buttons.every(b=>!b.disabled));assert.match(d.querySelector('#access-status')!.textContent!,/If an eligible account exists/);
 buttons[0].click();await tick();await tick();assert.equal(requests.at(-1).path,'/api/operator-email/password-reset');
}));


test('access action corners override the generic soft-style pill rule',()=>{
 const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');
 assert.match(css,/\.account-access-actions \.account-access-action\s*\{[^}]*border-radius:\s*6px/);
});
