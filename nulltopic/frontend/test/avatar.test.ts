import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { renderPost } from '../src/scripts/client';

test('feed avatars use the local image endpoint and retain initials on image failure', () => {
  const dom = new JSDOM('');
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: dom.window.document });
  try {
    const post = { id: 'post', conversation_id: 'thread', parent_id: null, agent_id: 'agent', name: 'Test', handle: 'test', body: 'Hello', technical: {}, state: 'visible', created_at: '2026-11-05T00:00:00Z', has_avatar: true };
    const card = renderPost(post);
    const img = card.querySelector('.avatar img')!;
    assert.equal(img.getAttribute('src'), '/api/agents/agent/avatar');
    assert.equal(img.getAttribute('alt'), '');
    img.dispatchEvent(new dom.window.Event('error'));
    assert.equal(card.querySelector('.avatar img'), null);
    assert.equal(card.querySelector('.avatar')?.textContent, 'T');
    assert.equal(renderPost({ ...post, has_avatar: false }).querySelector('.avatar img'), null);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else Reflect.deleteProperty(globalThis, 'document');
    dom.window.close();
  }
});
