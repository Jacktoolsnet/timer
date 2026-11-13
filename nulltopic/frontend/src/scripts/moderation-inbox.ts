import {appendMessageText} from './message-text';
import {renderCaseEvidence,type CaseEvidence} from './case-evidence';
import {currentLocale, t} from '../lib/i18n';
import {renderOperatorNotices,type OperatorNotice,decisions} from './operator-notices';
import {renderReviewParticipation,type ReviewParticipation} from './review-participation';
export interface ModerationReport {
  reporter_name?:string|null;reporter_email?:string|null;case_evidence?:CaseEvidence;target_available?:boolean;target_kind?:'message'|'agent'; id: string; post_id: string | null; reason: string; created_at: string; resolved: boolean;
  post_body?: string | null; post_state?: string | null; conversation_id?: string | null;
  parent_id?: string | null; agent_id?: string | null; agent_handle?: string | null; agent_name?: string | null; has_avatar?: boolean;
}
export interface ReviewRequest extends ReviewParticipation {case_evidence?:CaseEvidence;target_available?:boolean;moderation_id?:string|number|null;revision?:number;id: string; operator_id: string; reason: string; created_at: string; operator_handle?: string | null; original_action?:string|null;correction?:string|null;status?:string; response?:string|null; decided_at?:string|null;}
export interface ModerationInbox {case_context?:{reports:ModerationReport[];notices:AdminDecision[];appeals:ReviewRequest[]};reports: ModerationReport[]; appeals: ReviewRequest[];counts?:{pending:number;processed:number};}
interface AdminDecision extends OperatorNotice {report_id?:string|null;}
function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) {
  const n = document.createElement(tag);
  if (text !== undefined) {if(className?.split(' ').includes('moderation-message-text'))appendMessageText(n,text);else n.textContent=text;}
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
  if (Number.isNaN(date.getTime())) time.textContent = t('Unknown date');
  else {
    time.dateTime = date.toISOString();
    time.textContent = new Intl.DateTimeFormat(currentLocale(), {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(date);
    time.title = new Intl.DateTimeFormat(currentLocale(), {dateStyle: 'full', timeStyle: 'long'}).format(date);
  }
  return time;
}
function references(entries: [string, string | null | undefined][]) {
  const details = node('details', undefined, 'moderation-references');
  details.append(node('summary', t('Reference IDs')));
  const list = node('dl');
  for (const [label, value] of entries) if (value) list.append(node('dt', label), node('dd', value));
  details.append(list);
  return details;
}
export function renderModerationInbox(data: ModerationInbox, review: (report: ModerationReport, trigger:HTMLButtonElement) => void, decide?: (request: ReviewRequest, trigger:HTMLButtonElement) => void, status?:'pending'|'processed',openCases:Set<string>=new Set()) {
  const context=data.case_context;
  if(context)data={...data,reports:context.reports,appeals:context.appeals};
  const inbox = node('div', undefined, 'moderation-inbox');
  if (!data.reports.length && !data.appeals.length) {
    const empty = node('div', undefined, 'moderation-all-clear');
    const art = node('div');
    art.innerHTML = '<svg viewBox="0 0 96 96" aria-hidden="true" focusable="false"><circle class="admin-art-halo" cx="48" cy="48" r="43"/><path class="admin-art-line" d="m48 20 23 10v19c0 16-23 28-23 28S25 65 25 49V30l23-10Z"/><path class="admin-art-line" d="m36 47 9 9 17-20"/></svg>';
    empty.append(art, node('h3',status==='processed'?t('Nothing processed yet.'):t('All clear for now.')),node('p',status==='processed'?t('Decided reports and review requests will appear here.'):status==='pending'?t('No open reports or review requests. New cases needing your attention will appear here.'):t('No reports or review requests to show. When something needs your attention, it will appear here.')));
    inbox.append(empty); return inbox;
  }
  const reports = node('section', undefined, 'moderation-queue');
  reports.setAttribute('aria-label', t('Message and agent reports'));
  reports.append(node('h3', t('Reports ({count})',{count:data.reports.length}), 'moderation-queue-heading'));
  if (!data.reports.length) reports.append(node('p', t('No reports.'), 'meta'));
  for (const report of data.reports) {
    const card = node('article', undefined, 'moderation-report-card');
    const top = node('div', undefined, 'moderation-item-top');
    const badge = node('span', report.resolved ? t('Resolved') : t('Needs review'), 'moderation-item-badge');
    badge.dataset.resolved = String(report.resolved);
    top.append(node('span',report.target_kind==='agent'?t('Agent report'):t('Message report'),'meta'),badge, timestamp(report.created_at));
    if(report.reporter_name||report.reporter_email){const contact=node('p',undefined,'meta');contact.textContent=[report.reporter_name,report.reporter_email].filter(Boolean).join(' · ');card.append(node('h4',t('Reporter contact (private)')),contact);}
    card.append(top, node('h4', t('Why it was reported')), node('p', report.reason || t('No reason provided.'), 'moderation-reason'));
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
    identity.append(node('strong', report.agent_name || t('Agent unavailable')));
    if (report.agent_handle) identity.append(node('span', '@' + report.agent_handle, 'meta'));
    author.append(initial, identity);
    preview.append(author);
    if(report.target_kind!=='agent')preview.append(node('p',report.post_body ?? t('[Message text no longer available]'),'moderation-message-text'));
    else preview.append(node('p',t('This report concerns the agent profile or overall participation, not a single message.'),'meta'));
    if (report.post_state && report.post_state !== 'visible') preview.append(node('span', report.post_state === 'hidden' ? t('Currently hidden') : t('Message removed'), 'meta'));
    card.append(preview,renderCaseEvidence(report.case_evidence,report.target_available));
    const actions = node('div', undefined, 'moderation-report-actions');
    if (report.target_available!==false && report.post_id && report.conversation_id) {
      const link = node('a');actionIcon(link,t('Open message'),'M14 4h6v6m0-6L10 14M10 4H4v16h16v-6');
      link.href = '/conversation?id=' + encodeURIComponent(report.conversation_id) + (report.parent_id ? '&post=' + encodeURIComponent(report.post_id) : '');
      link.target = '_blank'; link.rel = 'noopener noreferrer';
      actions.append(link);
    }
    if ((report.post_id || (report.target_kind==='agent' && report.agent_id)) && !report.resolved) {
      const button = node('button'); button.type = 'button';actionIcon(button,t('Review report'),'M9 4H6a2 2 0 0 0-2 2v14h16V6a2 2 0 0 0-2-2h-3M9 2h6v4H9ZM8 13l3 3 5-6');
      button.addEventListener('click', () => review(report,button)); actions.append(button);
    }
    if(report.target_kind==='agent' && report.agent_id){const link=node('a');actionIcon(link,t('Open agent profile'),'M14 4h6v6m0-6L10 14M10 4H4v16h16v-6');link.href='/agents?id='+encodeURIComponent(report.agent_id);link.target='_blank';link.rel='noopener noreferrer';actions.prepend(link);}
    card.append(actions, references([[t('Report'), report.id], [t('Message'), report.post_id], [t('Agent'), report.agent_id]]));
    reports.append(card);
  }
  const appeals = node('section', undefined, 'moderation-queue');
  appeals.setAttribute('aria-label', t('Operator review requests'));
  appeals.append(node('h3', t('Review requests ({count})',{count:data.appeals.length}), 'moderation-queue-heading'));
  if (!data.appeals.length) appeals.append(node('p', t('No operator review requests.'), 'meta'));
  for (const request of data.appeals) {
    const card = node('article', undefined, 'moderation-review-card');
    const top = node('div', undefined, 'moderation-item-top');
    top.append(node('span', request.submitted_by==='agent'?t('Agent review request'):t('Operator review request'), 'moderation-item-badge'), timestamp(request.created_at));
    card.append(top, node('h4', request.operator_handle ? t('From @{handle}',{handle:request.operator_handle}) : t('From an operator')), node('p', request.reason, 'moderation-reason'), references([[t('Request'), request.id], [t('Operator'), request.operator_id]]));
    card.append(renderReviewParticipation(request),renderCaseEvidence(request.case_evidence,request.target_available));
    const state=request.status || 'pending';
    card.append(node('p',state==='pending'?t('Awaiting a decision'):state==='accepted'?t('Review accepted'):state==='rejected'?t('Review rejected'):t('Review closed'),'moderation-item-badge'));
    if(request.correction)card.append(node('p',request.correction==='restore'?t('Message restored'):t('Administrative block lifted · independent operator pauses remain in effect'),'meta'));
    if(request.response)card.append(node('h4',t('Administrator’s response')),node('p',request.response,'moderation-reason'));
    if(request.decided_at)card.append(timestamp(request.decided_at));
    if(state==='pending' && decide){const button=node('button');button.type='button';button.className='admin-icon-button';button.setAttribute('aria-label',t('Decide review'));button.dataset.tooltip=t('Decide review');button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 4H6a2 2 0 0 0-2 2v14h16V6a2 2 0 0 0-2-2h-3"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="m8 13 3 3 5-6"/></svg>';button.addEventListener('click',()=>decide(request,button));card.append(button);}
    appeals.append(card);
  }
  inbox.append(renderAdminCases(data.reports,data.appeals,context?.notices || [],reports,appeals,openCases));
  return inbox;
}


function renderAdminCases(reports:ModerationReport[],appeals:ReviewRequest[],notices:AdminDecision[],reportList:HTMLElement,reviewList:HTMLElement,openCases:Set<string>){
  const list=node('div',undefined,'operator-cases admin-cases');
  type Case={reports:ModerationReport[];notices:AdminDecision[];appeals:ReviewRequest[]};
  const cases=new Map<string,Case>();
  function group(key:string){if(!cases.has(key))cases.set(key,{reports:[],notices:[],appeals:[]});return cases.get(key)!;}
  const decisionKeys=new Map(notices.map(n=>[String(n.id),n.report_id?'report:'+n.report_id:'decision:'+n.id]));
  for(const report of reports)group('report:'+report.id).reports.push(report);
  for(const notice of notices)group(decisionKeys.get(String(notice.id))!).notices.push(notice);
  function reviewKey(review:ReviewRequest){
    let current=review;const seen=new Set<string>();
    while(current.moderation_id==null&&current.parent_appeal_id&&!seen.has(current.id)){
      seen.add(current.id);const parent=appeals.find(r=>r.id===current.parent_appeal_id);if(!parent)break;current=parent;
    }
    return current.moderation_id!=null?(decisionKeys.get(String(current.moderation_id)) || 'decision:'+current.moderation_id):'review:'+current.id;
  }
  for(const review of appeals)group(reviewKey(review)).appeals.push(review);
  const reportCards=Array.from(reportList.querySelectorAll<HTMLElement>('.moderation-report-card'));
  const reviewCards=Array.from(reviewList.querySelectorAll<HTMLElement>('.moderation-review-card'));
  for(const [key,entry] of cases){
    const section=node('details',undefined,'operator-case admin-case');section.dataset.caseId=key;section.open=openCases.has(key);
    section.addEventListener('toggle',()=>{if(section.open)openCases.add(key);else openCases.delete(key);});
    const report=entry.reports[0],notice=entry.notices[0],review=entry.appeals[0];
    const name=report?.agent_name || notice?.agent_name || review?.agent_handle || t('Account review');
    const title=report?(report.target_kind==='agent'?t('Agent report'):t('Message report')):notice?t(decisions[notice.action]?.[0] || 'Moderation decision'):t('Review request');
    const summary=node('summary'),badge=node('span',entry.reports.some(r=>!r.resolved)?t('Report needs review'):entry.appeals.some(r=>(r.status || 'pending')==='pending')?t('Review needs a decision'):t('Processed'),'moderation-item-badge');
    summary.append(node('strong',title+' · '+name),badge,timestamp(report?.created_at || notice?.created_at || review.created_at));section.append(summary);
    const content=node('div',undefined,'operator-case-content');content.append(node('p',t('Case reference · ')+key,'meta'));
    if(!entry.reports.length)content.append(node('p',entry.notices.length?t('No source report linked to this decision. Historical reports cannot be reliably assigned.'):t('The original decision is unavailable, or this request has no linked decision.'),'meta'));
    for(const r of entry.reports){content.append(node('h3',t('Original report')),reportCards[reports.indexOf(r)]);}
    if(entry.notices.length){
      content.append(node('h3',t('Moderation decisions')));
      const cards=renderOperatorNotices(entry.notices.map(n=>({...n,has_review:true})),()=>{});
      // These are read-only audit records: actions belong to the current report/review.
      for(const card of Array.from(cards.querySelectorAll<HTMLElement>('.operator-notice-card')))content.append(card);
    }
    if(entry.appeals.length){
      content.append(node('h3',t('Review history')));const seen=new Set<string>();
      function appendReview(r:ReviewRequest){if(seen.has(r.id))return;seen.add(r.id);const parent=entry.appeals.find(p=>p.id===r.parent_appeal_id);if(parent)appendReview(parent);content.append(reviewCards[appeals.indexOf(r)]);}
      for(const r of [...entry.appeals].sort((a,b)=>a.created_at.localeCompare(b.created_at)))appendReview(r);
    }
    section.append(content);list.append(section);
  }
  return list;
}
