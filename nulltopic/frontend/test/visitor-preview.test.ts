import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {PRODUCTION_VISITOR_KEY} from '../src/lib/advertising';
import {initializeVisitorPreview,isVisitorPreviewHost,VISITOR_PREVIEW_KEY,VISITOR_PREVIEW_VERSION} from '../src/scripts/visitor-preview';
function fixture(host='localhost',stored?:string,language='de',production=false){
 const dom=new JSDOM(readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'),{url:(production?'https://':'http://')+host+'/'}),w=dom.window,d=w.document;
 const originals=new Map<string,PropertyDescriptor|undefined>();for(const [key,value] of Object.entries({document:d,window:w,localStorage:w.localStorage})){originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value});}
 if(production)d.body.dataset.productionVisitorConfirmation='true';
 d.documentElement.lang=language;const dialog=d.querySelector<HTMLDialogElement>('#visitor-confirmation')!;let shows=0;
 Object.defineProperty(dialog,'showModal',{value:()=>{shows++;dialog.open=true;}});Object.defineProperty(dialog,'close',{value:()=>{dialog.open=false;}});
 if(stored)w.localStorage.setItem(VISITOR_PREVIEW_KEY,stored);
 return {w,d,dialog,shows:()=>shows,close(){w.close();for(const [key,value] of originals){if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key);}}};
}
function toggle(f:ReturnType<typeof fixture>,id:string,value=true){const input=f.d.querySelector<HTMLInputElement>(id)!;input.checked=value;input.dispatchEvent(new f.w.Event('change',{bubbles:true}));}
function submit(f:ReturnType<typeof fixture>){f.dialog.querySelector('form')!.dispatchEvent(new f.w.Event('submit',{bubbles:true,cancelable:true}));}
test('preview is restricted to exact loopback hosts, not arbitrary local-looking or production domains',()=>{
 for(const host of ['localhost','127.0.0.1','[::1]'])assert.ok(isVisitorPreviewHost(host));for(const host of ['nulltopic.com','localhost.example.com','192.168.1.1','example.org'])assert.ok(!isVisitorPreviewHost(host));
 const f=fixture('example.org');try{initializeVisitorPreview();assert.equal(f.shows(),0);assert.equal(f.d.getElementById('visitor-preview-controls')!.hidden,true);assert.equal(f.w.localStorage.length,0);}finally{f.close();}
});
test('both switches start off; only both allow explicit confirmation; Escape does not bypass it',()=>{
 const f=fixture();try{initializeVisitorPreview();const button=f.d.querySelector<HTMLButtonElement>('#visitor-confirm')!;assert.equal(f.shows(),1);assert.ok(f.dialog.open);assert.equal(button.disabled,true);assert.equal(f.w.localStorage.length,0);
 submit(f);assert.ok(f.dialog.open);assert.equal(f.w.localStorage.length,0);toggle(f,'#visitor-age');assert.equal(button.disabled,true);toggle(f,'#visitor-terms');assert.equal(button.disabled,false);toggle(f,'#visitor-age',false);assert.equal(button.disabled,true);toggle(f,'#visitor-age');
 const escape=new f.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});f.dialog.dispatchEvent(escape);assert.ok(escape.defaultPrevented);const cancel=new f.w.Event('cancel',{cancelable:true});f.dialog.dispatchEvent(cancel);assert.ok(cancel.defaultPrevented);assert.ok(f.dialog.open);submit(f);assert.equal(f.dialog.open,false);assert.equal(f.w.localStorage.getItem(VISITOR_PREVIEW_KEY),VISITOR_PREVIEW_VERSION);assert.equal(f.w.sessionStorage.length,0);
 f.d.getElementById('visitor-preview-reopen')!.click();assert.equal(f.w.localStorage.getItem(VISITOR_PREVIEW_KEY),VISITOR_PREVIEW_VERSION);assert.equal(button.disabled,false);assert.equal(f.d.getElementById('visitor-withdraw')!.hidden,false);f.d.getElementById('visitor-withdraw')!.click();assert.equal(f.shows(),2);assert.ok(f.dialog.open);assert.equal(button.disabled,true);assert.equal(f.w.localStorage.getItem(VISITOR_PREVIEW_KEY),null);for(const input of f.dialog.querySelectorAll<HTMLInputElement>('input'))assert.equal(input.checked,false);
 }finally{f.close();}
});
test('current browser version skips preview, old versions do not; blocked storage cannot prevent confirmation',()=>{
 for(const [version,count] of [[VISITOR_PREVIEW_VERSION,0],['old-version',1],['2026-11-10-visitor-draft-1',1]] as const){const f=fixture('localhost',version);try{initializeVisitorPreview();assert.equal(f.shows(),count);}finally{f.close();}}
 const f=fixture();try{Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('blocked');}});initializeVisitorPreview();toggle(f,'#visitor-age');toggle(f,'#visitor-terms');submit(f);assert.equal(f.dialog.open,false);}finally{f.close();}
});
for(const language of ['en','de','es','fr'])test('preview uses human language and explicit German/English legal routes: '+language,()=>{
 const f=fixture('localhost',undefined,language);try{initializeVisitorPreview();assert.equal(f.dialog.querySelector<HTMLAnchorElement>('[data-visitor-terms]')!.getAttribute('href'),'/nutzungsbedingungen'+(language==='de'?'':'/en'));assert.ok(f.dialog.querySelector('a[target="_blank"][rel="noopener noreferrer"]'));assert.equal(f.dialog.querySelectorAll('input[role=switch]').length,2);assert.equal(f.dialog.querySelector('input[type=email],input[name=privacy],input[name=ads]'),null);assert.equal(f.dialog.querySelector('#visitor-preview-leave'),null);assert.equal(f.dialog.querySelector('.visitor-confirmation-actions a'),null);assert.equal(f.dialog.querySelector('#visitor-preview-notice,.visitor-preview-explanation,#visitor-preview-status'),null);assert.equal(f.dialog.querySelector('.visitor-session-information'),null);assert.doesNotMatch(f.dialog.textContent!,/local preview|local interface test|testbestätigung|Oberflächentest|vista previa|aperçu local/i);assert.equal(f.d.getElementById('visitor-preview-controls')!.hidden,false);}finally{f.close();}
});
test('only public page shells have the local preview, not legal documents or authenticated/technical areas',()=>{
 for(const route of ['datenschutz','datenschutz/en','nutzungsbedingungen','nutzungsbedingungen/en','impressum','operator','administration','operator-access','operator-recovery','notifications']){const dom=new JSDOM(readFileSync(new URL('../dist/'+route+'/index.html',import.meta.url),'utf8'));try{assert.equal(dom.window.document.querySelector('#visitor-confirmation'),null,route);}finally{dom.window.close();}}
 for(const route of ['conversations','conversation','agents','rules']){const dom=new JSDOM(readFileSync(new URL('../dist/'+route+'/index.html',import.meta.url),'utf8'));try{assert.ok(dom.window.document.querySelector('#visitor-confirmation'),route);}finally{dom.window.close();}}
});
test('shared confirmation and reset reconcile existing tabs using actual storage, including clear and history return',()=>{
 const f=fixture();try{
  initializeVisitorPreview();assert.ok(f.dialog.open);
  f.w.localStorage.setItem(VISITOR_PREVIEW_KEY,VISITOR_PREVIEW_VERSION);
  f.w.dispatchEvent(new f.w.StorageEvent('storage',{key:VISITOR_PREVIEW_KEY,newValue:VISITOR_PREVIEW_VERSION}));assert.equal(f.dialog.open,false);
  f.w.localStorage.removeItem(VISITOR_PREVIEW_KEY);
  f.w.dispatchEvent(new f.w.StorageEvent('storage',{key:VISITOR_PREVIEW_KEY,newValue:null}));assert.ok(f.dialog.open);assert.equal(f.d.querySelector<HTMLButtonElement>('#visitor-confirm')!.disabled,true);
  f.w.localStorage.setItem(VISITOR_PREVIEW_KEY,VISITOR_PREVIEW_VERSION);
  // A delayed invalidation must not override a newer confirmation.
  f.w.dispatchEvent(new f.w.StorageEvent('storage',{key:VISITOR_PREVIEW_KEY,newValue:null}));assert.equal(f.dialog.open,false);
  f.w.localStorage.clear();f.w.dispatchEvent(new f.w.StorageEvent('storage',{key:null}));assert.ok(f.dialog.open);
  f.w.localStorage.setItem(VISITOR_PREVIEW_KEY,VISITOR_PREVIEW_VERSION);f.w.dispatchEvent(new f.w.PageTransitionEvent('pageshow',{persisted:true}));assert.equal(f.dialog.open,false);
  f.w.localStorage.removeItem(VISITOR_PREVIEW_KEY);f.w.dispatchEvent(new f.w.PageTransitionEvent('pageshow',{persisted:true}));assert.ok(f.dialog.open);
  assert.equal(f.w.sessionStorage.length,0);assert.equal(f.w.document.cookie,'');
 }finally{f.close();}
});
test('privacy and imprint are whole-link illustrated tiles with an informational reading reminder',()=>{
 const f=fixture();try{initializeVisitorPreview();const tiles=f.dialog.querySelectorAll<HTMLAnchorElement>('.visitor-document-links>a.visitor-document-tile');assert.equal(tiles.length,2);
 for(const tile of tiles){assert.ok(tile.querySelector('.visitor-document-icon svg[viewBox]'));assert.ok(tile.querySelector('strong')!.textContent);assert.ok(tile.querySelector('.visitor-document-copy>span')!.textContent);assert.equal(tile.target,'_blank');assert.equal(tile.rel,'noopener noreferrer');assert.equal(tile.querySelector('input,button,a'),null);assert.ok(tile.querySelector('.sr-only')!.textContent);}
 assert.match(f.dialog.querySelector('.visitor-privacy-information')!.textContent!,/Bitte lies auch/);assert.equal(f.dialog.querySelectorAll('input').length,2);
 }finally{f.close();}
});

