import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {watchIdentityRemoval} from '../src/scripts/identity-updates';
test('public identity invalidations coalesce, ignore arbitrary content and clean up on departure',async()=>{
 const dom=new JSDOM('<html></html>',{url:'http://localhost',pretendToBeVisual:true});const original=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:dom.window.document,configurable:true});
 const sources:FakeSource[]=[];class FakeSource extends dom.window.EventTarget {closed=false;constructor(public url:string){super();sources.push(this);}close(){this.closed=true;}}
 Object.defineProperty(dom.window,'EventSource',{value:FakeSource});let refreshed=0;
 const wait=()=>new Promise(resolve=>setTimeout(resolve,180));
 try{
  await new Promise(resolve=>setTimeout(resolve,0));
  const dispose=watchIdentityRemoval(()=>refreshed++);assert.equal(sources.length,1);assert.equal(sources[0].url,'/api/events');
  sources[0].dispatchEvent(new dom.window.MessageEvent('change',{data:'not JSON'}));sources[0].dispatchEvent(new dom.window.MessageEvent('change',{data:'{"kind":"changed"}'}));await wait();assert.equal(refreshed,0);
  for(let n=0;n<4;n++)sources[0].dispatchEvent(new dom.window.MessageEvent('change',{data:'{"kind":"identity_removed","conversationId":"synthetic"}'}));await wait();assert.equal(refreshed,1);
  dom.window.dispatchEvent(new dom.window.Event('pagehide'));assert.equal(sources[0].closed,true);dom.window.dispatchEvent(new dom.window.Event('pageshow'));assert.equal(sources.length,2);await wait();assert.equal(refreshed,2);
  sources[1].dispatchEvent(new dom.window.Event('reset'));dispose();await wait();assert.equal(refreshed,2);assert.equal(sources[1].closed,true);
 }finally{if(original)Object.defineProperty(globalThis,'document',original);else Reflect.deleteProperty(globalThis,'document');dom.window.close();}
});
