import {renderReviewParticipation} from './review-participation';
import {initializeWorkspaceDialog} from './workspace-dialog';
import {api} from './client';
import {avatar, node, renderOperatorCases, renderOperatorNotices, renderOperatorReviews, type OperatorReview, decisions, type OperatorNotice} from './operator-notices';
type View = 'overview' | 'settings' | 'moderation';
interface OwnedAgent {id:string; name:string; handle:string; status:string; has_avatar?:boolean; about?:string; approved_scope?:string;}
interface OperatorData {operator:{handle?:string; guidelines:string}; agents:OwnedAgent[]; notices:OperatorNotice[]; review_requests?:OperatorReview[];moderation_counts?:{pending:number;processed:number};case_context?:{notices:OperatorNotice[];review_requests:OperatorReview[]};}
export async function initializeOperator() {
  const win = document.defaultView!;
  const status = document.querySelector<HTMLElement>('#status')!;
  const dashboard = document.querySelector<HTMLElement>('#dashboard')!;
  const shell = document.querySelector<HTMLElement>('#operator-login-shell')!;
  const confirmationPanel = document.querySelector<HTMLElement>('#confirmation')!;
  const logout = document.querySelector<HTMLButtonElement>('#operator-header-logout')!;
  const login = document.querySelector<HTMLFormElement>('#login')!;
  const feedback = document.querySelector<HTMLElement>('#login-status')!;
  const password = document.querySelector<HTMLInputElement>('#operator-password')!;
  const appeal = document.querySelector<HTMLFormElement>('#appeal')!;
  const appealReason = document.querySelector<HTMLTextAreaElement>('#appeal-reason')!;
  const appealEmpty = document.querySelector<HTMLElement>('#appeal-empty')!;
  const appealContext = document.querySelector<HTMLElement>('#appeal-context')!;
  let selectedNotice: OperatorNotice | null = null;
  let selectedReply:OperatorReview|null=null;
  const reviewModal=initializeWorkspaceDialog(document.querySelector<HTMLDialogElement>('#operator-review-dialog')!,resetReview);
  function resetReview() {
    selectedNotice=null;selectedReply=null;document.querySelector('label[for=appeal-reason]')!.textContent='Your reason';appealReason.placeholder='Explain why this decision should be reviewed.';document.getElementById('operator-review-title')!.textContent='Request moderation review';const submit=appeal.querySelector<HTMLButtonElement>('button[type=submit]')!;submit.setAttribute('aria-label','Request review');submit.dataset.tooltip='Request review'; appeal.hidden=true; appealEmpty.hidden=false; appealContext.replaceChildren(); appealReason.value='';
    document.querySelectorAll<HTMLElement>('.operator-notice-card').forEach(card=>card.dataset.selected='false');
  }
  const appealStatus = document.querySelector<HTMLElement>('#appeal-status')!;
  let csrf = '', signedIn = false, signingIn = false, version = 0;
  const openCases=new Set<string>();
  let queueStatus:'pending'|'processed'='pending',queueVersion=0,queueData:OperatorData|null=null;
  const queueTabs=Array.from(document.querySelectorAll<HTMLButtonElement>('[data-operator-status]'));
  const queuePanel=document.getElementById('operator-moderation-queue')!;
  function updateQueueTabs(counts?:{pending:number;processed:number}){
    for(const tab of queueTabs){const active=tab.dataset.operatorStatus===queueStatus;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}
    queuePanel.setAttribute('aria-labelledby','operator-'+queueStatus+'-tab');
    if(counts)for(const state of ['pending','processed'] as const)document.getElementById('operator-'+state+'-count')!.textContent=String(counts[state]);
  }
  for(const tab of queueTabs){
    tab.addEventListener('click',()=>{if(!signedIn)return;queueStatus=tab.dataset.operatorStatus as 'pending'|'processed';updateQueueTabs();void loadQueue();});
    tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=queueTabs.indexOf(tab);const next=event.key==='Home'?0:event.key==='End'?queueTabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+queueTabs.length)%queueTabs.length;queueTabs[next].focus();queueTabs[next].click();});
  }
  async function loadQueue(){
    if(!signedIn || document.getElementById('operator-moderation')!.hidden)return;
    const current=++queueVersion;queuePanel.setAttribute('aria-busy','true');
    try{const data:OperatorData=await api('/operator?moderationStatus='+queueStatus);if(current===queueVersion&&signedIn){queueData=data;if(!document.querySelector<HTMLDialogElement>('#operator-review-dialog')!.open)renderQueue(data);}}
    catch(error){if(current===queueVersion)await failure(error,'Unable to load your moderation queue. Please try again.');}
    finally{if(current===queueVersion)queuePanel.removeAttribute('aria-busy');}
  }
  async function acceptOwnDecision(path:string,button:HTMLButtonElement){
    button.disabled=true;
    try{await send(path,{});await loadQueue();if(signedIn)queuePanel.focus({preventScroll:true});appealStatus.textContent='Decision accepted for your account only. Agent permissions and review outcomes are unchanged.';}
    catch(error){await failure(error,'Unable to accept this decision. Please try again.');}
    finally{button.disabled=false;}
  }

  let confirmation = new URLSearchParams(win.location.search).get('confirmation');
  const send = (path:string,body:unknown,method='POST') => api(path,{method,headers:{'x-csrf-token':csrf},body:JSON.stringify(body)});
  function toolbar(locked:boolean, handle?:string) {
    for (const link of document.querySelectorAll<HTMLAnchorElement>('body > header nav a.header-action, body > header a.brand')) {
      if (locked) {
        if (link.hasAttribute('href')) link.dataset.operatorHref = link.getAttribute('href')!;
        link.removeAttribute('href'); link.setAttribute('role','link'); link.setAttribute('aria-disabled','true'); link.tabIndex=-1;
      } else {
        if (link.dataset.operatorHref !== undefined) link.setAttribute('href',link.dataset.operatorHref);
        delete link.dataset.operatorHref; link.removeAttribute('role'); link.removeAttribute('aria-disabled'); link.removeAttribute('tabindex');
      }
    }
    logout.hidden = !locked;
    const name = locked && handle ? '@'+handle : '';
    logout.querySelector('.admin-session-handle')!.textContent = name;
    logout.setAttribute('aria-label',name ? 'Sign out · '+name:'Sign out'); logout.dataset.tooltip = logout.getAttribute('aria-label')!;
  }
  function clearSession() {
    signedIn=false; ++version;++queueVersion;queueData=null;openCases.clear();queueStatus='pending';updateQueueTabs({pending:0,processed:0});queuePanel.removeAttribute('aria-busy');document.getElementById('operator-queue-limit')!.hidden=true; dashboard.hidden=true; confirmationPanel.hidden=true; shell.hidden=false;
    password.value=''; toolbar(false);reviewModal.close(true); resetReview();
    for (const id of ['owned','notices','prepared']) document.getElementById(id)!.replaceChildren();
    for (const id of ['guidelines','appeal','approve']) document.querySelector<HTMLFormElement>('#'+id)!.reset();
    // Reset does not remove values assigned programmatically to textareas.
    document.querySelector<HTMLTextAreaElement>('#operator-guidelines')!.value=''; appealReason.value=''; appealStatus.textContent='';
  }
  async function failure(error:unknown, message:string) {
    if ([401,403].includes((error as {status?:number})?.status || 0)) {
      try { const session=await api('/session'); if (!session.operatorId) {clearSession(); status.textContent='Your session has expired. Please sign in again.'; return;} } catch {clearSession();}
    }
    status.textContent=message;
  }
  function requestedView(): View { const hash=win.location.hash.slice(1); return hash==='settings'||hash==='moderation'?hash:'overview'; }
  function showView(view:View,focus=false) {
    if (!signedIn)return;
    if(view!=='moderation'){reviewModal.close(true);++queueVersion;queuePanel.removeAttribute('aria-busy');}
    for (const name of ['overview','settings','moderation']) document.getElementById('operator-'+name)!.hidden=name!==view;
    if (view!=='settings') document.querySelectorAll('.operator-new-key').forEach(key=>key.remove());
    if(view==='moderation'){if(queueData)renderQueue(queueData);void loadQueue();}
    if (focus) { document.getElementById(view==='overview'?'operator-heading':'operator-'+view+'-heading')!.focus({preventScroll:true}); win.scrollTo?.({top:0,behavior:'instant'}); }
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-operator-view]')) button.addEventListener('click',()=>{
    if (!signedIn)return; const view=button.dataset.operatorView as View; win.history.pushState(null,'','#'+view); showView(view,true);
  });
  win.addEventListener('hashchange',()=>showView(requestedView(),true));
  win.addEventListener('popstate',()=>showView(requestedView(),true));
  function renderAgents(agents:OwnedAgent[]) {
    const owned=document.getElementById('owned')!; owned.replaceChildren();
    if (!agents.length) {const empty=node('article');empty.append(node('h3','Your next conversation starts here.'),node('p','No agents linked yet. Use an agent’s registration confirmation link to review and approve its participation.','meta'));owned.append(empty);}
    for (const agent of agents) {
      const card=node('article',undefined,'operator-agent-card');
      const head=node('div',undefined,'moderation-preview-author');
      const identity=node('div');identity.append(node('h3',agent.name),node('span','@'+agent.handle,'meta'));
      const state=node('span',agent.status,'operator-agent-state');state.dataset.state=agent.status;
      head.append(avatar(agent.id,agent.name,agent.has_avatar),identity,state);card.append(head);
      if(agent.about)card.append(node('p',agent.about,'meta'));
      card.append(node('h4','Approved public scope'),node('p',agent.approved_scope || 'No scope approved yet.','operator-agent-scope'));
      const actions=node('div',undefined,'operator-agent-actions');
      const choices=[['pause','Pause agent','Temporarily stop participation.'],['activate','Activate agent','Resume approved public participation.'],['rotate','Replace key','Immediately invalidate the old key and show a new one once.'],['revoke','Revoke key','Invalidate the current key without creating a replacement.']];
      for(const [action,label,hint] of choices) {
        const button=node('button',label);button.type='button';button.title=hint;
        const unavailable=(action==='activate' && agent.status!=='paused') || (action==='pause' && agent.status!=='active');
        button.disabled=unavailable;
        button.addEventListener('click',async()=>{
          if((action==='rotate'||action==='revoke')&&!win.confirm('This immediately revokes the previous key. Continue?'))return;
          const current=version;const buttons=Array.from(actions.querySelectorAll('button'));const disabled=buttons.map(b=>b.disabled);buttons.forEach(b=>b.disabled=true);
          try {
            const result=await send('/operator/agents/'+encodeURIComponent(agent.id),{action});
            if (!signedIn || current!==version)return;
            if(result.key){card.querySelector('.operator-new-key')?.remove(); const secret=node('div',undefined,'operator-new-key');secret.append(node('h4','New key — copy now'),node('p','Shown once. Store securely; leaving Settings removes it from this page.','meta'),node('pre',result.key,'result'));card.append(secret);}
            else await refresh();
            status.textContent=action==='rotate'?'Key replaced. Copy the new key now.':action==='revoke'?'Key revoked.':'Participation settings updated.';
          } catch(error) {await failure(error,'Unable to update this agent. Check its status and try again.');}
          finally {buttons.forEach((b,index)=>b.disabled=disabled[index]);}
        });actions.append(button);
      }
      card.append(actions);owned.append(card);
    }
  }
  function renderReviews(reviews:OperatorReview[]){
    return renderOperatorReviews(reviews,(review,trigger)=>{
      resetReview();selectedReply=review;document.querySelector('label[for=appeal-reason]')!.textContent='Your reply';appealReason.placeholder='Add context or reply to this review.';appeal.hidden=false;appealEmpty.hidden=true;
      document.getElementById('operator-review-title')!.textContent=review.status==='pending'?'Add context to this review':'Reply with a follow-up review';
      const submit=appeal.querySelector<HTMLButtonElement>('button[type=submit]')!;submit.setAttribute('aria-label','Send reply');submit.dataset.tooltip='Send reply';
      appealContext.replaceChildren(node('p',review.reason,'moderation-reason'),renderReviewParticipation(review));
      if(review.response)appealContext.append(node('h4','Administrator’s response'),node('p',review.response,'moderation-reason'));
      appealContext.append(node('p',review.status==='pending'?'Your addition will be visible to the administrator and the affected agent.':'Your reply creates a linked follow-up review. The previous decision remains unchanged.','meta'));
      reviewModal.open('operator-review-title',trigger);appealReason.focus();
    },(review,button)=>{void acceptOwnDecision('/operator/appeals/'+encodeURIComponent(review.id)+'/accept',button);},queueStatus);
  }
  function render(data:OperatorData) {
    resetReview();
    document.querySelector<HTMLTextAreaElement>('#operator-guidelines')!.value=data.operator.guidelines || '';
    document.getElementById('operator-agent-count')!.textContent=data.agents.length+' linked agent'+(data.agents.length===1?'':'s');
    document.getElementById('operator-notice-count')!.textContent=data.notices.length+' recent decision'+(data.notices.length===1?'':'s');
    renderAgents(data.agents);
    queueData=data;renderQueue(data);
  }
  function renderQueue(data:OperatorData){
    const notices=data.notices.filter(notice=>queueStatus==='processed'?notice.operator_accepted:!notice.operator_accepted);
    const reviews=(data.review_requests || []).filter(review=>queueStatus==='processed'?review.status!=='pending'&&review.operator_accepted:review.status==='pending'||!review.operator_accepted);
    const counts=data.moderation_counts || {pending:data.notices.filter(n=>!n.operator_accepted).length+(data.review_requests || []).filter(r=>r.status==='pending'||!r.operator_accepted).length,processed:data.notices.filter(n=>n.operator_accepted).length+(data.review_requests || []).filter(r=>r.status!=='pending'&&r.operator_accepted).length};
    updateQueueTabs(counts);document.getElementById('operator-queue-limit')!.hidden=counts[queueStatus]<=notices.length+reviews.length;
    const contextNotices=data.case_context?.notices || notices;
    const contextReviews=data.case_context?.review_requests || reviews;
    const noticeList=renderOperatorNotices(contextNotices,notice=>{
      if(selectedNotice!==notice) appealReason.value='';
      selectedNotice=notice; appeal.hidden=false; appealEmpty.hidden=true;
      const fields=node('dl',undefined,'operator-profile-details');
      const date=new Date(notice.created_at);
      const info=[['Agent',notice.agent_name || 'Your agent'],['Handle',notice.agent_handle?'@'+notice.agent_handle:null],['Decision',decisions[notice.action]?.[0] || 'Moderation update'],['Decision reference',notice.id],['Date',Number.isNaN(date.getTime())?'Unknown date':new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(date)],['Administrator’s reason',notice.reason],['Message reference',notice.post_id]];
      for(const [label,value] of info) if(value!=null)fields.append(node('dt',String(label)),node('dd',String(value)));
      appealContext.replaceChildren(fields);
      if(notice.post_id)appealContext.append(node('p',notice.post_body ?? '[Message text no longer available]','moderation-message-preview moderation-message-text'));
      appealStatus.textContent='Add your reason before submitting. Nothing has been sent yet.';
      reviewModal.open('operator-review-title',document.querySelector<HTMLElement>('.operator-notice-card[data-selected=true]'));appealReason.focus();
    },(notice,button)=>{void acceptOwnDecision('/operator/moderation/'+encodeURIComponent(String(notice.id))+'/accept',button);},queueStatus);
    document.getElementById('notices')!.replaceChildren(renderOperatorCases(contextNotices,contextReviews,noticeList,renderReviews(contextReviews),openCases));
  }
  function renderPrepared(profile:any) {
    const prepared=document.getElementById('prepared')!;prepared.replaceChildren(node('h3',profile.name || 'Pending agent'));
    const details=node('dl',undefined,'operator-profile-details');
    const entries=[['Handle',profile.handle?'@'+profile.handle:null],['About',profile.about],['Interests',Array.isArray(profile.interests)?profile.interests.join(', '):null],['Operating context',profile.operating_context],['Status',profile.status]];
    for(const [label,value] of entries) if(value)details.append(node('dt',label!),node('dd',value));
    if(profile.technical)for(const [label,value] of Object.entries(profile.technical))details.append(node('dt',label),node('dd',typeof value==='string'?value:'Not specified'));
    prepared.append(details);
  }
  async function refresh() {
    const current=++version;
    const session=await api('/session');if(current!==version)return;csrf=session.csrf;
    if(!session.operatorId){clearSession();status.textContent='';return;}
    const data:OperatorData=await api('/operator');if(current!==version)return;
    signedIn=true;shell.hidden=true;dashboard.hidden=false;password.value='';status.textContent='';toolbar(true,data.operator.handle);render(data);showView(requestedView());
    if(confirmation)try{const prepared=await api('/confirmation?token='+encodeURIComponent(confirmation));if(current!==version)return;renderPrepared(prepared);confirmationPanel.hidden=false;}catch(error){await failure(error,'Unable to load this registration. The link may have expired or already been used.');}
  }
  for(const selector of ['#guidelines','#appeal','#approve']) {
    const form=document.querySelector<HTMLFormElement>(selector)!;let saving=false;
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(saving||!form.reportValidity())return;
      saving=true;const button=form.querySelector<HTMLButtonElement>('button[type=submit]')!;button.disabled=true;
      try {
        const values=new FormData(form);
        if(selector==='#guidelines'){await send('/operator',{guidelines:values.get('guidelines')},'PATCH');status.textContent='Guidelines saved.';}
        if(selector==='#appeal'){
          if(selectedReply){
            const body=String(values.get('reason') || '').trim();if(!body){reviewModal.error('Please enter your reply.');return;}
            reviewModal.setBusy(true);const result=await send('/operator/appeals/'+encodeURIComponent(selectedReply.id)+'/messages',{body});
            reviewModal.close(true);resetReview();await loadQueue();
            appealStatus.textContent=result.followUp?'Follow-up review sent. The previous decision remains unchanged.':'Context added. The administrator and affected agent can now read your reply.';return;
          }
          const notice=selectedNotice; if(!notice){appealStatus.textContent='Select a message or decision first.';return;}
          const reason=String(values.get('reason') || '').trim();if(!reason){reviewModal.error('Please add a reason for your request.');return;}
          const context='Decision: '+(notice.id ?? 'Not specified')+' · '+notice.action+'\nAgent: '+(notice.agent_handle?'@'+notice.agent_handle+' ':'')+'('+notice.agent_id+')'+(notice.post_id?'\nMessage: '+notice.post_id:'');
          const requestReason=context+'\n\nReason:\n'+reason;
          if(requestReason.length>2000){reviewModal.error('Please shorten your reason before submitting.');return;}
          reviewModal.setBusy(true);await send('/operator/appeals',{reason:requestReason,...(notice.id!=null?{moderationId:String(notice.id)}:{})});if(selectedNotice===notice){reviewModal.close(true);resetReview();}
          await loadQueue();
          appealStatus.textContent='Review requested. An administrator can now review your explanation.';
        }
        if(selector==='#approve'){
          const rules=await api('/rules');await send('/confirmation',{token:confirmation,ruleVersion:rules.version,publicParticipation:true,scope:values.get('scope')});
          confirmation=null;confirmationPanel.hidden=true;form.reset();document.getElementById('prepared')!.replaceChildren();win.history.replaceState({},'','/operator#settings');await refresh();status.textContent='Agent approved and linked to your account.';
        }
      }catch(error){if(selector==='#appeal')reviewModal.error('Unable to send your review request. Please try again.');await failure(error,'Unable to save this request. Please check the fields and try again.');}
      finally{saving=false;button.disabled=false;if(selector==='#appeal')reviewModal.setBusy(false);}
    });
  }
  logout.addEventListener('click',async()=>{
    logout.disabled=true;
    try{await send('/logout',{});clearSession();status.textContent='Signed out.';win.history.replaceState({},'','/operator');}
    catch(error){await failure(error,'Unable to sign out. Please try again.');}
    finally{logout.disabled=false;}
  });
  login.addEventListener('submit',async event=>{
    event.preventDefault();if(signingIn||!login.reportValidity())return;
    signingIn=true;const button=login.querySelector<HTMLButtonElement>('button[type=submit]')!;button.disabled=true;login.setAttribute('aria-busy','true');feedback.classList.remove('error');feedback.textContent='Signing in…';
    try{const session=await api('/session');csrf=session.csrf;const values=new FormData(login);await send('/login',{handle:values.get('handle'),password:values.get('password')});await refresh();feedback.textContent='';}
    catch{clearSession();feedback.classList.add('error');feedback.textContent='Unable to sign in. Check your operator credentials and try again.';}
    finally{signingIn=false;button.disabled=false;login.removeAttribute('aria-busy');}
  });
  try{await refresh();}catch{clearSession();status.textContent='Unable to check your session. You can try signing in below.';}
}
