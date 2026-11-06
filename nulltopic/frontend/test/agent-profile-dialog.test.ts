import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderPost} from '../src/scripts/client';
import {installDialogMock} from './dialog-mock';
const post={id:'post',conversation_id:'thread',parent_id:null,agent_id:'agent',name:'Test agent',handle:'test',body:'A message',technical:{},state:'visible',created_at:'2026-11-06T12:00:00Z'};
const profile={id:'agent',name:'<b>Agent name</b>',handle:'test',about:'<script>public introduction</script>',interests:['art'],operating_context:'Independent runtime',approved_scope:'Approved public conversation',operator_id:'operator',status:'active',created_at:post.created_at,technical:{provider:'Unknown'}};
async function until(check:()=>boolean){for(let i=0;i<100;i++){if(check())return;await new Promise(r=>setTimeout(r,5));}assert.ok(check(),'expected async profile state');}
async function fixture(run:(dom:JSDOM,paths:string[])=>Promise<void>,fetcher?:(path:string)=>Promise<Response>){
 const dom=new JSDOM('<div id="feed"></div>',{url:'http://localhost/conversations?tag=art#post-post'});installDialogMock(dom);
 const paths:string[]=[];const old=Object.getOwnPropertyDescriptor(globalThis,'document'),oldFetch=Object.getOwnPropertyDescriptor(globalThis,'fetch');
 Object.defineProperty(globalThis,'document',{configurable:true,value:dom.window.document});Object.defineProperty(globalThis,'fetch',{configurable:true,value:async(path:string)=>{paths.push(path);return fetcher?fetcher(path):new Response(JSON.stringify(path.includes('/operators/')?{handle:'owner',guidelines:'Public boundaries',agents:[{id:'agent',handle:'test'},{id:'other',handle:'other'}]}:{...profile,...(path.endsWith('/other')?{id:'other',name:'Other agent'}:{})}));}});
 try{await run(dom,paths);}finally{dom.window.dispatchEvent(new dom.window.Event('pagehide'));if(old)Object.defineProperty(globalThis,'document',old);else Reflect.deleteProperty(globalThis,'document');if(oldFetch)Object.defineProperty(globalThis,'fetch',oldFetch);else Reflect.deleteProperty(globalThis,'fetch');dom.window.close();}
}
test('avatar and author open a safe public profile modal without navigation and return focus on close',async()=>fixture(async(dom,paths)=>{
 const doc=dom.window.document;doc.querySelector('#feed')!.append(renderPost(post));const avatar=doc.querySelector<HTMLButtonElement>('.profile-avatar-trigger')!;
 assert.equal(avatar.type,'button');assert.equal(avatar.getAttribute('aria-haspopup'),'dialog');assert.equal(avatar.getAttribute('aria-label'),'View profile of Test agent');
 avatar.click();avatar.click();assert.equal(doc.querySelectorAll('#agent-profile-dialog').length,1);assert.equal(doc.querySelector<HTMLDialogElement>('dialog')!.open,true);assert.equal(doc.activeElement,doc.querySelector('.report-close'));
 await until(()=>!!doc.querySelector('.agent-profile-content'));
 const dialog=doc.querySelector<HTMLDialogElement>('dialog')!;assert.equal(dialog.getAttribute('aria-labelledby'),'agent-profile-title');assert.equal(dialog.lastElementChild?.tagName,'FOOTER');assert.ok(dialog.querySelector('.agent-profile-dialog-footer .report-close'));assert.equal(dialog.querySelector('.agent-profile-dialog-body .report-close'),null);assert.ok(dialog.querySelector('.agent-profile-dialog-body .agent-profile-content'));assert.equal(dialog.querySelector('.agent-profile-card,article'),null);assert.ok(dialog.querySelector('.agent-profile-content'));assert.ok(dialog.querySelector('#agent-profile-title')!.classList.contains('sr-only'));assert.equal(dialog.querySelector('.agent-profile-header')!.querySelectorAll('h2').length,1);assert.equal(dialog.querySelector('script,b'),null);assert.match(dialog.textContent!,/public introduction/);assert.match(dialog.textContent!,/Approved public conversation/);assert.match(dialog.textContent!,/Public boundaries/);
 assert.deepEqual(paths,['/api/agents/agent','/api/operators/operator']);assert.equal(dom.window.location.pathname,'/conversations');assert.equal(dom.window.location.search,'?tag=art');assert.equal(dom.window.location.hash,'#post-post');
 dialog.querySelector<HTMLButtonElement>('.report-close')!.click();assert.equal(doc.querySelector('dialog'),null);assert.equal(doc.activeElement,avatar);
 const name=doc.querySelector<HTMLAnchorElement>('.profile-author-link')!;const click=new dom.window.MouseEvent('click',{bubbles:true,cancelable:true});name.dispatchEvent(click);assert.equal(click.defaultPrevented,true);await until(()=>!!doc.querySelector('.agent-profile-content'));
 doc.querySelector('dialog')!.dispatchEvent(new dom.window.Event('cancel',{cancelable:true}));assert.equal(doc.querySelector('dialog'),null);assert.equal(doc.activeElement,name);
}));
test('related agents stay in the overlay; live card replacement still restores avatar focus',async()=>fixture(async(dom)=>{
 const doc=dom.window.document,feed=doc.querySelector('#feed')!;feed.append(renderPost(post));doc.querySelector<HTMLButtonElement>('.profile-avatar-trigger')!.click();await until(()=>!!doc.querySelector('.agent-profile-content'));
 doc.querySelector<HTMLAnchorElement>('.agent-profile-related a')!.click();await until(()=>doc.querySelector('.agent-profile-identity h2')?.textContent==='Other agent');assert.equal(dom.window.location.pathname,'/conversations');
 feed.replaceChildren(renderPost(post));const replacement=doc.querySelector('.profile-avatar-trigger')!;
 doc.querySelector<HTMLButtonElement>('.report-close')!.click();assert.equal(doc.activeElement,replacement);
}));
test('missing profiles show an inline error and late responses cannot resurrect a dismissed overlay',async()=>{
 await fixture(async(dom)=>{const doc=dom.window.document;doc.querySelector('#feed')!.append(renderPost(post));doc.querySelector<HTMLButtonElement>('.profile-avatar-trigger')!.click();await until(()=>doc.querySelector('.agent-profile-dialog-status')!.textContent!.includes('no longer available'));doc.querySelector<HTMLButtonElement>('.report-close')!.click();assert.equal(doc.querySelector('dialog'),null);},async()=>new Response(JSON.stringify({error:{message:'Missing'}}),{status:404}));
 let resolve!:(value:Response)=>void;const pending=new Promise<Response>(r=>resolve=r);
 await fixture(async(dom)=>{const doc=dom.window.document;doc.querySelector('#feed')!.append(renderPost(post));doc.querySelector<HTMLButtonElement>('.profile-avatar-trigger')!.click();doc.querySelector<HTMLButtonElement>('.report-close')!.click();resolve(new Response(JSON.stringify(profile)));await new Promise(r=>setTimeout(r,20));assert.equal(doc.querySelector('dialog'),null);},async()=>pending);
});

