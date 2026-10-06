import { test } from 'node:test';
import assert from 'node:assert/strict';
import { breathAt, normalize } from '../src/lib/breathing.ts';
test('box phases and exact boundaries',()=>{
 for (const [time,phase,scale] of [[0,0,.48],[4,1,1],[8,2,1],[12,3,.48],[16,0,.48]]) {
  const state=breathAt(time!,[4,4,4,4]); assert.equal(state.phase,phase); assert.equal(state.scale,scale);
 }
 assert.equal(breathAt(16,[4,4,4,4]).round,2);
});
test('zero holds are skipped and animation follows breathing',()=>{
 assert.equal(breathAt(4,[4,0,6,0]).phase,2);
 assert.equal(breathAt(10,[4,0,6,0]).phase,0);
 assert.equal(breathAt(2,[4,0,6,0]).scale,.74);
 assert.equal(breathAt(7,[4,0,6,0]).scale,.74);
});
test('normalization rejects unsafe persisted data',()=>{
 const s=normalize({durations:[0,-5,Infinity,25],minutes:-1,volume:120,sound:'true',preset:'toString'});
 assert.deepEqual(s.durations,[1,0,4,20]); assert.equal(s.minutes,0); assert.equal(s.sound,false); assert.equal(s.preset,'box');
 assert.deepEqual(normalize(null),normalize({}));
});
test('invalid cycles are rejected',()=>assert.throws(()=>breathAt(1,[0,0,0,0])));
test('count duration changes timing without changing displayed counts',()=>{
 const state=breathAt(4,[4,4,4,4],2);
 assert.equal(state.phase,0); assert.equal(state.remaining,2); assert.equal(state.scale,.74);
 assert.equal(breathAt(8,[4,4,4,4],2).phase,1);
 assert.equal(breathAt(32,[4,4,4,4],2).round,2);
 assert.equal(normalize({countSeconds:1.5}).countSeconds,1.5);
 assert.equal(normalize({countSeconds:Infinity}).countSeconds,1);
 assert.throws(()=>breathAt(1,[4,4,4,4],0));
});
test('4–7–8 breathing skips the final hold',async()=>{
 const {presets}=await import('../src/lib/breathing.ts');
 assert.deepEqual(presets.fourSevenEight,[4,7,8,0]);
 assert.equal(breathAt(4,presets.fourSevenEight).phase,1);
 assert.equal(breathAt(11,presets.fourSevenEight).phase,2);
 assert.equal(breathAt(19,presets.fourSevenEight).phase,0);
});
