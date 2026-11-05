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
