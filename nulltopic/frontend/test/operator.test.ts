import {installDialogMock} from './dialog-mock';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {initializeOperator} from '../src/scripts/operator';
const html = readFileSync(new URL('../dist/operator/index.html', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
async function fixture(run: (dom: JSDOM, requests: {path: string; body?: any}[]) => Promise<void>, options: {signedIn?: boolean; fail?: boolean; confirmation?: boolean; withData?:boolean; expire?:boolean;reviews?:boolean;decided?:boolean;agentAccepted?:boolean;cases?:boolean;operatorPaused?:boolean;agentStatus?:string;declarationVersion?:string;approvedScope?:string;confirmationFail?:boolean} = {}) {
  const dom = new JSDOM(html, {url: 'http://localhost/operator' + (options.confirmation ? '?confirmation=test-token' : '')});
  installDialogMock(dom);
  dom.window.scrollTo=()=>{}; dom.window.HTMLElement.prototype.scrollIntoView=()=>{}; dom.window.confirm=()=>true;
  let signedIn = !!options.signedIn;
  const operatorReplies:string[]=[];let acceptedNotice=false,acceptedReview=false;
  const requests: {path: string; body?: any}[] = [];
  const values = {document: dom.window.document, location: dom.window.location, FormData: dom.window.FormData, fetch: async (path: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    requests.push({path, body});
    if (path === '/api/session') return new Response(JSON.stringify({csrf: 'test-csrf', adminId: 'unrelated-admin', ...(signedIn ? {operatorId: 'operator'} : {})}));
    if (path === '/api/login') {
      if (options.fail) return new Response(JSON.stringify({error: {message: 'Internal detail'}}), {status: 401});
      signedIn = true; return new Response(JSON.stringify({csrf: 'test-csrf'}));
    }
    if(path==='/api/operator/moderation/42/accept'){acceptedNotice=true;return new Response(JSON.stringify({ok:true}));}
    if(path==='/api/operator/appeals/review-fixture/accept'){acceptedReview=true;return new Response(JSON.stringify({ok:true}));}
    if (path === '/api/logout') {signedIn=false;return new Response(JSON.stringify({ok:true}));}
    if(path==='/api/operator/appeals/review-fixture/messages'){operatorReplies.push(body.body);return new Response(JSON.stringify({reviewId:options.decided?'follow-up':'review-fixture',followUp:!!options.decided}));}
    if (path === '/api/operator/appeals') {
      if(options.expire){signedIn=false;return new Response(JSON.stringify({error:{message:'Expired'}}),{status:401});}
      return new Response(JSON.stringify({ok:true}));
    }
    if(path.startsWith('/api/operator/agents/agent/posts?'))return new Response(JSON.stringify({agent:{id:'agent',name:'Example agent',handle:'example',status:'paused'},items:[],total:0,nextCursor:null}));
    if (path === '/api/operator/agents/agent') return new Response(JSON.stringify({key:'one-time-test-key'}));
    if(path==='/api/operator'||path.startsWith('/api/operator?')){
      const data={review_requests:options.reviews?[{id:'review-fixture',...(options.cases?{moderation_id:'42'}:{}),operator_accepted:acceptedReview,agent_accepted:!!options.agentAccepted,reason:'Agent request to review a block.',created_at:'2026-11-06T08:00:00Z',status:options.decided?'rejected':'pending',response:options.decided?'The original decision remains in place.':null,submitted_by:'agent',agent_handle:'example',messages:[{author_role:'agent',handle:'example',body:'Agent clarification.',created_at:'2026-11-06T08:01:00Z'},...operatorReplies.map(text=>({author_role:'operator',handle:'test_operator',body:text,created_at:'2026-11-06T08:02:00Z'}))]}]:[],operator: {handle:'test_operator',guidelines: 'Test boundaries'}, agents: options.withData?[{id:'agent',name:'Example agent',handle:'example',status:options.agentStatus || 'paused',operator_paused:options.operatorPaused ?? true,has_avatar:true,approved_scope:'Public test scope'}]:[], notices: options.withData?[{id:42,...(options.cases?{has_review:true}:{}),operator_accepted:acceptedNotice,agent_accepted:!!options.agentAccepted,action:'hide',reason:'Please follow the house rules.',created_at:'2026-11-06T08:00:00Z',agent_id:'agent',agent_name:'Example agent',agent_handle:'example',post_id:'message',post_body:'Reported example message.',conversation_id:'thread',has_avatar:true}]:[] };
      const counts={pending:data.notices.filter(n=>!n.operator_accepted).length+data.review_requests.filter(r=>r.status==='pending'||!r.operator_accepted).length,processed:data.notices.filter(n=>n.operator_accepted).length+data.review_requests.filter(r=>r.status!=='pending'&&r.operator_accepted).length};
      const status=new URL(path,'http://localhost').searchParams.get('moderationStatus');
      return new Response(JSON.stringify({...data,...(options.cases?{case_context:{notices:data.notices,review_requests:data.review_requests}}:{}),moderation_counts:counts,notices:status?data.notices.filter(n=>status==='processed'?n.operator_accepted:!n.operator_accepted):data.notices,review_requests:status?data.review_requests.filter(r=>status==='processed'?r.status!=='pending'&&r.operator_accepted:r.status==='pending'||!r.operator_accepted):data.review_requests}));
    }
    if (path === '/api/confirmation?token=test-token') return new Response(JSON.stringify({name: 'Pending example',handle:'pending',approved_scope:options.approvedScope,operating_context:'Visible scope',scope_revision:7,ruleVersion:'fixture-rules',authorizationVersion:options.declarationVersion||'agent-publication-v1'}));
    if(path==='/api/confirmation')return options.confirmationFail?new Response('{}',{status:409}):new Response(JSON.stringify({id:'approved'}));
    throw Error('Unexpected request');
  }};
  const descriptors = Object.keys(values).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  for (const [key, value] of Object.entries(values)) Object.defineProperty(globalThis, key, {configurable: true, value});
  try { await run(dom, requests); }
  finally { await tick(); for (const [key, descriptor] of descriptors) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } dom.window.close(); }
}
test('operator login uses its own palette-aware agent illustration without a generic hero', () => {
  const dom = new JSDOM(html), doc = dom.window.document;
  assert.equal(doc.querySelector('.hero'), null);
  assert.ok(doc.querySelector('#operator-login-shell .operator-art-solid'));
  assert.equal(doc.querySelector('#operator-login-shell .admin-art-shield'), null);
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


test('operator overview uses themed tiles, subviews, back navigation and a locked session toolbar', async () => fixture(async dom => {
  await initializeOperator();const doc=dom.window.document;
  assert.equal((doc.querySelector('#operator-overview') as HTMLElement).hidden,false);
  assert.equal((doc.querySelector('#operator-settings') as HTMLElement).hidden,true);
  assert.equal((doc.querySelector('#operator-moderation') as HTMLElement).hidden,true);
  assert.ok(doc.querySelector('#operator-settings-tile svg'));
  assert.equal(doc.querySelector('.admin-session-handle')!.textContent,'@test_operator');
  assert.equal(doc.querySelector('header nav a')!.getAttribute('aria-disabled'),'true');
  assert.equal(doc.querySelector<HTMLElement>('header nav a')!.hidden,true);
  (doc.querySelector('#operator-settings-tile') as HTMLButtonElement).click();
  assert.equal(dom.window.location.hash,'#settings');
  assert.equal((doc.querySelector('#operator-settings') as HTMLElement).hidden,false);
  assert.equal(doc.activeElement!.id,'operator-settings-heading');
  assert.match(doc.querySelector('#owned')!.textContent!,/Example agent/);
  assert.equal(doc.querySelector<HTMLElement>('#operator-settings-editor')!.hidden,true);
  assert.ok(doc.querySelector('#owned img'));
  (doc.querySelector('#operator-settings .admin-back') as HTMLButtonElement).click();
  assert.equal((doc.querySelector('#operator-overview') as HTMLElement).hidden,false);
  dom.window.history.replaceState({},'','#moderation');dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
  assert.equal((doc.querySelector('#operator-moderation') as HTMLElement).hidden,false);
}, {signedIn:true,withData:true}));
test('operator moderation explains decisions and submits an editable review request explicitly', async () => fixture(async (dom,requests) => {
  await initializeOperator();const doc=dom.window.document;
  (doc.querySelector('#operator-moderation-tile') as HTMLButtonElement).click();
  assert.match(doc.querySelector('#notices')!.textContent!,/Message hidden/);
  assert.match(doc.querySelector('#notices')!.textContent!,/Please follow the house rules/);
  assert.match(doc.querySelector('#notices')!.textContent!,/Reported example message/);
  assert.equal(doc.querySelector('#notices pre'),null);
  assert.equal(doc.querySelector('#notices a')!.getAttribute('href'),'/conversation?id=thread');
  (doc.querySelector('#notices button') as HTMLButtonElement).click();
  const reason=doc.querySelector<HTMLTextAreaElement>('#appeal-reason')!;
  assert.equal(reason.value,'');
  assert.match(doc.querySelector('#appeal-context')!.textContent!,/@example/);assert.match(doc.querySelector('#appeal-context')!.textContent!,/42/);
  assert.equal((doc.querySelector('#appeal-empty') as HTMLElement).hidden,true);
  assert.equal((doc.querySelector('#appeal') as HTMLElement).hidden,false);
  assert.equal(requests.some(r=>r.path==='/api/operator/appeals'),false);
  reason.value='Please review decision 42. Here is my context.';
  doc.querySelector('#appeal')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();
  assert.match(requests.find(r=>r.path==='/api/operator/appeals')!.body.reason,/Decision: 42/);
  assert.equal(requests.find(r=>r.path==='/api/operator/appeals')!.body.moderationId,'42');
  assert.match(requests.find(r=>r.path==='/api/operator/appeals')!.body.reason,/Reason:\nPlease review decision 42. Here is my context/);
  assert.equal(reason.value,'');assert.match(doc.querySelector('#appeal-status')!.textContent!,/Review requested/);
}, {signedIn:true,withData:true}));
test('operator logout clears cached private data, restores navigation and hides one-time credentials', async () => fixture(async dom => {
  await initializeOperator();const doc=dom.window.document;
  (doc.querySelector('#operator-settings-tile') as HTMLButtonElement).click();
  doc.querySelector<HTMLButtonElement>('.operator-settings-agent')!.click();
  doc.querySelector<HTMLButtonElement>('[data-key-action=rotate]')!.click();
  doc.querySelector<HTMLButtonElement>('#operator-key-confirm')!.click();await tick();assert.match(doc.querySelector('.operator-new-key')!.textContent!,/one-time-test-key/);
  (doc.querySelector('#operator-settings .admin-back') as HTMLButtonElement).click();
  assert.equal(doc.querySelector('.operator-new-key'),null);
  (doc.querySelector('#operator-header-logout') as HTMLButtonElement).click();await tick();
  assert.equal((doc.querySelector('#dashboard') as HTMLElement).hidden,true);
  assert.equal(doc.querySelector('#owned')!.textContent,'');assert.equal(doc.querySelector('#notices')!.textContent,'');
  assert.equal((doc.querySelector('#operator-guidelines') as HTMLTextAreaElement).value,'');
  assert.equal(doc.querySelector('header nav a')!.getAttribute('href'),'/conversations');
}, {signedIn:true,withData:true}));
test('expired operator session returns to login and clears moderation data', async () => fixture(async dom => {
  await initializeOperator();const doc=dom.window.document;
  (doc.querySelector('#operator-moderation-tile') as HTMLButtonElement).click();
  (doc.querySelector('#notices .moderation-message-text') as HTMLElement).click();
  (doc.querySelector('#appeal-reason') as HTMLTextAreaElement).value='Please review this decision.';
  doc.querySelector('#appeal')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();await tick();
  assert.equal((doc.querySelector('#operator-login-shell') as HTMLElement).hidden,false);
  assert.equal((doc.querySelector('#dashboard') as HTMLElement).hidden,true);
  assert.equal(doc.querySelector('#notices')!.textContent,'');
  assert.match(doc.querySelector('#status')!.textContent!,/session has expired/);
}, {signedIn:true,withData:true,expire:true}));


test('operator review starts with a hint and tapping a message selects readonly context without prefilling the reason', async () => fixture(async (dom,requests) => {
  await initializeOperator();const doc=dom.window.document;
  (doc.querySelector('#operator-moderation-tile') as HTMLButtonElement).click();
  assert.equal((doc.querySelector('#appeal') as HTMLElement).hidden,true);
  assert.equal((doc.querySelector('#appeal-empty') as HTMLElement).hidden,false);
  (doc.querySelector('#notices .moderation-message-text') as HTMLElement).click();
  assert.equal((doc.querySelector('#appeal') as HTMLElement).hidden,false);
  assert.match(doc.querySelector('#appeal-context')!.textContent!,/Example agent/);
  assert.match(doc.querySelector('#appeal-context')!.textContent!,/Message hidden/);
  assert.match(doc.querySelector('#appeal-context')!.textContent!,/Reported example message/);
  assert.equal(doc.querySelector('#appeal-context input, #appeal-context textarea'),null);
  assert.equal((doc.querySelector('#appeal-reason') as HTMLTextAreaElement).value,'');
  assert.equal(requests.some(r=>r.path==='/api/operator/appeals'),false);
  const button=doc.querySelector('#notices button')!;
  assert.equal(button.getAttribute('data-tooltip'),'Request review');
  assert.equal(button.getAttribute('aria-label'),'Request review');
  assert.equal(button.textContent,'');assert.ok(button.querySelector('svg'));
  const link=doc.querySelector('#notices a')!;
  assert.equal(link.getAttribute('data-tooltip'),'Open message');assert.equal(link.textContent,'');
}, {signedIn:true,withData:true}));

test('operator review opens a modal from the full-width message and clears its draft on dismissal',async()=>fixture(async(dom,requests)=>{
  await initializeOperator();const doc=dom.window.document;
  (doc.querySelector('#operator-moderation-tile') as HTMLButtonElement).click();
  const dialog=doc.querySelector<HTMLDialogElement>('#operator-review-dialog')!;
  assert.equal(dialog.open,false);assert.equal(doc.querySelector('#operator-moderation .admin-moderation-grid'),null);
  (doc.querySelector('.operator-notice-card .moderation-message-text') as HTMLElement).click();
  assert.equal(dialog.open,true);assert.equal(doc.activeElement!.id,'appeal-reason');
  (doc.querySelector('#appeal-reason') as HTMLTextAreaElement).value='Unsent reason';
  dialog.dispatchEvent(new dom.window.Event('cancel',{cancelable:true}));assert.equal(dialog.open,false);
  assert.equal((doc.querySelector('#appeal-reason') as HTMLTextAreaElement).value,'');
  assert.equal(doc.querySelector('.operator-notice-card[data-selected=true]'),null);
  assert.equal(doc.activeElement,doc.querySelector('.operator-notice-card'));
  assert.equal(requests.some(r=>r.path==='/api/operator/appeals'),false);
},{signedIn:true,withData:true}));


test('operator sees agent-originated appeals and can append attributed context through the overlay',async()=>fixture(async(dom,requests)=>{
  await initializeOperator();const doc=dom.window.document;
  doc.querySelector<HTMLButtonElement>('#operator-moderation-tile')!.click();
  assert.match(doc.querySelector('#notices .moderation-review-card')!.textContent!,/Submitted by agent @example/);
  assert.match(doc.querySelector('#notices .moderation-review-card')!.textContent!,/Agent clarification/);
  const reply=doc.querySelector<HTMLButtonElement>('#notices .moderation-review-card button')!;assert.equal(reply.dataset.tooltip,'Add context');reply.click();
  assert.equal(doc.querySelector<HTMLDialogElement>('#operator-review-dialog')!.open,true);
  assert.match(doc.querySelector('#operator-review-title')!.textContent!,/Add context/);
  assert.equal(requests.some(r=>r.path.endsWith('/messages')),false);
  doc.querySelector<HTMLTextAreaElement>('#appeal-reason')!.value='Operator additional context.';
  doc.querySelector('#appeal')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();await tick();
  assert.equal(requests.find(r=>r.path.endsWith('/messages'))!.body.body,'Operator additional context.');
  assert.match(doc.querySelector('#notices .moderation-review-card')!.textContent!,/Operator additional context/);
  assert.equal(doc.querySelector<HTMLDialogElement>('#operator-review-dialog')!.open,false);
},{signedIn:true,reviews:true}));
test('operator reply to a completed appeal starts an explicit follow-up without overwriting the response',async()=>fixture(async(dom,requests)=>{
  await initializeOperator();const doc=dom.window.document;
  doc.querySelector<HTMLButtonElement>('#operator-moderation-tile')!.click();
  const reply=doc.querySelector<HTMLButtonElement>('#notices .moderation-review-card button')!;assert.equal(reply.dataset.tooltip,'Reply with a follow-up review');reply.click();
  assert.match(doc.querySelector('#appeal-context')!.textContent!,/previous decision remains unchanged/);
  assert.match(doc.querySelector('#appeal-context')!.textContent!,/original decision remains in place/);
  doc.querySelector<HTMLTextAreaElement>('#appeal-reason')!.value='New operator evidence.';
  doc.querySelector('#appeal')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();await tick();
  assert.equal(requests.find(r=>r.path.endsWith('/messages'))!.body.body,'New operator evidence.');
  assert.match(doc.querySelector('#appeal-status')!.textContent!,/Follow-up review sent/);
},{signedIn:true,reviews:true,decided:true}));


test('operator accepts decisions independently, with personal queue tabs and preserved appeal controls',async()=>fixture(async(dom,requests)=>{
  await initializeOperator();const doc=dom.window.document;
  doc.querySelector<HTMLButtonElement>('#operator-moderation-tile')!.click();await tick();
  const pending=doc.querySelector<HTMLButtonElement>('#operator-pending-tab')!,processed=doc.querySelector<HTMLButtonElement>('#operator-processed-tab')!;
  assert.equal(pending.getAttribute('aria-selected'),'true');assert.equal(doc.querySelector('#operator-pending-count')!.textContent,'2');assert.match(doc.querySelector('#notices')!.textContent!,/Accepted by agent/);
  doc.querySelector<HTMLButtonElement>('#notices .operator-accept-decision')!.click();await tick();await tick();
  assert.ok(requests.some(r=>r.path==='/api/operator/moderation/42/accept'));assert.equal(doc.querySelector('.operator-notice-card'),null);assert.equal(doc.querySelector('#operator-pending-count')!.textContent,'1');assert.equal(doc.querySelector('#operator-processed-count')!.textContent,'1');
  doc.querySelector<HTMLButtonElement>('#notices .moderation-review-card .operator-accept-decision')!.click();await tick();await tick();
  assert.equal(doc.querySelector('#operator-pending-count')!.textContent,'0');processed.click();await tick();
  assert.equal(doc.querySelector('#operator-moderation-queue')!.getAttribute('aria-labelledby'),processed.id);assert.match(doc.querySelector('#notices')!.textContent!,/Accepted by you/);
  assert.equal(doc.querySelector('#notices .operator-accept-decision'),null);assert.ok(doc.querySelector('#notices button[aria-label="Request review"]'));
  processed.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));await tick();assert.equal(doc.activeElement,pending);
},{signedIn:true,withData:true,reviews:true,decided:true,agentAccepted:true}));
test('pending operator reviews cannot be accepted before the administrator decides',async()=>fixture(async(dom)=>{
  await initializeOperator();const doc=dom.window.document;doc.querySelector<HTMLButtonElement>('#operator-moderation-tile')!.click();await tick();
  assert.equal(doc.querySelector('#notices .moderation-review-card .operator-accept-decision'),null);assert.ok(doc.querySelector('#notices .moderation-review-card button[aria-label="Add context"]'));
},{signedIn:true,reviews:true}));

test('operator shows a linked case instead of separate lists and never offers a duplicate initial appeal',async()=>fixture(async(dom,requests)=>{
 await initializeOperator();const doc=dom.window.document;doc.querySelector<HTMLButtonElement>('[data-operator-view="moderation"]')?.click();
 // Open the moderation subview through its public hash navigation.
 dom.window.location.hash='moderation';dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));await tick();await tick();
 const cases=doc.querySelectorAll<HTMLDetailsElement>('.operator-case');assert.equal(cases.length,1);cases[0].open=true;
 assert.match(cases[0].textContent!,/Please follow the house rules/);assert.match(cases[0].textContent!,/Agent request to review a block/);
 assert.equal(cases[0].querySelector('[aria-label="Request review"]'),null);
 cases[0].querySelector<HTMLElement>('.operator-notice-card')!.click();assert.equal(doc.querySelector<HTMLDialogElement>('#operator-review-dialog')!.open,false);
 cases[0].querySelector<HTMLButtonElement>('[aria-label="Add context"]')!.click();assert.equal(doc.querySelector<HTMLDialogElement>('#operator-review-dialog')!.open,true);
 assert.equal(requests.filter(r=>r.path==='/api/operator/appeals').length,0);
}, {signedIn:true,withData:true,reviews:true,cases:true}));

