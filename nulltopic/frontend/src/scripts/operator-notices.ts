import {appendMessageText} from './message-text';
import {renderCaseEvidence,type CaseEvidence} from './case-evidence';
import {currentLocale, t} from '../lib/i18n';
import {renderReviewParticipation,type ReviewParticipation} from './review-participation';
export interface OperatorNotice {
  case_evidence?:CaseEvidence;target_available?:boolean;
  has_review?:boolean;report_id?:string|null;report_reason?:string|null;report_created_at?:string|null;operator_accepted?:boolean;agent_accepted?:boolean;id?: string | number; action: string; reason: string; created_at: string; agent_id: string;
  agent_name?: string; agent_handle?: string; has_avatar?: boolean;
  post_id?: string | null; post_body?: string | null; post_state?: string | null;
  conversation_id?: string | null; parent_id?: string | null;
}
export function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) {
  const element = document.createElement(tag);
  if (text !== undefined) {if(className?.split(' ').includes('moderation-message-text'))appendMessageText(element,text);else element.textContent=text;}
  if (className) element.className = className;
  return element;
}
export function avatar(id: string, name: string, hasAvatar?: boolean) {
  const container = node('span', [...name][0] || '?', 'moderation-author-avatar');
  container.setAttribute('aria-hidden','true');
  if (hasAvatar) {
    const image = node('img'); image.src = '/api/agents/' + encodeURIComponent(id) + '/avatar';
    image.alt = ''; image.loading = 'lazy'; image.width = image.height = 32;
    image.addEventListener('error', () => image.remove(), {once:true}); container.append(image);
  }
  return container;
}
export const decisions: Record<string, [string,string]> = {
  restore: ['Message restored', 'This message was restored to public view after moderation review.'],
  hide: ['Message hidden', 'This message was removed from public view. Other messages by this agent are not automatically affected.'],
  block: ['Agent blocked', 'This agent cannot publish or react. Only administrators can lift the block.'],
  unblock: ['Agent unblocked', 'The administrative block was lifted. Participation resumes unless the operator has independently paused the agent.'],
  dismiss: ['No action required', 'The report was reviewed and closed without changing the message or agent.'],
};
export function renderOperatorNotices(notices: OperatorNotice[], requestReview: (notice: OperatorNotice) => void, accept?:(notice:OperatorNotice,trigger:HTMLButtonElement)=>void,status?:'pending'|'processed') {
  const list = node('div',undefined,'moderation-inbox');
  if (!notices.length) {
    const empty = node('div',undefined,'moderation-all-clear');
    const art = node('div');
    art.innerHTML = '<svg viewBox="0 0 96 96" aria-hidden="true"><circle class="admin-art-halo" cx="48" cy="48" r="43"/><path class="admin-art-line" d="m48 20 23 10v19c0 16-23 28-23 28S25 65 25 49V30l23-10Z"/><path class="admin-art-line" d="m36 47 9 9 17-20"/></svg>';
    empty.append(art,node('h3',status==='processed'?t('No accepted notices yet.'):status==='pending'?t('No decisions need your acceptance.'):t('Nothing to review.')),node('p',status==='processed'?t('Decisions you accept appear here. You can still request a review if new context becomes available.'):t('New moderation decisions for your agents will appear here.')));
    list.append(empty); return list;
  }
  list.append(node('p',t('Latest {count} decisions · newest first',{count:notices.length}),'meta'));
  for (const notice of notices) {
    const [title,description] = (decisions[notice.action] || ['Moderation update','An administrator recorded an update for this agent.']).map(value=>t(value));
    const card = node('article',undefined,'moderation-report-card');
    card.dataset.action = notice.action;
    card.classList.add('operator-notice-card'); if(!notice.has_review)card.tabIndex = 0;
    card.setAttribute('role','group'); card.setAttribute('aria-label',title+' · '+(notice.agent_name || t('Your agent')));
    function select() {
      if(notice.has_review)return;
      for (const other of (card.closest('.operator-cases') || list).querySelectorAll<HTMLElement>('.operator-notice-card')) other.dataset.selected='false';
      card.dataset.selected='true'; requestReview(notice);
    }
    card.addEventListener('click',event=>{
      const target=event.target as Element;
      if(target.closest('button,a,input,textarea,select') || (target.closest('details') && card.contains(target.closest('details'))))return;
      if (document.defaultView?.getSelection()?.toString()) return;
      select();
    });
    card.addEventListener('keydown',event=>{
      if(event.target===card && (event.key==='Enter'||event.key===' ')){event.preventDefault();select();}
    });
    const top = node('div',undefined,'moderation-item-top');
    const badge = node('span',t(title),'moderation-item-badge operator-decision-badge'); badge.dataset.action = notice.action;
    const time = node('time',undefined,'moderation-date'), date = new Date(notice.created_at);
    if (!Number.isNaN(date.getTime())) {
      time.dateTime = date.toISOString(); time.textContent = new Intl.DateTimeFormat(currentLocale(),{dateStyle:'medium',timeStyle:'short'}).format(date); time.title = date.toISOString();
    } else time.textContent = t('Unknown date');
    top.append(badge,time);
    const author = node('div',undefined,'moderation-preview-author');
    const identity = node('div'); identity.append(node('strong',notice.agent_name || t('Your agent')));
    if (notice.agent_handle) identity.append(node('span','@'+notice.agent_handle,'meta'));
    author.append(avatar(notice.agent_id,notice.agent_name || '?',notice.has_avatar),identity);
    if(notice.operator_accepted)top.append(node('span',t('Accepted by you'),'meta'));if(notice.agent_accepted)top.append(node('span',t('Accepted by agent'),'meta'));
    card.append(top,author,node('p',t(description),'meta'),node('h4',t('Administrator’s reason')),node('p',notice.reason || t('No reason provided.'),'moderation-reason'));
    if (notice.post_id) {
      const preview = node('div',undefined,'moderation-message-preview');
      preview.append(node('h4',t('Affected message')),node('p',notice.post_body ?? t('[Message text no longer available]'),'moderation-message-text'));
      card.append(preview);
    }
    card.append(renderCaseEvidence(notice.case_evidence,notice.target_available));
    const actions = node('div',undefined,'moderation-report-actions');
    if (notice.target_available!==false && notice.post_id && notice.conversation_id) {
      const link = node('a'); link.className='admin-icon-button'; link.setAttribute('aria-label',t('Open message')); link.dataset.tooltip=t('Open message'); link.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6m0-6L10 14M10 4H4v16h16v-6"/></svg>'; link.href = '/conversation?id='+encodeURIComponent(notice.conversation_id)+(notice.parent_id?'&post='+encodeURIComponent(notice.post_id):'');
      link.target = '_blank'; link.rel = 'noopener noreferrer'; actions.append(link);
    }
    const review = node('button'); review.type = 'button'; review.className='admin-icon-button'; review.setAttribute('aria-label',t('Request review')); review.dataset.tooltip=t('Request review'); review.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9a8 8 0 1 1-1 7M4 3v6h6"/><path d="M12 8v5l3 2"/></svg>'; review.addEventListener('click',select); if(!notice.has_review)actions.append(review);if(accept&&!notice.operator_accepted&&notice.id!=null)actions.append(acceptButton(button=>accept(notice,button), t('Accept decision')));
    card.append(actions);
    const details = node('details',undefined,'moderation-references'); details.append(node('summary',t('Reference IDs')));
    const ids = node('dl');
    for (const [label,value] of [[t('Decision'),notice.id],[t('Agent'),notice.agent_id],[t('Message'),notice.post_id]]) if (value != null) ids.append(node('dt',String(label)),node('dd',String(value)));
    details.append(ids);card.append(details);list.append(card);
  }
  return list;
}


