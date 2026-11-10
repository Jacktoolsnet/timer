import {installDialogMock} from './dialog-mock';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderAgentProfile, initializeAgents, type AgentProfile} from '../src/scripts/agents';
const agent: AgentProfile = {id: 'example', name: 'Curious agent', handle: 'curious_agent', about: 'Small observations and big questions.', interests: ['art', 'everyday life'], operating_context: 'Operator-supervised exploration.', approved_scope: 'Public conversations only.', operator_id: 'owner', status: 'active', created_at: '2026-11-05T00:00:00Z', has_avatar: true, technical: {provider: null, model: 'Example model', version: null, reasoning: null}};
function globals(values: Record<string, unknown>) {
  const previous = Object.keys(values).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  for (const [key, value] of Object.entries(values)) Object.defineProperty(globalThis, key, {configurable: true, value});
  return () => { for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } };
}
test('agent profile has distinct identity, interests, scope, operator and technical sections', () => {
  const dom = new JSDOM('');
  const restore = globals({document: dom.window.document});
  try {
    const card = renderAgentProfile(agent, {handle: 'test_owner', guidelines: 'Be kind.', agents: [{id: agent.id, handle: agent.handle}, {id: 'other', handle: 'another_agent'}]});
    assert.equal(card.querySelector('h2 a')?.textContent, agent.name);
    assert.equal(card.querySelector('.agent-profile-handle')?.textContent, '@curious_agent');
    assert.equal(card.querySelector('.agent-profile-state')?.getAttribute('data-state'), 'active');
    assert.deepEqual([...card.querySelectorAll('.agent-profile-interests li')].map(n => n.textContent), agent.interests);
    assert.match(card.querySelector('.agent-profile-boundaries')!.textContent!, /Public conversations only/);
    assert.match(card.querySelector('.agent-profile-owner')!.textContent!, /@test_owner/);
    assert.equal(card.querySelector('.agent-profile-related a')?.getAttribute('href'), '/agents?id=other');
    assert.equal((card.querySelector('details') as HTMLDetailsElement).open, false);
    assert.match(card.querySelector('details')!.textContent!, /not independently verified/);
    const image = card.querySelector('img')!;
    assert.equal(image.getAttribute('src'), '/api/agents/example/avatar');
    image.dispatchEvent(new dom.window.Event('error'));
    assert.equal(card.querySelector('.agent-profile-avatar')!.textContent, 'C');
  } finally { restore(); dom.window.close(); }
});
test('profile content stays plain text; unknown details and missing operator have explicit fallbacks', () => {
  const dom = new JSDOM('');
  const restore = globals({document: dom.window.document});
  try {
    const card = renderAgentProfile({...agent, has_avatar: false, about: '<img src=x onerror=alert(1)>', technical: null, interests: [], status: 'paused', approved_scope: null}, null);
    assert.equal(card.querySelector('img'), null);
    assert.equal(card.querySelector('.agent-profile-about')!.textContent, '<img src=x onerror=alert(1)>');
    assert.equal(card.querySelector('.agent-profile-state')!.textContent, 'Paused');
    assert.equal(card.querySelectorAll('.agent-profile-facts dd').length, 6);
    assert.equal(card.querySelector('.agent-profile-facts dd')!.textContent, 'Unknown');
    assert.match(card.querySelector('.agent-profile-owner')!.textContent!, /could not be loaded/);
  } finally { restore(); dom.window.close(); }
});
test('search can leave an individual profile and shares operator lookups across matching cards', async () => {
  const dom = new JSDOM('<form id="search"><input id="q"/></form><p id="status"></p><div id="agents"></div>', {url: 'http://localhost/agents?id=example'});
  const requests: string[] = [];
  const restore = globals({document: dom.window.document, location: dom.window.location, history: dom.window.history, fetch: async (path: string) => {
    requests.push(path);
    const data = path.startsWith('/api/operators/') ? {handle: 'owner', guidelines: '', agents: []}
      : path.startsWith('/api/agents?') ? [agent, {...agent, id: 'other'}] : agent;
    return new Response(JSON.stringify(data));
  }});
  try {
    initializeAgents();
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(dom.window.document.querySelector('#agents')!.children.length, 1);
    (dom.window.document.querySelector('#q') as HTMLInputElement).value = 'curious';
    dom.window.document.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', {cancelable: true}));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(dom.window.location.search, '?q=curious');
    assert.equal(dom.window.document.querySelector('#agents')!.children.length, 2);
    assert.equal(requests.filter(path => path === '/api/operators/owner').length, 2);
  } finally { restore(); dom.window.close(); }
});

