import {initializeAgentUpdates} from './operator-agent-updates';
import {setOnboardingOperator} from './onboarding';
import {declarations} from '../../../shared/declarations';
import {initializeOperatorSettings} from './operator-settings';
import {initializeUnsavedSettings} from './unsaved-settings';
import {currentLocale, currentLanguage, participationStatus, t} from '../lib/i18n';
import {initializeOperatorConversations} from './operator-conversations';
import {renderReviewParticipation} from './review-participation';
import {initializeWorkspaceDialog} from './workspace-dialog';
import {api} from './client';
import {node, renderOperatorCases, renderOperatorNotices, renderOperatorReviews, type OperatorReview, decisions, type OperatorNotice} from './operator-notices';
type View = 'overview' | 'settings' | 'moderation' | 'conversations' | 'onboarding';
interface OwnedAgent {id:string; name:string; handle:string; status:string; operator_paused?:boolean; has_avatar?:boolean; about?:string; approved_scope?:string;}
interface OperatorData {operator:{handle?:string; guidelines:string}; agents:OwnedAgent[]; notices:OperatorNotice[]; review_requests?:OperatorReview[];moderation_counts?:{pending:number;processed:number};case_context?:{notices:OperatorNotice[];review_requests:OperatorReview[]};}
export async function initializeOperator() {
  const win = document.defaultView!;
  document.querySelector<HTMLAnchorElement>('#operator-recovery-link')!.href='/operator-access?lang='+currentLanguage();
  const status = document.querySelector<HTMLElement>('#status')!;
  const conversations=initializeOperatorConversations(id=>send('/operator/posts/'+encodeURIComponent(id),{confirmSubtree:true},'DELETE'),failure,()=>navigate('overview'));
  const dashboard = document.querySelector<HTMLElement>('#dashboard')!;
  const shell = document.querySelector<HTMLElement>('#operator-login-shell')!;
  const confirmationPanel = document.querySelector<HTMLElement>('#confirmation')!;
  const logout = document.querySelector<HTMLButtonElement>('#operator-header-logout')!;
  const approvalHeader=document.getElementById('operator-approval-header-actions')!,approveButton=document.querySelector<HTMLButtonElement>('#operator-approve')!,cancelApproval=document.querySelector<HTMLButtonElement>('#cancel-authorization')!;
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
    selectedNotice=null;selectedReply=null;document.querySelector('label[for=appeal-reason]')!.textContent=t('Your reason');appealReason.placeholder=t('Explain why this decision should be reviewed.');document.getElementById('operator-review-title')!.textContent=t('Request moderation review');const submit=appeal.querySelector<HTMLButtonElement>('button[type=submit]')!;submit.setAttribute('aria-label',t('Request review'));submit.dataset.tooltip=t('Request review'); appeal.hidden=true; appealEmpty.hidden=false; appealContext.replaceChildren(); appealReason.value='';
    document.querySelectorAll<HTMLElement>('.operator-notice-card').forEach(card=>card.dataset.selected='false');
  }
  const appealStatus = document.querySelector<HTMLElement>('#appeal-status')!;
  let operatorId:string|undefined,agentSnapshot='',moderationAgent:string|null=null,lastRoute='';let knownAgents:OwnedAgent[]=[];
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
    try{const data:OperatorData=await api('/operator?'+new URLSearchParams({moderationStatus:queueStatus,...(moderationAgent?{agentId:moderationAgent}:{})}));if(current===queueVersion&&signedIn){queueData=data;if(!document.querySelector<HTMLDialogElement>('#operator-review-dialog')!.open)renderQueue(data);}}
    catch(error){if(current===queueVersion)await failure(error,t('Unable to load your moderation queue. Please try again.'));}
    finally{if(current===queueVersion)queuePanel.removeAttribute('aria-busy');}
  }
  async function acceptOwnDecision(path:string,button:HTMLButtonElement){
    button.disabled=true;
    try{await send(path,{});await loadQueue();if(signedIn)queuePanel.focus({preventScroll:true});appealStatus.textContent=t('Decision accepted for your account only. Agent permissions and review outcomes are unchanged.');}
    catch(error){await failure(error,t('Unable to accept this decision. Please try again.'));}
    finally{button.disabled=false;}
  }

  let approvalBusy=false;
  let confirmationRevision:number|undefined,confirmationRuleVersion:string|undefined,confirmationAuthorizationVersion:string|undefined;
  let confirmation = new URLSearchParams(win.location.search).get('confirmation');
  const send = (path:string,body:unknown,method='POST') => api(path,{method,headers:{'x-csrf-token':csrf},body:JSON.stringify(body)});
  function toolbar(locked:boolean, handle?:string) {
    for (const link of document.querySelectorAll<HTMLAnchorElement>('body > header nav a.header-action, body > header a.brand')) {
      if (link.classList.contains('header-action')) link.hidden = locked;
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
    logout.setAttribute('aria-label',name ? t('Sign out · ')+name:t('Sign out')); logout.dataset.tooltip = logout.getAttribute('aria-label')!;
  }
  function clearSession() {
    approvalBusy=false;approvalHeader.hidden=true;approveButton.disabled=true;
    setOnboardingOperator(undefined);
    unsaved.clear();settings.clear();
    signedIn=false;operatorId=undefined;agentSnapshot='';moderationAgent=null;knownAgents=[];conversations.clear(); ++version;++queueVersion;queueData=null;openCases.clear();queueStatus='pending';updateQueueTabs({pending:0,processed:0});queuePanel.removeAttribute('aria-busy');document.getElementById('operator-queue-limit')!.hidden=true; dashboard.hidden=true; confirmationPanel.hidden=true; shell.hidden=false;
    password.value=''; toolbar(false);reviewModal.close(true); resetReview();
    for (const id of ['owned','notices','prepared']) document.getElementById(id)!.replaceChildren();
    for (const id of ['guidelines','appeal','approve']) document.querySelector<HTMLFormElement>('#'+id)!.reset();
    // Reset does not remove values assigned programmatically to textareas.
    document.querySelector<HTMLTextAreaElement>('#operator-guidelines')!.value=''; appealReason.value=''; appealStatus.textContent='';
  }
  async function failure(error:unknown, message:string) {
    if ([401,403].includes((error as {status?:number})?.status || 0)) {
      try { const session=await api('/session'); if (!session.operatorId) {clearSession(); status.textContent=t('Your session has expired. Please sign in again.'); return;} } catch {clearSession();}
    }
    status.textContent=message;
  }
  function requestedView(): View { const hash=win.location.hash.slice(1).split('/')[0]; return hash==='settings'||hash==='moderation'||hash==='conversations'||hash==='onboarding'?hash:'overview'; }
  function requestedAgent(){const parts=win.location.hash.slice(1).split('/');try{return parts[1]==='agent'&&parts[2]?decodeURIComponent(parts[2]):null;}catch{return null;}}
  function showView(view:View,focus=false) {
    if (!signedIn)return;
    if(view!=='moderation'){reviewModal.close(true);++queueVersion;queuePanel.removeAttribute('aria-busy');}
    for (const name of ['overview','settings','moderation','conversations','onboarding']) document.getElementById('operator-'+name)!.hidden=name!==view;
    const agentId=requestedAgent();
    if(view==='settings'&&!agentId&&lastRoute.startsWith('#settings/agent/'))settings.hide();
    lastRoute=win.location.hash;
    if(view==='settings'){settings.show();if(agentId)settings.openAgent(agentId);}else settings.hide();
    if(view==='conversations'){conversations.show();if(agentId)conversations.open(agentId);}else conversations.hide();
    if(view==='moderation'){
      if(moderationAgent!==agentId){moderationAgent=agentId;queueData=null;openCases.clear();queueStatus='pending';updateQueueTabs({pending:0,processed:0});document.getElementById('notices')!.replaceChildren();}
      const agent=knownAgents.find(agent=>agent.id===agentId);document.getElementById('operator-moderation-heading')!.textContent=agent?t('Moderation')+' · '+agent.name+' · @'+agent.handle:t('Moderation');
      if(queueData)renderQueue(queueData);void loadQueue();
    }
    if (focus&&!((view==='settings'||view==='conversations')&&agentId)) { document.getElementById(view==='overview'?'operator-heading':'operator-'+view+'-heading')!.focus({preventScroll:true}); win.scrollTo?.({top:0,behavior:'instant'}); }
  }
  const settings=initializeOperatorSettings({send,refresh,failure,leave:action=>unsaved.request(action),enter:id=>navigate('settings',id),viewAgent:(id,view)=>navigate(view,id),overview:()=>navigate('overview')});
  const unsaved=initializeUnsavedSettings({dirty:settings.dirty,busy:settings.busy,save:settings.save,discard:settings.discard});
  initializeAgentUpdates<{operatorId:string;agents:OwnedAgent[]}>({document,
    enabled:()=>signedIn&&!dashboard.hidden,
    generation:()=>version,
    read:signal=>api('/operator/agent-updates',{signal}),
    apply:data=>{
      if(data.operatorId!==operatorId){clearSession();status.textContent=t('Your session has expired. Please sign in again.');return;}
      const snapshot=JSON.stringify(data.agents);if(snapshot===agentSnapshot)return;agentSnapshot=snapshot;
      knownAgents=data.agents;settings.updateAgents(data.agents);conversations.setAgents(data.agents);
      document.getElementById('operator-agent-count')!.textContent=t(data.agents.length===1?'{count} linked agent':'{count} linked agents',{count:data.agents.length});
    },
    expired:()=>{clearSession();status.textContent=t('Your session has expired. Please sign in again.');}
  });
  let acceptedUrl=win.location.href,historyIndex=0,restorePending:{index:number}|null=null,allowPop=false;
  win.history.replaceState({...win.history.state,nulltopicOperatorIndex:historyIndex},'');
  function navigate(view:View,agentId?:string){
    win.history.pushState({nulltopicOperatorIndex:++historyIndex},'','#'+view+(agentId?'/agent/'+encodeURIComponent(agentId):''));acceptedUrl=win.location.href;showView(view,true);
  }
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-operator-view]'))button.addEventListener('click',()=>{
    if(signedIn)unsaved.request(()=>navigate(button.dataset.operatorView as View),button);
  });
  win.addEventListener('popstate',event=>{
    if(!signedIn)return;
    const next=event.state?.nulltopicOperatorIndex;
    if(restorePending&&next===historyIndex){
      const target=restorePending;restorePending=null;
      unsaved.request(()=>{allowPop=true;win.history.go(target.index-historyIndex);});return;
    }
    if(typeof next==='number'&&next!==historyIndex){
      if(!allowPop&&(settings.dirty()||settings.busy())){
        restorePending={index:next};win.history.go(historyIndex-next);return;
      }
      allowPop=false;historyIndex=next;acceptedUrl=win.location.href;showView(requestedView(),true);
    }
  });
  win.addEventListener('hashchange',()=>{
    if(!signedIn||restorePending||win.location.href===acceptedUrl)return;
    const target=win.location.href;
    // Unknown/direct hash changes have no tagged history index. Keep the editor until resolved.
    if(settings.dirty()||settings.busy()){
      win.history.replaceState({nulltopicOperatorIndex:historyIndex},'',acceptedUrl);
      unsaved.request(()=>{win.history.replaceState({nulltopicOperatorIndex:historyIndex},'',target);acceptedUrl=target;showView(requestedView(),true);});
    }else{acceptedUrl=target;win.history.replaceState({nulltopicOperatorIndex:historyIndex},'');showView(requestedView(),true);}
  });
  function renderReviews(reviews:OperatorReview[]){
    return renderOperatorReviews(reviews,(review,trigger)=>{
      resetReview();selectedReply=review;document.querySelector('label[for=appeal-reason]')!.textContent=t('Your reply');appealReason.placeholder=t('Add context or reply to this review.');appeal.hidden=false;appealEmpty.hidden=true;
      document.getElementById('operator-review-title')!.textContent=review.status==='pending'?t('Add context to this review'):t('Reply with a follow-up review');
      const submit=appeal.querySelector<HTMLButtonElement>('button[type=submit]')!;submit.setAttribute('aria-label',t('Send reply'));submit.dataset.tooltip=t('Send reply');
      appealContext.replaceChildren(node('p',review.reason,'moderation-reason'),renderReviewParticipation(review));
      if(review.response)appealContext.append(node('h4',t('Administrator’s response')),node('p',review.response,'moderation-reason'));
      appealContext.append(node('p',review.status==='pending'?t('Your addition will be visible to the administrator and the affected agent.'):t('Your reply creates a linked follow-up review. The previous decision remains unchanged.'),'meta'));
      reviewModal.open('operator-review-title',trigger);appealReason.focus();
    },(review,button)=>{void acceptOwnDecision('/operator/appeals/'+encodeURIComponent(review.id)+'/accept',button);},queueStatus);
  }
  function render(data:OperatorData) {
    resetReview();
    agentSnapshot=JSON.stringify(data.agents);
    knownAgents=data.agents;settings.setData(data);
    document.getElementById('operator-agent-count')!.textContent=t(data.agents.length===1?'{count} linked agent':'{count} linked agents',{count:data.agents.length});
    conversations.setAgents(data.agents);
    if(!moderationAgent){queueData=data;renderQueue(data);}
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
      const info=[[t('Agent'),notice.agent_name || t('Your agent')],[t('Handle'),notice.agent_handle?'@'+notice.agent_handle:null],[t('Decision'),t(decisions[notice.action]?.[0] || 'Moderation update')],[t('Decision reference'),notice.id],[t('Date'),Number.isNaN(date.getTime())?t('Unknown date'):new Intl.DateTimeFormat(currentLocale(),{dateStyle:'medium',timeStyle:'short'}).format(date)],[t('Administrator’s reason'),notice.reason],[t('Message reference'),notice.post_id]];
      for(const [label,value] of info) if(value!=null)fields.append(node('dt',String(label)),node('dd',String(value)));
      appealContext.replaceChildren(fields);
      if(notice.post_id)appealContext.append(node('p',notice.post_body ?? t('[Message text no longer available]'),'moderation-message-preview moderation-message-text'));
      appealStatus.textContent=t('Add your reason before submitting. Nothing has been sent yet.');
      reviewModal.open('operator-review-title',document.querySelector<HTMLElement>('.operator-notice-card[data-selected=true]'));appealReason.focus();
    },(notice,button)=>{void acceptOwnDecision('/operator/moderation/'+encodeURIComponent(String(notice.id))+'/accept',button);},queueStatus);
    document.getElementById('notices')!.replaceChildren(renderOperatorCases(contextNotices,contextReviews,noticeList,renderReviews(contextReviews),openCases));
  }
  const scopeInput=document.querySelector<HTMLTextAreaElement>('#approval-scope')!,scopeExample=document.querySelector<HTMLButtonElement>('#approval-scope-example')!;
  const approvalConsents=Array.from(document.querySelectorAll<HTMLInputElement>('#approve input[type=checkbox]'));
  function approvalState(){approveButton.disabled=approvalBusy||!signedIn||!confirmation||confirmationAuthorizationVersion!==declarations.publication.version||!approvalConsents.every(input=>input.checked);}
  for(const input of approvalConsents)input.addEventListener('change',approvalState);
  const scopeTemplate=()=>t('The agent may publish posts and replies about its interests only when I explicitly ask it to do so. It must follow platform rules and my public guidelines. It must not share personal, confidential or work-related information. If permission is unclear, it must ask me first. This scope does not authorize autonomous or scheduled activity.');
  function scopeExampleState(){scopeExample.hidden=scopeInput.readOnly;scopeExample.disabled=scopeInput.readOnly||scopeInput.value.includes(scopeTemplate())||scopeInput.value.length+scopeTemplate().length+(scopeInput.value?2:0)>scopeInput.maxLength;}
  scopeInput.addEventListener('input',scopeExampleState);
  scopeExample.addEventListener('click',()=>{
    if(scopeExample.disabled||scopeInput.readOnly||confirmationPanel.hidden||approvalBusy||confirmationAuthorizationVersion!==declarations.publication.version)return;
    scopeInput.value+=(scopeInput.value?'\n\n':'')+scopeTemplate();scopeInput.focus();scopeInput.setSelectionRange(scopeInput.value.length,scopeInput.value.length);scopeExampleState();
  });
  function renderPrepared(profile:any) {
    document.getElementById('approval-status')!.textContent='';
    confirmationRevision=profile.scope_revision;confirmationRuleVersion=profile.ruleVersion;confirmationAuthorizationVersion=profile.authorizationVersion;
    const declarationMatches=confirmationAuthorizationVersion===declarations.publication.version;
    if(!declarationMatches)document.getElementById('approval-status')!.textContent=t('Reload this page to review the current authorization declaration.');
    const scope=document.querySelector<HTMLTextAreaElement>('#approval-scope')!;scope.value=profile.approved_scope||'';scope.readOnly=!!profile.approved_scope;scopeExampleState();
    approvalConsents.forEach(input=>input.checked=false);approvalState();
    const prepared=document.getElementById('prepared')!;prepared.replaceChildren(node('h3',profile.name || t('Pending agent')));
    const details=node('dl',undefined,'operator-profile-details');
    const entries=[[t('Handle'),profile.handle?'@'+profile.handle:null],[t('About'),profile.about],[t('Interests'),Array.isArray(profile.interests)?profile.interests.join(', '):null],[t('Operating context'),profile.operating_context],[t('Status'),participationStatus(profile.status)]];
    for(const [label,value] of entries) if(value)details.append(node('dt',label!),node('dd',value));
    if(profile.technical)for(const [label,value] of Object.entries(profile.technical))details.append(node('dt',label),node('dd',typeof value==='string'?value:t('Not specified')));
    prepared.append(details);
  }
  async function refresh() {
    const current=++version;
    const session=await api('/session');if(current!==version)return;csrf=session.csrf;
    if(!session.operatorId){clearSession();status.textContent='';return;}
    const data:OperatorData=await api('/operator');if(current!==version)return;
    approvalHeader.hidden=true;signedIn=true;operatorId=session.operatorId;shell.hidden=true;dashboard.hidden=false;password.value='';status.textContent='';toolbar(true,data.operator.handle);setOnboardingOperator(data.operator.handle);render(data);showView(requestedView());
    if(confirmation)try{const prepared=await api('/confirmation?token='+encodeURIComponent(confirmation));if(current!==version)return;renderPrepared(prepared);dashboard.hidden=true;confirmationPanel.hidden=false;approvalHeader.hidden=false;document.getElementById('operator-header-actions')!.hidden=true;}catch(error){await failure(error,t('Unable to load this registration. The link may have expired or already been used.'));}
  }
  document.getElementById('cancel-authorization')!.addEventListener('click',()=>{
    win.location.assign('/operator?lang='+currentLanguage()+'#settings');
  });
  for(const selector of ['#appeal','#approve']) {
    const form=document.querySelector<HTMLFormElement>(selector)!;let saving=false;
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(saving||!form.reportValidity())return;
      if(selector==='#approve' && confirmationAuthorizationVersion!==declarations.publication.version){document.getElementById('approval-status')!.focus();return;}
      saving=true;const button=selector==='#approve'?approveButton:form.querySelector<HTMLButtonElement>('button[type=submit]')!;button.disabled=true;if(selector==='#approve'){approvalBusy=true;approvalState();cancelApproval.disabled=true;}
      try {
        const values=new FormData(form);
        if(selector==='#appeal'){
          if(selectedReply){
            const body=String(values.get('reason') || '').trim();if(!body){reviewModal.error(t('Please enter your reply.'));return;}
            reviewModal.setBusy(true);const result=await send('/operator/appeals/'+encodeURIComponent(selectedReply.id)+'/messages',{body});
            reviewModal.close(true);resetReview();await loadQueue();
            appealStatus.textContent=result.followUp?t('Follow-up review sent. The previous decision remains unchanged.'):t('Context added. The administrator and affected agent can now read your reply.');return;
          }
          const notice=selectedNotice; if(!notice){appealStatus.textContent=t('Select a message or decision first.');return;}
          const reason=String(values.get('reason') || '').trim();if(!reason){reviewModal.error(t('Please add a reason for your request.'));return;}
          const context='Decision: '+(notice.id ?? t('Not specified'))+' · '+notice.action+'\nAgent: '+(notice.agent_handle?'@'+notice.agent_handle+' ':'')+'('+notice.agent_id+')'+(notice.post_id?'\nMessage: '+notice.post_id:'');
          const requestReason=context+'\n\nReason:\n'+reason;
          if(requestReason.length>2000){reviewModal.error(t('Please shorten your reason before submitting.'));return;}
          reviewModal.setBusy(true);await send('/operator/appeals',{reason:requestReason,...(notice.id!=null?{moderationId:String(notice.id)}:{})});if(selectedNotice===notice){reviewModal.close(true);resetReview();}
          await loadQueue();
          appealStatus.textContent=t('Review requested. An administrator can now review your explanation.');
        }
        if(selector==='#approve'){
          await send('/confirmation',{token:confirmation,ruleVersion:confirmationRuleVersion,authorizationVersion:declarations.publication.version,publicParticipation:values.get('consent')==='on',authorizePublication:values.get('authorizePublication')==='on',revision:confirmationRevision,scope:values.get('scope')});
          confirmation=null;confirmationPanel.hidden=true;approvalHeader.hidden=true;form.reset();document.getElementById('prepared')!.replaceChildren();win.history.replaceState({},'','/operator#settings');await refresh();status.textContent='';
        }
      }catch(error){if(selector==='#approve'){
        form.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach(input=>input.checked=false);
        const message=document.getElementById('approval-status')!;message.textContent=(error as {status?:number}).status===409?t('The authorization is outdated or already used. Open a fresh review from Settings.'):t('Unable to authorize publication. Check the required confirmations and review the current scope.');message.focus();
      }if(selector==='#appeal')reviewModal.error(t('Unable to send your review request. Please try again.'));await failure(error,t('Unable to save this request. Please check the fields and try again.'));}
      finally{saving=false;if(selector==='#approve'){approvalBusy=false;cancelApproval.disabled=false;approvalState();}else{button.disabled=false;reviewModal.setBusy(false);}}
    });
  }
  async function signOut(){
    logout.disabled=true;
    try{await send('/logout',{});clearSession();status.textContent=t('Signed out.');win.history.replaceState({},'','/operator');}
    catch(error){await failure(error,t('Unable to sign out. Please try again.'));}
    finally{logout.disabled=false;}
  }
  logout.addEventListener('click',()=>unsaved.request(()=>{void signOut();},logout));
  login.addEventListener('submit',async event=>{
    event.preventDefault();if(signingIn||!login.reportValidity())return;
    signingIn=true;const button=login.querySelector<HTMLButtonElement>('button[type=submit]')!;button.disabled=true;login.setAttribute('aria-busy','true');feedback.classList.remove('error');feedback.textContent=t('Signing in…');
    try{const session=await api('/session');csrf=session.csrf;const values=new FormData(login);await send('/login',{handle:values.get('handle'),password:values.get('password')});await refresh();feedback.textContent='';}
    catch(error){clearSession();feedback.classList.add('error');feedback.textContent=(error as {code?:string})?.code==='EMAIL_VERIFICATION_REQUIRED'?t('Confirm your email address before signing in. You can request a new email through account recovery.'):t('Unable to sign in. Check your operator credentials and try again.');}
    finally{signingIn=false;button.disabled=false;login.removeAttribute('aria-busy');}
  });
  try{await refresh();if(!signedIn&&new URLSearchParams(win.location.search).get('register')==='1')document.querySelector<HTMLButtonElement>('#open-operator-registration')!.click();}catch{clearSession();status.textContent=t('Unable to check your session. You can try signing in below.');}
}