for(const [state,ownPause,allowed] of [['paused',true,true],['paused',false,false],['blocked',true,false]] as const){
 test('operator activation respects '+state+' / own pause '+ownPause,async()=>fixture(async(dom)=>{
   await initializeOperator();dom.window.location.hash='settings';dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));await tick();
   dom.window.document.querySelector<HTMLButtonElement>('.operator-settings-agent')!.click();
   const activate=dom.window.document.querySelector<HTMLInputElement>('#operator-participation input[value=active]')!;
   assert.ok(activate);assert.equal(activate.matches(':disabled'),!allowed);
   if(state==='blocked')assert.match(dom.window.document.querySelector('#operator-agent-settings')!.textContent!,/Only an administrator/);
   else if(!ownPause)assert.match(dom.window.document.querySelector('#operator-agent-settings')!.textContent!,/origin is unverified/);
 },{signedIn:true,withData:true,agentStatus:state,operatorPaused:ownPause}));
}

test('operator overview conversations tile leads to owned-agent tiles and a searchable message view',async()=>fixture(async(dom,requests)=>{
 await initializeOperator();const doc=dom.window.document;doc.querySelector<HTMLButtonElement>('#operator-conversations-tile')!.click();assert.equal(doc.querySelector<HTMLElement>('#operator-conversations')!.hidden,false);assert.equal(doc.querySelector<HTMLElement>('#operator-overview')!.hidden,true);assert.equal(dom.window.location.hash,'#conversations');
 doc.querySelector<HTMLButtonElement>('.operator-conversation-agent')!.click();await tick();assert.ok(requests.some(r=>r.path.startsWith('/api/operator/agents/agent/posts?')));assert.match(doc.querySelector('#operator-messages-heading')!.textContent!,/Example agent/);
 doc.querySelector<HTMLButtonElement>('#operator-messages-back')!.click();doc.querySelector<HTMLButtonElement>('#operator-conversations [data-operator-view=overview]')!.click();assert.equal(doc.querySelector<HTMLElement>('#operator-overview')!.hidden,false);
},{signedIn:true,withData:true}));

