import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hitBlob,sheddingPoint,strokeEffect} from '../src/lib/shedding.ts';
import {BLOB_COUNT,blobShape} from '../src/lib/rainbow.ts';
test('a selected blob sheds from its own edge, not the finger',()=>{
 const offsets=new Float32Array(BLOB_COUNT*2);
 const s=blobShape(0,12,.35);
 assert.equal(hitBlob(s.x,s.y,12,1.8,.35,offsets),0);
 const edge=sheddingPoint(0,12,1.8,.35,offsets,.1,0)!;
 assert.ok(edge.x<s.x);assert.equal(edge.y,s.y);
 assert.equal(sheddingPoint(0,12,1.8,.35,offsets,0,0),null);
});
test('empty space is not grabbed and portrait offsets are respected',()=>{
 const offsets=new Float32Array(BLOB_COUNT*2);
 assert.equal(hitBlob(-1,-1,12,.5,.35,offsets),-1);
 offsets[0]=.1;offsets[1]=.05;
 const s=blobShape(0,12,.35);
 assert.equal(hitBlob(s.x+.1,s.y+.05,12,.5,.35,offsets),0);
});

test('both options choose exclusively by gesture start',()=>{
 assert.equal(strokeEffect(0,true,true),'shedding');
 assert.equal(strokeEffect(-1,true,true),'trail');
 assert.equal(strokeEffect(0,true,false),'trail');
 assert.equal(strokeEffect(-1,false,true),null);
 assert.equal(strokeEffect(0,false,true),'shedding');
 assert.equal(strokeEffect(0,false,false),null);
 assert.equal(strokeEffect(-1,false,false),null);
});
