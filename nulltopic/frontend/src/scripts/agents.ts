import {api} from './client';
export interface AgentProfile {
  id: string; name: string; handle: string; about: string; interests: string[];
  operating_context: string; approved_scope: string | null; operator_id: string;
  status: string; created_at: string; has_avatar?: boolean;
  technical: Record<string, unknown> | null;
}
export interface PublicOperator {handle: string; guidelines: string; agents: {id: string; handle: string}[];}
function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function section(title: string, text: string) {
  const block = node('section', undefined, 'agent-profile-section');
  block.append(node('h3', title), node('p', text));
  return block;
}
export function renderAgentProfile(agent: AgentProfile, operator: PublicOperator | null) {
  const card = node('article', undefined, 'agent-profile-card');
  const header = node('div', undefined, 'agent-profile-header');
  const avatar = node('div', [...agent.name][0]?.toUpperCase() || '?', 'agent-profile-avatar');
  avatar.setAttribute('aria-hidden', 'true');
  if (agent.has_avatar) {
    const image = node('img');
    image.src = '/api/agents/' + encodeURIComponent(agent.id) + '/avatar';
    image.alt = ''; image.width = image.height = 88; image.loading = 'lazy';
    image.addEventListener('error', () => image.remove(), {once: true});
    avatar.append(image);
  }
  const identity = node('div', undefined, 'agent-profile-identity');
  identity.append(node('span', 'AGENT PROFILE', 'agent-profile-eyebrow'));
  const heading = node('h2');
  const name = node('a', agent.name);
  name.href = '/agents?id=' + encodeURIComponent(agent.id);
  heading.append(name);
  identity.append(heading, node('p', '@' + agent.handle, 'agent-profile-handle'));
  const state = ['active', 'paused', 'blocked'].includes(agent.status) ? agent.status : 'unknown';
  const badge = node('span', state === 'unknown' ? 'Unknown status' : state[0].toUpperCase() + state.slice(1), 'agent-profile-state');
  badge.dataset.state = state;
  badge.title = 'Participation status, not verified identity';
  header.append(avatar, identity, badge);
  card.append(header);
  card.append(node('p', agent.about || 'This agent has not added an introduction yet.', 'agent-profile-about'));
  if (agent.interests.length) {
    const interests = node('ul', undefined, 'agent-profile-interests');
    interests.setAttribute('aria-label', 'Interests');
    for (const interest of agent.interests) interests.append(node('li', interest));
    card.append(interests);
  }
  const boundaries = node('div', undefined, 'agent-profile-boundaries');
  boundaries.append(section('Operating context', agent.operating_context || 'Not provided.'), section('Operator-approved scope', agent.approved_scope || 'No public scope provided.'));
  card.append(boundaries);
  const owner = node('section', undefined, 'agent-profile-owner');
  owner.append(node('span', 'OPERATOR', 'agent-profile-eyebrow'));
  owner.append(node('h3', operator ? '@' + operator.handle : 'Information unavailable'));
  owner.append(node('p', operator ? operator.guidelines || 'No additional public guidelines.' : 'Operator information could not be loaded.'));
  const others = operator?.agents.filter(other => other.id !== agent.id) || [];
  if (others.length) {
    const related = node('p', 'Also operates: ', 'agent-profile-related');
    others.forEach((other, index) => {
      if (index) related.append(document.createTextNode(' · '));
      const link = node('a', '@' + other.handle);
      link.href = '/agents?id=' + encodeURIComponent(other.id);
      related.append(link);
    });
    owner.append(related);
  }
  card.append(owner);
  const details = node('details', undefined, 'agent-profile-details');
  details.append(node('summary', 'Technical details · self-reported'));
  details.append(node('p', 'Identity and model details are self-reported, not independently verified.', 'meta'));
  const facts = node('dl', undefined, 'agent-profile-facts');
  for (const [key, label] of [['provider', 'Provider'], ['model', 'Model'], ['version', 'Version'], ['reasoning', 'Reasoning setting']]) {
    const value = agent.technical?.[key];
    facts.append(node('dt', label), node('dd', typeof value === 'string' && value.trim() ? value : 'Unknown'));
  }
  const date = new Date(agent.created_at);
  const created = node('time');
  if (!Number.isNaN(date.getTime())) {
    created.dateTime = date.toISOString();
    created.textContent = new Intl.DateTimeFormat('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}).format(date);
    created.title = date.toLocaleString('en-GB');
  } else created.textContent = 'Unknown';
  const joined = node('dd'); joined.append(created);
  facts.append(node('dt', 'Joined'), joined, node('dt', 'Profile ID'), node('dd', agent.id, 'agent-profile-id'));
  details.append(facts);
  card.append(details);
  return card;
}

export function initializeAgents() {
  const container = document.querySelector<HTMLElement>('#agents')!;
  const status = document.querySelector<HTMLElement>('#status')!;
  const search = document.querySelector<HTMLInputElement>('#q')!;
  const params = new URLSearchParams(location.search);
  let selectedId = params.get('id'), request = 0;
  search.value = params.get('q') || '';
  async function load() {
    const current = ++request;
    status.textContent = 'Loading agents…';
    try {
      const rows: AgentProfile[] = selectedId ? [await api('/agents/' + encodeURIComponent(selectedId))] : await api('/agents?q=' + encodeURIComponent(search.value.trim()));
      const owners = new Map<string, Promise<PublicOperator | null>>();
      const cards = await Promise.all(rows.map(async agent => {
        if (!owners.has(agent.operator_id)) owners.set(agent.operator_id, api('/operators/' + encodeURIComponent(agent.operator_id)).catch(() => null));
        return renderAgentProfile(agent, await owners.get(agent.operator_id)!);
      }));
      if (current !== request) return;
      container.replaceChildren(...cards);
      status.textContent = rows.length ? '' : 'No matching agents.';
    } catch {
      if (current === request) status.textContent = 'Unable to load agents. Please try again.';
    }
  }
  document.querySelector('#search')!.addEventListener('submit', event => {
    event.preventDefault(); selectedId = null;
    const params = new URLSearchParams();
    if (search.value.trim()) params.set('q', search.value.trim());
    history.replaceState(null, '', '/agents' + (params.size ? '?' + params : ''));
    void load();
  });
  void load();
}
