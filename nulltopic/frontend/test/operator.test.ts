import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {initializeOperator} from '../src/scripts/operator';
const html = readFileSync(new URL('../dist/operator/index.html', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
async function fixture(run: (dom: JSDOM, requests: {path: string; body?: any}[]) => Promise<void>, options: {signedIn?: boolean; fail?: boolean; confirmation?: boolean} = {}) {
  const dom = new JSDOM(html, {url: 'http://localhost/operator' + (options.confirmation ? '?confirmation=test-token' : '')});
  let signedIn = !!options.signedIn;
  const requests: {path: string; body?: any}[] = [];
  const values = {document: dom.window.document, location: dom.window.location, FormData: dom.window.FormData, fetch: async (path: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    requests.push({path, body});
    if (path === '/api/session') return new Response(JSON.stringify({csrf: 'test-csrf', adminId: 'unrelated-admin', ...(signedIn ? {operatorId: 'operator'} : {})}));
    if (path === '/api/login') {
      if (options.fail) return new Response(JSON.stringify({error: {message: 'Internal detail'}}), {status: 401});
      signedIn = true; return new Response(JSON.stringify({csrf: 'test-csrf'}));
    }
    if (path === '/api/operator') return new Response(JSON.stringify({operator: {guidelines: 'Test boundaries'}, agents: [], notices: []}));
    if (path === '/api/confirmation?token=test-token') return new Response(JSON.stringify({name: 'Pending example'}));
    throw Error('Unexpected request');
  }};
  const descriptors = Object.keys(values).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  for (const [key, value] of Object.entries(values)) Object.defineProperty(globalThis, key, {configurable: true, value});
  try { await run(dom, requests); }
  finally { for (const [key, descriptor] of descriptors) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } dom.window.close(); }
}
test('operator login uses its own palette-aware agent illustration without a generic hero', () => {
  const dom = new JSDOM(html), doc = dom.window.document;
  assert.equal(doc.querySelector('.hero'), null);
  assert.ok(doc.querySelector('#operator-login-shell .operator-art-solid'));
  assert.equal(doc.querySelector('.admin-art-shield'), null);
  assert.ok(doc.querySelector('#operator-password[autocomplete="current-password"]'));
  assert.equal((doc.querySelector('#dashboard') as HTMLElement).hidden, true);
  dom.window.close();
});
test('admin-only session stays on operator login; operator authentication clears password and reveals management', async () => fixture(async (dom, requests) => {
  await initializeOperator();
  const doc = dom.window.document;
  assert.equal((doc.querySelector('#operator-login-shell') as HTMLElement).hidden, false);
  assert.equal(requests.some(r => r.path === '/api/operator'), false);
  (doc.querySelector('#operator-handle') as HTMLInputElement).value = 'test_operator';
  (doc.querySelector('#operator-password') as HTMLInputElement).value = 'test-only-password';
  doc.querySelector('#login')!.dispatchEvent(new dom.window.Event('submit', {cancelable: true}));
  await tick();
  assert.equal(requests.find(r => r.path === '/api/login')?.body.admin, undefined);
  assert.equal((doc.querySelector('#dashboard') as HTMLElement).hidden, false);
  assert.equal((doc.querySelector('#operator-login-shell') as HTMLElement).hidden, true);
  assert.equal((doc.querySelector('#operator-password') as HTMLInputElement).value, '');
}));
test('operator confirmation remains an explicit review, never an automatic approval', async () => fixture(async (dom, requests) => {
  await initializeOperator();
  assert.equal((dom.window.document.querySelector('#confirmation') as HTMLElement).hidden, false);
  assert.match(dom.window.document.querySelector('#prepared')!.textContent!, /Pending example/);
  assert.equal(requests.some(r => r.path === '/api/confirmation' && r.body), false);
}, {signedIn: true, confirmation: true}));
test('operator login failures stay inline without exposing backend details', async () => fixture(async (dom) => {
  await initializeOperator();
  const doc = dom.window.document;
  (doc.querySelector('#operator-handle') as HTMLInputElement).value = 'test_operator';
  (doc.querySelector('#operator-password') as HTMLInputElement).value = 'test-only-password';
  doc.querySelector('#login')!.dispatchEvent(new dom.window.Event('submit', {cancelable: true}));
  await tick();
  assert.equal((doc.querySelector('#dashboard') as HTMLElement).hidden, true);
  assert.match(doc.querySelector('#login-status')!.textContent!, /operator credentials/);
  assert.doesNotMatch(doc.body.textContent!, /Internal detail/);
}, {fail: true}));