test('empty search shows a decorative sad agent and an actionable reset without an empty-platform reset loop', async () => {
  const {renderEmptyAgents} = await import('../src/scripts/agents');
  const dom = new JSDOM('');
  const restore = globals({document: dom.window.document});
  try {
    let resets = 0;
    const empty = renderEmptyAgents(true, () => { resets++; });
    assert.equal(empty.getAttribute('role'), 'status');
    assert.equal(empty.querySelector('svg')?.getAttribute('aria-hidden'), 'true');
    assert.match(empty.querySelector('h2')!.textContent!, /No agents found/);
    empty.querySelector('button')!.click();
    assert.equal(resets, 1);
    const platformEmpty = renderEmptyAgents(false, () => { resets++; });
    assert.equal(platformEmpty.querySelector('button'), null);
    assert.match(platformEmpty.textContent!, /operators approve/);
  } finally { restore(); dom.window.close(); }
});

test('show all agents clears an unsuccessful search and restores the profile list', async () => {
  const dom = new JSDOM('<form id="search"><input id="q"/></form><p id="status"></p><div id="agents"></div>', {url: 'http://localhost/agents?q=missing'});
  const restore = globals({document: dom.window.document, location: dom.window.location, history: dom.window.history, fetch: async (path: string) => new Response(JSON.stringify(
    path.startsWith('/api/operators/') ? {handle: 'owner', guidelines: '', agents: []} : path.includes('q=missing') ? [] : [agent]
  ))});
  try {
    initializeAgents();
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.ok(dom.window.document.querySelector('.agents-empty-state'));
    (dom.window.document.querySelector('.agents-empty-state button') as HTMLButtonElement).click();
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(dom.window.location.search, '');
    assert.equal((dom.window.document.querySelector('#q') as HTMLInputElement).value, '');
    assert.equal(dom.window.document.querySelector('.agents-empty-state'), null);
    assert.ok(dom.window.document.querySelector('.agent-profile-card'));
  } finally { restore(); dom.window.close(); }
});


test('agent flag opens a safe report overlay and sends only an explicit agent report',async()=>{
  const dom=new JSDOM('');installDialogMock(dom);const requests:{path:string;body?:any}[]=[];
  const restore=globals({document:dom.window.document,fetch:async(path:string,init?:RequestInit)=>{
    const body=init?.body?JSON.parse(String(init.body)):undefined;requests.push({path,body});
    return new Response(JSON.stringify(path==='/api/session'?{csrf:'test-csrf'}:{ok:true}));
  }});
  try{
    const card=renderAgentProfile({...agent,name:'<b>Agent name</b>'},null);dom.window.document.body.append(card);
    const flag=card.querySelector<HTMLButtonElement>('.agent-report-button')!;
    assert.equal(flag.getAttribute('data-tooltip'),'Report agent');assert.equal(flag.getAttribute('aria-label'),'Report agent');assert.ok(flag.querySelector('svg'));
    flag.click();const dialog=dom.window.document.querySelector('dialog')!;assert.equal(dialog.open,true);
    assert.match(dialog.textContent!,/Report this agent/);assert.match(dialog.textContent!,/<b>Agent name/);assert.equal(dialog.querySelector('b'),null);assert.equal(requests.length,0);
    dialog.querySelector('textarea')!.value='Repeated spam from this agent.';dialog.querySelector<HTMLInputElement>('#report-good-faith')!.checked=true;
    dialog.querySelector('form')!.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await new Promise(resolve=>setTimeout(resolve,0));
    const sent=requests.find(r=>r.path==='/api/reports')!;assert.equal(sent.body.agentId,agent.id);assert.equal(sent.body.postId,undefined);assert.equal(sent.body.reason,'Repeated spam from this agent.');
    assert.equal(requests.some(r=>r.path.includes('/admin/')),false);assert.equal(dom.window.document.querySelector('dialog'),null);
  }finally{restore();dom.window.close();}
});

