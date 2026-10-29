import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,normalize,pulseAt,tappedTempo,bouncePosition} from '../src/lib/metronome.ts';
test('normalizes untrusted saved settings',()=>{
 const s=normalize({bpm:Infinity,beats:99,subdivision:7,volume:-2,accents:[0,2,8 as 0],audibleBars:0});
 assert.equal(s.bpm,90);assert.equal(s.beats,12);assert.equal(s.subdivision,1);assert.equal(s.volume,0);assert.deepEqual(s.accents.slice(0,4),[0,2,1,1]);assert.equal(s.audibleBars,1);
 assert.equal(normalize({bpm:1}).bpm,20);assert.equal(normalize({bpm:999}).bpm,300);
});
test('beat, bar and subdivision positions are deterministic',()=>{
 const s=normalize({...defaults,subdivision:3});
 assert.deepEqual(pulseAt(0,s),{beat:0,bar:0,sub:0,silent:false,accent:2});
 assert.equal(pulseAt(1,s).accent,1);assert.equal(pulseAt(3,s).beat,1);assert.equal(pulseAt(12,s).bar,1);
});
test('silent beats also mute their subdivisions',()=>{
 const s=normalize({...defaults,subdivision:4,accents:[2,0,1,1]});
 for(let i=4;i<8;i++)assert.equal(pulseAt(i,s).accent,0);
});
test('gap mode repeats audible and silent bars without losing position',()=>{
 const s=normalize({...defaults,gap:true,subdivision:2});
 for(let i=0;i<24;i++)assert.equal(pulseAt(i,s).silent,false);
 for(let i=24;i<32;i++){assert.equal(pulseAt(i,s).silent,true);assert.equal(pulseAt(i,s).accent,0);}
 assert.equal(pulseAt(32,s).silent,false);assert.equal(pulseAt(32,s).beat,0);assert.equal(pulseAt(32,s).accent,2);
});
test('tap tempo handles insufficient taps, jitter and outliers',()=>{
 assert.equal(tappedTempo([0]),null);assert.equal(tappedTempo([0,500,1000,1500]),120);
 assert.equal(tappedTempo([0,500,1005,1500,3500]),119);
 assert.equal(tappedTempo([0,100]),300);assert.equal(tappedTempo([0,3000]),20);
});

test('new views normalize and ball contacts stations exactly on beats',()=>{
 for(const view of ['strip','ball'] as const)assert.equal(normalize({view}).view,view);
 assert.deepEqual(bouncePosition(0,4),{x:30,y:238});assert.deepEqual(bouncePosition(1,4),{x:130,y:238});
 assert.deepEqual(bouncePosition(.5,4),{x:80,y:138});assert.deepEqual(bouncePosition(4,4),{x:30,y:238});
 assert.deepEqual(bouncePosition(.5,1),{x:180,y:138});assert.deepEqual(bouncePosition(.5,4,true),{x:30,y:238});
});

test('removed saved views fall back to orbit',()=>{
 for(const view of ['waves','chase'])assert.equal(normalize({view} as unknown as Parameters<typeof normalize>[0]).view,'orbit');
});
