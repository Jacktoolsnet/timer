import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ExportTiming,formatExportDuration} from '../src/lib/export-timing.ts';
test('warmup excludes setup and estimates from actual recent throughput, not video length',()=>{
 const clock=new ExportTiming(0);assert.deepEqual(clock.read(3000),{phase:'estimating',remainingMs:null,elapsedMs:3000});
 for(let second=4;second<=8;second++)clock.observe((second-3)*.01,second*1000);
 assert.equal(clock.read(8000).remainingMs,null);
 for(let second=9;second<=13;second++)clock.observe((second-3)*.01,second*1000);
 assert.deepEqual(clock.read(13000),{elapsedMs:13000,remainingMs:88000,phase:'rendering'});
});
test('recent window adapts to slower scenes and remains bounded over a long export',()=>{
 const clock=new ExportTiming(0);for(let t=1000;t<=60000;t+=1000)clock.observe(t/1000*.005,t);
 const before=clock.read(60000).remainingMs!;
 for(let t=61000;t<=120000;t+=1000)clock.observe(.3+(t-60000)/1000*.001,t);
 const value=clock.read(120000);assert.equal(value.phase,'rendering');assert.ok(Math.abs(value.remainingMs!-620000)<1e-6);assert.ok(value.remainingMs!>before);
});
test('stalled progress is not a countdown to a fictitious zero and resumes with fresh warmup',()=>{
 const clock=new ExportTiming(0);for(let t=1000;t<=10000;t+=1000)clock.observe(t/1000*.01,t);
 assert.equal(clock.read(10000).phase,'rendering');clock.observe(.1,21000);assert.equal(clock.read(21000).phase,'stalled');assert.equal(clock.read(21000).remainingMs,null);
 clock.observe(.11,30000);assert.equal(clock.read(30000).phase,'estimating');for(let t=31000;t<=35000;t+=1000)clock.observe(.11+(t-30000)/1000*.01,t);assert.equal(clock.read(35000).phase,'rendering');
});
test('finalizing never claims zero seconds until the file has actually completed',()=>{
 const clock=new ExportTiming(0);clock.observe(.98,10000);assert.deepEqual(clock.read(20000),{elapsedMs:20000,remainingMs:null,phase:'finalizing'});
 clock.observe(1,25000);assert.deepEqual(clock.read(90000),{elapsedMs:25000,remainingMs:0,phase:'complete'});clock.stop(100000);assert.equal(clock.read(100000).elapsedMs,25000);
});
test('stopping freezes elapsed time and removes an obsolete remaining estimate',()=>{
 const clock=new ExportTiming(100);for(let t=1100;t<=10100;t+=1000)clock.observe((t-100)/100000,t);clock.stop(12100);
 assert.deepEqual(clock.read(99999),{elapsedMs:12000,remainingMs:null,phase:'stopped'});clock.observe(1,100000);assert.equal(clock.read(100000).phase,'stopped');
});
test('invalid, repeated and regressing samples cannot create negative or infinite estimates',()=>{
 const clock=new ExportTiming(0);clock.observe(.1,1000);clock.observe(.05,2000);clock.observe(NaN,NaN);clock.observe(.2,500);
 const result=clock.read(100);assert.equal(result.remainingMs,null);assert.equal(result.elapsedMs,2000);assert.throws(()=>new ExportTiming(NaN));
});
test('durations handle zero, minutes, hours and invalid values',()=>{
 for(const [ms,text] of [[0,'00:00'],[999,'00:00'],[61000,'01:01'],[3723456,'01:02:03'],[-1,'00:00'],[NaN,'00:00']] as const)assert.equal(formatExportDuration(ms),text);
});