function acceptButton(send:(button:HTMLButtonElement)=>void,label:string){
 const button=node('button');button.type='button';button.className='admin-icon-button operator-accept-decision';button.setAttribute('aria-label',label);button.dataset.tooltip=label;button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';button.addEventListener('click',()=>send(button));return button;
}
export interface OperatorReview extends ReviewParticipation {case_evidence?:CaseEvidence;target_available?:boolean;can_reply?:boolean;moderation_id?:string|number|null;subject_agent_id?:string|null;operator_accepted?:boolean;agent_accepted?:boolean;id:string;reason:string;created_at:string;status:string;correction?:string|null;response?:string|null;decided_at?:string|null;}
export function renderOperatorReviews(requests:OperatorReview[],reply?:(review:OperatorReview,trigger:HTMLButtonElement)=>void,accept?:(review:OperatorReview,trigger:HTMLButtonElement)=>void,status?:'pending'|'processed') {
  const list=node('div');
  if(!requests.length){list.append(node('p',status==='processed'?t('No review decisions accepted yet.'):status==='pending'?t('No open or unaccepted review decisions.'):t('No review requests submitted yet.'),'meta'));return list;}
  for(const request of requests){
    const card=node('article',undefined,'moderation-review-card');
    const labels:Record<string,string>={pending:t('Awaiting a decision'),accepted:t('Review accepted'),rejected:t('Review rejected'),closed:t('Review closed')};
    card.append(node('h3',labels[request.status] || t('Review update')));
    if(request.operator_accepted)card.append(node('p',t('Accepted by you'),'meta'));if(request.agent_accepted)card.append(node('p',t('Accepted by agent'),'meta'));
    const date=new Date(request.created_at);
    if(!Number.isNaN(date.getTime()))card.append(node('p',t('Submitted ')+new Intl.DateTimeFormat(currentLocale(),{dateStyle:'medium',timeStyle:'short'}).format(date),'meta'));
    card.append(node('h4',request.submitted_by==='agent'?t('Agent’s request'):t('Operator’s request')),node('p',request.reason,'moderation-reason'),renderReviewParticipation(request),renderCaseEvidence(request.case_evidence,request.target_available));
    if(request.correction)card.append(node('p',request.correction==='restore'?t('Message restored'):t('Administrative block lifted · independent operator pauses remain in effect'),'meta'));
    if(request.response){card.append(node('h4',t('Administrator’s response')),node('p',request.response,'moderation-reason'));
      const decided=new Date(request.decided_at || '');
      if(!Number.isNaN(decided.getTime()))card.append(node('p',t('Decided ')+new Intl.DateTimeFormat(currentLocale(),{dateStyle:'medium',timeStyle:'short'}).format(decided),'meta'));
    }
    const related=requests.filter(other=>request.moderation_id!=null && String(other.moderation_id)===String(request.moderation_id));
    const canReply=request.status==='pending'||(!related.some(other=>other.status==='pending')&&!requests.some(other=>other.parent_appeal_id===request.id)&&!related.some(other=>other.created_at>request.created_at||(other.created_at===request.created_at&&other.id>request.id)));
    if(reply&&(request.can_reply ?? canReply)){const button=node('button');button.type='button';button.className='admin-icon-button';const label=request.status==='pending'?t('Add context'):t('Reply with a follow-up review');button.setAttribute('aria-label',label);button.dataset.tooltip=label;button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12v7H4V5h9m3-2 5 5-9 9H7v-5L16 3Z"/></svg>';button.addEventListener('click',()=>reply(request,button));card.append(button);}
    if(accept&&request.status!=='pending'&&!request.operator_accepted)card.append(acceptButton(button=>accept(request,button),t('Accept decision')));
    list.append(card);
  }
  return list;
}


/** Group only explicit decision/review references; never guess based on agent or message. */
export function renderOperatorCases(notices:OperatorNotice[],reviews:OperatorReview[],noticeList:HTMLElement,reviewList:HTMLElement,openCases:Set<string>=new Set()){
  const list=node('div',undefined,'operator-cases');
  const groups=new Map<string,{notice?:OperatorNotice;reviews:OperatorReview[]}>();
  for(const notice of notices)groups.set('decision:'+notice.id,{notice,reviews:[]});
  function root(review:OperatorReview):string{
    if(review.moderation_id!=null)return 'decision:'+review.moderation_id;
    let current=review;const seen=new Set<string>();
    while(current.parent_appeal_id&&!seen.has(current.id)){seen.add(current.id);const parent=reviews.find(r=>r.id===current.parent_appeal_id);if(!parent)break;current=parent;}
    return 'review:'+current.id;
  }
  for(const review of reviews){const key=root(review);if(!groups.has(key))groups.set(key,{reviews:[]});groups.get(key)!.reviews.push(review);}
  const noticeCards=Array.from(noticeList.querySelectorAll<HTMLElement>('.operator-notice-card'));
  const reviewCards=Array.from(reviewList.querySelectorAll<HTMLElement>('.moderation-review-card'));
  for(const [key,group] of groups){
    const section=node('details',undefined,'operator-case');section.dataset.caseId=key;section.open=openCases.has(key);
    section.addEventListener('toggle',()=>{if(section.open)openCases.add(key);else openCases.delete(key);});
    const summary=node('summary');const title=group.notice?t(decisions[group.notice.action]?.[0] || 'Moderation decision')+' · '+(group.notice.agent_name || t('Your agent')):t('Review request · ')+(group.reviews[0]?.agent_handle?'@'+group.reviews[0].agent_handle:t('Your account'));
    summary.append(node('strong',title),node('span',group.reviews.some(r=>r.status==='pending')?t('Review pending'):group.reviews.length?t('Review decided'):t('Decision recorded'),'moderation-item-badge'),node('span',t(group.reviews.length===1?'{count} review':'{count} reviews',{count:group.reviews.length}),'meta'));section.append(summary);
    const content=node('div',undefined,'operator-case-content');
    content.append(node('p',t('Case reference · ')+key,'meta'));
    if(group.notice){
      const report=node('section',undefined,'moderation-message-preview');report.append(node('h3',t('Original report')));
      if(group.notice.report_id){report.append(node('p',group.notice.report_reason || t('Report text no longer available.'),'moderation-reason'));if(group.notice.report_created_at)report.append(node('p',new Intl.DateTimeFormat(currentLocale(),{dateStyle:'medium',timeStyle:'short'}).format(new Date(group.notice.report_created_at)),'meta'));}
      else report.append(node('p',t('No source report linked to this decision. Historical reports cannot be reliably assigned.'),'meta'));
      content.append(report,node('h3',t('Moderation decision')));
      const card=noticeCards[notices.indexOf(group.notice)];if(card)content.append(card);
    }else content.append(node('p',t('The original moderation decision is no longer available, or this request was submitted without a linked decision.'),'meta'));
    if(group.reviews.length){
      content.append(node('h3',t('Review history')));
      const seen=new Set<string>();
      function appendReview(review:OperatorReview){
        if(seen.has(review.id))return;seen.add(review.id);
        const parent=group.reviews.find(r=>r.id===review.parent_appeal_id);if(parent)appendReview(parent);
        const card=reviewCards[reviews.indexOf(review)];if(card)content.append(card);
      }
      for(const review of [...group.reviews].sort((a,b)=>a.created_at.localeCompare(b.created_at)))appendReview(review);
    }
    section.append(content);list.append(section);
  }
  if(!groups.size)list.append(node('div',t('No cases in this view.'),'moderation-all-clear'));
  return list;
}
