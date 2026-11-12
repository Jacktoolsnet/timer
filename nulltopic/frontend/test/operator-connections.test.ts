import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {initializeOperatorConnections} from '../src/scripts/operator-connections';
import {connectionCounts} from '../src/scripts/connection-counts';
import {installDialogMock} from './dialog-mock';
const tick=()=>new Promise(r=>setTimeout(r,0));
async function fixture(run:(dom:JSDOM,manager:ReturnType<typeof initializeOperatorConnections>,reads:string[],writes:any[],state:{fail:boolean;hold:boolean;release?:()=>void})=>Promise<void>){
 const dom=new JSDOM(readFileSync(new URL('../dist/operator/index.html',import.meta.url),'utf8'),{url:'http://localhost/operator#connections/agent/owned'});installDialogMock(dom);
 const saved=Object.getOwnPropertyDescriptor(globalThis,'document'),fetchSaved=Object.getOwnPropertyDescriptor(globalThis,'fetch');
 const reads:string[]=[],writes:any[]=[],state:{fail:boolean;hold:boolean;release?:()=>void}={fail:false,hold:false};
 Object.defineProperty(globalThis,'document',{value:dom.window.document,configurable:true});Object.defineProperty(globalThis,'fetch',{value:async(path:string)=>{reads.push(path);if(state.hold)await new Promise<void>(resolve=>state.release=resolve);return new Response(JSON.stringify({items:[{id:'other',name:'<img src=x onerror=alert(1)>',handle:'untrusted',has_avatar:false}],following_count:3,follower_count:7,nextCursor:reads.length===1?'next':null}));},configurable:true});
 const manager=initializeOperatorConnections({send:async(path,body,method)=>{writes.push({path,body,method});if(state.fail)throw Error('synthetic failure');return {ok:true};},refresh:async()=>{},failure:async()=>{}});
 try{dom.window.document.getElementById('operator-connections')!.hidden=false;await run(dom,manager,reads,writes,state);}finally{manager.clear();dom.window.close();if(saved)Object.defineProperty(globalThis,'document',saved);else Reflect.deleteProperty(globalThis,'document');if(fetchSaved)Object.defineProperty(globalThis,'fetch',fetchSaved);}
}
test('connections are owner-scoped, safe, paginated and only removed after explicit modal confirmation',async()=>fixture(async(dom,manager,reads,writes)=>{
 const d=dom.window.document;manager.open('owned',{id:'owned',name:'Owner agent',handle:'owner'});await tick();await tick();assert.ok(reads[0].includes('/operator/agents/owned/connections?direction=following'));
 assert.equal(d.querySelector('.operator-connection-identity img'),null);assert.ok(d.querySelector('.operator-connection-identity')!.textContent!.includes('<img'));assert.equal(d.querySelector('.operator-connection-identity')!.getAttribute('href'),'/agents?id=other');assert.equal(d.querySelector('[data-connection-count=followers]')!.textContent,'7');
 d.querySelector<HTMLButtonElement>('#operator-connections-more')!.click();await tick();assert.ok(reads[1].includes('after=next'));
 d.querySelector<HTMLButtonElement>('[data-end-connection]')!.click();assert.equal(writes.length,0);assert.equal(d.querySelector<HTMLDialogElement>('#operator-connection-dialog')!.open,true);d.querySelector<HTMLButtonElement>('#operator-connection-dialog [data-dialog-close]')!.click();assert.equal(writes.length,0);
 d.querySelector<HTMLButtonElement>('[data-end-connection]')!.click();d.querySelector<HTMLButtonElement>('#operator-connection-remove')!.click();await tick();await tick();assert.deepEqual(writes[0],{path:'/operator/agents/owned/following/other',body:{},method:'DELETE'});
 d.querySelector<HTMLButtonElement>('[data-connection-direction=followers]')!.click();await tick();assert.ok(reads.at(-1)!.includes('direction=followers'));d.querySelector<HTMLButtonElement>('[data-end-connection]')!.click();assert.equal(d.querySelector<HTMLButtonElement>('[data-end-connection]')!.dataset.tooltip,'Remove follower');d.querySelector<HTMLButtonElement>('#operator-connection-remove')!.click();await tick();assert.equal(writes.at(-1).path,'/operator/agents/owned/followers/other');
}));
test('failed removal stays retryable; hiding clears private content and ignores late reads',async()=>fixture(async(dom,manager,_reads,writes,state)=>{
 const d=dom.window.document;manager.open('owned');await tick();d.querySelector<HTMLButtonElement>('[data-end-connection]')!.click();state.fail=true;d.querySelector<HTMLButtonElement>('#operator-connection-remove')!.click();d.querySelector<HTMLButtonElement>('#operator-connection-remove')!.click();await tick();assert.equal(writes.length,1);assert.equal(d.querySelector<HTMLDialogElement>('#operator-connection-dialog')!.open,true);assert.ok(d.querySelector('#operator-connection-dialog .workspace-dialog-status')!.textContent);
 manager.hide();assert.equal(d.querySelector('#operator-connection-list')!.children.length,0);state.hold=true;manager.open('other');await tick();manager.clear();state.release?.();await tick();assert.equal(d.querySelector('#operator-connection-list')!.children.length,0);
}));
test('public connection counts show localized aggregates without exposing a private list',async()=>fixture(async(dom)=>{
 dom.window.document.documentElement.lang='de';const counts=connectionCounts({following_count:12,follower_count:8});assert.deepEqual([...counts.querySelectorAll('dt')].map(n=>n.textContent),['Folgt','Follower']);assert.deepEqual([...counts.querySelectorAll('dd')].map(n=>n.textContent),['12','8']);assert.equal(counts.querySelector('a,button'),null);
}));
