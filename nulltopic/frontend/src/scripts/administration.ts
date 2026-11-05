import {api} from './client';
type View = 'overview' | 'users' | 'moderation';
type AdminUser = {id: string; handle: string; is_root: boolean; enabled: boolean};

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
  const overview = document.querySelector<HTMLElement>('#admin-overview')!;
  const usersStatus = document.querySelector<HTMLElement>('#admin-users-status')!;
  const usersTile = document.querySelector<HTMLButtonElement>('#admin-users-tile')!;
  const logout = document.querySelector<HTMLButtonElement>('#admin-header-logout')!;
  const filter = document.querySelector<HTMLInputElement>('#admin-user-filter')!;
  let csrf = '', signedIn = false, isRoot = false, signingIn = false, creatingUser = false;
  let view: View = 'overview', viewVersion = 0, usersRequest = 0, users: AdminUser[] = [];
  let checkingPermission = false;
  const send = (path: string, body: unknown, method = 'POST') => api(path, {
    method, headers: {'x-csrf-token': csrf}, body: JSON.stringify(body),
  });
  function toolbar(locked: boolean, handle?: string) {
    for (const link of document.querySelectorAll<HTMLAnchorElement>('body > header nav a.header-action, body > header a.brand')) {
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
    const label = username ? 'Sign out · ' + username : 'Sign out';
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
        signedIn = isRoot = false; ++usersRequest; clearPasswords(); toolbar(false);
        dashboard.hidden = true; shell.hidden = false;
        document.querySelector('#admin-users')!.replaceChildren();
        document.querySelector('#reports')!.textContent = '';
        status.textContent = 'Your session could not be verified. Please sign in again.';
      } finally { checkingPermission = false; }
    }
  }
  function renderUsers() {
    const query = filter.value.trim().toLowerCase();
    const visible = users.filter(user => user.handle.toLowerCase().includes(query));
    const container = document.querySelector('#admin-users')!;
    container.replaceChildren();
    document.querySelector('#admin-user-count')!.textContent = `${visible.length} of ${users.length} accounts`;
    if (!visible.length) container.append(node('p', 'No matching administrator accounts.', 'admin-list-empty'));
    for (const user of visible) {
      const card = node('div', undefined, 'admin-user-card');
      const heading = node('div', undefined, 'admin-user-heading');
      const avatar = node('span', user.handle[0]?.toUpperCase() || '?', 'admin-user-avatar');
      avatar.setAttribute('aria-hidden', 'true');
      const identity = node('div', undefined, 'admin-user-identity');
      identity.append(node('h3', '@' + user.handle), node('p', user.is_root ? 'Managed through server environment' : 'Administrator', 'meta'));
      const badge = node('span', user.is_root ? 'Root' : user.enabled ? 'Active' : 'Disabled', 'admin-account-state');
      badge.dataset.enabled = String(user.enabled);
      heading.append(avatar, identity, badge); card.append(heading);
      if (!user.is_root) {
        const actions = node('div', undefined, 'admin-user-actions');
        const details = node('details', undefined, 'admin-user-security');
        details.append(node('summary', 'Change password'));
        const form = node('form', undefined, 'admin-user-password');
        const label = node('label', 'New password');
        const input = node('input');
        input.type = 'password'; input.minLength = 12; input.maxLength = 256;
        input.required = true; input.autocomplete = 'new-password';
        label.append(input);
        const save = node('button', 'Set password'); save.type = 'submit';
        const toggle = node('button', user.enabled ? 'Disable access' : 'Enable access', 'admin-user-toggle');
        toggle.type = 'button';
        let busy = false;
        const update = async (body: unknown) => {
          if (busy) return;
          busy = true; save.disabled = toggle.disabled = true;
          try {
            await send('/admin/users/' + encodeURIComponent(user.id), body, 'PATCH');
            input.value = '';
            usersStatus.textContent = 'Administrator updated. Previous sessions are no longer valid.';
            await loadUsers();
          } catch (error) {
            usersStatus.textContent = 'Unable to update administrator. Please try again.';
            await checkExpired(error);
          } finally { busy = false; save.disabled = toggle.disabled = false; }
        };
        form.addEventListener('submit', event => { event.preventDefault(); if (form.reportValidity()) void update({password: input.value}); });
        toggle.addEventListener('click', () => void update({enabled: !user.enabled}));
        form.append(label, save); details.append(form);
        actions.append(details, toggle); card.append(actions);
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
    return hash === 'users' || hash === 'moderation' ? hash : 'overview';
  };
  async function showView(next: View, focus = false) {
    if (!signedIn) return;
    if (next === 'users' && !isRoot) next = 'overview';
    if (view === 'users' && next !== 'users') clearPasswords();
    view = next;
    const version = ++viewVersion;
    overview.hidden = next !== 'overview';
    management.hidden = next !== 'users';
    moderation.hidden = next !== 'moderation';
    status.textContent = '';
    if (focus) {
      const heading = document.querySelector<HTMLElement>(next === 'overview' ? '#admin-heading' : next === 'users' ? '#admin-users-heading' : '#moderation-heading')!;
      heading.tabIndex = -1; heading.focus({preventScroll: true});
      win.scrollTo({top: 0, behavior: 'instant'});
    }
    try {
      if (next === 'users') { usersStatus.textContent = 'Loading accounts…'; await loadUsers(); if (version === viewVersion) usersStatus.textContent = ''; }
      if (next === 'moderation') {
        document.querySelector('#reports')!.textContent = 'Loading reports…';
        const data = await api('/admin');
        if (version === viewVersion && signedIn) document.querySelector('#reports')!.textContent = JSON.stringify(data, null, 2);
      }
    } catch (error) {
      if (version === viewVersion) status.textContent = 'Unable to load this section. Please try again.';
      await checkExpired(error);
    }
  }
  function navigate(next: View) {
    if (!signedIn || (next === 'users' && !isRoot)) return;
    win.history.pushState(null, '', '#' + next);
    void showView(next, true);
  }
  document.querySelectorAll<HTMLElement>('[data-admin-view]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.adminView as View)));
  win.addEventListener('hashchange', () => { if (signedIn) void showView(requestedView(), true); });
  filter.addEventListener('input', renderUsers);
  async function refresh() {
    const session = await api('/session');
    csrf = session.csrf; signedIn = !!session.adminId; isRoot = signedIn && session.adminRole === 'root';
    shell.hidden = signedIn; dashboard.hidden = !signedIn;
    toolbar(signedIn, session.adminHandle); usersTile.disabled = !isRoot;
    document.querySelector('#users-tile-access')!.textContent = isRoot ? 'Manage accounts' : 'Root access required';
    status.textContent = '';
    if (signedIn) {
      (login.elements.namedItem('password') as HTMLInputElement).value = '';
      await showView(requestedView());
    } else {
      ++viewVersion; ++usersRequest; clearPasswords(); users = [];
      filter.value = '';
      document.querySelector<HTMLFormElement>('#action')!.reset();
      document.querySelector('#admin-users')!.replaceChildren();
      document.querySelector('#reports')!.textContent = '';
      management.hidden = moderation.hidden = true;
    }
  }
  login.addEventListener('submit', async event => {
    event.preventDefault();
    if (signingIn || !login.reportValidity()) return;
    signingIn = true; submit.disabled = true; login.setAttribute('aria-busy', 'true');
    feedback.classList.remove('error'); feedback.textContent = 'Signing in…';
    const form = new FormData(login);
    try {
      const session = await api('/session'); csrf = session.csrf;
      await send('/login', {admin: true, handle: form.get('handle'), password: form.get('password')});
      await refresh(); feedback.textContent = '';
      if (signedIn) {
        const heading = document.querySelector<HTMLElement>(view === 'users' ? '#admin-users-heading' : view === 'moderation' ? '#moderation-heading' : '#admin-heading')!;
        heading.tabIndex = -1; heading.focus({preventScroll: true});
      }
    } catch (error) {
      feedback.classList.add('error');
      feedback.textContent = (error as {status?: number})?.status === 429
        ? 'Too many sign-in attempts. Please wait before trying again.'
        : 'Unable to sign in. Check your root or administrator credentials and try again.';
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
      await send('/admin/users', {handle: data.get('handle'), password: data.get('password')});
      create.reset(); filter.value = '';
      usersStatus.textContent = 'Administrator created.';
      await loadUsers();
    } catch (error) {
      usersStatus.textContent = (error as {status?: number})?.status === 409
        ? 'That handle is already in use. Choose another one.' : 'Unable to create administrator. Check the fields and try again.';
      await checkExpired(error);
    } finally { creatingUser = false; button.disabled = false; }
  });
  document.querySelector('#action')!.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      await send('/admin/actions', Object.fromEntries(new FormData(event.target as HTMLFormElement)));
      await showView('moderation'); status.textContent = 'Action recorded.';
    } catch (error) { status.textContent = 'Unable to record the action. Please check the details and try again.'; await checkExpired(error); }
  });
  logout.addEventListener('click', async () => {
    logout.disabled = true;
    try {
      await send('/logout', {});
      win.history.replaceState(null, '', win.location.pathname);
      await refresh();
      document.querySelector<HTMLInputElement>('#admin-handle')!.focus();
    } catch { status.textContent = 'Unable to sign out. Please try again.'; }
    finally { logout.disabled = false; }
  });
  try { await refresh(); }
  catch {
    signedIn = isRoot = false; toolbar(false);
    shell.hidden = false; dashboard.hidden = true;
    status.textContent = 'Unable to check your session. You can try signing in below.';
  }
}
