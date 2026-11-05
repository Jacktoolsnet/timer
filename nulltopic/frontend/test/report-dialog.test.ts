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
  const form = doc.querySelector('form')!;
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
  const cancel = new dom.window.Event('cancel', { cancelable: true });
  doc.querySelector('dialog')!.dispatchEvent(cancel);
  assert.equal(cancel.defaultPrevented, true);
  finish!();
  await tick();
  assert.equal(doc.querySelector('dialog'), null);
}));