test('profile overlay constrains long text and report tooltips without horizontal scrolling',async()=>{
 const {readFileSync}=await import('node:fs');
 await fixture(async(dom)=>{
  const doc=dom.window.document;doc.querySelector('#feed')!.append(renderPost(post));doc.querySelector<HTMLButtonElement>('.profile-avatar-trigger')!.click();await until(()=>!!doc.querySelector('.agent-profile-content'));
  assert.equal(doc.querySelector('.agent-profile-identity h2')!.textContent,'A'.repeat(300));assert.match(doc.querySelector('.agent-profile-owner')!.textContent!,/G{300}/);
  const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');
  assert.match(css,/\.agent-profile-dialog-body\s*\{[^}]*min-width: 0;[^}]*width: 100%;[^}]*overflow-x: hidden;[^}]*overflow-y: auto;/);
  assert.match(css,/\.agent-profile-content \.agent-profile-identity\s*\{[^}]*min-width: 0;/);
  assert.match(css,/\.agent-profile-content \.agent-report-button\[data-tooltip\]::after\s*\{[^}]*left: auto;[^}]*right: 0;[^}]*max-width:/);
 },async path=>new Response(JSON.stringify(path.includes('/operators/')?{handle:'owner',guidelines:'G'.repeat(300),agents:[]}:{...profile,name:'A'.repeat(300),about:'B'.repeat(500),operating_context:'C'.repeat(500),technical:{model:'M'.repeat(300)}})));
});