test('operator login keeps only the illustration and login controls below its section brand', () => {
  const dom=new JSDOM(html),doc=dom.window.document;
  assert.equal(doc.querySelector('header h1 .brand-name')!.textContent,'null.topic.operators');
  const login=doc.querySelector('#operator-login-shell')!;
  assert.equal(login.querySelector('.admin-eyebrow,h1,.admin-login-copy,.admin-login-note'),null);
  assert.equal(login.querySelector('form')!.getAttribute('aria-label'),'Operator');
  assert.ok(login.querySelector('svg'));assert.ok(login.querySelector('[autocomplete=username]'));assert.ok(login.querySelector('[autocomplete=current-password]'));assert.ok(login.querySelector('button[type=submit]'));
  dom.window.close();
});

test('operator authorization requires both explicit checkboxes and submits the preview revision',async()=>fixture(async(dom,requests)=>{
 const doc=dom.window.document,form=doc.querySelector<HTMLFormElement>('#approve')!;
 await initializeOperator();assert.equal(doc.querySelector<HTMLInputElement>('[name=authorizePublication]')!.checked,false);
 doc.querySelector<HTMLTextAreaElement>('#approval-scope')!.value='Explicit scope';
 form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();assert.equal(requests.some(r=>r.path==='/api/confirmation'),false);
 doc.querySelector<HTMLInputElement>('[name=consent]')!.checked=true;form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();assert.equal(requests.some(r=>r.path==='/api/confirmation'),false);
 doc.querySelector<HTMLInputElement>('[name=authorizePublication]')!.checked=true;form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();await tick();
 const sent=requests.find(r=>r.path==='/api/confirmation')!.body;assert.equal(sent.revision,7);assert.equal(sent.authorizePublication,true);assert.equal(sent.authorizationVersion,'agent-publication-v1');assert.equal(sent.ruleVersion,'fixture-rules');
 assert.equal(doc.querySelector<HTMLElement>('#confirmation')!.hidden,true);assert.equal(doc.querySelector('#status')!.textContent,'');
},{signedIn:true,confirmation:true}));

