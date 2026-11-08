import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {JSDOM} from 'jsdom';
import {initializeOperator} from '../src/scripts/operator';import {installDialogMock} from './dialog-mock';
const tick=()=>new Promise(r=>setTimeout(r,0));
async function fixture(run:(dom:JSDOM,state:any,requests:any[])=>Promise<void>){
 const dom=new JSDOM(readFileSync(new URL('../dist/operator/index.html',import.meta.url),'utf8'),{url:'http://localhost/operator',pretendToBeVisual:true});installDialogMock(dom);dom.window.scrollTo=()=>{};
 const state={denied:false,foreign:false,agents:[{id:'first',handle:'first_agent',name:'First agent',status:'active',operator_paused:false,approved_scope:'Public testing'}]},requests:any[]=[];
 const values={document:dom.window.document,location:dom.window.location,FormData:dom.window.FormData,fetch:async(path:string,init?:RequestInit)=>{
  const body=init?.body?JSON.parse(String(init.body)):undefined;requests.push({path,body});
  if(path==='/api/session')return new Response(JSON.stringify({operatorId:'owner',csrf:'fixture'}));
  if(path==='/api/operator/agent-updates')return new Response(JSON.stringify(state.denied?{error:{code:'UNAUTHORIZED'}}:{operatorId:state.foreign?'other':'owner',agents:state.agents}),{status:state.denied?401:200});
  if(path==='/api/operator')return new Response(JSON.stringify({operator:{handle:'fixture_operator',guidelines:'Keep drafts'},agents:state.agents,notices:[],review_requests:[]}));
  if(path==='/api/operator/agents/new/authorization')return new Response('{}',{status:409});
  throw Error('Unexpected synthetic request');
 }};
 const old=Object.keys(values).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)] as const);for(const[k,v]of Object.entries(values))Object.defineProperty(globalThis,k,{configurable:true,value:v});
 try{await initializeOperator();await run(dom,state,requests);}finally{dom.window.close();for(const[k,v]of old)if(v)Object.defineProperty(globalThis,k,v);else Reflect.deleteProperty(globalThis,k);}
}
const add=(state:any)=>state.agents.push({id:'new',handle:'new_agent',name:'New agent',status:'pending',operator_paused:false});
test('a new pending agent appears on focus; clicking its tile requests review but never authorizes it',async()=>fixture(async(dom,state,requests)=>{
 const d=dom.window.document;d.querySelector<HTMLButtonElement>('#operator-settings-tile')!.click();add(state);
 dom.window.dispatchEvent(new dom.window.Event('focus'));await tick();await tick();
 const tile=d.querySelector<HTMLButtonElement>('.operator-settings-agent[data-agent-id=new]')!;assert.ok(tile);assert.match(tile.textContent!,/Waiting for approval/);assert.match(tile.textContent!,/Review registration/);
 assert.equal(requests.some(r=>r.body),false,'automatic reads never issue authorization tokens');
 tile.click();await tick();await tick();assert.deepEqual(requests.find(r=>r.path==='/api/operator/agents/new/authorization').body,{});assert.equal(requests.some(r=>r.path==='/api/confirmation'),false);
}));
test('passive agent updates preserve participation drafts, selected editor, one-time key output and shared guidelines',async()=>fixture(async(dom,state)=>{
 const d=dom.window.document;d.querySelector<HTMLButtonElement>('#operator-settings-tile')!.click();d.querySelector<HTMLButtonElement>('.operator-settings-agent[data-agent-id=first]')!.click();
 d.querySelector<HTMLInputElement>('input[name=participation][value=paused]')!.click();d.querySelector('#operator-key-result')!.textContent='synthetic-one-time-display';
 add(state);dom.window.dispatchEvent(new dom.window.Event('focus'));await tick();await tick();
 assert.equal(d.querySelector<HTMLElement>('#operator-settings-editor')!.hidden,false);assert.equal(d.querySelector<HTMLInputElement>('input[name=participation][value=paused]')!.checked,true);assert.equal(d.querySelector<HTMLButtonElement>('#operator-header-save')!.disabled,false);assert.equal(d.querySelector('#operator-key-result')!.textContent,'synthetic-one-time-display');assert.equal(d.querySelector<HTMLInputElement>('#operator-guidelines')!.value,'Keep drafts');
 assert.ok(d.querySelector('.operator-settings-agent[data-agent-id=new]'));
}));
for(const foreign of [false,true])test(`passive session failure clears private data without an extra keepalive (foreign=${foreign})`,async()=>fixture(async(dom,state,requests)=>{
 state.denied=!foreign;state.foreign=foreign;const sessions=requests.filter(r=>r.path==='/api/session').length;
 dom.window.dispatchEvent(new dom.window.Event('focus'));await tick();await tick();assert.equal(dom.window.document.querySelector<HTMLElement>('#dashboard')!.hidden,true);assert.equal(dom.window.document.querySelector('#owned')!.children.length,0);assert.equal(requests.filter(r=>r.path==='/api/session').length,sessions);
}));

test('a shared-guidelines draft survives discovery of a new agent',async()=>fixture(async(dom,state,requests)=>{
 const d=dom.window.document;d.querySelector<HTMLButtonElement>('#operator-settings-tile')!.click();d.querySelector<HTMLButtonElement>('#operator-guidelines-tile')!.click();const field=d.querySelector<HTMLTextAreaElement>('#operator-guidelines')!;field.value='Unsaved operator draft';field.dispatchEvent(new dom.window.Event('input'));
 add(state);dom.window.dispatchEvent(new dom.window.Event('focus'));await tick();await tick();assert.equal(field.value,'Unsaved operator draft');assert.equal(d.querySelector<HTMLButtonElement>('#operator-header-save')!.disabled,false);assert.equal(d.querySelector<HTMLElement>('#operator-settings-editor')!.hidden,false);assert.equal(requests.some(r=>r.body),false);
}));
