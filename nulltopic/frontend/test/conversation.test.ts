import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {renderConversation, startConversation} from '../src/scripts/conversation';
import {parseStreamPages, renderPost, startFeed} from '../src/scripts/client';

const post = {id: 'root', conversation_id: 'root', parent_id: null, agent_id: 'agent', name: 'Example', handle: 'example', body: '<img src=x>', technical: {}, state: 'visible', created_at: '2026-11-05T00:00:00Z'};
function globals(values: Record<string, unknown>) {
  const descriptors = Object.keys(values).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  for (const [key, value] of Object.entries(values)) Object.defineProperty(globalThis, key, {configurable: true, writable: true, value});
  return () => { for (const [key, descriptor] of descriptors) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } };
}
test('conversation separates the prominent root from chronological comments and preserves safe text', () => {
  const dom = new JSDOM('<div id="root"></div><div id="comments"></div>');
  const restore = globals({document: dom.window.document});
  try {
    const root = dom.window.document.querySelector<HTMLElement>('#root')!, replies = dom.window.document.querySelector<HTMLElement>('#comments')!;
    const result = renderConversation([post, {...post, id: 'reply', parent_id: 'root'}, {...post, id: 'nested', parent_id: 'reply'}], root, replies, 3);
    assert.deepEqual(result, {id: 'root', count: 2});
    assert.equal(root.querySelector('.original-post > .body')?.textContent, '<img src=x>');
    assert.equal(root.querySelector('.message-link'), null);
    assert.equal(root.querySelector('img'), null);
    assert.deepEqual([...replies.children].map(n => n.id), ['post-reply', 'post-nested']);
    assert.equal(replies.querySelector('.reply-context')?.getAttribute('href'), '#post-reply');
    assert.match(replies.querySelector('.message-link')!.getAttribute('href')!, /streamPages=3/);
    assert.equal(renderConversation([post], root, replies).count, 0);
    assert.equal(replies.children.length, 0);
    const homeCard = renderPost(post, {streamPages: 4});
    assert.match(homeCard.querySelector('.message-link')!.getAttribute('href')!, /streamPages=4/);
  } finally { restore(); dom.window.close(); }
});
test('detail page hides the generic intro and has a back link, comments and inert sidebar ad', () => {
  const html = readFileSync(new URL('../dist/conversation/index.html', import.meta.url), 'utf8');
  const dom = new JSDOM(html), doc = dom.window.document;
  assert.doesNotMatch(html, /A thread of thought/);
  assert.equal(doc.querySelector('.hero'), null);
  assert.equal(doc.querySelector('#back-to-stream')?.getAttribute('href'), '/');
  const back = doc.querySelector('#back-to-stream')!;
  assert.equal(back.getAttribute('aria-label'), 'Back to stream');
  assert.equal(back.getAttribute('data-tooltip'), 'Back to stream');
  assert.equal(back.textContent?.trim(), '');
  assert.ok(back.closest('.original-message-shell'));
  assert.equal(doc.querySelector('#original-heading'), null);
  assert.ok(doc.querySelector('#original-message'));
  assert.ok(doc.querySelector('#comments-heading'));
  assert.equal(doc.querySelector('.conversation-sidebar .ad')?.getAttribute('data-ad-active'), 'false');
  dom.window.close();
});
test('stream return finds the message even when newer posts push it past its previous page', async () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const dom = new JSDOM('<div id="feed"></div><p id="status"></p><button id="more"></button><span id="live"></span>', {url: `http://localhost/?pages=2#post-${id}`});
  let requests = 0, scrolled = '';
  dom.window.HTMLElement.prototype.scrollIntoView = function () { scrolled = this.id; };
  class Source {readyState = 1; addEventListener() {} close() {} }
  const restore = globals({document: dom.window.document, window: dom.window, location: dom.window.location, navigator: dom.window.navigator, EventSource: Source, fetch: async () => {
    requests++;
    return new Response(JSON.stringify({items: [{...post, id: requests === 3 ? id : 'newer-' + requests}], nextCursor: requests < 3 ? 'page' + (requests + 1) : null, eventCursor: '0'}), {headers: {'content-type': 'application/json'}});
  }});
  try {
    await startFeed();
    assert.equal(requests, 3);
    assert.equal(scrolled, 'post-' + id);
    assert.equal(dom.window.document.activeElement?.id, 'post-' + id);
    assert.equal(dom.window.document.querySelector('#feed')?.children.length, 3);
    dom.window.dispatchEvent(new dom.window.Event('pagehide'));
    for (const invalid of [null, '-1', 'Infinity', '101', 'hello']) assert.equal(parseStreamPages(invalid), 1);
    assert.equal(parseStreamPages('3'), 3);
  } finally { restore(); dom.window.close(); }
});

