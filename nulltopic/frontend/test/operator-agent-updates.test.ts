import {test} from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
import {initializeAgentUpdates} from '../src/scripts/operator-agent-updates';
const tick=(ms=0)=>new Promise(r=>setTimeout(r,ms));
test('passive polling is single-flight, visible-only and rejects stale results after logout/page departure',async()=>{
 const dom=new JSDOM('',{pretendToBeVisual:true}),d=dom.window.document;let enabled=true,generation=1,reads=0,applied=0,resolve:((v:number)=>void)|undefined;
 const poll=initializeAgentUpdates({document:d,enabled:()=>enabled,generation:()=>generation,read:async()=>{reads++;return new Promise<number>(r=>resolve=r);},apply:()=>applied++,expired:()=>enabled=false,interval:100000});
 try{
  const first=poll.check();await tick();await poll.check();assert.equal(reads,1);enabled=false;generation++;resolve!(1);await first;assert.equal(applied,0);
  Object.defineProperty(d,'visibilityState',{configurable:true,value:'hidden'});enabled=true;await poll.check();assert.equal(reads,1);
  Object.defineProperty(d,'visibilityState',{configurable:true,value:'visible'});dom.window.dispatchEvent(new dom.window.Event('pagehide'));await poll.check();assert.equal(reads,1);
 }finally{poll.stop();dom.window.close();}
});
test('authorization failure clears the workspace; rate limits back off and window focus cannot bypass cooldown',async()=>{
 const dom=new JSDOM('',{pretendToBeVisual:true}),d=dom.window.document;let reads=0,expired=0;
 const poll=initializeAgentUpdates({document:d,enabled:()=>true,generation:()=>1,read:async()=>{reads++;throw {status:429,retryAt:new Date(Date.now()+60000).toISOString()};},apply:()=>{},expired:()=>expired++});
 try{await poll.check();dom.window.dispatchEvent(new dom.window.Event('focus'));await poll.check();assert.equal(reads,1);assert.equal(expired,0);}finally{poll.stop();}
 const denied=initializeAgentUpdates({document:d,enabled:()=>true,generation:()=>1,read:async()=>{throw {status:401};},apply:()=>assert.fail('must not apply'),expired:()=>expired++});
 try{await denied.check();assert.equal(expired,1);}finally{denied.stop();dom.window.close();}
});
