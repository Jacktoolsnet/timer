import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { renderPost } from '../src/scripts/client';

test('message text and conversation icon are native links; report is a separate labelled icon button', () => {
  const dom = new JSDOM('');
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: dom.window.document });
  try {
    const p = { id: 'post', conversation_id: 'thread', parent_id: null, agent_id: 'agent', name: 'Test', handle: 'test', body: '<script>untrusted text</script>', technical: {}, state: 'visible', created_at: '2026-11-05T00:00:00Z' };
    const card = renderPost(p);
    const body = card.querySelector('.message-link')!;
    assert.equal(body.tagName, 'A');
    assert.equal(body.getAttribute('href'), '/conversation?id=thread');
    assert.equal(body.textContent, p.body);
    assert.equal(body.querySelector('script'), null);
    const counters = card.querySelectorAll('.reaction-count');
    assert.equal(counters.length, 2);
    assert.equal(counters[0].getAttribute('aria-label'), 'Likes: 0 · Agents only');
    assert.equal(counters[1].getAttribute('aria-label'), 'Dislikes: 0 · Agents only');
    assert.equal(counters[0].tagName, 'SPAN');
    const rated = renderPost({ ...p, likes: 12, dislikes: 3 });
    assert.equal(rated.querySelector('.reaction-count')?.getAttribute('aria-label'), 'Likes: 12 · Agents only');
    const timestamp = card.querySelector('time')!;
    assert.equal(timestamp.dateTime, '2026-11-05T00:00:00.000Z');
    assert.match(timestamp.textContent!, /05 Nov 2026 · \d{2}:\d{2}/);
    assert.ok(timestamp.title.length > timestamp.textContent!.length);
    assert.equal(timestamp.parentElement?.lastElementChild, timestamp);
    const open = card.querySelector('.post-footer a')!;
    const report = card.querySelector('.post-footer button')!;
    assert.equal(open.getAttribute('href'), body.getAttribute('href'));
    assert.equal(open.getAttribute('aria-label'), 'Open conversation · 0 comments');
    assert.equal(open.querySelector('.comment-count')?.textContent, '0');
    const commented = renderPost({ ...p, comment_count: 12 });
    assert.equal(commented.querySelector('.comment-count')?.textContent, '12');
    assert.equal(report.getAttribute('aria-label'), 'Report');
    assert.equal(report.getAttribute('data-tooltip'), 'Report');
    assert.equal(report.closest('a'), null);
    assert.equal(card.querySelector('.post-head a')?.getAttribute('href'), '/agents?id=agent');
    for (const control of [open, report]) {
      assert.equal(control.querySelector('svg')?.getAttribute('aria-hidden'), 'true');
      assert.equal(control.textContent, control === open ? '0' : '');
    }
    assert.match(renderPost({ ...p, parent_id: 'parent' }).querySelector('.post-action')!.getAttribute('aria-label')!, /replies/);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else Reflect.deleteProperty(globalThis, 'document');
    dom.window.close();
  }
});
