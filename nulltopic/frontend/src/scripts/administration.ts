import {api} from './client';

export async function initializeAdministration() {
  const status = document.querySelector<HTMLElement>('#status')!;
  const feedback = document.querySelector<HTMLElement>('#login-status')!;
  const shell = document.querySelector<HTMLElement>('#admin-login-shell')!;
  const dashboard = document.querySelector<HTMLElement>('#dashboard')!;
  const login = document.querySelector<HTMLFormElement>('#login')!;
  const submit = login.querySelector<HTMLButtonElement>('button[type=submit]')!;
  let csrf = '', signingIn = false, creatingUser = false;
  const management = document.querySelector<HTMLElement>('#admin-user-management')!;
  const usersStatus = document.querySelector<HTMLElement>('#admin-users-status')!;
  const send = (path: string, body: unknown, method = 'POST') => api(path, {
    method, headers: {'x-csrf-token': csrf}, body: JSON.stringify(body),
  });
  async function loadUsers() {
    const users = await api('/admin/users');
    const container = document.querySelector('#admin-users')!;
    container.replaceChildren();
    for (const user of users) {
      const card = document.createElement('div');
      card.className = 'admin-user-card';
      const heading = document.createElement('h3');
      heading.textContent = '@' + user.handle;
      const note = document.createElement('p');
      note.className = 'meta';
      note.textContent = user.is_root ? 'Root · managed through server environment' : user.enabled ? 'Administrator · active' : 'Administrator · disabled';
      card.append(heading, note);
      if (!user.is_root) {
        const form = document.createElement('form');
        form.className = 'admin-user-password';
        const label = document.createElement('label');
        label.textContent = 'New password';
        const input = document.createElement('input');
        input.type = 'password'; input.minLength = 12; input.maxLength = 256;
        input.required = true; input.autocomplete = 'new-password';
        label.append(input);
        const save = document.createElement('button');
        save.type = 'submit'; save.textContent = 'Set password';
        const toggle = document.createElement('button');
        toggle.type = 'button'; toggle.textContent = user.enabled ? 'Disable access' : 'Enable access';
        let busy = false;
        const update = async (body: unknown) => {
          if (busy) return;
          busy = true; save.disabled = toggle.disabled = true;
          try {
            await send('/admin/users/' + encodeURIComponent(user.id), body, 'PATCH');
            input.value = '';
            usersStatus.textContent = 'Administrator updated. Previous sessions are no longer valid.';
            await loadUsers();
          } catch { usersStatus.textContent = 'Unable to update administrator. Please try again.'; }
          finally { busy = false; save.disabled = toggle.disabled = false; }
        };
        form.addEventListener('submit', event => { event.preventDefault(); if (form.reportValidity()) void update({password: input.value}); });
        toggle.addEventListener('click', () => void update({enabled: !user.enabled}));
        form.append(label, save, toggle); card.append(form);
      }
      container.append(card);
    }
  }
  async function refresh() {
    const session = await api('/session');
    csrf = session.csrf;
    // Never reveal the administrator dashboard merely for an operator session.
    shell.hidden = !!session.adminId;
    dashboard.hidden = !session.adminId;
    status.textContent = '';
    management.hidden = !session.adminId || session.adminRole !== 'root';
    if (session.adminId) {
      document.querySelector('#reports')!.textContent = JSON.stringify(await api('/admin'), null, 2);
      (login.elements.namedItem('password') as HTMLInputElement).value = '';
      if (session.adminRole === 'root') await loadUsers();
    }
  }
  login.addEventListener('submit', async event => {
    event.preventDefault();
    if (signingIn || !login.reportValidity()) return;
    signingIn = true;
    submit.disabled = true;
    login.setAttribute('aria-busy', 'true');
    feedback.classList.remove('error');
    feedback.textContent = 'Signing in…';
    const form = new FormData(login);
    try {
      // Also refresh CSRF if the first session request failed or expired.
      const session = await api('/session');
      csrf = session.csrf;
      await send('/login', {admin: true, handle: form.get('handle'), password: form.get('password')});
      await refresh();
      feedback.textContent = '';
    } catch (error) {
      feedback.classList.add('error');
      feedback.textContent = (error as {status?: number})?.status === 429
        ? 'Too many sign-in attempts. Please wait before trying again.'
        : 'Unable to sign in. Check your root or administrator credentials and try again.';
    } finally {
      signingIn = false;
      submit.disabled = false;
      login.removeAttribute('aria-busy');
    }
  });
  const create = document.querySelector<HTMLFormElement>('#admin-create-user')!;
  create.addEventListener('submit', async event => {
    event.preventDefault();
    if (creatingUser || !create.reportValidity()) return;
    creatingUser = true;
    const button = create.querySelector<HTMLButtonElement>('button')!;
    button.disabled = true;
    try {
      const data = new FormData(create);
      await send('/admin/users', {handle: data.get('handle'), password: data.get('password')});
      create.reset();
      usersStatus.textContent = 'Administrator created.';
      await loadUsers();
    } catch (error) {
      usersStatus.textContent = (error as {status?: number})?.status === 409
        ? 'That handle is already in use. Choose another one.' : 'Unable to create administrator. Check the fields and try again.';
    } finally { creatingUser = false; button.disabled = false; }
  });
  document.querySelector('#action')!.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      await send('/admin/actions', Object.fromEntries(new FormData(event.target as HTMLFormElement)));
      await refresh();
      status.textContent = 'Action recorded.';
    } catch { status.textContent = 'Unable to record the action. Please check the details and try again.'; }
  });
  document.querySelector('#logout')!.addEventListener('click', async () => {
    try { await send('/logout', {}); location.reload(); }
    catch { status.textContent = 'Unable to sign out. Please try again.'; }
  });
  try { await refresh(); }
  catch {
    shell.hidden = false;
    dashboard.hidden = true;
    status.textContent = 'Unable to check your session. You can try signing in below.';
  }
}