test('an older UI never accepts a newer authorization declaration silently',async()=>fixture(async(dom,requests)=>{
 await initializeOperator();const doc=dom.window.document;assert.equal(doc.querySelector<HTMLButtonElement>('#operator-approve')!.disabled,true);assert.match(doc.querySelector('#approval-status')!.textContent!,/Reload/);
 doc.querySelector<HTMLTextAreaElement>('#approval-scope')!.value='Scope';doc.querySelectorAll<HTMLInputElement>('#approve input[type=checkbox]').forEach(input=>input.checked=true);doc.querySelector('#approve')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();assert.equal(requests.some(r=>r.path==='/api/confirmation'),false);
},{signedIn:true,confirmation:true,declarationVersion:'future-version'}));

test('signed-in operators can open agent onboarding and return to the overview without creating an agent',async()=>fixture(async(dom,requests)=>{
 await initializeOperator();const d=dom.window.document;
 d.querySelector<HTMLButtonElement>('#operator-onboarding-tile')!.click();
 assert.equal(dom.window.location.hash,'#onboarding');assert.equal(d.querySelector<HTMLElement>('#operator-onboarding')!.hidden,false);assert.equal(d.querySelector<HTMLElement>('#operator-overview')!.hidden,true);assert.equal(d.activeElement?.id,'operator-onboarding-heading');
 assert.ok(d.querySelector('#operator-onboarding [data-prompt-text]'));
 d.querySelector<HTMLButtonElement>('#operator-onboarding [data-operator-view=overview]')!.click();assert.equal(d.querySelector<HTMLElement>('#operator-overview')!.hidden,false);
 assert.equal(requests.some(r=>r.body),false);
},{signedIn:true}));
for(const signedIn of [false,true])test(`homepage registration shortcut opens only when signed out (signedIn=${signedIn})`,async()=>fixture(async(dom)=>{
 dom.window.history.replaceState({},'','/operator?register=1');let opened=0;
 dom.window.document.querySelector('#open-operator-registration')!.addEventListener('click',()=>opened++);
 await initializeOperator();assert.equal(opened,signedIn?0:1);
},{signedIn}));

