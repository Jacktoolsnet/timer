import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderCaseRetention,clearCaseRetention} from '../src/scripts/case-retention';
import {installDialogMock} from './dialog-mock';

test('retention lists safe private metadata, explicit reasoned holds and accessible icon-only confirmation',async()=>{
 const dom=new JSDOM('<html lang="de"><body><section><div data-retention-list></div></section></body></html>',{url:'http://localhost/administration'});installDialogMock(dom);
 const values={document:dom.window.document,fetch:async()=>new Response(JSON.stringify({items:[{case_id:'case-fixture',closed_at:null,delete_after:null,hold_reason:'<img src=x onerror=alert(1)>',review_due_at:'2026-11-10T12:00:00Z',review_due:true}],nextCursor:null}))};
 const previous=Object.keys(values).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)] as const);for(const [key,value]of Object.entries(values))Object.defineProperty(globalThis,key,{configurable:true,value});
 const sent:{path:string;body:any}[]=[];
 try{
  const section=dom.window.document.querySelector('section')!;
  await renderCaseRetention(section,async(path,body)=>{sent.push({path,body});return {ok:true};},()=>true);
  assert.match(section.textContent!,/Aufbewahrungssperre/);assert.match(section.textContent!,/Prüfung fällig/);assert.equal(section.querySelector('img,script'),null);
  const open=section.querySelector<HTMLButtonElement>('[aria-label="Aufbewahrungssperre aufheben"]')!;assert.ok(open.querySelector('svg'));assert.equal(open.textContent,'');open.click();
  const dialog=dom.window.document.querySelector<HTMLDialogElement>('dialog')!;assert.equal(dialog.open,true);assert.match(dialog.textContent!,/startet die Aufbewahrungsfrist nicht neu/);
  assert.equal(sent.length,0);const form=dialog.querySelector('form')!;form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));assert.equal(sent.length,0,'empty reason cannot submit');
  dialog.querySelector('textarea')!.value='Proceedings completed';form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,0));
  assert.deepEqual(sent,[{path:'/admin/cases/case-fixture/retention',body:{action:'release',reason:'Proceedings completed'}}]);
  section.querySelector<HTMLButtonElement>('[aria-label="Aufbewahrung prüfen"]')!.click();assert.ok(dom.window.document.querySelector('dialog'));clearCaseRetention();assert.equal(dom.window.document.querySelector('dialog'),null);
 }finally{for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}dom.window.close();}
});
