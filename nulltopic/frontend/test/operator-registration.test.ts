import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {JSDOM} from 'jsdom';
import {operatorLegal} from '../../shared/operator-legal';
import {initializeOperatorRegistration} from '../src/scripts/operator-registration';import {declarations} from '../../shared/declarations';
const html=readFileSync(new URL('../dist/operator/index.html',import.meta.url),'utf8');const tick=()=>new Promise(r=>setTimeout(r,0));
test('registration cancel action matches the submit size and sits on the left',()=>{
 const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');
 assert.match(css,/\.operator-registration \.report-actions\s*\{ justify-content: space-between; align-items: center;/);
 assert.match(css,/#register-cancel\s*\{ width: 60px; min-width: 60px; height: 60px; min-height: 60px;/);
});
async function fixture(run:(dom:JSDOM,requests:any[])=>Promise<void>,fail=false){
 const dom=new JSDOM(html,{url:'http://localhost/operator'}),requests:any[]=[];
 dom.window.document.querySelector<HTMLElement>('#operator-login-shell')!.hidden=false;const dialog=dom.window.document.querySelector<HTMLDialogElement>('#operator-registration')!;
 dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;dialog.dispatchEvent(new dom.window.Event('close'));};
 const values={document:dom.window.document,FormData:dom.window.FormData,fetch:async(path:string,init?:RequestInit)=>{requests.push({path,body:init?.body?JSON.parse(String(init.body)):undefined});return new Response(JSON.stringify(path==='/api/session'?{csrf:'fixture'}:fail?{error:{message:'Unavailable'}}:{id:'fixture'}),{status:fail&&path!=='/api/session'?409:200});}};
 const previous=Object.keys(values).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)] as const);for(const [k,v]of Object.entries(values))Object.defineProperty(globalThis,k,{configurable:true,value:v});
 try{dom.window.document.querySelector<HTMLInputElement>('#register-email')!.value='fixture@example.invalid';initializeOperatorRegistration();dom.window.document.querySelector<HTMLButtonElement>('#open-operator-registration')!.click();await run(dom,requests);}finally{for(const[k,v]of previous)if(v)Object.defineProperty(globalThis,k,v);else Reflect.deleteProperty(globalThis,k);dom.window.close();}
}
test('personal registration requires explicit age; organization adds a separate unchecked declaration',async()=>fixture(async(dom,requests)=>{
 const d=dom.window.document,form=d.querySelector<HTMLFormElement>('#operator-register')!,type=d.querySelector<HTMLSelectElement>('#register-type')!,age=form.querySelector<HTMLInputElement>('[name=ageConfirmed]')!,organization=form.querySelector<HTMLInputElement>('[name=organizationAuthorized]')!;
 d.querySelector<HTMLInputElement>('#register-handle')!.value='fixture_operator';d.querySelector<HTMLInputElement>('#register-password')!.value='synthetic-password';d.querySelector<HTMLInputElement>('#register-password-repeat')!.value='synthetic-password';
 const submit=()=>form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
 assert.equal(age.checked,false);assert.equal(organization.checked,false);assert.equal(organization.disabled,true);submit();await tick();assert.equal(requests.length,0);
 age.checked=true;form.querySelector<HTMLInputElement>('[name=termsAccepted]')!.checked=true;type.value='organization';type.dispatchEvent(new dom.window.Event('change'));assert.equal(organization.required,true);assert.equal(organization.disabled,false);submit();await tick();assert.equal(requests.length,0);
 organization.checked=true;submit();await tick();await tick();
 const sent=requests.find(r=>r.path==='/api/operator-registrations').body;assert.equal(sent.termsAccepted,true);assert.equal(sent.termsVersion,operatorLegal.terms.version);assert.equal(sent.privacyVersion,operatorLegal.privacy.version);assert.equal(sent.email,'fixture@example.invalid');assert.equal(sent.language,'en');assert.equal(sent.ageConfirmed,true);assert.equal(sent.organizationAuthorized,true);assert.equal(sent.accountType,'organization');assert.equal(sent.ageVersion,declarations.age.version);assert.equal(sent.organizationVersion,declarations.organization.version);assert.equal(sent.age_confirmed_at,undefined);
 assert.equal(d.querySelector<HTMLInputElement>('#register-password')!.value,'');assert.equal(d.querySelector<HTMLInputElement>('#register-password-repeat')!.value,'');assert.equal(age.checked,false);assert.equal(organization.checked,false);assert.equal(d.querySelector<HTMLInputElement>('#operator-handle')!.value,'fixture_operator');
}));
test('switching account types clears organization consent; failed registration is accessible and clears the password',async()=>fixture(async(dom,requests)=>{
 const d=dom.window.document,form=d.querySelector<HTMLFormElement>('#operator-register')!,type=d.querySelector<HTMLSelectElement>('#register-type')!,check=form.querySelector<HTMLInputElement>('[name=organizationAuthorized]')!;
 type.value='organization';type.dispatchEvent(new dom.window.Event('change'));check.checked=true;type.value='personal';type.dispatchEvent(new dom.window.Event('change'));assert.equal(check.checked,false);assert.equal(check.disabled,true);
 d.querySelector<HTMLInputElement>('#register-handle')!.value='fixture_operator';d.querySelector<HTMLInputElement>('#register-password')!.value='synthetic-password';d.querySelector<HTMLInputElement>('#register-password-repeat')!.value='synthetic-password';form.querySelector<HTMLInputElement>('[name=ageConfirmed]')!.checked=true;form.querySelector<HTMLInputElement>('[name=termsAccepted]')!.checked=true;
 form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();await tick();assert.equal(requests.find(r=>r.path==='/api/operator-registrations').body.organizationAuthorized,undefined);assert.match(d.querySelector('#register-feedback')!.textContent!,/Unable to create/);assert.equal(d.activeElement,d.querySelector('#register-feedback'));assert.equal(d.querySelector<HTMLInputElement>('#register-password')!.value,'');assert.equal(d.querySelector<HTMLInputElement>('#register-password-repeat')!.value,'');
},true));