test('header review button follows House rules and is not in the footer',()=>{
 const f=fixture();try{const rules=f.d.querySelector('header nav a[href="/rules"]')!;assert.equal(rules.nextElementSibling?.id,'visitor-preview-controls');assert.ok(rules.nextElementSibling?.querySelector('#visitor-preview-reopen'));assert.equal(f.d.querySelector('footer #visitor-preview-reopen'),null);initializeVisitorPreview();assert.equal(f.d.querySelector<HTMLButtonElement>('#visitor-withdraw')!.hidden,true);}finally{f.close();}
});

test('failed removal retains the stored choice and shows an error instead of pretending to withdraw',()=>{
 const f=fixture('localhost',VISITOR_PREVIEW_VERSION);try{initializeVisitorPreview();f.d.getElementById('visitor-preview-reopen')!.click();Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('blocked');}});f.d.getElementById('visitor-withdraw')!.click();assert.equal(f.w.localStorage.getItem(VISITOR_PREVIEW_KEY),VISITOR_PREVIEW_VERSION);assert.equal(f.d.getElementById('visitor-withdraw-error')!.hidden,false);assert.ok(f.dialog.open);}finally{f.close();}
});


test('production advertising acknowledgement uses a separate choice and never migrates local preview acceptance',()=>{
 const f=fixture('nulltopic.com',VISITOR_PREVIEW_VERSION,'de',true);
 try{
  let events=0;f.w.addEventListener('nulltopic:visitor-confirmation',()=>events++);
  initializeVisitorPreview();assert.equal(f.shows(),1);
  toggle(f,'#visitor-age');toggle(f,'#visitor-terms');submit(f);
  assert.equal(f.w.localStorage.getItem(PRODUCTION_VISITOR_KEY),VISITOR_PREVIEW_VERSION);assert.equal(events,1);
  f.d.querySelector<HTMLButtonElement>('#visitor-preview-reopen')!.click();
  f.d.querySelector<HTMLButtonElement>('#visitor-withdraw')!.click();
  assert.equal(f.w.localStorage.getItem(PRODUCTION_VISITOR_KEY),null);assert.equal(events,2);
 }finally{f.close();}
});
