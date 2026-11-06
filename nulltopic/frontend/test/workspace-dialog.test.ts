import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installDialogMock} from './dialog-mock';
import {initializeWorkspaceDialog} from '../src/scripts/workspace-dialog';
function fixture(){
  const dom=new JSDOM('<button id="trigger">Open</button><dialog class="workspace-dialog"><button type="button" data-dialog-close>Close</button><h2 id="title">Action</h2><p class="workspace-dialog-status" tabindex="-1" role="alert"></p><textarea></textarea></dialog>');
  installDialogMock(dom);const doc=dom.window.document;
  const dialog=doc.querySelector('dialog')!,trigger=doc.querySelector<HTMLButtonElement>('#trigger')!;
  let closed=0;const control=initializeWorkspaceDialog(dialog,()=>{closed++;dialog.querySelector('textarea')!.value='';});
  return {dom,doc,dialog,trigger,control,closed:()=>closed};
}
test('workspace modal labels its current action and clears draft/returns focus on Escape or close',()=>{
  const {dom,doc,dialog,trigger,control,closed}=fixture();trigger.focus();control.open('title',trigger);
  assert.equal(dialog.open,true);assert.equal(dialog.getAttribute('aria-labelledby'),'title');
  dialog.querySelector('textarea')!.value='Draft';
  dialog.dispatchEvent(new dom.window.Event('cancel',{cancelable:true}));
  assert.equal(dialog.open,false);assert.equal(closed(),1);assert.equal(dialog.querySelector('textarea')!.value,'');assert.equal(doc.activeElement,trigger);
  control.open('title',trigger);dialog.querySelector('button')!.click();assert.equal(dialog.open,false);assert.equal(closed(),2);
  dom.window.close();
});
test('pending submissions cannot be dismissed; errors stay inside the modal and backdrop close works afterwards',()=>{
  const {dom,doc,dialog,trigger,control,closed}=fixture();control.open('title',trigger);control.setBusy(true);
  assert.equal(dialog.querySelector('button')!.disabled,true);assert.equal(dialog.getAttribute('aria-busy'),'true');
  dialog.dispatchEvent(new dom.window.Event('cancel',{cancelable:true}));control.close();assert.equal(dialog.open,true);assert.equal(closed(),0);
  control.error('Unable to save.');assert.equal(doc.activeElement,dialog.querySelector('[role=alert]'));
  assert.match(dialog.textContent!,/Unable to save/);
  control.setBusy(false);assert.equal(dialog.querySelector('button')!.disabled,false);
  dialog.dispatchEvent(new dom.window.MouseEvent('click',{clientX:-10,clientY:-10}));assert.equal(dialog.open,false);
  control.open('title',trigger);dialog.dispatchEvent(new dom.window.Event('close'));assert.equal(dialog.open,true,'stale close events must not clear a newly opened modal');
  control.setBusy(true);control.close(true);assert.equal(dialog.open,false);assert.equal(dialog.querySelector('button')!.disabled,false);
  dom.window.close();
});


test('workspace editors reserve a gap before action buttons and focus outlines',()=>{
  const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');
  assert.match(css,/\.workspace-dialog textarea\s*\{\s*margin-bottom:\s*24px;/);
});
