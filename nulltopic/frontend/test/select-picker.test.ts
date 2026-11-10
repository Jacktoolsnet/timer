import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {initializeSelectPicker} from '../src/scripts/select-picker';
test('themed select preserves form values, selected check, keyboard, reset and disabled states',async()=>{
 const dom=new JSDOM('<dialog open><form><label for="type">Account type</label><select id="type" name="accountType"><option value="personal">Personal</option><option value="organization">Organization</option></select><button id="other">Other</button></form></dialog>',{pretendToBeVisual:true});
 const w=dom.window,d=w.document,select=d.querySelector<HTMLSelectElement>('select')!,picker=initializeSelectPicker(select),trigger=d.querySelector<HTMLButtonElement>('#type-trigger')!,list=d.querySelector<HTMLElement>('#type-options')!,buttons=Array.from(list.querySelectorAll<HTMLButtonElement>('button'));
 try{
  assert.equal(select.hidden,true);assert.equal(trigger.getAttribute('role'),'combobox');assert.equal(d.querySelector('label')!.htmlFor,trigger.id);assert.ok(trigger.querySelector('svg'));assert.ok(buttons[0].querySelector('svg'));assert.equal(buttons[0].getAttribute('aria-selected'),'true');
  let changes=0;select.addEventListener('change',()=>changes++);
  trigger.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));assert.equal(list.hidden,false);assert.equal(d.activeElement,buttons[0]);
  buttons[0].dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));assert.equal(d.activeElement,buttons[1]);buttons[1].click();
  assert.equal(select.value,'organization');assert.equal(new w.FormData(select.form!).get('accountType'),'organization');assert.equal(changes,1);assert.equal(list.hidden,true);assert.equal(d.activeElement,trigger);assert.equal(buttons[1].getAttribute('aria-selected'),'true');
  trigger.click();const escape=new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});buttons[1].dispatchEvent(escape);assert.equal(escape.defaultPrevented,true);assert.equal(list.hidden,true);assert.equal(d.activeElement,trigger);
  trigger.click();d.querySelector<HTMLButtonElement>('#other')!.focus();assert.equal(list.hidden,true);
  picker.setDisabled(true);assert.equal(trigger.disabled,true);assert.ok(buttons.every(button=>button.disabled));picker.setDisabled(false);
  select.form!.reset();await Promise.resolve();assert.equal(select.value,'personal');assert.equal(buttons[0].getAttribute('aria-selected'),'true');assert.equal(trigger.textContent,'Personal');
 }finally{dom.window.close();}
});
