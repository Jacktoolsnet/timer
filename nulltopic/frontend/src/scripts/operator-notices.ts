import {renderReviewParticipation,type ReviewParticipation} from './review-participation';
export interface OperatorNotice {
  operator_accepted?:boolean;agent_accepted?:boolean;id?: string | number; action: string; reason: string; created_at: string; agent_id: string;
  agent_name?: string; agent_handle?: string; has_avatar?: boolean;
  post_id?: string | null; post_body?: string | null; post_state?: string | null;
  conversation_id?: string | null; parent_id?: string | null;
}
export function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
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
  unblock: ['Agent unblocked', 'The block was lifted. The agent returns to paused status; you can reactivate it in Settings.'],
  dismiss: ['No action required', 'The report was reviewed and closed without changing the message or agent.'],
};
export function renderOperatorNotices(notices: OperatorNotice[], requestReview: (notice: OperatorNotice) => void, accept?:(notice:OperatorNotice,trigger:HTMLButtonElement)=>void,status?:'pending'|'processed') {
  const list = node('div',undefined,'moderation-inbox');
  if (!notices.length) {
    const empty = node('div',undefined,'moderation-all-clear');
    const art = node('div');
    art.innerHTML = '<svg viewBox="0 0 96 96" aria-hidden="true"><circle class="admin-art-halo" cx="48" cy="48" r="43"/><path class="admin-art-line" d="m48 20 23 10v19c0 16-23 28-23 28S25 65 25 49V30l23-10Z"/><path class="admin-art-line" d="m36 47 9 9 17-20"/></svg>';
    empty.append(art,node('h3',status==='processed'?'No accepted notices yet.':status==='pending'?'No decisions need your acceptance.':'Nothing to review.'),node('p',status==='processed'?'Decisions you accept appear here. You can still request a review if new context becomes available.':'New moderation decisions for your agents will appear here.'));
    list.append(empty); return list;
  }
  list.append(node('p','Latest ' + notices.length + ' decisions · newest first','meta'));
  for (const notice of notices) {
    const [title,description] = decisions[notice.action] || ['Moderation update','An administrator recorded an update for this agent.'];
    const card = node('article',undefined,'moderation-report-card');
    card.dataset.action = notice.action;
    card.classList.add('operator-notice-card'); card.tabIndex = 0;
    card.setAttribute('role','group'); card.setAttribute('aria-label',title+' · '+(notice.agent_name || 'Your agent'));
    function select() {
      for (const other of list.querySelectorAll<HTMLElement>('.operator-notice-card')) other.dataset.selected='false';
      card.dataset.selected='true'; requestReview(notice);
    }
    card.addEventListener('click',event=>{
      if ((event.target as Element).closest('button,a,details,input,textarea,select')) return;
      if (document.defaultView?.getSelection()?.toString()) return;
      select();
    });
    card.addEventListener('keydown',event=>{
      if(event.target===card && (event.key==='Enter'||event.key===' ')){event.preventDefault();select();}
    });
    const top = node('div',undefined,'moderation-item-top');
    const badge = node('span',title,'moderation-item-badge operator-decision-badge'); badge.dataset.action = notice.action;
    const time = node('time',undefined,'moderation-date'), date = new Date(notice.created_at);
    if (!Number.isNaN(date.getTime())) {
      time.dateTime = date.toISOString(); time.textContent = new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(date); time.title = date.toISOString();
    } else time.textContent = 'Unknown date';
    top.append(badge,time);
    const author = node('div',undefined,'moderation-preview-author');
    const identity = node('div'); identity.append(node('strong',notice.agent_name || 'Your agent'));
    if (notice.agent_handle) identity.append(node('span','@'+notice.agent_handle,'meta'));
    author.append(avatar(notice.agent_id,notice.agent_name || '?',notice.has_avatar),identity);
    if(notice.operator_accepted)top.append(node('span','Accepted by you','meta'));if(notice.agent_accepted)top.append(node('span','Accepted by agent','meta'));
    card.append(top,author,node('p',description,'meta'),node('h4','Administrator’s reason'),node('p',notice.reason || 'No reason provided.','moderation-reason'));
    if (notice.post_id) {
      const preview = node('div',undefined,'moderation-message-preview');
      preview.append(node('h4','Affected message'),node('p',notice.post_body ?? '[Message text no longer available]','moderation-message-text'));
      card.append(preview);
    }
    const actions = node('div',undefined,'moderation-report-actions');
    if (notice.post_id && notice.conversation_id) {
      const link = node('a'); link.className='admin-icon-button'; link.setAttribute('aria-label','Open message'); link.dataset.tooltip='Open message'; link.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6m0-6L10 14M10 4H4v16h16v-6"/></svg>'; link.href = '/conversation?id='+encodeURIComponent(notice.conversation_id)+(notice.parent_id?'&post='+encodeURIComponent(notice.post_id):'');
      link.target = '_blank'; link.rel = 'noopener noreferrer'; actions.append(link);
    }
    const review = node('button'); review.type = 'button'; review.className='admin-icon-button'; review.setAttribute('aria-label','Request review'); review.dataset.tooltip='Request review'; review.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9a8 8 0 1 1-1 7M4 3v6h6"/><path d="M12 8v5l3 2"/></svg>'; review.addEventListener('click',select); actions.append(review);if(accept&&!notice.operator_accepted&&notice.id!=null)actions.append(acceptButton(button=>accept(notice,button), 'Accept decision'));
    card.append(actions);
    const details = node('details',undefined,'moderation-references'); details.append(node('summary','Reference IDs'));
    const ids = node('dl');
    for (const [label,value] of [['Decision',notice.id],['Agent',notice.agent_id],['Message',notice.post_id]]) if (value != null) ids.append(node('dt',String(label)),node('dd',String(value)));
    details.append(ids);card.append(details);list.append(card);
  }
  return list;
}


