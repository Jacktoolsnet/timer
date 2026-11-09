import {installDialogMock} from './dialog-mock';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {initializeAdministration} from '../src/scripts/administration';

const html = readFileSync(new URL('../dist/administration/index.html', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
async function fixture(run: (dom: JSDOM, requests: {path: string; body?: any; headers?: HeadersInit}[]) => Promise<void>, fail = false, root = false, withReports = false, agentReport = false, withContext=false) {
  const dom = new JSDOM(html, {url: 'http://localhost/administration'});
  installDialogMock(dom);
  dom.window.scrollTo = () => {};
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  const requests: {path: string; body?: any; headers?: HeadersInit}[] = [];
  let authenticated = false;
  let reviewOutcome='pending',reviewResponse='',reportResolved=false;
  const users = [{id: 'root', handle: 'server_root', is_root: true, enabled: true}, {id: 'normal', handle: 'existing_admin', is_root: false, enabled: true}];
  const values = {document: dom.window.document, FormData: dom.window.FormData, fetch: async (path: string, options?: RequestInit) => {
    requests.push({path, body: options?.body ? JSON.parse(String(options.body)) : undefined, headers: options?.headers});
    if (path === '/api/session') return new Response(JSON.stringify({csrf: 'test-csrf', operatorId: 'operator-only', ...(authenticated ? {adminId: 'admin', adminHandle: root ? 'server_root' : 'test_admin', adminRole: root ? 'root' : 'administrator'} : {})}));
    if (path === '/api/login') {
      if (fail) return new Response(JSON.stringify({error: {message: 'Internal authentication detail'}}), {status: 401});
      authenticated = true;
      return new Response(JSON.stringify({csrf: 'test-csrf'}));
    }
    if(path==='/api/admin/appeals/review-id/decision'){const body=JSON.parse(String(options?.body));reviewOutcome=body.outcome.startsWith('accepted_')?'accepted':body.outcome;reviewResponse=body.response;return new Response(JSON.stringify({ok:true}));}
    if (path === '/api/admin/actions'){reportResolved=true;return new Response(JSON.stringify({ok:true}));}
    if (path === '/api/logout') { authenticated = false; return new Response(JSON.stringify({ok: true})); }
    if (path.startsWith('/api/admin?')) {
      const data={reports: withReports ? [{id:'report', target_kind:agentReport?'agent':'message', post_id:agentReport?null:'message', agent_id:'agent', agent_handle:'example_agent', agent_name:'Example', conversation_id:'thread', post_body:'Reported example', reason:'Reported reason', created_at:'2026-11-05T10:00:00Z', resolved:reportResolved}] : [], appeals: withReports?[{id:'review-id',operator_id:'owner',operator_handle:'example_operator',reason:'Please reconsider decision 42.',created_at:'2026-11-06T08:00:00Z',status:reviewOutcome,response:reviewResponse,original_action:'hide',submitted_by:withContext?'agent':'operator',agent_handle:'example',revision:withContext?2:0,messages:withContext?[{author_role:'agent',body:'Agent clarification.',created_at:'2026-11-06T08:01:00Z'},{author_role:'operator',body:'Operator context.',created_at:'2026-11-06T08:02:00Z'}]:[]}]:[]};
      const counts={pending:data.reports.filter(r=>!r.resolved).length+data.appeals.filter(r=>r.status==='pending').length,processed:data.reports.filter(r=>r.resolved).length+data.appeals.filter(r=>r.status!=='pending').length};
      const status=new URL(path,'http://localhost').searchParams.get('status');
      return new Response(JSON.stringify({counts,reports:data.reports.filter(r=>status==='processed'?r.resolved:!r.resolved),appeals:data.appeals.filter(r=>status==='processed'?r.status!=='pending':r.status==='pending')}));
    }
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
  const shell=doc.querySelector('#admin-login-shell')!;
  assert.equal(shell.querySelector('.admin-eyebrow,h1,.admin-login-copy,.admin-login-note'),null);
  assert.equal(shell.querySelector('form')!.getAttribute('aria-label'),'Administration');
  assert.equal(shell.querySelector('.admin-login-art p')!.textContent,'Manage access.Review reports.');
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
  assert.equal(requests.some(r => r.path.startsWith('/api/admin?')), false);
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
  assert.equal((doc.querySelector('#admin-overview') as HTMLElement).hidden, false);
  assert.deepEqual([...doc.querySelectorAll('#dashboard h1')].filter(node=>!node.closest('[hidden]')).map(node=>node.id),['admin-heading']);
  assert.equal((doc.querySelector('#admin-user-management') as HTMLElement).hidden, true);
  assert.equal(requests.some(r => r.path === '/api/admin/users'), false);
  (doc.querySelector('#admin-users-tile') as HTMLButtonElement).click();
  await tick();
  assert.equal((doc.querySelector('#admin-user-management') as HTMLElement).hidden, false);
  const cards = doc.querySelectorAll('.admin-user-card');
  assert.equal(cards.length, 2);
  assert.equal(cards[0].querySelector('input'), null);
  assert.ok(cards[1].querySelector('input[type=password]'));
  for(const button of cards[1].querySelectorAll('button')){
    assert.equal(button.textContent?.trim(),'');assert.ok(button.querySelector('svg'));assert.ok(button.getAttribute('aria-label'));
    assert.equal(button.getAttribute('aria-label'),button.getAttribute('data-tooltip'));
  }
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
  (doc.querySelector('.admin-user-toggle') as HTMLButtonElement).click();
  await tick();
  assert.ok(requests.some(r => r.path === '/api/admin/users/normal' && r.body?.enabled === false));
}, false, true));

test('administration tiles, back navigation and toolbar lock follow the authenticated workspace', async () => fixture(async (dom, requests) => {
  await initializeAdministration();
  const doc = dom.window.document;
  (doc.querySelector('#admin-handle') as HTMLInputElement).value = 'server_root';
  (doc.querySelector('#admin-password') as HTMLInputElement).value = 'test-only-password';
  doc.querySelector('#login')!.dispatchEvent(new dom.window.Event('submit', {cancelable: true}));
  await tick();
  assert.equal((doc.querySelector('#admin-overview') as HTMLElement).hidden, false);
  assert.equal(doc.querySelectorAll('.admin-tile svg[aria-hidden=true]').length, 3);
  for (const link of doc.querySelectorAll('header nav a.header-action')) {
    assert.equal(link.getAttribute('aria-disabled'), 'true');
    assert.equal((link as HTMLElement).hidden, true);
    assert.equal(link.hasAttribute('href'), false);
    assert.equal(link.getAttribute('tabindex'), '-1');
    const click = new dom.window.MouseEvent('click', {bubbles: true, cancelable: true});
    link.dispatchEvent(click); assert.equal(click.defaultPrevented, true);
  }
  assert.equal((doc.querySelector('#admin-header-logout') as HTMLElement).hidden, false);
  assert.equal(doc.querySelector('.admin-session-handle')?.textContent, '@server_root');
  assert.equal(doc.querySelector('#admin-header-logout')?.getAttribute('aria-label'), 'Sign out · @server_root');
  assert.equal(doc.querySelector('[aria-label="Settings"]')?.getAttribute('aria-disabled'), null);
  assert.equal(requests.some(r => r.path.startsWith('/api/admin?')), false);
  assert.equal(doc.querySelector<HTMLElement>('#admin-moderation-tile')!.hidden,true);
  assert.equal(doc.querySelector<HTMLElement>('#admin-retention-tile')!.hidden,true);
  dom.window.location.hash='#moderation';await tick();
  assert.equal(doc.querySelector<HTMLElement>('#admin-moderation')!.hidden,true);
  assert.equal(requests.some(r=>r.path.startsWith('/api/admin?')),false);
  (doc.querySelector('#admin-users-tile') as HTMLButtonElement).click();
  await tick();
  const filter = doc.querySelector<HTMLInputElement>('#admin-user-filter')!;
  filter.value = 'existing'; filter.dispatchEvent(new dom.window.Event('input'));
  assert.equal(doc.querySelectorAll('.admin-user-card').length, 1);
  assert.match(doc.querySelector('.admin-user-card')!.textContent!, /existing_admin/);
  (doc.querySelector('#new-admin-password') as HTMLInputElement).value = 'discard-on-leave';
  (doc.querySelector('#admin-user-management .admin-back') as HTMLButtonElement).click();
  assert.equal((doc.querySelector('#new-admin-password') as HTMLInputElement).value, '');
  (doc.querySelector('#admin-header-logout') as HTMLButtonElement).click();
  await tick();
  assert.equal((doc.querySelector('#dashboard') as HTMLElement).hidden, true);
  assert.equal((doc.querySelector('#admin-login-shell') as HTMLElement).hidden, false);
  assert.equal((doc.querySelector('#admin-header-logout') as HTMLElement).hidden, true);
  assert.equal(doc.querySelector('.admin-session-handle')?.textContent, '');
  assert.equal(doc.querySelector('header nav a')?.getAttribute('href'), '/conversations');
  assert.equal(doc.querySelector('header nav a')?.getAttribute('aria-disabled'), null);
  assert.equal(doc.querySelector<HTMLElement>('header nav a')!.hidden,false);
}, false, true));

test('ordinary administrators cannot open user management even through a view hash', async () => fixture(async (dom, requests) => {
  await initializeAdministration();
  const doc = dom.window.document;
  (doc.querySelector('#admin-handle') as HTMLInputElement).value = 'normal_admin';
  (doc.querySelector('#admin-password') as HTMLInputElement).value = 'test-only-password';
  doc.querySelector('#login')!.dispatchEvent(new dom.window.Event('submit', {cancelable: true}));
  await tick();
  assert.equal((doc.querySelector('#admin-users-tile') as HTMLButtonElement).disabled, true);
  dom.window.history.replaceState(null, '', '#users');
  dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
  await tick();
  assert.equal((doc.querySelector('#admin-user-management') as HTMLElement).hidden, true);
  assert.equal((doc.querySelector('#admin-overview') as HTMLElement).hidden, false);
  assert.equal(requests.some(r => r.path === '/api/admin/users'), false);
}));

test('human-readable moderation review selects the right target without executing an action', async () => fixture(async (dom, requests) => {
  await initializeAdministration();
  const doc = dom.window.document;
  (doc.querySelector('#admin-handle') as HTMLInputElement).value = 'test_admin';
  (doc.querySelector('#admin-password') as HTMLInputElement).value = 'test-only-password';
  doc.querySelector('#login')!.dispatchEvent(new dom.window.Event('submit', {cancelable: true}));
  await tick();
  (doc.querySelector('#admin-moderation-tile') as HTMLButtonElement).click();
  await tick();
  assert.match(doc.querySelector('#reports')!.textContent!, /Reported example/);
  assert.equal(doc.querySelector('#reports pre'), null);
  (doc.querySelector('.moderation-report-actions button') as HTMLButtonElement).click();
  assert.equal((doc.querySelector('#action-id') as HTMLInputElement).value, 'message');
  assert.equal((doc.querySelector('#action-type') as HTMLSelectElement).value, 'hide');
  assert.equal((doc.querySelector('#action-reason') as HTMLTextAreaElement).value, '');
  assert.equal(doc.activeElement?.id, 'action-reason');
  const action = doc.querySelector<HTMLSelectElement>('#action-type')!;
  action.value = 'block'; action.dispatchEvent(new dom.window.Event('change'));
  assert.equal((doc.querySelector('#action-id') as HTMLInputElement).value, 'agent');
  assert.equal(requests.some(r => r.path === '/api/admin/actions'), false);
  (doc.querySelector('#admin-moderation .admin-back') as HTMLButtonElement).click();
  assert.equal((doc.querySelector('#action-id') as HTMLInputElement).value, '');
}, false, false, true));


test('no-action decision sends selected report and editable preset only on explicit submission', async () => fixture(async (dom, requests) => {
  await initializeAdministration();
  const doc = dom.window.document;
  (doc.querySelector('#admin-handle') as HTMLInputElement).value = 'test_admin';
  (doc.querySelector('#admin-password') as HTMLInputElement).value = 'test-only-password';
  doc.querySelector('#login')!.dispatchEvent(new dom.window.Event('submit', {cancelable:true}));
  await tick();
  (doc.querySelector('#admin-moderation-tile') as HTMLButtonElement).click(); await tick();
  (doc.querySelector('.moderation-report-actions button') as HTMLButtonElement).click();
  (doc.querySelector('#moderation-action-trigger') as HTMLButtonElement).click();
  (doc.querySelector('[data-value=dismiss]') as HTMLButtonElement).click();
  (doc.querySelector('#moderation-reason-presets button') as HTMLButtonElement).click();
  const reason = doc.querySelector<HTMLTextAreaElement>('#action-reason')!;
  reason.value += ' Reviewed the whole thread.';
  assert.equal(requests.some(r => r.path === '/api/admin/actions'),false);
  doc.querySelector('#action')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
  await tick();
  const decision = requests.find(r => r.path === '/api/admin/actions')!;
  assert.equal(decision.body.action,'dismiss');
  assert.equal(decision.body.id,'message');
  assert.equal(decision.body.reportId,'report');
  assert.match(decision.body.reason,/Reviewed the whole thread/);
}, false, false, true));


test('moderation submit is a labelled icon button with the action text as tooltip', () => {
  const dom = new JSDOM(html);
  const button = dom.window.document.querySelector('#action button[type=submit]')!;
  assert.equal(button.getAttribute('aria-label'), 'Record moderation action');
  assert.equal(button.getAttribute('data-tooltip'), 'Record moderation action');
  assert.equal(button.textContent, '');
  assert.ok(button.querySelector('svg[aria-hidden=true]'));
  dom.window.close();
});


test('admin decides an operator review with an explicit outcome and response', async () => fixture(async(dom,requests)=>{
  await initializeAdministration();const doc=dom.window.document;
  (doc.querySelector('#admin-handle') as HTMLInputElement).value='test_admin';
  (doc.querySelector('#admin-password') as HTMLInputElement).value='test-only-password';
  doc.querySelector('#login')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();
  (doc.querySelector('#admin-moderation-tile') as HTMLButtonElement).click();await tick();
  const button=Array.from(doc.querySelectorAll<HTMLButtonElement>('.moderation-review-card button')).find(b=>b.getAttribute('aria-label')==='Decide review')!;
  assert.equal(button.getAttribute('data-tooltip'),'Decide review');assert.equal(button.textContent,'');assert.ok(button.querySelector('svg[aria-hidden=true]'));
  button.click();assert.equal((doc.querySelector('#review-decision') as HTMLElement).hidden,false);
  assert.match(doc.querySelector('#review-decision-context')!.textContent!,/Please reconsider decision 42/);
  assert.equal(requests.some(r=>r.path.includes('/decision')),false);
  (doc.querySelector('#review-decision-trigger') as HTMLButtonElement).click();
  (doc.querySelector('#review-decision-options [data-value=accepted]') as HTMLButtonElement).click();
  (doc.querySelector('#review-response-presets button') as HTMLButtonElement).click();
  assert.match((doc.querySelector('#review-response') as HTMLTextAreaElement).value,/accept/);
  assert.equal(requests.some(r=>r.path.includes('/appeals/')),false);
  (doc.querySelector('#review-response') as HTMLTextAreaElement).value='Your review is accepted. Here is the explanation.';
  doc.querySelector('#review-decision')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();await tick();
  const decision=requests.find(r=>r.path.includes('/appeals/'))!;
  assert.equal(decision.body.outcome,'accepted');assert.match(decision.body.response,/explanation/);
  assert.equal(new Headers(decision.headers).get('x-csrf-token'),'test-csrf');
  assert.equal((doc.querySelector('#review-decision') as HTMLElement).hidden,true);
  assert.equal(doc.querySelector('.moderation-review-card'),null);
  (doc.querySelector('#moderation-processed-tab') as HTMLButtonElement).click();await tick();
  assert.match(doc.querySelector('.moderation-review-card')!.textContent!,/Review accepted/);
  assert.equal(doc.querySelector('.moderation-review-card button'),null);
},false,false,true));

test('admin moderation has full-width lists and opens only the requested form in one modal',async()=>fixture(async(dom,requests)=>{
  await initializeAdministration();const doc=dom.window.document;
  (doc.querySelector('#admin-handle') as HTMLInputElement).value='test_admin';
  (doc.querySelector('#admin-password') as HTMLInputElement).value='test-only-password';
  doc.querySelector('#login')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();
  (doc.querySelector('#admin-moderation-tile') as HTMLButtonElement).click();await tick();
  const dialog=doc.querySelector<HTMLDialogElement>('#admin-moderation-dialog')!;
  assert.equal(dialog.open,false);assert.equal(doc.querySelector('#admin-moderation .admin-moderation-grid'),null);
  assert.equal(doc.querySelector('#open-moderation-action'),null);
  assert.equal(doc.querySelector<HTMLInputElement>('#action-id')!.readOnly,true);
  const report=doc.querySelector<HTMLButtonElement>('.moderation-report-actions button')!;report.focus();report.click();
  assert.equal(dialog.open,true);assert.equal((doc.querySelector('#action') as HTMLElement).hidden,false);assert.equal((doc.querySelector('#review-decision') as HTMLElement).hidden,true);
  dialog.dispatchEvent(new dom.window.Event('cancel',{cancelable:true}));assert.equal(dialog.open,false);assert.equal(doc.activeElement,report);
  const review=doc.querySelector<HTMLButtonElement>('.moderation-review-card button')!;review.click();
  assert.equal(dialog.open,true);assert.equal((doc.querySelector('#action') as HTMLElement).hidden,true);assert.equal((doc.querySelector('#review-decision') as HTMLElement).hidden,false);
  (doc.querySelector('#review-response') as HTMLTextAreaElement).value='Unsent draft';
  (doc.querySelector('#review-cancel') as HTMLButtonElement).click();assert.equal(dialog.open,false);
  assert.equal((doc.querySelector('#review-response') as HTMLTextAreaElement).value,'');
  assert.equal(requests.some(r=>r.path.includes('/decision')||r.path==='/api/admin/actions'),false);
},false,false,true));


test('workspace overlay action buttons are icons with accessible names and text tooltips',()=>{
  for(const path of ['administration','operator']){
    const dom=new JSDOM(readFileSync(new URL('../dist/'+path+'/index.html',import.meta.url),'utf8'));
    for(const dialog of dom.window.document.querySelectorAll('dialog.workspace-dialog')){
    const buttons=dialog.querySelectorAll<HTMLButtonElement>('button[type=submit],button[data-dialog-close],#operator-delete-confirm,#operator-key-confirm,[data-unsaved-save],[data-unsaved-discard]');
    assert.ok(buttons.length>=2);
    for(const button of buttons){assert.ok(button.querySelector('svg[aria-hidden=true]'));assert.equal(button.textContent,'');assert.ok(button.getAttribute('aria-label'));assert.equal(button.getAttribute('data-tooltip'),button.getAttribute('aria-label'));}
    }
    dom.window.close();
  }
});


test('linked message review offers explicit acceptance with restoration and editable response',async()=>fixture(async(dom,requests)=>{
  await initializeAdministration();const doc=dom.window.document;
  (doc.querySelector('#admin-handle') as HTMLInputElement).value='test_admin';
  (doc.querySelector('#admin-password') as HTMLInputElement).value='test-only-password';
  doc.querySelector('#login')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();
  (doc.querySelector('#admin-moderation-tile') as HTMLButtonElement).click();await tick();
  doc.querySelector<HTMLButtonElement>('.moderation-review-card button')!.click();
  doc.querySelector<HTMLButtonElement>('#review-decision-trigger')!.click();
  const restore=doc.querySelector<HTMLButtonElement>('#review-decision-options [data-value=accepted_restore]')!;
  assert.equal(restore.hidden,false);assert.equal(doc.querySelector<HTMLElement>('#review-decision-options [data-value=accepted_unblock]')!.hidden,true);
  restore.click();doc.querySelector<HTMLButtonElement>('#review-response-presets button')!.click();
  assert.equal(requests.some(r=>r.path.includes('/appeals/')),false);
  doc.querySelector('#review-decision')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();await tick();
  assert.equal(requests.find(r=>r.path.includes('/appeals/'))!.body.outcome,'accepted_restore');
  assert.match(requests.find(r=>r.path.includes('/appeals/'))!.body.response,/restored/);
},false,false,true));


test('admin opens an agent report with block/no-action decisions and an agent target',async()=>fixture(async(dom,requests)=>{
  await initializeAdministration();const doc=dom.window.document;
  (doc.querySelector('#admin-handle') as HTMLInputElement).value='test_admin';
  (doc.querySelector('#admin-password') as HTMLInputElement).value='test-only-password';
  doc.querySelector('#login')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();
  doc.querySelector<HTMLButtonElement>('#admin-moderation-tile')!.click();await tick();
  doc.querySelector<HTMLButtonElement>('.moderation-report-actions button')!.click();
  assert.equal(doc.querySelector<HTMLSelectElement>('#action-type')!.value,'block');assert.equal(doc.querySelector<HTMLInputElement>('#action-id')!.value,'agent');
  assert.deepEqual(Array.from(doc.querySelectorAll<HTMLElement>('#moderation-action-options [role=option]:not([hidden])')).map(option=>option.dataset.value),['block','dismiss']);
  doc.querySelector<HTMLButtonElement>('#moderation-action-trigger')!.click();doc.querySelector<HTMLButtonElement>('#moderation-action-options [data-value=dismiss]')!.click();
  assert.equal(doc.querySelector<HTMLInputElement>('#action-id')!.value,'agent');
  doc.querySelector<HTMLTextAreaElement>('#action-reason')!.value='No agent-level action required.';
  doc.querySelector('#action')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();
  const action=requests.find(r=>r.path==='/api/admin/actions')!;assert.equal(action.body.id,'agent');assert.equal(action.body.reportId,'report');assert.equal(action.body.action,'dismiss');
},false,false,true,true));


test('admin sees both participants and submits the context revision with its verdict',async()=>fixture(async(dom,requests)=>{
  await initializeAdministration();const doc=dom.window.document;
  doc.querySelector<HTMLInputElement>('#admin-handle')!.value='test_admin';doc.querySelector<HTMLInputElement>('#admin-password')!.value='test-only-password';
  doc.querySelector('#login')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();
  doc.querySelector<HTMLButtonElement>('#admin-moderation-tile')!.click();await tick();
  doc.querySelector<HTMLButtonElement>('.moderation-review-card button')!.click();
  assert.match(doc.querySelector('#review-decision-context')!.textContent!,/Submitted by agent/);assert.match(doc.querySelector('#review-decision-context')!.textContent!,/Operator context/);
  doc.querySelector<HTMLButtonElement>('#review-decision-trigger')!.click();doc.querySelector<HTMLButtonElement>('#review-decision-options [data-value=rejected]')!.click();
  doc.querySelector<HTMLTextAreaElement>('#review-response')!.value='Reviewed both participants.';
  doc.querySelector('#review-decision')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();
  assert.equal(requests.find(r=>r.path.includes('/appeals/'))!.body.expectedRevision,2);
},false,false,true,false,true));


test('moderation status tabs filter queues, show counts, support keyboard navigation and keep processed cases read-only',async()=>fixture(async(dom,requests)=>{
  await initializeAdministration();const doc=dom.window.document;
  doc.querySelector<HTMLInputElement>('#admin-handle')!.value='test_admin';doc.querySelector<HTMLInputElement>('#admin-password')!.value='test-only-password';
  doc.querySelector('#login')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();
  doc.querySelector<HTMLButtonElement>('#admin-moderation-tile')!.click();await tick();
  const pending=doc.querySelector<HTMLButtonElement>('#moderation-pending-tab')!,processed=doc.querySelector<HTMLButtonElement>('#moderation-processed-tab')!;
  assert.equal(pending.getAttribute('aria-selected'),'true');assert.equal(doc.querySelector('#moderation-pending-count')!.textContent,'2');assert.equal(doc.querySelector('#moderation-processed-count')!.textContent,'0');
  assert.ok(requests.some(r=>r.path==='/api/admin?status=pending'));processed.click();await tick();
  assert.equal(processed.getAttribute('aria-selected'),'true');assert.equal(doc.querySelector('#reports')!.getAttribute('aria-labelledby'),processed.id);assert.match(doc.querySelector('#reports')!.textContent!,/Nothing processed yet/);
  processed.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));await tick();assert.equal(doc.activeElement,pending);assert.equal(pending.tabIndex,0);assert.equal(processed.tabIndex,-1);
  doc.querySelector<HTMLButtonElement>('.moderation-review-card button')!.click();
  doc.querySelector<HTMLButtonElement>('#review-decision-trigger')!.click();doc.querySelector<HTMLButtonElement>('#review-decision-options [data-value=closed]')!.click();doc.querySelector<HTMLTextAreaElement>('#review-response')!.value='Closed with explanation.';
  doc.querySelector('#review-decision')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();await tick();
  assert.equal(doc.querySelector('#moderation-pending-count')!.textContent,'1');assert.equal(doc.querySelector('#moderation-processed-count')!.textContent,'1');assert.equal(doc.querySelector('.moderation-review-card'),null);
  processed.click();await tick();assert.match(doc.querySelector('.moderation-review-card')!.textContent!,/Closed with explanation/);assert.equal(doc.querySelector('.moderation-review-card button'),null);
},false,false,true));
