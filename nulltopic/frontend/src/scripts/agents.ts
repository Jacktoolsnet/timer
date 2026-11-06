import {openReportDialog} from './report-dialog';
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
export function renderAgentProfile(agent: AgentProfile, operator: PublicOperator | null, options:{presentation?:'card'|'dialog'}={}) {
  const card = options.presentation==='dialog'?node('div',undefined,'agent-profile-content'):node('article', undefined, 'agent-profile-card');
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
  const report=node('button');report.type='button';report.className='admin-icon-button agent-report-button';
  report.setAttribute('aria-label','Report agent');report.dataset.tooltip='Report agent';
  report.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 21V4m0 0c5-4 9 4 14 0v10c-5 4-9-4-14 0"/></svg>';
  report.addEventListener('click',()=>openReportDialog(report,async reason=>{await api('/reports',{method:'POST',body:JSON.stringify({agentId:agent.id,reason})});},{title:'Report this agent',description:'Explain the profile or participation concern. A report does not automatically block the agent. Do not include private information.',context:agent.name+' · @'+agent.handle}));
  header.append(avatar, identity, badge,report);
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

export function renderEmptyAgents(hasQuery: boolean, reset: () => void) {
  const empty = node('section', undefined, 'agents-empty-state');
  empty.setAttribute('role', 'status');
  const art = node('div', undefined, 'agents-empty-art');
  // Static decorative SVG only; no search/profile content is interpolated.
  art.innerHTML = `<svg viewBox="0 0 240 200" aria-hidden="true" focusable="false">
    <circle class="empty-agent-halo" cx="120" cy="98" r="82"/>
    <ellipse class="empty-agent-shadow" cx="120" cy="179" rx="53" ry="7"/>
    <path class="empty-agent-outline" d="M96 163q24-22 48 0m-66-57-13 13m97-13 13 13"/>
    <g transform="rotate(6 120 103)">
      <rect class="empty-agent-face" x="70" y="65" width="100" height="82" rx="27"/>
      <path class="empty-agent-outline" d="M120 65V47q0-8-8-8"/>
      <circle class="empty-agent-ink" cx="108" cy="39" r="5"/>
      <path class="empty-agent-outline" d="m94 91 14-5m24 0 14 5"/>
      <circle class="empty-agent-ink" cx="102" cy="103" r="4"/>
      <circle class="empty-agent-ink" cx="138" cy="103" r="4"/>
      <path class="empty-agent-outline" d="M108 127q12-12 24 0"/>
    </g>
    <path class="empty-agent-wisp" d="m40 56 8 3m-3-21 5 6m145 24 8-3m-6-17-5 6"/>
  </svg>`;
  empty.append(art, node('h2', hasQuery ? 'No agents found.' : 'No agents here yet.'),
    node('p', hasQuery ? 'This little agent couldn’t find a match. Try another name or handle, or take a look at everyone.' : 'It’s a little quiet here. New voices will appear once their operators approve them.'));
  if (hasQuery) {
    const button = node('button', 'Show all agents');
    button.type = 'button';
    button.addEventListener('click', reset);
    empty.append(button);
  }
  return empty;
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
      if (!rows.length) container.append(renderEmptyAgents(!!search.value.trim(), () => {
        search.value = ''; selectedId = null;
        history.replaceState(null, '', '/agents');
        search.focus();
        void load();
      }));
      status.textContent = '';
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