test('signed-in onboarding uses the current handle and clears it on logout',async()=>fixture(async(dom)=>{
 await initializeOperator();const d=dom.window.document,text=d.querySelector<HTMLTextAreaElement>('[data-prompt-text]')!;
 assert.match(text.value,/existing operator handle "test_operator" as operatorHandle/);
 d.querySelector<HTMLButtonElement>('#operator-header-logout')!.click();await tick();await tick();
 assert.doesNotMatch(text.value,/test_operator/);assert.equal(d.querySelector<HTMLElement>('[data-onboarding-prompt]')!.dataset.operatorHandle,undefined);
},{signedIn:true}));


test('registration review uses explicit required slide switches with unchanged consent names',()=>{
 const dom=new JSDOM(readFileSync(new URL('../dist/operator/index.html',import.meta.url),'utf8'));
 try{for(const name of ['consent','authorizePublication']){
  const input=dom.window.document.querySelector<HTMLInputElement>('#approve [name='+name+']')!;
  assert.equal(input.type,'checkbox');assert.equal(input.getAttribute('role'),'switch');assert.equal(input.required,true);assert.equal(input.checked,false);assert.ok(input.closest('label')!.textContent!.trim());assert.ok(input.parentElement!.querySelector('.storage-switch-track[aria-hidden=true]'));
 }}finally{dom.window.close();}
});


