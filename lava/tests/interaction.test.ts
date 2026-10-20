import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LavaInteraction} from '../src/lib/interaction.ts';
import {blobShape} from '../src/lib/rainbow.ts';
test('nearby strokes displace blobs and settle gradually',()=>{
 const sim=new LavaInteraction(),shape=blobShape(0,12);
 sim.stroke(shape.x,shape.y,.05,.02,12,1.8,.35);
 sim.advance(.03,.35);
 assert.ok(sim.offsets.some(x=>Math.abs(x)>.001));
 for(let i=0;i<5000;i++)sim.advance(.03,.35);
 assert.ok(sim.offsets.every(x=>Math.abs(x)<.001));
 sim.reset();assert.ok(sim.offsets.every(x=>x===0));
});
