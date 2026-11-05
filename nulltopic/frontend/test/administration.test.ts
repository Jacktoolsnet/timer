import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {initializeAdministration} from '../src/scripts/administration';

const html = readFileSync(new URL('../dist/administration/index.html', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
async function fixture(run: (dom: JSDOM, requests: {path: string; body?: any; headers?: HeadersInit}[]) => Promise<void>, fail = false, root = false) {
  const dom = new JSDOM(html, {url: 'http://localhost/administration'});
  const requests: {path: string; body?: any; headers?: HeadersInit}[] = [];
  let authenticated = false;
  const users = [{id: 'root', handle: 'server_root', is_root: true, enabled: true}, {id: 'normal', handle: 'existing_admin', is_root: false, enabled: true}];
  const values = {document: dom.window.document, FormData: dom.window.FormData, fetch: async (path: string, options?: RequestInit) => {
    requests.push({path, body: options?.body ? JSON.parse(String(options.body)) : undefined, headers: options?.headers});
    if (path === '/api/session') return new Response(JSON.stringify({csrf: 'test-csrf', operatorId: 'operator-only', ...(authenticated ? {adminId: 'admin', adminRole: root ? 'root' : 'administrator'} : {})}));
    if (path === '/api/login') {
      if (fail) return new Response(JSON.stringify({error: {message: 'Internal authentication detail'}}), {status: 401});
      authenticated = true;
      return new Response(JSON.stringify({csrf: 'test-csrf'}));
    }
    if (path === '/api/admin') return new Response(JSON.stringify({reports: [], appeals: []}));
    if (path === '/api/admin/users') {
      if (options?.method === 'POST') {
        const body = JSON.parse(String(options.body));
        users.push({id: 'created', handle: body.handle, is_root: false, enabled: true});
        return new Response(JSON.stringify({id: 'created'}));
      }
      return new Response(JSON.stringify(users));
    }
    if (path.startsWith('/api/admin/users/')) return new Response(JSON.stringify({ok: true}));
    throw Error('Unexpected request');
  }};
  const previous = Object.keys(values).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  for (const [key, value] of Object.entries(values)) Object.defineProperty(globalThis, key, {configurable: true, value});
  try { await run(dom, requests); }
  finally {
    for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
    dom.window.close();
  }
}

test('administration has a theme-aware SVG login card and legacy route redirects', () => {
  const dom = new JSDOM(html), doc = dom.window.document;
  assert.equal(doc.querySelector('.hero'), null);
  assert.ok(doc.querySelector('.admin-login-art[aria-hidden="true"] svg'));
  assert.ok(doc.querySelector('#admin-handle[autocomplete="username"]'));
  assert.ok(doc.querySelector('#admin-password[type="password"]'));
  assert.equal((doc.querySelector('#dashboard') as HTMLElement).hidden, true);
  assert.equal(doc.querySelector('header a[href="/administration"]')?.getAttribute('aria-current'), 'page');
  const legacy = new JSDOM(readFileSync(new URL('../dist/moderation/index.html', import.meta.url), 'utf8'));
  assert.match(legacy.window.document.querySelector('meta[http-equiv="refresh"]')!.getAttribute('content')!, /url=\/administration/);
  legacy.window.close(); dom.window.close();
});
test('operator sessions see only admin login; successful admin authentication reveals the dashboard', async () => fixture(async (dom, requests) => {
  await initializeAdministration();
  const doc = dom.window.document;
  assert.equal((doc.querySelector('#admin-login-shell') as HTMLElement).hidden, false);
  assert.equal((doc.querySelector('#dashboard') as HTMLElement).hidden, true);
  assert.equal(requests.some(r => r.path === '/api/admin'), false);
  (doc.querySelector('#admin-handle') as HTMLInputElement).value = 'test_admin';
  (doc.querySelector('#admin-password') as HTMLInputElement).value = 'test-only-password';
  doc.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', {cancelable: true}));
  await tick();
  assert.equal(requests.find(r => r.path === '/api/login')?.body.admin, true);
  assert.equal(new Headers(requests.find(r => r.path === '/api/login')?.headers).get('x-csrf-token'), 'test-csrf');
  assert.equal((doc.querySelector('#admin-login-shell') as HTMLElement).hidden, true);
  assert.equal((doc.querySelector('#dashboard') as HTMLElement).hidden, false);
  assert.equal((doc.querySelector('#admin-user-management') as HTMLElement).hidden, true);
  assert.equal((doc.querySelector('#admin-password') as HTMLInputElement).value, '');
}));
test('failed administrator authentication stays on login and shows a safe inline error', async () => fixture(async (dom) => {
  await initializeAdministration();
  const doc = dom.window.document;
  (doc.querySelector('#admin-handle') as HTMLInputElement).value = 'test_admin';
  (doc.querySelector('#admin-password') as HTMLInputElement).value = 'test-only-password';
  doc.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', {cancelable: true}));
  await tick();
  assert.equal((doc.querySelector('#dashboard') as HTMLElement).hidden, true);
  assert.match(doc.querySelector('#login-status')!.textContent!, /Unable to sign in/);
  assert.doesNotMatch(doc.body.textContent!, /Internal authentication detail/);
  assert.equal((doc.querySelector('#login button') as HTMLButtonElement).disabled, false);
}, true));

test('root can manage accounts while its own credentials remain environment-only', async () => fixture(async (dom, requests) => {
  await initializeAdministration();
  const doc = dom.window.document;
  (doc.querySelector('#admin-handle') as HTMLInputElement).value = 'server_root';
  (doc.querySelector('#admin-password') as HTMLInputElement).value = 'test-only-password';
  doc.querySelector('#login')!.dispatchEvent(new dom.window.Event('submit', {cancelable: true}));
  await tick();
  assert.equal((doc.querySelector('#admin-user-management') as HTMLElement).hidden, false);
  const cards = doc.querySelectorAll('.admin-user-card');
  assert.equal(cards.length, 2);
  assert.equal(cards[0].querySelector('input'), null);
  assert.ok(cards[1].querySelector('input[type=password]'));
  (doc.querySelector('#new-admin-handle') as HTMLInputElement).value = 'new_admin';
  (doc.querySelector('#new-admin-password') as HTMLInputElement).value = 'test-new-password';
  doc.querySelector('#admin-create-user')!.dispatchEvent(new dom.window.Event('submit', {cancelable: true}));
  await tick();
  assert.equal(requests.find(r => r.path === '/api/admin/users' && r.body)?.body.handle, 'new_admin');
  assert.equal((doc.querySelector('#new-admin-password') as HTMLInputElement).value, '');
  assert.equal(doc.querySelectorAll('.admin-user-card').length, 3);
  const normalForm = doc.querySelector<HTMLFormElement>('.admin-user-password')!;
  normalForm.querySelector('input')!.value = 'test-reset-password';
  normalForm.dispatchEvent(new dom.window.Event('submit', {cancelable: true}));
  await tick();
  assert.ok(requests.some(r => r.path === '/api/admin/users/normal' && r.body?.password));
  (doc.querySelector('.admin-user-password button[type=button]') as HTMLButtonElement).click();
  await tick();
  assert.ok(requests.some(r => r.path === '/api/admin/users/normal' && r.body?.enabled === false));
}, false, true));
