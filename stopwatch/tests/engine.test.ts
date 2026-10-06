import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Stopwatch,formatElapsed} from '../src/lib/stopwatch.ts';
test('start, pause, resume, background gap and reset',()=>{const s=new Stopwatch(); s.start(100);s.start(200);assert.equal(s.elapsed(1100),1000);s.pause(2100);assert.equal(s.elapsed(9000),2000);s.start(10000);assert.equal(s.elapsed(70000),62000);s.reset();assert.equal(s.elapsed(80000),0);assert.equal(s.running,false);});
test('lap durations exclude pauses and retain cumulative time',()=>{const s=new Stopwatch();assert.equal(s.lap(0),undefined);s.start(0);assert.deepEqual(s.lap(1000),{elapsed:1000,duration:1000});s.pause(2000);s.start(5000);assert.deepEqual(s.lap(6000),{elapsed:3000,duration:2000});s.reset();assert.equal(s.laps.length,0);});
test('hundredths and unlimited hours',()=>{assert.equal(formatElapsed(0),'00:00:00.00');assert.equal(formatElapsed(3723489),'01:02:03.48');assert.equal(formatElapsed(360000000),'100:00:00.00');assert.equal(formatElapsed(-5),'00:00:00.00');});
test('export rows are chronological and CSV quotes headings and preserves UTF-8',async()=>{
 const {lapRows,lapsCsv}=await import('../src/lib/stopwatch.ts');
 const rows=lapRows([{duration:1234,elapsed:1234},{duration:2345,elapsed:3579}],['Runde','Dauer, "präzise"','Gesamtzeit']);
 assert.deepEqual(rows[1],['1','00:00:01.23','00:00:01.23']);assert.deepEqual(rows[2],['2','00:00:02.34','00:00:03.57']);
 assert.ok(lapsCsv(rows).startsWith('\uFEFF"Runde","Dauer, ""präzise""","Gesamtzeit"\r\n'));
});
