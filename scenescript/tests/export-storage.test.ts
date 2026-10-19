import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileVideoDestination,memoryVideoDestination} from '../src/scripts/export-storage.ts';
import {estimatedExportBytes,exportSize,MEMORY_EXPORT_LIMIT} from '../src/lib/export-plan.ts';
import {demoProject} from '../src/lib/model.ts';
const bytes=(...data:number[])=>new Uint8Array(data);
test('22-minute export budgets exceed a GiB and sizes preserve project orientation',()=>{
 const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].duration=22*60;
 const options={format:'mp4',resolution:1080,fps:30,audio:true} as const;
 assert.ok(estimatedExportBytes(p,options)>1024**3);assert.ok(estimatedExportBytes(p,{...options,resolution:480})<estimatedExportBytes(p,options));
 p.format='portrait';assert.deepEqual(exportSize(p,options),{width:1080,height:1920,bitrate:8000000});assert.equal(MEMORY_EXPORT_LIMIT,128*1024*1024);
});
test('disk writes retain positions, apply backpressure and commit only through finish',async()=>{
 const calls:string[]=[],writes:number[]=[];let resolve!:()=>void;
 const dest=fileVideoDestination({async write(c){calls.push('writing');writes.push(c.position);await new Promise<void>(r=>resolve=r);calls.push('written');},async close(){calls.push('commit');},async abort(){calls.push('abort');}},new AbortController().signal);
 const writer=dest.stream.getWriter(),pending=writer.write({type:'write',position:37,data:bytes(1,2)});await Promise.resolve();assert.deepEqual(calls,['writing']);assert.equal(dest.bytes,0);resolve();await pending;assert.equal(dest.bytes,39);assert.deepEqual(writes,[37]);
 await writer.close();assert.deepEqual(calls,['writing','written']);await dest.finish();assert.equal(calls.at(-1),'commit');await dest.abort();assert.equal(calls.includes('abort'),false);
});
test('multi-GiB logical disk output never requires a full output ArrayBuffer',async()=>{
 let size=0,writes=0,maxChunk=0,commits=0;
 const dest=fileVideoDestination({async write(c){size=Math.max(size,c.position+c.data.byteLength);maxChunk=Math.max(maxChunk,c.data.byteLength);writes++;},async close(){commits++;},async abort(){}},new AbortController().signal);
 const writer=dest.stream.getWriter(),chunk=new Uint8Array(1024*1024);
 for(let i=0;i<3072;i++)await writer.write({type:'write',position:i*chunk.length,data:chunk});
 await writer.write({type:'write',position:0,data:bytes(10,20)});await writer.close();await dest.finish();
 assert.equal(size,3*1024**3);assert.equal(dest.bytes,size);assert.equal(writes,3073);assert.equal(maxChunk,1024*1024);assert.equal(commits,1);
});
test('closing the muxer after cancellation must not commit a native file',async()=>{
 let commits=0,aborts=0,removes=0;const controller=new AbortController();
 const dest=fileVideoDestination({async write(){},async close(){commits++;},async abort(){aborts++;}},controller.signal,async()=>null,async()=>{removes++;});
 const writer=dest.stream.getWriter();await writer.write({type:'write',position:0,data:bytes(1)});controller.abort();await writer.close();
 await assert.rejects(()=>dest.finish(),{name:'AbortError'});await dest.abort();await dest.abort();assert.equal(commits,0);assert.equal(aborts,1);assert.equal(removes,1);
});
test('write and final-commit failures do not produce successful output',async()=>{
 for(const fail of ['write','close']){
  let aborted=false;
  const dest=fileVideoDestination({async write(){if(fail==='write')throw Error('disk write failed');},async close(){if(fail==='close')throw Error('commit failed');},async abort(){aborted=true;}},new AbortController().signal);
  const writer=dest.stream.getWriter();
  if(fail==='write')await assert.rejects(()=>writer.write({type:'write',position:0,data:bytes(1)}),/disk write failed/);
  else{await writer.write({type:'write',position:0,data:bytes(1)});await writer.close();await assert.rejects(()=>dest.finish(),/commit failed/);}
  await dest.abort();assert.equal(aborted,true);
 }
});
test('small Blob fallback preserves header rewrites and enforces an exact byte limit',async()=>{
 const dest=memoryVideoDestination('video/mp4',new AbortController().signal,8),writer=dest.stream.getWriter();
 await writer.write({type:'write',position:0,data:bytes(0,0,3,4)});await writer.write({type:'write',position:4,data:bytes(5,6,7,8)});await writer.write({type:'write',position:0,data:bytes(1,2)});await writer.close();
 const blob=(await dest.finish())!;assert.equal(blob.type,'video/mp4');assert.deepEqual(new Uint8Array(await blob.arrayBuffer()),bytes(1,2,3,4,5,6,7,8));
 const capped=memoryVideoDestination('video/webm',new AbortController().signal,8),w=capped.stream.getWriter();await assert.rejects(()=>w.write({type:'write',position:0,data:new Uint8Array(9)}),/exportMemoryLimit/);assert.equal(capped.bytes,0);await capped.abort();
});
test('bad positions cannot allocate sparse in-memory output',async()=>{
 for(const position of [-1,NaN,Number.MAX_SAFE_INTEGER,3]){
  const d=memoryVideoDestination('video/webm',new AbortController().signal,8),w=d.stream.getWriter();await assert.rejects(()=>w.write({type:'write',position,data:bytes(1)}));await d.abort();
 }
});