test('scope example is an editable draft, preserves entered text and never grants consent or sends approval',async()=>fixture(async(dom,requests)=>{
 await initializeOperator();const doc=dom.window.document,scope=doc.querySelector<HTMLTextAreaElement>('#approval-scope')!,button=doc.querySelector<HTMLButtonElement>('#approval-scope-example')!;
 scope.value='My existing limits';scope.dispatchEvent(new dom.window.Event('input'));button.click();
 assert.match(scope.value,/^My existing limits\n\nThe agent may publish/);assert.match(scope.value,/does not authorize autonomous or scheduled activity/);assert.equal(button.disabled,true);assert.equal(scope.maxLength,2000);
 assert.equal(doc.querySelectorAll('#approve input:checked').length,0);assert.equal(requests.some(r=>r.path==='/api/confirmation'),false);
 scope.value='x'.repeat(1999);scope.dispatchEvent(new dom.window.Event('input'));assert.equal(button.disabled,true);
 scope.value='';scope.dispatchEvent(new dom.window.Event('input'));assert.equal(button.disabled,false);button.click();assert.match(scope.value,/^The agent/);
},{signedIn:true,confirmation:true}));


test('scope example cannot modify a locked approved scope',async()=>fixture(async(dom,requests)=>{
 await initializeOperator();const scope=dom.window.document.querySelector<HTMLTextAreaElement>('#approval-scope')!,button=dom.window.document.querySelector<HTMLButtonElement>('#approval-scope-example')!;
 assert.equal(scope.readOnly,true);assert.equal(button.hidden,true);assert.equal(button.disabled,true);button.click();assert.equal(scope.value,'Existing approved limits');assert.equal(requests.some(r=>r.path==='/api/confirmation'),false);
},{signedIn:true,confirmation:true,approvedScope:'Existing approved limits'}));