test('registration opens from the illustration column; cancel clears declarations and returns focus',async()=>fixture(async(dom)=>{
 const d=dom.window.document,dialog=d.querySelector<HTMLDialogElement>('#operator-registration')!,trigger=d.querySelector<HTMLButtonElement>('#open-operator-registration')!;
 assert.equal(dialog.open,true);assert.ok(trigger.closest('.admin-login-art'));assert.equal(trigger.closest('form'),null);assert.equal(trigger.type,'button');
 const age=d.querySelector<HTMLInputElement>('[name=ageConfirmed]')!;assert.equal(age.getAttribute('role'),'switch');age.checked=true;
 d.querySelector<HTMLInputElement>('#register-password')!.value='synthetic-password';d.querySelector<HTMLInputElement>('#register-password-repeat')!.value='synthetic-password';d.querySelector<HTMLButtonElement>('#register-cancel')!.click();
 assert.equal(dialog.open,false);assert.equal(age.checked,false);assert.equal(d.querySelector<HTMLInputElement>('#register-password')!.value,'');assert.equal(d.querySelector<HTMLInputElement>('#register-password-repeat')!.value,'');assert.equal(d.activeElement,trigger);
 trigger.click();assert.equal(dialog.open,true);assert.equal(age.checked,false);
}));

test('password confirmation blocks mismatches locally and is never sent to the API',async()=>fixture(async(dom,requests)=>{
 const d=dom.window.document,form=d.querySelector<HTMLFormElement>('#operator-register')!,password=d.querySelector<HTMLInputElement>('#register-password')!,repeat=d.querySelector<HTMLInputElement>('#register-password-repeat')!;
 assert.equal(password.minLength,12);assert.equal(password.maxLength,256);assert.equal(repeat.required,true);assert.equal(repeat.minLength,12);assert.equal(repeat.maxLength,256);assert.match(d.querySelector('#register-password-rules')!.textContent!,/12–256/);
 d.querySelector<HTMLInputElement>('#register-handle')!.value='fixture_operator';form.querySelector<HTMLInputElement>('[name=ageConfirmed]')!.checked=true;form.querySelector<HTMLInputElement>('[name=termsAccepted]')!.checked=true;
 password.value='synthetic-password';repeat.value='different-password';repeat.dispatchEvent(new dom.window.Event('input'));
 assert.equal(repeat.validity.customError,true);assert.equal(repeat.getAttribute('aria-invalid'),'true');assert.match(repeat.validationMessage,/do not match/);
 form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();assert.equal(requests.length,0);
 password.value=repeat.value;password.dispatchEvent(new dom.window.Event('input'));assert.equal(repeat.validity.customError,false);assert.equal(repeat.hasAttribute('aria-invalid'),false);
 form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();await tick();
 const body=requests.find(r=>r.path==='/api/operator-registrations').body;assert.equal(body.password,'different-password');assert.equal(body.passwordConfirmation,undefined);assert.equal(body.repeat,undefined);assert.equal(repeat.value,'');assert.equal(password.value,'');
}));

test('registration requires a syntactically valid private email address',async()=>fixture(async(dom,requests)=>{
 const d=dom.window.document,email=d.querySelector<HTMLInputElement>('#register-email')!;assert.equal(email.required,true);assert.equal(email.autocomplete,'email');
 email.value='not-an-email';assert.equal(email.validity.typeMismatch,true);d.querySelector('#operator-register')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();assert.equal(requests.length,0);
}));