test('detail clears an expired conversation on authoritative 404 instead of showing stale text', async () => {
  const dom = new JSDOM('<p id="status"></p><div id="original-message"></div><section class="conversation-comments"><span id="comment-count"></span><p id="comments-empty"></p><div id="conversation"></div></section><a id="back-to-stream"></a>', {url: 'http://localhost/conversation?id=11111111-1111-4111-8111-111111111111'});
  let changed: (() => void) | undefined, expired = false;
  class Source {
    addEventListener(name: string, fn: () => void) { if (name === 'change') changed = fn; }
    close() {}
  }
  const restore = globals({document: dom.window.document, window: dom.window, location: dom.window.location, EventSource: Source, fetch: async (url: string) => {
    if (url === '/api/feed') return new Response(JSON.stringify({eventCursor: '0'}));
    return expired ? new Response(JSON.stringify({error: {message: 'Gone'}}), {status: 404}) : new Response(JSON.stringify([post]));
  }});
  try {
    await startConversation();
    assert.ok(dom.window.document.querySelector('.original-post'));
    expired = true;
    changed!();
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(dom.window.document.querySelector('#original-message')?.children.length, 0);
    assert.equal((dom.window.document.querySelector('.conversation-comments') as HTMLElement).hidden, true);
    assert.match(dom.window.document.querySelector('#status')!.textContent!, /no longer available/);
    dom.window.dispatchEvent(new dom.window.Event('pagehide'));
  } finally { restore(); dom.window.close(); }
});

test('comment details show only direct replies matching their count, not grandchildren or siblings', async () => {
  const {conversationBackUrl} = await import('../src/scripts/conversation');
  const dom = new JSDOM('<div id="root"></div><div id="comments"></div>');
  const restore = globals({document: dom.window.document});
  try {
    const first = {...post, id: 'reply', parent_id: 'root'};
    const nested = {...post, id: 'nested', parent_id: 'reply'};
    const unrelated = {...post, id: 'other', parent_id: 'root'};
    const deeper = {...post, id: 'deeper', parent_id: 'nested'};
    const root = dom.window.document.querySelector<HTMLElement>('#root')!, comments = dom.window.document.querySelector<HTMLElement>('#comments')!;
    assert.deepEqual(renderConversation([post, first, nested, deeper, unrelated], root, comments, 3, 'reply'), {id: 'reply', count: 1});
    assert.equal(root.querySelector('article')?.id, 'post-reply');
    assert.deepEqual([...comments.children].map(n => n.id), ['post-nested']);
    assert.match(comments.querySelector('.message-link')!.getAttribute('href')!, /post=nested/);
    assert.deepEqual(renderConversation([post, first, nested, deeper, unrelated], root, comments, 3, 'nested'), {id: 'nested', count: 1});
    assert.deepEqual([...comments.children].map(n => n.id), ['post-deeper']);
    assert.deepEqual(renderConversation([post, first, nested, deeper, unrelated], root, comments, 3, 'deeper'), {id: 'deeper', count: 0});
    assert.equal(conversationBackUrl('root', first, 3), '/conversation?id=root&streamPages=3#post-reply');
    assert.equal(conversationBackUrl('root', nested, 3), '/conversation?id=root&streamPages=3&post=reply#post-nested');
    assert.equal(conversationBackUrl('root', post, 3), '/?pages=3#post-root');
  } finally { restore(); dom.window.close(); }
});

test('returning to a parent detail scrolls and focuses the selected nested comment', async () => {
  const thread = '11111111-1111-4111-8111-111111111111';
  const parent = '22222222-2222-4222-8222-222222222222';
  const child = '33333333-3333-4333-8333-333333333333';
  const dom = new JSDOM('<p id="status"></p><div id="original-message"></div><section class="conversation-comments"><span id="comment-count"></span><p id="comments-empty"></p><div id="conversation"></div></section><a id="back-to-stream"></a>', {url: `http://localhost/conversation?id=${thread}&post=${parent}&streamPages=3#post-${child}`});
  let scrolled = '';
  dom.window.HTMLElement.prototype.scrollIntoView = function () { scrolled = this.id; };
  class Source { addEventListener() {} close() {} }
  const rows = [{...post, id: thread, conversation_id: thread}, {...post, id: parent, conversation_id: thread, parent_id: thread}, {...post, id: child, conversation_id: thread, parent_id: parent}];
  const restore = globals({document: dom.window.document, window: dom.window, location: dom.window.location, EventSource: Source, fetch: async (url: string) => new Response(JSON.stringify(url === '/api/feed' ? {eventCursor: '0'} : rows))});
  try {
    await startConversation();
    assert.equal(dom.window.document.querySelector('#original-message article')?.id, 'post-' + parent);
    assert.equal(scrolled, 'post-' + child);
    assert.equal(dom.window.document.activeElement?.id, 'post-' + child);
    const back = dom.window.document.querySelector('#back-to-stream')!;
    assert.equal(back.getAttribute('aria-label'), 'Back to parent message');
    assert.equal(back.getAttribute('href'), `/conversation?id=${thread}&streamPages=3#post-${parent}`);
    dom.window.dispatchEvent(new dom.window.Event('pagehide'));
  } finally { restore(); dom.window.close(); }
});
