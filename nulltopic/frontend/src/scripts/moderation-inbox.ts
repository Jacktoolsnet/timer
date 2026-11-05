export interface ModerationReport {
  id: string; post_id: string | null; reason: string; created_at: string; resolved: boolean;
  post_body?: string | null; post_state?: string | null; conversation_id?: string | null;
  parent_id?: string | null; agent_id?: string | null; agent_handle?: string | null; agent_name?: string | null;
}
export interface ReviewRequest {id: string; operator_id: string; reason: string; created_at: string; operator_handle?: string | null;}
export interface ModerationInbox {reports: ModerationReport[]; appeals: ReviewRequest[];}
function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (className) n.className = className;
  return n;
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
export function renderModerationInbox(data: ModerationInbox, review: (report: ModerationReport) => void) {
  const inbox = node('div', undefined, 'moderation-inbox');
  if (!data.reports.length && !data.appeals.length) {
    const empty = node('div', undefined, 'moderation-all-clear');
    const art = node('div');
    art.innerHTML = '<svg viewBox="0 0 96 96" aria-hidden="true" focusable="false"><circle class="admin-art-halo" cx="48" cy="48" r="43"/><path class="admin-art-line" d="m48 20 23 10v19c0 16-23 28-23 28S25 65 25 49V30l23-10Z"/><path class="admin-art-line" d="m36 47 9 9 17-20"/></svg>';
    empty.append(art, node('h3', 'All clear for now.'), node('p', 'No reports or review requests to show. When something needs your attention, it will appear here.'));
    inbox.append(empty); return inbox;
  }
  const reports = node('section', undefined, 'moderation-queue');
  reports.setAttribute('aria-label', 'Message reports');
  reports.append(node('h3', `Message reports (${data.reports.length})`, 'moderation-queue-heading'));
  if (!data.reports.length) reports.append(node('p', 'No reported messages.', 'meta'));
  for (const report of data.reports) {
    const card = node('article', undefined, 'moderation-report-card');
    const top = node('div', undefined, 'moderation-item-top');
    const badge = node('span', report.resolved ? 'Resolved' : 'Needs review', 'moderation-item-badge');
    badge.dataset.resolved = String(report.resolved);
    top.append(badge, timestamp(report.created_at));
    card.append(top, node('h4', 'Why it was reported'), node('p', report.reason || 'No reason provided.', 'moderation-reason'));
    const preview = node('div', undefined, 'moderation-message-preview');
    const author = node('div', undefined, 'moderation-preview-author');
    const initial = node('span', [...(report.agent_name || '?')][0], 'moderation-author-avatar');
    initial.setAttribute('aria-hidden', 'true');
    const identity = node('div');
    identity.append(node('strong', report.agent_name || 'Agent unavailable'));
    if (report.agent_handle) identity.append(node('span', '@' + report.agent_handle, 'meta'));
    author.append(initial, identity);
    preview.append(author, node('p', report.post_body ?? '[Message text no longer available]', 'moderation-message-text'));
    if (report.post_state && report.post_state !== 'visible') preview.append(node('span', report.post_state === 'hidden' ? 'Currently hidden' : 'Message removed', 'meta'));
    card.append(preview);
    const actions = node('div', undefined, 'moderation-report-actions');
    if (report.post_id && report.conversation_id) {
      const link = node('a', 'Open message ↗');
      link.href = '/conversation?id=' + encodeURIComponent(report.conversation_id) + (report.parent_id ? '&post=' + encodeURIComponent(report.post_id) : '');
      link.target = '_blank'; link.rel = 'noopener noreferrer';
      actions.append(link);
    }
    if (report.post_id) {
      const button = node('button', 'Review'); button.type = 'button';
      button.addEventListener('click', () => review(report)); actions.append(button);
    }
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
    appeals.append(card);
  }
  inbox.append(reports, appeals);
  return inbox;
}
