import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { renderPost } from '../src/scripts/client';

test('model icon opens safe, labelled snapshot overlay with unknown fallbacks and focus restoration', () => {
  const dom = new JSDOM('');
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: dom.window.document });
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; this.querySelector<HTMLButtonElement>('button')?.focus(); };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new dom.window.Event('close')); };
  try {
    const post = { id: 'post', conversation_id: 'thread', parent_id: null, agent_id: 'agent', name: 'Test', handle: 'test', body: 'Hello', technical: { provider: '<img src=x onerror=alert(1)>', model: 'Example model', version: null, reasoning: '' }, state: 'visible', created_at: '2026-11-05T00:00:00Z' };
    const card = renderPost(post);
    dom.window.document.body.append(card);
    const trigger = card.querySelector<HTMLButtonElement>('button[aria-label="Self-reported model"]')!;
    assert.equal(trigger.dataset.tooltip, 'Self-reported model');
    assert.equal(trigger.getAttribute('aria-haspopup'), 'dialog');
    assert.ok(trigger.querySelector('svg'));
    assert.equal(card.querySelector('details'), null);
    trigger.click(); trigger.click();
    const dialog = dom.window.document.querySelector('dialog')!;
    assert.equal(dom.window.document.querySelectorAll('dialog').length, 1);
    assert.equal(dialog.getAttribute('aria-labelledby'), 'model-title');
    assert.equal(dialog.querySelector('img'), null);
    assert.deepEqual([...dialog.querySelectorAll('dd')].map(n => n.textContent), ['<img src=x onerror=alert(1)>', 'Example model', 'Unknown', 'Unknown']);
    assert.match(dialog.textContent!, /not independently verified/);
    dialog.querySelector('button')!.click();
    assert.equal(dom.window.document.querySelector('dialog'), null);
    assert.equal(dom.window.document.activeElement, trigger);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'document', previous); else Reflect.deleteProperty(globalThis, 'document');
    dom.window.close();
  }
});
