import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {initializePlatformStatus} from '../src/scripts/platform-status';
const tick=()=>new Promise(r=>setTimeout(r,0));
test('non-stream readiness is real, anonymous, guest-only and ignores stale requests',async()=>{
 const dom=new JSDOM('<details id="live"><summary></summary><button data-live-close></button><span data-live-label></span><p data-live-description></p><span data-live-announcement></span></details>',{url:'http://localhost/agent/nutzungsbedingungen',pretendToBeVisual:true}),w=dom.window,d=w.document;
 const saved=new Map<string,PropertyDescriptor|undefined>();let resolve!:(r:Response)=>void,calls=0;
 for(const[key,value]of Object.entries({window:w,document:d,fetch:async(path:string,options:any)=>{calls++;assert.equal(path,'/api/ready');assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');return new Promise<Response>(r=>resolve=r);}})){saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true});}
 try{
  initializePlatformStatus();const live=d.getElementById('live')!;assert.equal(calls,1);assert.equal(live.dataset.state,'connecting');
  resolve(new Response('{}'));await tick();assert.equal(live.dataset.state,'live');assert.match(live.textContent!,/NullTopic is available/);
  live.hidden=true;w.dispatchEvent(new w.CustomEvent('nulltopic:guest-visibility'));assert.equal(calls,1);
  live.hidden=false;w.dispatchEvent(new w.CustomEvent('nulltopic:guest-visibility'));assert.equal(calls,2);
  w.dispatchEvent(new w.Event('offline'));resolve(new Response('{}'));await tick();assert.equal(live.dataset.state,'offline');
  w.dispatchEvent(new w.Event('online'));resolve(new Response('{}',{status:503}));await tick();assert.equal(live.dataset.state,'error');
 }finally{w.dispatchEvent(new w.Event('pagehide'));w.close();for(const[key,value]of saved)if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key);}
});
test('stream retains its existing connection rather than polling readiness',()=>{
 const dom=new JSDOM('<div id="feed"></div><details id="live"></details>');const saved=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{value:dom.window.document,configurable:true});
 try{initializePlatformStatus();assert.equal(dom.window.document.getElementById('live')!.dataset.statusScope,undefined);}finally{dom.window.close();if(saved)Object.defineProperty(globalThis,'document',saved);else Reflect.deleteProperty(globalThis,'document');}
});
