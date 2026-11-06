import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {initializeModerationActionPicker} from '../src/scripts/moderation-action-picker';

const html = readFileSync(new URL('../dist/administration/index.html', import.meta.url), 'utf8');
function fixture() {
  const dom = new JSDOM(html), doc = dom.window.document;
  for (const id of ['dashboard','admin-moderation']) doc.getElementById(id)!.hidden = false;
  const select = doc.querySelector<HTMLSelectElement>('#action-type')!;
  doc.querySelector<HTMLDialogElement>('#admin-moderation-dialog')!.setAttribute('open','');
  doc.querySelector<HTMLFormElement>('#action')!.hidden=false;
  const reason = doc.querySelector<HTMLTextAreaElement>('#action-reason')!;
  const sync=initializeModerationActionPicker(select, reason);
  return {dom, doc, select, reason,sync, trigger: doc.querySelector<HTMLButtonElement>('#moderation-action-trigger')!, list: doc.querySelector<HTMLElement>('#moderation-action-options')!};
}
test('custom action list keeps form values, accessible selection and two editable presets per action', () => {
  const {dom,doc,select,reason,trigger,list} = fixture();
  assert.equal(select.hidden, true);
  assert.equal(list.hidden, true);
  assert.equal(doc.querySelector('label#action-label')!.getAttribute('for'), trigger.id);
  assert.equal(list.querySelectorAll('[role=option]').length, 4);
  for (const option of list.querySelectorAll<HTMLButtonElement>('[role=option]')) {
    trigger.click();
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    option.click();
    assert.equal(select.value, option.dataset.value);
    assert.equal(new dom.window.FormData(select.form!).get('action'), select.value);
    assert.equal(option.getAttribute('aria-selected'), 'true');
    assert.equal(list.hidden, true);
    const presets = doc.querySelectorAll<HTMLButtonElement>('#moderation-reason-presets button');
    assert.equal(presets.length, 2);
    for (const preset of presets) {
      preset.click(); assert.equal(reason.value, preset.textContent);
      assert.equal(doc.activeElement, reason);
      reason.value += ' Additional context.';
      assert.match(reason.value, /Additional context/);
    }
  }
  assert.equal(select.value, 'dismiss');
  assert.match(trigger.textContent!, /No action required/);
  dom.window.close();
});
test('action list supports keyboard navigation, escape, outside dismissal and reset', async () => {
  const {dom,doc,select,trigger,list} = fixture();
  const key = (target: Element, value: string) => target.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key:value,bubbles:true,cancelable:true}));
  trigger.focus(); key(trigger,'ArrowDown');
  const options = list.querySelectorAll<HTMLButtonElement>('[role=option]');
  assert.equal(doc.activeElement, options[0]);
  key(options[0],'End'); assert.equal(doc.activeElement, options[3]);
  key(options[3],'ArrowDown'); assert.equal(doc.activeElement, options[0]);
  key(options[0],'ArrowUp'); assert.equal(doc.activeElement, options[3]);
  key(options[3],'Home'); assert.equal(doc.activeElement, options[0]);
  key(options[0],'Escape'); assert.equal(list.hidden,true); assert.equal(doc.activeElement,trigger);
  trigger.click(); doc.body.click(); assert.equal(list.hidden,true);
  trigger.click(); options[3].click(); select.form!.reset();
  await Promise.resolve();
  assert.equal(select.value,'hide'); assert.equal(list.hidden,true);
  assert.match(trigger.textContent!,/Hide message/);
  dom.window.close();
});


test('agent report decisions expose only block and no-action choices with agent-specific reasons',()=>{
  const {dom,doc,select,sync,list,trigger,reason}=fixture();select.value='block';sync('agent');
  const options=list.querySelectorAll<HTMLButtonElement>('[role=option]:not([hidden])');assert.deepEqual(Array.from(options).map(option=>option.dataset.value),['block','dismiss']);
  trigger.click();options[1].click();assert.equal(select.value,'dismiss');
  doc.querySelector<HTMLButtonElement>('#moderation-reason-presets button')!.click();assert.match(reason.value,/agent/);
  select.value='hide';sync('message');assert.equal(list.querySelectorAll('[role=option]:not([hidden])').length,4);dom.window.close();
});