test('compact agent search clears queries and selected profiles while retaining explicit language', async () => {
  const dom = new JSDOM('<form id="search"><input id="q"/><button id="agent-search-clear" type="button" hidden></button></form><p id="status"></p><div id="agents"></div>', {url: 'http://localhost/agents?id=example&q=old&lang=de'});
  const paths: string[] = [];
  const restore = globals({document: dom.window.document, location: dom.window.location, history: dom.window.history, fetch: async (path: string) => {
    paths.push(path);
    return new Response(JSON.stringify(path.startsWith('/api/operators/') ? {handle: 'owner', guidelines: '', agents: []} : path.includes('?') ? [] : agent));
  }});
  try {
    initializeAgents(); await new Promise(resolve => setTimeout(resolve, 0));
    const input = dom.window.document.querySelector<HTMLInputElement>('#q')!;
    const clear = dom.window.document.querySelector<HTMLButtonElement>('#agent-search-clear')!;
    assert.equal(clear.hidden, false);
    clear.click(); await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(dom.window.location.search, '?lang=de'); assert.equal(input.value, ''); assert.equal(clear.hidden, true);
    assert.equal(dom.window.document.activeElement, input); assert.equal(paths.at(-1), '/api/agents?q=');
    input.value = '<script> & art';
    dom.window.document.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', {cancelable: true}));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(clear.hidden, false); assert.equal(new URLSearchParams(dom.window.location.search).get('lang'), 'de');
    assert.equal(new URLSearchParams(dom.window.location.search).get('q'), '<script> & art'); assert.equal(dom.window.document.querySelector('script'), null);
  } finally { restore(); dom.window.close(); }
});

test('directory waits for complete profiles and preserves unchanged cards during refresh',async()=>{
 const dom=new JSDOM('<form id="search"><input id="q"/></form><p id="status"></p><div id="agents"></div>',{url:'http://localhost/agents'});
 let release!:()=>void,fail=false;const ownerReady=new Promise<void>(resolve=>{release=resolve;});
 const restore=globals({document:dom.window.document,location:dom.window.location,history:dom.window.history,fetch:async(path:string)=>{
  if(fail)return new Response('{}',{status:503});
  if(path.startsWith('/api/operators/')){await ownerReady;return new Response(JSON.stringify({handle:'owner',guidelines:'Public policy',agents:[]}));}
  return new Response(JSON.stringify([agent]));
 }});
 const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
 try{
  initializeAgents();await tick();
  const d=dom.window.document,container=d.querySelector('#agents')!,status=d.querySelector('#status')!,form=d.querySelector('form')!;
  assert.equal(container.childElementCount,0);assert.equal(container.getAttribute('aria-busy'),'true');assert.ok(status.classList.contains('sr-only'));
  release();await tick();const card=d.querySelector('.agent-profile-card')!;assert.ok(card);assert.equal(container.getAttribute('aria-busy'),'false');
  const details=card.querySelector('details')!;details.open=true;
  form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();
  assert.equal(d.querySelector('.agent-profile-card'),card);assert.equal(details.open,true);assert.equal(status.textContent,'');
  fail=true;form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();assert.ok(!status.classList.contains('sr-only'));assert.match(status.textContent!,/Unable to load/);assert.equal(container.getAttribute('aria-busy'),'false');
  fail=false;form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick();assert.ok(d.querySelector('.agent-profile-card'));assert.ok(status.classList.contains('sr-only'));
 }finally{restore();dom.window.close();}
});
