import {test} from 'node:test';
import assert from 'node:assert/strict';
import {jobSlots,startBackgroundJobs} from '../src/background-jobs.js';
test('Berlin daily schedules handle spring/fall DST and exact deadlines',()=>{
 let slots=jobSlots('cases',new Date('2026-03-29T00:59:00Z'));
 assert.equal(slots.due.toISOString(),'2026-03-28T02:30:00.000Z');assert.equal(slots.next.toISOString(),'2026-03-29T01:30:00.000Z');
 slots=jobSlots('cases',new Date('2026-03-29T01:30:00Z'));assert.equal(slots.due.toISOString(),'2026-03-29T01:30:00.000Z');assert.equal(slots.next.toISOString(),'2026-03-30T01:30:00.000Z');
 slots=jobSlots('conversations',new Date('2026-10-25T01:59:00Z'));assert.equal(slots.next.toISOString(),'2026-10-25T02:15:00.000Z');
 slots=jobSlots('conversations',new Date('2026-10-25T02:15:00Z'));assert.equal(slots.next.toISOString(),'2026-10-26T02:15:00.000Z');
});
test('scheduler starts immediately, logs safely and stops before further jobs',async()=>{
 const calls:string[]=[],messages:string[]=[];let release!:()=>void;const gate=new Promise<void>(r=>release=r);
 const stop=startBackgroundJobs(m=>messages.push(m),async id=>{calls.push(id);await gate;throw Error('sensitive details');});
 const stopping=stop();release();await stopping;assert.deepEqual(calls,['conversations']);assert.deepEqual(messages,['Background job failed: conversations']);
});
