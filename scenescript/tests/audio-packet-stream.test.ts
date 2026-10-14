import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AudioPacketStream} from '../src/lib/audio-packet-stream.ts';

test('adjacent chunks share one decoder and retain a packet crossing the boundary',async()=>{
 let opened=0,closed=0;
 const stream=new AudioPacketStream(async function*(start){opened++;try{for(let i=Math.floor(start/.6);i<10;i++)yield {timestamp:i*.6,duration:.6,id:i};}finally{closed++;}});
 const collect=async(a:number,b:number)=>{const ids=[];for await(const p of stream.range(a,b))ids.push(p.id);return ids;};
 assert.deepEqual(await collect(0,1),[0,1]);assert.deepEqual(await collect(1,2),[1,2,3]);assert.deepEqual(await collect(2,3),[3,4]);assert.equal(opened,1);
 await stream.dispose();assert.equal(closed,1);
});

test('seeks and loops restart with pre-roll but do not emit pre-roll packets',async()=>{
 const starts:number[]=[];
 const stream=new AudioPacketStream(async function*(start){starts.push(start);for(let i=Math.floor(start*10);i<100;i++)yield {timestamp:i/10,duration:.1};});
 const collect=async(a:number,b:number)=>{const packets=[];for await(const p of stream.range(a,b))packets.push(p.timestamp);return packets;};
 assert.deepEqual(await collect(2,2.2),[2,2.1]);assert.deepEqual(await collect(2.2,2.4),[2.2,2.3]);assert.deepEqual(await collect(0,.2),[0,.1]);assert.deepEqual(await collect(5,5.1),[5]);
 assert.deepEqual(starts,[1.75,0,4.75]);await stream.dispose();
});

test('end of stream and repeated disposal are safe',async()=>{
 const stream=new AudioPacketStream(async function*(){yield {timestamp:0,duration:.5};});
 let count=0;for await(const _ of stream.range(0,1))count++;assert.equal(count,1);
 for await(const _ of stream.range(1,2))count++;assert.equal(count,1);await stream.dispose();await stream.dispose();
});
