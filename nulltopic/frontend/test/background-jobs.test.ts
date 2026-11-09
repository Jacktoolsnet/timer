import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installDialogMock} from './dialog-mock';
import {renderBackgroundJobs,clearJobDialogs} from '../src/scripts/background-jobs';

test('task panel shows human status/history and requires a preview and explicit confirmation before running',async()=>{
 const dom=new JSDOM('<html lang="de"><body><section><div data-jobs-list></div></section></body></html>',{url:'http://localhost/administration#jobs'});installDialogMock(dom);
 let completed=false;const requests:{path:string;body:unknown}[]=[];
 const row={id:'cases',state:'overdue',manual_required:true,started_at:null,finished_at:null,last_success_at:null,next_run_at:'2026-11-10T02:30:00Z',retry_at:null,affected_count:null,error_code:null};
 const values={document:dom.window.document,fetch:async(path:string)=>new Response(JSON.stringify(path.endsWith('/history')?[]:{enabled:true,items:[{...row,state:completed?'ready':'overdue',manual_required:!completed}]}))};
 const before=Object.keys(values).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)] as const);for(const [key,value]of Object.entries(values))Object.defineProperty(globalThis,key,{configurable:true,value});
 try{
  const section=dom.window.document.querySelector('section')!;await renderBackgroundJobs(section,async(path,body)=>{requests.push({path,body});if(path.endsWith('/run')){completed=true;return {count:2};}return {id:'preview',count:2};},()=>true,async()=>{});
  assert.match(section.textContent!,/Überfällig/);assert.match(section.textContent!,/Europe\/Berlin/);assert.equal(requests.length,0);
  const trigger=section.querySelector<HTMLButtonElement>('[aria-label="Manuellen Start vorbereiten"]')!;assert.equal(trigger.textContent,'');assert.ok(trigger.querySelector('svg'));trigger.click();await new Promise(r=>setTimeout(r,0));
  assert.equal(requests.length,1);assert.ok(requests[0].path.endsWith('/preview'));
  const dialog=dom.window.document.querySelector<HTMLDialogElement>('dialog')!;assert.equal(dialog.open,true);assert.match(dialog.textContent!,/Zur Löschung vorgesehen: 2/);assert.match(dialog.textContent!,/endgültig/);
  dialog.querySelector<HTMLButtonElement>('[aria-label="Bereinigung jetzt starten"]')!.click();await new Promise(r=>setTimeout(r,0));
  assert.deepEqual(requests[1],{path:'/admin/jobs/cases/run',body:{previewId:'preview'}});assert.equal(dom.window.document.querySelector('dialog'),null);assert.equal(section.querySelector('[aria-label="Manuellen Start vorbereiten"]'),null,'no start offered after success');
  clearJobDialogs();
 }finally{for(const [key,descriptor]of before){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}dom.window.close();}
});
