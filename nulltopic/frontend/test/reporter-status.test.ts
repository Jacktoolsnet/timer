import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {initializeReporterStatus} from '../src/scripts/reporter-status';
const html=readFileSync(new URL('../dist/dsa/index.html',import.meta.url),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,0));
test('report actions share a compact toolbar inside the information tile',()=>{
 const dom=new JSDOM(html),d=dom.window.document;
 const toolbar=d.querySelector('.report-status-information .report-status-toolbar');
 assert.ok(toolbar);
 assert.equal(toolbar.getAttribute('role'),'group');
 for(const id of ['report-status-refresh','report-stop-emails']){
  const button: HTMLButtonElement=toolbar.querySelector<HTMLButtonElement>('#'+id)!;
  assert.ok(button);assert.ok(button.querySelector('svg'));
  assert.equal(button.textContent,'');assert.equal(button.dataset.tooltip,button.getAttribute('aria-label'));
 }
 assert.equal(d.querySelectorAll('.report-status-grid > .report-status-tile').length,2);
 assert.ok(d.querySelector('.report-status-information #report-status-details'));
 assert.equal(d.getElementById('report-status-summary'),null);
 assert.ok(!d.querySelector('.report-status-information')!.textContent!.includes('Use the private link you received'));
 dom.window.close();
});
async function fixture(run:(d:Document,w:JSDOM['window'],calls:any[])=>Promise<void>,hash='#receipt='+'a'.repeat(43),failure=false){
 const dom=new JSDOM(html,{url:'http://localhost:4321/dsa'+hash}),calls:any[]=[],old=new Map<string,PropertyDescriptor|undefined>();
 for(const [key,value] of Object.entries({document:dom.window.document,window:dom.window,fetch:async(path:string,options:any)=>{calls.push({path,...options,body:JSON.parse(options.body)});return new Response(JSON.stringify({status:'decided',emailNotifications:true,events:[{kind:'decision',action:'dismiss',response:'<img src=x onerror=alert(1)>',created_at:'2026-11-10T10:00:00Z'}]}),{status:failure?404:200});}})){old.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value});}
 try{initializeReporterStatus();await tick();await run(dom.window.document,dom.window,calls);}finally{dom.window.dispatchEvent(new dom.window.Event('pagehide'));dom.window.close();for(const [key,value] of old){if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key);}}
}
test('reporter status is account-free, secret-body-only, no-referrer and uses safe literal response text',async()=>fixture(async(d,w,calls)=>{
 const contact=d.querySelector<HTMLAnchorElement>('#report-contact')!;
 assert.ok(contact.classList.contains('report-contact-button'));assert.ok(contact.querySelector('svg'));
 const mail=new URL(contact.href);assert.equal(mail.protocol,'mailto:');assert.equal(mail.pathname,'jacktoolsnet@gmail.com');assert.equal(mail.searchParams.get('subject'),'NullTopic – Report status');assert.equal(contact.target,'_blank');assert.equal(contact.rel,'noopener noreferrer');assert.equal(mail.searchParams.get('body'),'Hello, I have a question about my report:\r\n\r\nhttp://localhost:4321/dsa?lang=en#receipt='+ 'a'.repeat(43)+'\r\n\r\nMy question:\r\n');
 assert.equal(calls.length,1);assert.equal(calls[0].path,'/api/report-status');assert.equal(calls[0].credentials,'omit');assert.equal(calls[0].referrerPolicy,'no-referrer');assert.deepEqual(calls[0].body,{token:'a'.repeat(43)});assert.equal(d.querySelector('meta[name=referrer]')!.getAttribute('content'),'no-referrer');assert.equal(d.querySelector('meta[name=robots]')!.getAttribute('content'),'noindex,nofollow');assert.equal(d.querySelector('#visitor-confirmation[open],.ad'),null);assert.equal(d.getElementById('report-status-details')!.hidden,false);assert.equal(d.querySelector('#report-status-timeline img'),null);assert.ok(d.querySelector('#report-status-timeline')!.textContent!.includes('<img'));
 d.getElementById('report-stop-emails')!.click();await tick();await tick();assert.equal(calls[1].path,'/api/report-status/stop-emails');assert.ok(d.getElementById('report-status-feedback')!.textContent!.includes('stopped'));w.dispatchEvent(new w.Event('pagehide'));assert.equal(d.getElementById('report-status-details')!.hidden,true);assert.equal(new URL(contact.href).searchParams.get('body'),null);
}));
test('missing private link never fetches an account or status',async()=>fixture(async(d,_w,calls)=>{assert.equal(calls.length,0);assert.ok(d.getElementById('report-status-feedback')!.textContent!.includes('complete'));},''));
test('missing or purged receipt gives neutral error and no retained case details',async()=>fixture(async(d,_w,calls)=>{assert.equal(calls.length,1);assert.equal(d.getElementById('report-status-details')!.hidden,true);assert.ok(d.getElementById('report-status-feedback')!.textContent!.includes('unavailable'));},undefined,true));