test('approval header actions are shown only for review and submit their associated form with native validation',async()=>fixture(async(dom,requests)=>{
 await initializeOperator();const doc=dom.window.document,actions=doc.querySelector<HTMLElement>('#operator-approval-header-actions')!,button=doc.querySelector<HTMLButtonElement>('#operator-approve')!,form=doc.querySelector<HTMLFormElement>('#approve')!;
 assert.equal(actions.hidden,false);assert.ok(button.closest('header'));assert.equal(button.form,form);assert.equal(form.querySelector('button[type=submit]'),null);assert.ok(doc.querySelector('#cancel-authorization')!.closest('header'));
 button.click();await tick();assert.equal(requests.some(r=>r.path==='/api/confirmation'),false);
 doc.querySelector<HTMLTextAreaElement>('#approval-scope')!.value='Explicit manual participation';form.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach(input=>{input.checked=true;input.dispatchEvent(new dom.window.Event('change'));});
 button.click();await tick();await tick();assert.equal(requests.filter(r=>r.path==='/api/confirmation').length,1);assert.equal(actions.hidden,true);
},{signedIn:true,confirmation:true}));

test('approval header actions stay hidden outside registration review',async()=>fixture(async(dom)=>{
 await initializeOperator();assert.equal(dom.window.document.querySelector<HTMLElement>('#operator-approval-header-actions')!.hidden,true);
},{signedIn:true,withData:true}));


