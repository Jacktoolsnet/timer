import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {JSDOM} from 'jsdom';
import {initializeOperatorRegistration} from '../src/scripts/operator-registration';import {declarations} from '../../shared/declarations';
const html=readFileSync(new URL('../dist/operator/index.html',import.meta.url),'utf8');const tick=()=>new Promise(r=>setTimeout(r,0));
async function fixture(run:(dom:JSDOM,requests:any[])=>Promise<void>,fail=false){
 const dom=new JSDOM(html,{url:'http://localhost/operator'}),requests:any[]=[];
 dom.window.document.querySelector<HTMLElement>('#operator-login-shell')!.hidden=false;dom.window.document.querySelector<HTMLDetailsElement>('#operator-registration')!.open=true;
 const values={document:dom.window.document,FormData:dom.window.FormData,fetch:async(path:string,init?:RequestInit)=>{requests.push({path,body:init?.body?JSON.parse(String(init.body)):undefined});return new Response(JSON.stringify(path==='/api/session'?{csrf:'fixture'}:fail?{error:{message:'Unavailable'}}:{id:'fixture'}),{status:fail&&path!=='/api/session'?409:200});}};
 const previous=Object.keys(values).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)] as const);for(const [k,v]of Object.entries(values))Object.defineProperty(globalThis,k,{configurable:true,value:v});
 try{initializeOperatorRegistration();await run(dom,requests);}finally{for(const[k,v]of previous)if(v)Object.defineProperty(globalThis,k,v);else Reflect.deleteProperty(globalThis,k);dom.window.close();}
}
test('personal registration requires explicit age; organization adds a separate unchecked declaration',async()=>fixture(async(dom,requests)=>{
 const d=dom.window.document,form=d.querySelector<HTMLFormElement>('#operator-register')!,type=d.querySelector<HTMLSelectElement>('#register-type')!,age=form.querySelector<HTMLInputElement>('[name=ageConfirmed]')!,organization=form.querySelector<HTMLInputElement>('[name=organizationAuthorized]')!;
 d.querySelector<HTMLInputElement>('#register-handle')!.value='fixture_operator';d.querySelector<HTMLInputElement>('#register-password')!.value='synthetic-password';
 const submit=()=>form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
 assert.equal(age.checked,false);assert.equal(organization.checked,false);assert.equal(organization.disabled,true);submit();await tick();assert.equal(requests.length,0);
 age.checked=true;type.value='organization';type.dispatchEvent(new dom.window.Event('change'));assert.equal(organization.required,true);assert.equal(organization.disabled,false);submit();await tick();assert.equal(requests.length,0);
 organization.checked=true;submit();await tick();await tick();
 const sent=requests.find(r=>r.path==='/api/operator-registrations').body;assert.equal(sent.ageConfirmed,true);assert.equal(sent.organizationAuthorized,true);assert.equal(sent.accountType,'organization');assert.equal(sent.ageVersion,declarations.age.version);assert.equal(sent.organizationVersion,declarations.organization.version);assert.equal(sent.age_confirmed_at,undefined);
 assert.equal(d.querySelector<HTMLInputElement>('#register-password')!.value,'');assert.equal(age.checked,false);assert.equal(organization.checked,false);assert.equal(d.querySelector<HTMLInputElement>('#operator-handle')!.value,'fixture_operator');
}));
test('switching account types clears organization consent; failed registration is accessible and clears the password',async()=>fixture(async(dom,requests)=>{
 const d=dom.window.document,form=d.querySelector<HTMLFormElement>('#operator-register')!,type=d.querySelector<HTMLSelectElement>('#register-type')!,check=form.querySelector<HTMLInputElement>('[name=organizationAuthorized]')!;
 type.value='organization';type.dispatchEvent(new dom.window.Event('change'));check.checked=true;type.value='personal';type.dispatchEvent(new dom.window.Event('change'));assert.equal(check.checked,false);assert.equal(check.disabled,true);
 d.querySelector<HTMLInputElement>('#register-handle')!.value='fixture_operator';d.querySelector<HTMLInputElement>('#register-password')!.value='synthetic-password';form.querySelector<HTMLInputElement>('[name=ageConfirmed]')!.checked=true;
 form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();await tick();assert.equal(requests.find(r=>r.path==='/api/operator-registrations').body.organizationAuthorized,undefined);assert.match(d.querySelector('#register-feedback')!.textContent!,/Unable to create/);assert.equal(d.activeElement,d.querySelector('#register-feedback'));assert.equal(d.querySelector<HTMLInputElement>('#register-password')!.value,'');
},true));
