import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoProject} from '../src/lib/model.ts';
import {CONTACT_PAGE_SIZE,contactLayout,contactPlan,defaultStillTimes,parseStillTimes} from '../src/lib/still-plan.ts';
import {binaryZip,textZip} from '../src/lib/text-zip.ts';
test('contact plans map local scene seconds to exact project times without boundary leakage',()=>{
 const p=demoProject();p.scenes[0].duration=4;
 const before=JSON.stringify(p),plan=contactPlan(p,[{sceneIndex:1,times:[3,0,1,1]},{sceneIndex:0,times:[2]}]);
 assert.deepEqual(plan.map(f=>[f.sceneIndex,f.localTime,f.time]),[[0,2,2],[1,0,4],[1,1,5],[1,3,7]]);
 assert.equal(plan[1].sceneId,p.scenes[1].id);assert.equal(JSON.stringify(p),before);
 for(const times of [[],[-1],[NaN],[Infinity],[5],Array(13).fill(0)])assert.throws(()=>contactPlan(p,[{sceneIndex:1,times}]));
 assert.throws(()=>contactPlan(p,[]));assert.throws(()=>contactPlan(p,[{sceneIndex:2,times:[0]}]));assert.throws(()=>contactPlan(p,[{sceneIndex:0,times:[0]},{sceneIndex:0,times:[1]}]));
});
test('time inputs accept decimal points or commas, but require unambiguous separators',()=>{
 assert.deepEqual(parseStillTimes(' 0; 1.25; 2,5 '),[0,1.25,2.5]);
 for(const value of ['', '1,2,3','-1','NaN','1e3','1;wrong'])assert.throws(()=>parseStillTimes(value));
 for(const duration of [.01,.1,5,3600])for(const time of defaultStillTimes(duration))assert.ok(time>=0&&time<duration);
});
test('contact pages keep format, predictable positions and bounded canvas memory',()=>{
 const p=demoProject();
 for(const format of ['landscape','portrait','square'] as const){p.format=format;const l=contactLayout(p,CONTACT_PAGE_SIZE);assert.equal(l.columns,3);assert.ok(l.width*l.height<4_000_000);assert.ok(l.width<4096&&l.height<4096);}
 assert.throws(()=>contactLayout(p,0));assert.throws(()=>contactLayout(p,7));
});
test('binary ZIP preserves arbitrary PNG-like bytes and keeps text export compatibility',()=>{
 const data=new Uint8Array([137,80,78,71,0,255,128]),zip=binaryZip([{name:'page.png',data}]),view=new DataView(zip.buffer),length=view.getUint16(26,true);
 assert.equal(view.getUint32(0,true),0x04034b50);assert.deepEqual(zip.slice(30+length,30+length+data.length),data);
 assert.deepEqual(textZip([{name:'ä.txt',text:'Grüße'}]),binaryZip([{name:'ä.txt',data:new TextEncoder().encode('Grüße')}]));
 assert.throws(()=>binaryZip([{name:'../bad.png',data}]));assert.throws(()=>binaryZip([{name:'x',data},{name:'x',data}]));
});
