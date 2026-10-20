import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LavaTrail} from '../src/lib/trail.ts';
test('stroke leaves bounded bubbles that disappear over time',()=>{
 const trail=new LavaTrail();
 trail.stroke(.6,.5,.2,0,1.8,'#ff763f');
 assert.ok(trail.bubbles.length>0);
 assert.ok(trail.bubbles.every(p=>p.colour==='#ff763f'&&p.x>=.4&&p.x<=.6));
 for(let i=0;i<100;i++)trail.stroke(.6,.5,.2,0,1.8,'#ff763f');
 assert.ok(trail.bubbles.length<=64);
 trail.advance(5,.35);assert.equal(trail.bubbles.length,0);
});
test('stationary pointer does not emit and pause preserves bubbles',()=>{
 const trail=new LavaTrail();
 trail.stroke(.5,.5,0,0,.5,'#fff');assert.equal(trail.bubbles.length,0);
 trail.stroke(.5,.5,.1,0,.5,'#fff');
 const before=JSON.stringify(trail.bubbles);trail.advance(0,.35);
 assert.equal(JSON.stringify(trail.bubbles),before);
 trail.clear();assert.equal(trail.bubbles.length,0);
});