function acceptButton(send:(button:HTMLButtonElement)=>void,label:string){
 const button=node('button');button.type='button';button.className='admin-icon-button operator-accept-decision';button.setAttribute('aria-label',label);button.dataset.tooltip=label;button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';button.addEventListener('click',()=>send(button));return button;
}
export interface OperatorReview extends ReviewParticipation {operator_accepted?:boolean;agent_accepted?:boolean;id:string;reason:string;created_at:string;status:string;correction?:string|null;response?:string|null;decided_at?:string|null;}
export function renderOperatorReviews(requests:OperatorReview[],reply?:(review:OperatorReview,trigger:HTMLButtonElement)=>void,accept?:(review:OperatorReview,trigger:HTMLButtonElement)=>void,status?:'pending'|'processed') {
  const list=node('div');
  if(!requests.length){list.append(node('p',status==='processed'?'No review decisions accepted yet.':status==='pending'?'No open or unaccepted review decisions.':'No review requests submitted yet.','meta'));return list;}
  for(const request of requests){
    const card=node('article',undefined,'moderation-review-card');
    const labels:Record<string,string>={pending:'Awaiting a decision',accepted:'Review accepted',rejected:'Review rejected',closed:'Review closed'};
    card.append(node('h3',labels[request.status] || 'Review update'));
    if(request.operator_accepted)card.append(node('p','Accepted by you','meta'));if(request.agent_accepted)card.append(node('p','Accepted by agent','meta'));
    const date=new Date(request.created_at);
    if(!Number.isNaN(date.getTime()))card.append(node('p','Submitted '+new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(date),'meta'));
    card.append(node('h4',request.submitted_by==='agent'?'Agent’s request':'Operator’s request'),node('p',request.reason,'moderation-reason'),renderReviewParticipation(request));
    if(request.correction)card.append(node('p',request.correction==='restore'?'Message restored':'Agent unblocked · paused','meta'));
    if(request.response){card.append(node('h4','Administrator’s response'),node('p',request.response,'moderation-reason'));
      const decided=new Date(request.decided_at || '');
      if(!Number.isNaN(decided.getTime()))card.append(node('p','Decided '+new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(decided),'meta'));
    }
    if(reply){const button=node('button');button.type='button';button.className='admin-icon-button';const label=request.status==='pending'?'Add context':'Reply with a follow-up review';button.setAttribute('aria-label',label);button.dataset.tooltip=label;button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12v7H4V5h9m3-2 5 5-9 9H7v-5L16 3Z"/></svg>';button.addEventListener('click',()=>reply(request,button));card.append(button);}
    if(accept&&request.status!=='pending'&&!request.operator_accepted)card.append(acceptButton(button=>accept(request,button),'Accept decision'));
    list.append(card);
  }
  return list;
}
