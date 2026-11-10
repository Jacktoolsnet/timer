import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {initializeVisitorSessionVisibility} from '../src/scripts/visitor-session-visibility';
const tick=()=>new Promise(r=>setTimeout(r,0));
async function fixture(run:(w:JSDOM['window'],d:Document,respond:(value:boolean)=>void)=>Promise<void>){
 const dom=new JSDOM('<span id="visitor-preview-controls"><button>Review</button></span><details id="live"><summary>Live</summary></details>',{url:'http://localhost/',pretendToBeVisual:true}),w=dom.window;
 let resolve!:(response:Response)=>void;
 const old=new Map<string,PropertyDescriptor|undefined>();for(const [key,value]of Object.entries({document:w.document,fetch:async(path:string,options:any)=>{assert.equal(path,'/api/session-state');assert.equal(options.cache,'no-store');assert.equal(options.referrerPolicy,'no-referrer');return new Promise<Response>(r=>{resolve=r;});}})){old.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true});}
 try{initializeVisitorSessionVisibility();await run(w,w.document,value=>resolve(new Response(JSON.stringify({authenticated:value}))));}finally{w.dispatchEvent(new w.Event('pagehide'));w.close();for(const[key,value]of old){if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key);}}
}
test('guest control stays visible; either authenticated role hides it, logout restores it',async()=>fixture(async(w,d,respond)=>{
 const control=d.getElementById('visitor-preview-controls')!;assert.equal(control.hidden,false);respond(false);await tick();assert.equal(control.hidden,false);
 w.dispatchEvent(new w.CustomEvent('nulltopic:session-state',{detail:true}));assert.equal(control.hidden,true);
 w.dispatchEvent(new w.CustomEvent('nulltopic:session-state',{detail:false}));assert.equal(control.hidden,false);
}));
test('initial authenticated check hides the control and stale checks cannot overwrite newer session state',async()=>fixture(async(w,d,respond)=>{
 const control=d.getElementById('visitor-preview-controls')!;
 w.dispatchEvent(new w.CustomEvent('nulltopic:session-state',{detail:true}));respond(false);await tick();assert.equal(control.hidden,true);
 w.dispatchEvent(new w.CustomEvent('nulltopic:session-state',{detail:false}));assert.equal(control.hidden,false);
}));
test('passive server result can hide an authenticated visitor control on public pages',async()=>fixture(async(_w,d,respond)=>{
 respond(true);await tick();assert.equal(d.getElementById('visitor-preview-controls')!.hidden,true);
}));

test('live status follows guest visibility and closes its open panel on sign-in',async()=>fixture(async(w,d,respond)=>{
 const live=d.getElementById('live')!;respond(false);await tick();assert.equal(live.hidden,false);
 live.setAttribute('open','');
 w.dispatchEvent(new w.CustomEvent('nulltopic:session-state',{detail:true}));
 assert.equal(live.hidden,true);assert.equal(live.hasAttribute('open'),false);
 w.dispatchEvent(new w.CustomEvent('nulltopic:session-state',{detail:false}));
 assert.equal(live.hidden,false);assert.equal(live.hasAttribute('open'),false);
}));
test('passive session checks also hide live status without changing its connection state',async()=>fixture(async(_w,d,respond)=>{
 const live=d.getElementById('live')!;live.dataset.state='live';respond(true);await tick();
 assert.equal(live.hidden,true);assert.equal(live.dataset.state,'live');
}));