test('registration offers separate legal links and requires explicit terms agreement before enabling submission',async()=>fixture(async(dom,requests)=>{
 const d=dom.window.document,form=d.querySelector<HTMLFormElement>('#operator-register')!,terms=form.querySelector<HTMLInputElement>('[name=termsAccepted]')!,button=form.querySelector<HTMLButtonElement>('button[type=submit]')!;
 assert.equal(terms.checked,false);assert.equal(terms.required,true);assert.equal(terms.getAttribute('role'),'switch');assert.equal(button.disabled,true);
 for(const path of [operatorLegal.terms.path,operatorLegal.privacy.path]){const link=form.querySelector<HTMLAnchorElement>(`a[href="${path}/en"]`)!;assert.ok(link);assert.equal(link.target,'_blank');assert.match(link.rel,/noopener/);}
 assert.equal(form.querySelector('[name=privacyAccepted]'),null);assert.equal(form.querySelector('.operator-registration-legal p'),null);
 d.querySelector<HTMLInputElement>('#register-handle')!.value='fixture_operator';d.querySelector<HTMLInputElement>('#register-password')!.value='synthetic-password';d.querySelector<HTMLInputElement>('#register-password-repeat')!.value='synthetic-password';form.querySelector<HTMLInputElement>('[name=ageConfirmed]')!.checked=true;
 form.dispatchEvent(new dom.window.Event('input'));assert.equal(button.disabled,true);
 form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();assert.equal(requests.length,0);
 terms.checked=true;terms.dispatchEvent(new dom.window.Event('change',{bubbles:true}));assert.equal(button.disabled,false);
 terms.checked=false;terms.dispatchEvent(new dom.window.Event('change',{bubbles:true}));assert.equal(button.disabled,true);
 d.querySelector<HTMLButtonElement>('#register-cancel')!.click();d.querySelector<HTMLButtonElement>('#open-operator-registration')!.click();assert.equal(terms.checked,false);assert.equal(button.disabled,true);
}));

test('operator privacy and imprint reuse visitor tiles, SVGs and copy with audience-specific links',async()=>fixture(async(dom)=>{
 const d=dom.window.document,form=d.querySelector<HTMLFormElement>('#operator-register')!;
 const operator=[...form.querySelectorAll<HTMLAnchorElement>('.visitor-document-links>a.visitor-document-tile')],visitor=[...d.querySelectorAll<HTMLAnchorElement>('#visitor-confirmation .visitor-document-tile')];
 assert.equal(operator.length,2);assert.equal(visitor.length,2);
 for(let i=0;i<2;i++){
  assert.equal(operator[i].innerHTML,visitor[i].innerHTML);assert.equal(operator[i].className,visitor[i].className);
  assert.equal(operator[i].target,'_blank');assert.equal(operator[i].rel,'noopener noreferrer');assert.equal(operator[i].querySelector('input,button,a'),null);
 }
 assert.equal(operator[0].getAttribute('href'),operatorLegal.privacy.path+'/en');assert.equal(new URL(operator[1].href).pathname,'/impressum');assert.equal(new URL(operator[1].href).searchParams.get('lang'),'en');
 assert.equal(form.querySelector('[data-visitor-privacy],[data-visitor-imprint]'),null);
 assert.equal(form.querySelector('#register-terms-link')!.nextElementSibling,operator[0].parentElement);
 assert.equal(form.querySelector('label a'),null);
}));

test('desktop registration separates credentials from confirmations without changing form or field order',()=>{
 const dom=new JSDOM(html),d=dom.window.document,form=d.querySelector('#operator-register')!;
 try{
  const fields=form.querySelector('.operator-registration-fields')!,confirmations=form.querySelector('.operator-registration-confirmations')!;
  for(const name of ['handle','email','password'])assert.ok(fields.querySelector(`[name=${name}]`));
  for(const name of ['accountType','ageConfirmed','organizationAuthorized','termsAccepted'])assert.ok(confirmations.querySelector(`[name=${name}]`));
  assert.equal(confirmations.firstElementChild?.getAttribute('for'),'register-type');assert.ok(confirmations.querySelector('.visitor-document-links'));assert.equal(form.querySelector('.report-actions')!.parentElement,form);
  assert.deepEqual([...form.querySelectorAll('input,select')].map(e=>e.getAttribute('name')||e.id),['handle','email','password','register-password-repeat','accountType','ageConfirmed','organizationAuthorized','termsAccepted']);
  const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');assert.match(css,/@media \(min-width: 1000px\)\s*\{\s*\.operator-registration \{ width: min\(1000px, calc\(100vw - 64px\)\)/);
 }finally{dom.window.close();}
});
