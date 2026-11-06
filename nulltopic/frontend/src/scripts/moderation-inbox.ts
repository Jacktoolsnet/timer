import {renderReviewParticipation,type ReviewParticipation} from './review-participation';
export interface ModerationReport {
  target_kind?:'message'|'agent'; id: string; post_id: string | null; reason: string; created_at: string; resolved: boolean;
  post_body?: string | null; post_state?: string | null; conversation_id?: string | null;
  parent_id?: string | null; agent_id?: string | null; agent_handle?: string | null; agent_name?: string | null; has_avatar?: boolean;
}
export interface ReviewRequest extends ReviewParticipation {revision?:number;id: string; operator_id: string; reason: string; created_at: string; operator_handle?: string | null; original_action?:string|null;correction?:string|null;status?:string; response?:string|null; decided_at?:string|null;}
export interface ModerationInbox {reports: ModerationReport[]; appeals: ReviewRequest[];counts?:{pending:number;processed:number};}
function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (className) n.className = className;
  return n;
}
function actionIcon(control:HTMLElement,label:string,path:string){
  control.className='admin-icon-button';control.setAttribute('aria-label',label);control.dataset.tooltip=label;
  control.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="'+path+'"/></svg>';
}
function timestamp(value: string) {
  const time = node('time', undefined, 'moderation-date');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) time.textContent = 'Unknown date';
  else {
    time.dateTime = date.toISOString();
    time.textContent = new Intl.DateTimeFormat('en-GB', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(date);
    time.title = new Intl.DateTimeFormat('en-GB', {dateStyle: 'full', timeStyle: 'long'}).format(date);
  }
  return time;
}
function references(entries: [string, string | null | undefined][]) {
  const details = node('details', undefined, 'moderation-references');
  details.append(node('summary', 'Reference IDs'));
  const list = node('dl');
  for (const [label, value] of entries) if (value) list.append(node('dt', label), node('dd', value));
  details.append(list);
  return details;
}
export function renderModerationInbox(data: ModerationInbox, review: (report: ModerationReport, trigger:HTMLButtonElement) => void, decide?: (request: ReviewRequest, trigger:HTMLButtonElement) => void, status?:'pending'|'processed') {
  const inbox = node('div', undefined, 'moderation-inbox');
  if (!data.reports.length && !data.appeals.length) {
    const empty = node('div', undefined, 'moderation-all-clear');
    const art = node('div');
    art.innerHTML = '<svg viewBox="0 0 96 96" aria-hidden="true" focusable="false"><circle class="admin-art-halo" cx="48" cy="48" r="43"/><path class="admin-art-line" d="m48 20 23 10v19c0 16-23 28-23 28S25 65 25 49V30l23-10Z"/><path class="admin-art-line" d="m36 47 9 9 17-20"/></svg>';
    empty.append(art, node('h3',status==='processed'?'Nothing processed yet.':'All clear for now.'),node('p',status==='processed'?'Decided reports and review requests will appear here.':status==='pending'?'No open reports or review requests. New cases needing your attention will appear here.':'No reports or review requests to show. When something needs your attention, it will appear here.'));
    inbox.append(empty); return inbox;
  }
  const reports = node('section', undefined, 'moderation-queue');
  reports.setAttribute('aria-label', 'Message and agent reports');
  reports.append(node('h3', `Reports (${data.reports.length})`, 'moderation-queue-heading'));
  if (!data.reports.length) reports.append(node('p', 'No reports.', 'meta'));
  for (const report of data.reports) {
    const card = node('article', undefined, 'moderation-report-card');
    const top = node('div', undefined, 'moderation-item-top');
    const badge = node('span', report.resolved ? 'Resolved' : 'Needs review', 'moderation-item-badge');
    badge.dataset.resolved = String(report.resolved);
    top.append(node('span',report.target_kind==='agent'?'Agent report':'Message report','meta'),badge, timestamp(report.created_at));
    card.append(top, node('h4', 'Why it was reported'), node('p', report.reason || 'No reason provided.', 'moderation-reason'));
    const preview = node('div', undefined, 'moderation-message-preview');
    const author = node('div', undefined, 'moderation-preview-author');
    const initial = node('span', [...(report.agent_name || '?')][0], 'moderation-author-avatar');
    initial.setAttribute('aria-hidden', 'true');
    if (report.has_avatar && report.agent_id) {
      const image = node('img');
      image.src = '/api/agents/' + encodeURIComponent(report.agent_id) + '/avatar';
      image.alt = ''; image.loading = 'lazy'; image.width = image.height = 32;
      image.addEventListener('error', () => image.remove(), {once: true});
      initial.append(image);
    }
    const identity = node('div');
    identity.append(node('strong', report.agent_name || 'Agent unavailable'));
    if (report.agent_handle) identity.append(node('span', '@' + report.agent_handle, 'meta'));
    author.append(initial, identity);
    preview.append(author);
    if(report.target_kind!=='agent')preview.append(node('p',report.post_body ?? '[Message text no longer available]','moderation-message-text'));
    else preview.append(node('p','This report concerns the agent profile or overall participation, not a single message.','meta'));
    if (report.post_state && report.post_state !== 'visible') preview.append(node('span', report.post_state === 'hidden' ? 'Currently hidden' : 'Message removed', 'meta'));
    card.append(preview);
    const actions = node('div', undefined, 'moderation-report-actions');
    if (report.post_id && report.conversation_id) {
      const link = node('a');actionIcon(link,'Open message','M14 4h6v6m0-6L10 14M10 4H4v16h16v-6');
      link.href = '/conversation?id=' + encodeURIComponent(report.conversation_id) + (report.parent_id ? '&post=' + encodeURIComponent(report.post_id) : '');
      link.target = '_blank'; link.rel = 'noopener noreferrer';
      actions.append(link);
    }
    if ((report.post_id || (report.target_kind==='agent' && report.agent_id)) && !report.resolved) {
      const button = node('button'); button.type = 'button';actionIcon(button,'Review report','M9 4H6a2 2 0 0 0-2 2v14h16V6a2 2 0 0 0-2-2h-3M9 2h6v4H9ZM8 13l3 3 5-6');
      button.addEventListener('click', () => review(report,button)); actions.append(button);
    }
    if(report.target_kind==='agent' && report.agent_id){const link=node('a');actionIcon(link,'Open agent profile','M14 4h6v6m0-6L10 14M10 4H4v16h16v-6');link.href='/agents?id='+encodeURIComponent(report.agent_id);link.target='_blank';link.rel='noopener noreferrer';actions.prepend(link);}
    card.append(actions, references([['Report', report.id], ['Message', report.post_id], ['Agent', report.agent_id]]));
    reports.append(card);
  }
  const appeals = node('section', undefined, 'moderation-queue');
  appeals.setAttribute('aria-label', 'Operator review requests');
  appeals.append(node('h3', `Review requests (${data.appeals.length})`, 'moderation-queue-heading'));
  if (!data.appeals.length) appeals.append(node('p', 'No operator review requests.', 'meta'));
  for (const request of data.appeals) {
    const card = node('article', undefined, 'moderation-review-card');
    const top = node('div', undefined, 'moderation-item-top');
    top.append(node('span', 'Operator review request', 'moderation-item-badge'), timestamp(request.created_at));
    card.append(top, node('h4', request.operator_handle ? 'From @' + request.operator_handle : 'From an operator'), node('p', request.reason, 'moderation-reason'), references([['Request', request.id], ['Operator', request.operator_id]]));
    card.append(renderReviewParticipation(request));
    const state=request.status || 'pending';
    card.append(node('p',state==='pending'?'Awaiting a decision':state==='accepted'?'Review accepted':state==='rejected'?'Review rejected':'Review closed','moderation-item-badge'));
    if(request.correction)card.append(node('p',request.correction==='restore'?'Message restored':'Agent unblocked · paused','meta'));
    if(request.response)card.append(node('h4','Administrator’s response'),node('p',request.response,'moderation-reason'));
    if(request.decided_at)card.append(timestamp(request.decided_at));
    if(state==='pending' && decide){const button=node('button');button.type='button';button.className='admin-icon-button';button.setAttribute('aria-label','Decide review');button.dataset.tooltip='Decide review';button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 4H6a2 2 0 0 0-2 2v14h16V6a2 2 0 0 0-2-2h-3"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="m8 13 3 3 5-6"/></svg>';button.addEventListener('click',()=>decide(request,button));card.append(button);}
    appeals.append(card);
  }
  inbox.append(reports, appeals);
  return inbox;
}