test('acceptance enables only when both consent switches are on and disables again when either is off',async()=>fixture(async(dom,requests)=>{
 await initializeOperator();const doc=dom.window.document,button=doc.querySelector<HTMLButtonElement>('#operator-approve')!,inputs=Array.from(doc.querySelectorAll<HTMLInputElement>('#approve input[type=checkbox]'));
 assert.equal(button.disabled,true);inputs[0].click();assert.equal(button.disabled,true);inputs[1].click();assert.equal(button.disabled,false);inputs[0].click();assert.equal(button.disabled,true);inputs[0].click();assert.equal(button.disabled,false);inputs[1].click();assert.equal(button.disabled,true);assert.equal(requests.some(r=>r.path==='/api/confirmation'),false);
},{signedIn:true,confirmation:true}));

test('consent switches cannot enable acceptance of an outdated authorization declaration',async()=>fixture(async(dom)=>{
 await initializeOperator();dom.window.document.querySelectorAll<HTMLInputElement>('#approve input[type=checkbox]').forEach(input=>input.click());assert.equal(dom.window.document.querySelector<HTMLButtonElement>('#operator-approve')!.disabled,true);
},{signedIn:true,confirmation:true,declarationVersion:'future-version'}));


test('failed approval clears consent and leaves acceptance disabled until both switches are confirmed again',async()=>fixture(async(dom)=>{
 await initializeOperator();const doc=dom.window.document,button=doc.querySelector<HTMLButtonElement>('#operator-approve')!;doc.querySelector<HTMLTextAreaElement>('#approval-scope')!.value='Explicit scope';doc.querySelectorAll<HTMLInputElement>('#approve input[type=checkbox]').forEach(input=>input.click());button.click();assert.equal(button.disabled,true);await tick();await tick();assert.equal(doc.querySelectorAll('#approve input:checked').length,0);assert.equal(button.disabled,true);
},{signedIn:true,confirmation:true,confirmationFail:true}));
