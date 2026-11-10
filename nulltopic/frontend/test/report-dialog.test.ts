import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { openReportDialog } from '../src/scripts/report-dialog';

async function fixture(run: (document: Document, trigger: HTMLButtonElement, dom: JSDOM) => Promise<void>) {
  const dom = new JSDOM('<button id="trigger">Report</button>');
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: dom.window.document });
  // JSDOM does not implement native modal focus trapping or top-layer rendering.
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; this.querySelector<HTMLTextAreaElement>('textarea')?.focus(); };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new dom.window.Event('close')); };
  try { await run(dom.window.document, dom.window.document.querySelector('button')!, dom); }
  finally { if (previous) Object.defineProperty(globalThis, 'document', previous); else Reflect.deleteProperty(globalThis, 'document'); dom.window.close(); }
}
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test('report overlay is labelled, cancels without publishing and restores focus', async () => fixture(async (doc, trigger) => {
  doc.body.append(trigger);
  let calls = 0;
  openReportDialog(trigger, async () => { calls++; });
  openReportDialog(trigger, async () => { calls++; });
  assert.equal(doc.querySelectorAll('dialog').length, 1);
  assert.equal(doc.querySelector('dialog')?.getAttribute('aria-labelledby'), 'report-title');
  assert.equal(doc.activeElement?.tagName, 'TEXTAREA');
  assert.equal(doc.querySelector('textarea')?.maxLength, 1000);
  for(const button of doc.querySelectorAll('dialog button')){assert.equal(button.textContent,'');assert.ok(button.querySelector('svg'));assert.equal(button.getAttribute('data-tooltip'),button.getAttribute('aria-label'));}
  (doc.querySelector('.report-cancel') as HTMLButtonElement).click();
  assert.equal(calls, 0);
  assert.equal(doc.querySelector('dialog'), null);
  assert.equal(doc.activeElement, trigger);
}));

test('report overlay trims valid input, prevents duplicate sends and stays open on errors', async () => fixture(async (doc, trigger, dom) => {
  let calls = 0;
  let finish: (() => void) | undefined;
  openReportDialog(trigger, async reason => {
    assert.equal(reason, 'Spam');
    calls++;
    if (calls === 1) throw Error('Private server details must not be rendered');
    await new Promise<void>(resolve => { finish = resolve; });
  });
  const form = doc.querySelector('form')!;doc.querySelector<HTMLInputElement>('#report-good-faith')!.checked=true;
  const input = doc.querySelector('textarea')!;
  input.value = '   ';
  form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
  assert.equal(calls, 0);
  input.value = ' Spam ';
  input.dispatchEvent(new dom.window.Event('input'));
  form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
  await tick();
  assert.equal(calls, 1);
  assert.match(doc.querySelector('.report-status')!.textContent!, /could not be sent/);
  assert.doesNotMatch(doc.body.textContent!, /Private server details/);
  assert.equal(input.value, ' Spam ');
  form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
  form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
  assert.equal(calls, 2);
  assert.equal(form.getAttribute('aria-busy'), 'true');
  assert.ok(doc.querySelector('.report-submit svg'));assert.equal(doc.querySelector('.report-submit')!.getAttribute('aria-label'),'Sending report…');
  const cancel = new dom.window.Event('cancel', { cancelable: true });
  doc.querySelector('dialog')!.dispatchEvent(cancel);
  assert.equal(cancel.defaultPrevented, true);
  finish!();
  await tick();
  assert.equal(doc.querySelector('dialog'), null);
}));

test('optional reporter contacts produce an explicit saved-link receipt and never resubmit',async()=>fixture(async(doc,trigger,dom)=>{
 dom.reconfigure({url:'http://localhost:4321/conversations'});let calls=0;const token='a'.repeat(43);
 openReportDialog(trigger,async(reason,contact)=>{calls++;assert.equal(reason,'Concern');assert.deepEqual(contact,{reporterName:'Fixture name',reporterEmail:'fixture@example.invalid',language:'en',goodFaith:true});return {ok:true,statusUrl:'http://localhost:4321/dsa?lang=en#receipt='+token,emailQueued:true};});
 const form=doc.querySelector('form')!;doc.querySelector('textarea')!.value='Concern';doc.querySelector<HTMLInputElement>('#reporter-name')!.value='Fixture name';doc.querySelector<HTMLInputElement>('#reporter-email')!.value='fixture@example.invalid';
 form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));assert.equal(calls,0,'good faith is not silently asserted');doc.querySelector<HTMLInputElement>('#report-good-faith')!.checked=true;
 form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();assert.equal(calls,1);assert.ok(doc.querySelector<HTMLDialogElement>('dialog')!.open);assert.equal(doc.querySelector<HTMLElement>('.report-receipt')!.hidden,false);assert.equal(doc.querySelector<HTMLElement>('.report-fields')!.hidden,true);assert.equal(doc.querySelector<HTMLInputElement>('#report-status-link')!.value,'http://localhost:4321/dsa?lang=en#receipt='+token);assert.equal(doc.querySelector<HTMLAnchorElement>('[data-open-receipt]')!.target,'_blank');
 form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();assert.equal(calls,1);doc.querySelector<HTMLButtonElement>('.report-cancel')!.click();assert.equal(doc.querySelector('dialog'),null);
}));

test('send stays disabled until required fields and any supplied email are valid', async () => fixture(async (doc, trigger, dom) => {
  openReportDialog(trigger, async () => {});
  const submit = doc.querySelector<HTMLButtonElement>('.report-submit')!;
  const reason = doc.querySelector<HTMLTextAreaElement>('#report-reason')!;
  const consent = doc.querySelector<HTMLInputElement>('#report-good-faith')!;
  const email = doc.querySelector<HTMLInputElement>('#reporter-email')!;
  const input = (field: Element) => field.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.equal(submit.disabled, true);
  reason.value = 'Concern'; input(reason);
  assert.equal(submit.disabled, true);
  consent.click();
  assert.equal(submit.disabled, false, 'anonymous reports need no name or email');
  email.value = 'invalid'; input(email);
  assert.equal(submit.disabled, true);
  email.value = 'reporter@example.invalid'; input(email);
  assert.equal(submit.disabled, false);
  reason.value = '   '; input(reason);
  assert.equal(submit.disabled, true);
  reason.value = 'Concern'; input(reason);
  consent.click();
  assert.equal(submit.disabled, true);
}));
