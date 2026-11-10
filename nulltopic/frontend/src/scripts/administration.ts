import {initializeStatistics} from './statistics';
import {initializeEmailLogin} from './email-login';
import {renderBackgroundJobs,clearJobDialogs} from './background-jobs';
import {renderCaseRetention,clearCaseRetention} from './case-retention';
import {t,currentLanguage} from '../lib/i18n';
import {renderReviewParticipation} from './review-participation';
import {initializeReviewDecisionPicker} from './review-decision-picker';
import {initializeWorkspaceDialog} from './workspace-dialog';
import {initializeModerationActionPicker} from './moderation-action-picker';
import {renderModerationInbox, type ModerationReport, type ReviewRequest, type ModerationInbox} from './moderation-inbox';
import {api} from './client';
type View = 'overview' | 'users' | 'moderation' | 'retention' | 'jobs' | 'statistics';
type AdminUser = {email?:string|null;id: string; handle: string; is_root: boolean; enabled: boolean};

export async function initializeAdministration() {
  const win = document.defaultView!;
  const status = document.querySelector<HTMLElement>('#status')!;
  const feedback = document.querySelector<HTMLElement>('#login-status')!;
  const shell = document.querySelector<HTMLElement>('#admin-login-shell')!;
  const dashboard = document.querySelector<HTMLElement>('#dashboard')!;
  const login = document.querySelector<HTMLFormElement>('#login')!;
  const submit = login.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const management = document.querySelector<HTMLElement>('#admin-user-management')!;
  const moderation = document.querySelector<HTMLElement>('#admin-moderation')!;
  const retention = document.querySelector<HTMLElement>('#admin-retention');
  const jobs=document.querySelector<HTMLElement>('#admin-jobs');
  const overview = document.querySelector<HTMLElement>('#admin-overview')!;
  const usersStatus = document.querySelector<HTMLElement>('#admin-users-status')!;
  const usersTile = document.querySelector<HTMLButtonElement>('#admin-users-tile')!;
  const logout = document.querySelector<HTMLButtonElement>('#admin-header-logout')!;
  const filter = document.querySelector<HTMLInputElement>('#admin-user-filter')!;
  let csrf = '', signedIn = false, isRoot = false, signingIn = false, creatingUser = false;
  let view: View = 'overview', viewVersion = 0, usersRequest = 0, users: AdminUser[] = [];
  let checkingPermission = false;
  const statistics=initializeStatistics({active:()=>signedIn&&view==='statistics'&&!dashboard.hidden,onError:checkExpired});
  const openCases=new Set<string>();
  let moderationStatus:'pending'|'processed'='pending';
  const tabs=Array.from(document.querySelectorAll<HTMLButtonElement>('[data-moderation-status]'));
  const reportsPanel=document.querySelector<HTMLElement>('#reports')!;
  function updateTabs(counts?:{pending:number;processed:number}){
    for(const tab of tabs){const selected=tab.dataset.moderationStatus===moderationStatus;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;}
    reportsPanel.setAttribute('aria-labelledby','moderation-'+moderationStatus+'-tab');
    if(counts)for(const name of ['pending','processed'] as const)document.getElementById('moderation-'+name+'-count')!.textContent=String(counts[name]);
  }
  for(const tab of tabs){
    tab.addEventListener('click',()=>{if(!signedIn)return;moderationStatus=tab.dataset.moderationStatus as 'pending'|'processed';updateTabs();void showView('moderation');});
    tab.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();
      const index=tabs.indexOf(tab),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
      tabs[next].focus();tabs[next].click();
    });
  }

  let selectedReport: ModerationReport | null = null;
  let selectedReview: ReviewRequest | null = null;
  const reviewForm=document.querySelector<HTMLFormElement>('#review-decision')!;
  const syncReviewPicker=initializeReviewDecisionPicker(document.querySelector<HTMLSelectElement>('#review-outcome')!,document.querySelector<HTMLTextAreaElement>('#review-response')!);
  const modal=initializeWorkspaceDialog(document.querySelector<HTMLDialogElement>('#admin-moderation-dialog')!,()=>{clearReview();actionForm.reset();actionForm.hidden=true;selectedReport=null;selection.hidden=true;});
  function clearReview(){selectedReview=null;reviewForm.reset();reviewForm.hidden=true;document.querySelector('#review-decision-context')!.replaceChildren();}

  const actionForm = document.querySelector<HTMLFormElement>('#action')!;
  const actionType = document.querySelector<HTMLSelectElement>('#action-type')!;
  const actionId = document.querySelector<HTMLInputElement>('#action-id')!;
  const syncActionPicker = initializeModerationActionPicker(actionType, document.querySelector<HTMLTextAreaElement>('#action-reason')!);
  const selection = document.querySelector<HTMLElement>('#moderation-selection')!;
  function selectTarget() {
    if (!selectedReport) return;
    actionId.value = (selectedReport.target_kind!=='agent' && ['hide','dismiss'].includes(actionType.value) ? selectedReport.post_id : selectedReport.agent_id) || '';
    selection.textContent = t('Selected {kind}{agent}. Review or edit the reason before submitting.', {kind:selectedReport.target_kind!=='agent' && ['hide','dismiss'].includes(actionType.value) ? t('Message') : t('Agent'), agent:selectedReport.agent_handle ? ' · @'+selectedReport.agent_handle : ''});
    selection.hidden = false;
  }
  actionType.addEventListener('change', selectTarget);


  const send = (path: string, body: unknown, method = 'POST') => api(path, {
    method, headers: {'x-csrf-token': csrf}, body: JSON.stringify(body),
  });
  function toolbar(locked: boolean, handle?: string) {
    for (const link of document.querySelectorAll<HTMLAnchorElement>('body > header nav a.header-action, body > header a.brand')) {
      if (link.classList.contains('header-action')) link.hidden = locked;
      if (locked) {
        if (link.hasAttribute('href')) link.dataset.adminHref = link.getAttribute('href')!;
        link.removeAttribute('href'); link.setAttribute('role', 'link'); link.setAttribute('aria-disabled', 'true');
        link.setAttribute('tabindex', '-1');
      } else {
        if (link.dataset.adminHref !== undefined) link.setAttribute('href', link.dataset.adminHref);
        delete link.dataset.adminHref;
        link.removeAttribute('aria-disabled'); link.removeAttribute('tabindex'); link.removeAttribute('role');
      }
    }
    const username = locked && handle ? '@' + handle : '';
    logout.querySelector('.admin-session-handle')!.textContent = username;
    const label = username ? t('Sign out · ') + username : t('Sign out');
    logout.setAttribute('aria-label', label);
    logout.dataset.tooltip = label;
    logout.hidden = !locked;
  }
  for (const link of document.querySelectorAll('body > header a')) {
    link.addEventListener('click', event => { if (link.getAttribute('aria-disabled') === 'true') event.preventDefault(); });
  }
  function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    if (className) n.className = className;
    return n;
  }
  function clearPasswords() {
    management.querySelectorAll<HTMLInputElement>('input[type=password]').forEach(input => input.value = '');
  }
  async function checkExpired(error: unknown) {
    if (!checkingPermission && [401, 403].includes((error as {status?: number})?.status || 0)) {
      checkingPermission = true;
      try { await refresh(); }
      catch {
        statistics.clear();
        signedIn = isRoot = false; ++usersRequest; clearPasswords(); toolbar(false);
        modal.close(true);dashboard.hidden = true; shell.hidden = false;
        document.querySelector('#admin-users')!.replaceChildren();
        document.querySelector('#reports')!.textContent = '';openCases.clear();clearJobDialogs();jobs?.querySelector('[data-jobs-list]')?.replaceChildren();clearCaseRetention();retention?.querySelector('[data-retention-list]')?.replaceChildren();
        status.textContent = t('Your session could not be verified. Please sign in again.');
      } finally { checkingPermission = false; }
    }
  }
  function renderUsers() {
    const query = filter.value.trim().toLowerCase();
    const visible = users.filter(user => user.handle.toLowerCase().includes(query));
    const container = document.querySelector('#admin-users')!;
    container.replaceChildren();
    document.querySelector('#admin-user-count')!.textContent = t('{shown} of {total} accounts',{shown:visible.length,total:users.length});
    if (!visible.length) container.append(node('p', t('No matching administrator accounts.'), 'admin-list-empty'));
    for (const user of visible) {
      const card = node('div', undefined, 'admin-user-card');
      const heading = node('div', undefined, 'admin-user-heading');
      const avatar = node('span', user.handle[0]?.toUpperCase() || '?', 'admin-user-avatar');
      avatar.setAttribute('aria-hidden', 'true');
      const identity = node('div', undefined, 'admin-user-identity');
      identity.append(node('h3', '@' + user.handle), node('p', user.is_root ? t('Managed through server environment') : t('Administrator'), 'meta'));
      const badge = node('span', user.is_root ? t('Root') : user.enabled ? t('Active') : t('Disabled'), 'admin-account-state');
      badge.dataset.enabled = String(user.enabled);
      identity.append(node('p',user.email||t('Email not configured'),'meta'));heading.append(avatar, identity, badge); card.append(heading);
      if (!user.is_root) {
        const actions = node('div', undefined, 'admin-user-actions');
        const details = node('details', undefined, 'admin-user-security');
        details.append(node('summary', t('Change password')));
        const form = node('form', undefined, 'admin-user-password');
        const label = node('label', t('New password'));
        const input = node('input');
        input.type = 'password'; input.minLength = 12; input.maxLength = 256;
        input.required = true; input.autocomplete = 'new-password';
        label.append(input);
        const save = node('button', undefined, 'admin-icon-button'); save.type = 'submit';
        save.setAttribute('aria-label',t('Set password'));save.dataset.tooltip=t('Set password');
        save.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 21H5V3h12l4 4v14ZM7 3v6h10V3M7 21v-8h10v8"/></svg>';
        const toggle = node('button', undefined, 'admin-user-toggle admin-icon-button');
        const toggleLabel=user.enabled?t('Disable access'):t('Enable access');
        toggle.setAttribute('aria-label',toggleLabel);toggle.dataset.tooltip=toggleLabel;
        toggle.innerHTML=user.enabled?'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg>';
        toggle.type = 'button';
        let busy = false;
        const update = async (body: unknown) => {
          if (busy) return;
          busy = true; save.disabled = toggle.disabled = true;
          try {
            await send('/admin/users/' + encodeURIComponent(user.id), body, 'PATCH');
            input.value = '';
            usersStatus.textContent = t('Administrator updated. Previous sessions are no longer valid.');
            await loadUsers();
          } catch (error) {
            usersStatus.textContent = t('Unable to update administrator. Please try again.');
            await checkExpired(error);
          } finally { busy = false; save.disabled = toggle.disabled = false; }
        };
        form.addEventListener('submit', event => { event.preventDefault(); if (form.reportValidity()) void update({password: input.value}); });
        toggle.addEventListener('click', () => void update({enabled: !user.enabled}));
        form.append(label, save); details.append(form);
        const emailForm=node('form',undefined,'admin-user-password'),emailLabel=node('label',t('Email')),emailInput=node('input');emailInput.type='email';emailInput.required=true;emailInput.maxLength=254;emailInput.value=user.email||'';emailLabel.append(emailInput);const emailSave=node('button',undefined,'admin-icon-button');emailSave.type='submit';emailSave.setAttribute('aria-label',t('Save email'));emailSave.dataset.tooltip=t('Save email');emailSave.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 21H5V3h12l4 4v14ZM7 3v6h10V3M7 21v-8h10v8"/></svg>';emailForm.append(emailLabel,emailSave);emailForm.addEventListener('submit',event=>{event.preventDefault();if(emailForm.reportValidity())void update({email:emailInput.value});});
        const emailDetails=node('details',undefined,'admin-user-security');emailDetails.append(node('summary',t('Change sign-in email')),emailForm);
        actions.append(details,emailDetails,toggle);card.append(actions);

      }
      container.append(card);
    }
  }
  async function loadUsers() {
    const request = ++usersRequest;
    const loaded: AdminUser[] = await api('/admin/users');
    if (request !== usersRequest || !signedIn || !isRoot || view !== 'users') return;
    users = loaded; renderUsers();
  }
  const requestedView = (): View => {
    const hash = win.location.hash.slice(1);
    return hash === 'users' || hash === 'moderation' || hash === 'retention' || hash === 'jobs' || hash === 'statistics' ? hash : 'overview';
  };
  async function showView(next: View, focus = false) {
    if (!signedIn) return;
    if ((next === 'users' && !isRoot) || (isRoot && (next === 'moderation'||next === 'retention'||next==='jobs'))) next = 'overview';
    if (view === 'users' && next !== 'users') clearPasswords();
    if(view==='retention')clearCaseRetention();
    if(view==='jobs')clearJobDialogs();
    if (view === 'moderation' && next !== 'moderation') { modal.close(true); clearReview(); actionForm.reset(); selectedReport = null; selection.hidden = true; }
    statistics.clear();
    view = next;
    const version = ++viewVersion;
    document.getElementById('admin-statistics')!.hidden=next!=='statistics';
    overview.hidden = next !== 'overview';
    management.hidden = next !== 'users';
    moderation.hidden = next !== 'moderation';
    if(retention)retention.hidden=next!=='retention';
    if(jobs)jobs.hidden=next!=='jobs';
    status.textContent = '';
    if (focus) {
      const heading = document.querySelector<HTMLElement>(next === 'overview' ? '#admin-heading' : next === 'users' ? '#admin-users-heading' : next==='statistics'?'#statistics-heading':next==='jobs'?'#jobs-heading':next==='retention'?'#retention-heading':'#moderation-heading')!;
      heading.tabIndex = -1; heading.focus({preventScroll: true});
      win.scrollTo({top: 0, behavior: 'instant'});
    }
    try {
      if(next==='statistics')await statistics.load();
      if(next==='jobs'&&jobs)await renderBackgroundJobs(jobs,send,()=>signedIn&&!isRoot&&view==='jobs'&&viewVersion===version,checkExpired);
      if(next==='retention'&&retention){await renderCaseRetention(retention,send,()=>signedIn&&!isRoot&&view==='retention'&&viewVersion===version,checkExpired);}
      if (next === 'users') { usersStatus.textContent = t('Loading accounts…'); await loadUsers(); if (version === viewVersion) usersStatus.textContent = ''; }
      if (next === 'moderation') {
        reportsPanel.textContent = t('Loading requests…');reportsPanel.setAttribute('aria-busy','true');updateTabs();
        const data:ModerationInbox = await api('/admin?status='+moderationStatus);
        if(version===viewVersion && signedIn){updateTabs(data.counts);document.getElementById('moderation-list-limit')!.hidden=!data.counts || data.counts[moderationStatus]<=data.reports.length+data.appeals.length;}
        if (version === viewVersion && signedIn) document.querySelector('#reports')!.replaceChildren(renderModerationInbox(data, (report,trigger) => {
          clearReview();actionForm.hidden=false;
          selectedReport = report; actionType.value = report.target_available===false?'dismiss':report.target_kind==='agent'?'block':'hide';selectTarget();syncActionPicker(report.target_kind,report.target_available!==false);
          document.querySelector<HTMLTextAreaElement>('#action-reason')!.value = '';
          modal.open('moderation-action-title',trigger);
          document.querySelector<HTMLTextAreaElement>('#action-reason')!.focus({preventScroll: true});
        }, (request,trigger)=>{
          actionForm.hidden=true;
          clearReview();selectedReview=request;syncReviewPicker(request.original_action,request.target_available!==false);reviewForm.hidden=false;
          const context=document.querySelector('#review-decision-context')!;
          const who=document.createElement('p');who.textContent=request.operator_handle?t('From @{handle}',{handle:request.operator_handle}):t('Operator review request');
          const text=document.createElement('p');text.className='moderation-reason';text.textContent=request.reason;
          context.replaceChildren(who,text,renderReviewParticipation(request));modal.open('review-decision-title',trigger);document.querySelector<HTMLTextAreaElement>('#review-response')!.focus();
        },moderationStatus,openCases));
        if(version===viewVersion)reportsPanel.removeAttribute('aria-busy');
      }
    } catch (error) {
      if (version === viewVersion){reportsPanel.removeAttribute('aria-busy');status.textContent = t('Unable to load this section. Please try again.');}
      await checkExpired(error);
    }
  }
  function navigate(next: View) {
    if (!signedIn || (next === 'users' && !isRoot) || (isRoot&&(next==='moderation'||next==='retention'||next==='jobs'))) return;
    win.history.pushState(null, '', '#' + next);
    void showView(next, true);
  }
  document.querySelectorAll<HTMLElement>('[data-admin-view]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.adminView as View)));
  win.addEventListener('hashchange', () => { if (signedIn) void showView(requestedView(), true); });
  filter.addEventListener('input', renderUsers);
  async function refresh() {
    const session = await api('/session');
    csrf = session.csrf;if(session.loginChallenge)emailLogin.begin(session.loginChallenge,false); signedIn = !!session.adminId; isRoot = signedIn && session.adminRole === 'root';
    shell.hidden = signedIn; dashboard.hidden = !signedIn;
    toolbar(signedIn, session.adminHandle); usersTile.disabled = !isRoot;usersTile.hidden=!isRoot;
    for(const id of ['admin-moderation-tile','admin-retention-tile','admin-jobs-tile','admin-notifications-tile']){const tile=document.getElementById(id);if(tile)tile.hidden=isRoot;}
    if(isRoot){clearJobDialogs();jobs?.querySelector('[data-jobs-list]')?.replaceChildren();reportsPanel.replaceChildren();openCases.clear();retention?.querySelector('[data-retention-list]')?.replaceChildren();}
    document.querySelector('#users-tile-access')!.textContent = isRoot ? t('Manage accounts') : t('Root access required');
    const notificationsLink=document.querySelector<HTMLAnchorElement>('#admin-notifications-tile');if(notificationsLink)notificationsLink.href='/notifications?role=admin&lang='+currentLanguage();
    status.textContent = '';
    if (signedIn) {
      (login.elements.namedItem('password') as HTMLInputElement).value = '';
      await showView(requestedView());
    } else {
      statistics.clear();document.getElementById('admin-statistics')!.hidden=true;
      ++viewVersion; ++usersRequest; clearPasswords(); users = [];moderationStatus='pending';updateTabs({pending:0,processed:0});document.getElementById('moderation-list-limit')!.hidden=true;
      filter.value = '';
      modal.close(true);clearReview(); actionForm.reset(); selectedReport = null; selection.hidden = true;
      document.querySelector('#admin-users')!.replaceChildren();
      document.querySelector('#reports')!.textContent = '';openCases.clear();
      management.hidden = moderation.hidden = true;
      clearJobDialogs();if(jobs){jobs.hidden=true;jobs.querySelector('[data-jobs-list]')?.replaceChildren();}clearCaseRetention();if(retention){retention.hidden=true;retention.querySelector('[data-retention-list]')?.replaceChildren();}
    }
  }
  const emailLogin=initializeEmailLogin({form:login,send,csrf:value=>{csrf=value;},authenticated:refresh});
  login.addEventListener('submit', async event => {
    event.preventDefault();
    if (signingIn || !login.reportValidity()) return;
    signingIn = true; submit.disabled = true; login.setAttribute('aria-busy', 'true');
    feedback.classList.remove('error'); feedback.textContent = t('Signing in…');
    const form = new FormData(login);
    try {
      const session = await api('/session'); csrf = session.csrf;
      const result=await send('/login', {admin: true, handle: form.get('handle'), password: form.get('password'),language:currentLanguage()});if(emailLogin.begin(result))return;
      await refresh(); feedback.textContent = '';
      if (signedIn) {
        const heading = document.querySelector<HTMLElement>(view === 'users' ? '#admin-users-heading' : view === 'moderation' ? '#moderation-heading' : view==='retention'?'#retention-heading':view==='jobs'?'#jobs-heading':'#admin-heading')!;
        heading.tabIndex = -1; heading.focus({preventScroll: true});
      }
    } catch (error) {
      feedback.classList.add('error');
      feedback.textContent = (error as {code?:string}).code==='TWO_FACTOR_SETUP_REQUIRED'?t('An email address must be configured for this account. Ask Root or check ROOT_ADMIN_EMAIL.'):(error as {code?:string}).code==='LOGIN_MAIL_UNAVAILABLE'?t('Sign-in email could not be delivered. Please try again later.'):(error as {status?: number})?.status === 429
        ? t('Too many sign-in attempts. Please wait before trying again.')
        : t('Unable to sign in. Check your root or administrator credentials and try again.');
    } finally { signingIn = false; submit.disabled = false; login.removeAttribute('aria-busy'); }
  });
  const create = document.querySelector<HTMLFormElement>('#admin-create-user')!;
  create.addEventListener('submit', async event => {
    event.preventDefault();
    if (creatingUser || !isRoot || view !== 'users' || !create.reportValidity()) return;
    creatingUser = true;
    const button = create.querySelector<HTMLButtonElement>('button')!; button.disabled = true;
    try {
      const data = new FormData(create);
      await send('/admin/users', {handle: data.get('handle'), password: data.get('password'),email:data.get('email')});
      create.reset(); filter.value = '';
      usersStatus.textContent = t('Administrator created.');
      await loadUsers();
    } catch (error) {
      usersStatus.textContent = (error as {status?: number})?.status === 409
        ? t('That handle is already in use. Choose another one.') : t('Unable to create administrator. Check the fields and try again.');
      await checkExpired(error);
    } finally { creatingUser = false; button.disabled = false; }
  });
  let decidingReview=false;
  reviewForm.addEventListener('submit',async event=>{
    event.preventDefault();if(decidingReview||!selectedReview||!reviewForm.reportValidity())return;
    const id=selectedReview.id,revision=selectedReview.revision || 0;const button=reviewForm.querySelector<HTMLButtonElement>('button[type=submit]')!;
    decidingReview=true;button.disabled=true;modal.setBusy(true);
    try {
      await send('/admin/appeals/'+encodeURIComponent(id)+'/decision',{...Object.fromEntries(new FormData(reviewForm)),expectedRevision:revision});
      modal.close(true);clearReview();await showView('moderation');const heading=document.querySelector<HTMLElement>('#reports-heading')!;heading.tabIndex=-1;heading.focus();status.textContent=t('Review decided. Your response is now visible to the operator.');
    }catch(error){status.textContent=(error as {status?:number}).status===409?t('Unable to apply this decision. It may have new agent/operator context, already be decided, have a newer moderation action, or refer to an unavailable message or parent. No changes were saved. Reload Moderation and check the current state.'):t('Unable to send your decision. Please try again.');modal.error(status.textContent || t('Unable to decide this review.'));await checkExpired(error);}
    finally{decidingReview=false;button.disabled=false;modal.setBusy(false);}
  });
  let recordingAction = false;
  document.querySelector('#action')!.addEventListener('submit', async event => {
    event.preventDefault();
    if (recordingAction || !actionForm.reportValidity()) return;
    if (actionType.value === 'dismiss' && !selectedReport) { modal.error(t('Choose Review on a report before closing it without action.')); return; }
    recordingAction = true;modal.setBusy(true);
    const button = actionForm.querySelector<HTMLButtonElement>('button:not([type=button])')!;
    button.disabled = true;
    try {
      await send('/admin/actions', {...Object.fromEntries(new FormData(actionForm)), ...(selectedReport ? {reportId: selectedReport.id} : {})});
      modal.close(true);clearReview(); actionForm.reset(); selectedReport = null; selection.hidden = true;
      await showView('moderation');const heading=document.querySelector<HTMLElement>('#reports-heading')!;heading.tabIndex=-1;heading.focus(); status.textContent = t('Action recorded.');
    } catch (error) { status.textContent = t('Unable to record the action. The report may already have been reviewed; check the details and try again.');modal.error(status.textContent || t('Unable to record the action.')); await checkExpired(error); }
    finally { recordingAction = false; button.disabled = false;modal.setBusy(false); }
  });
  logout.addEventListener('click', async () => {
    logout.disabled = true;
    try {
      await send('/logout', {});
      win.history.replaceState(null, '', win.location.pathname);
      await refresh();
      document.querySelector<HTMLInputElement>('#admin-handle')!.focus();
    } catch { status.textContent = t('Unable to sign out. Please try again.'); }
    finally { logout.disabled = false; }
  });
  try { await refresh(); }
  catch {
    signedIn = isRoot = false; toolbar(false);
    shell.hidden = false; dashboard.hidden = true;
    status.textContent = t('Unable to check your session. You can try signing in below.');
  }
}
