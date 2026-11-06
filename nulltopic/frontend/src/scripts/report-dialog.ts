/** Native modal dialog supplies focus containment and an inert page underneath. */
export function openReportDialog(trigger: HTMLButtonElement, send: (reason: string) => Promise<void>, options?:{title:string;description:string;context?:string}) {
  const existing = document.querySelector<HTMLDialogElement>('#report-dialog');
  if (existing) { existing.querySelector<HTMLTextAreaElement>('textarea')?.focus(); return; }
  const dialog = document.createElement('dialog');
  dialog.id = 'report-dialog';
  dialog.className = 'report-dialog';
  dialog.setAttribute('aria-labelledby', 'report-title');
  dialog.setAttribute('aria-describedby', 'report-description');
  // Static UI only: never interpolate public content into HTML.
  dialog.innerHTML = `
    <form class="report-form">
      <div class="report-heading">
        <span class="report-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 21V4m0 0c5-4 9 4 14 0v10c-5 4-9-4-14 0"/></svg></span>
        <button class="report-close admin-icon-button" type="button" aria-label="Close report" data-tooltip="Close report"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
      </div>
      <h2 id="report-title">Report this message</h2>
      <p id="report-description">Help keep this space welcoming. Tell us why this message should be reviewed. Do not include private information.</p>
      <label for="report-reason">Reason for reporting</label>
      <textarea id="report-reason" name="reason" rows="5" maxlength="1000" required autofocus placeholder="What should the moderators know?"></textarea>
      <p class="report-status" role="status" aria-live="polite"></p>
      <div class="report-actions"><button class="report-cancel admin-icon-button" type="button" aria-label="Cancel" data-tooltip="Cancel"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18"/></svg></button><button class="report-submit admin-icon-button" type="submit" aria-label="Send report" data-tooltip="Send report"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/></svg></button></div>
    </form>`;
  if(options){
    dialog.querySelector('#report-title')!.textContent=options.title;
    dialog.querySelector('#report-description')!.textContent=options.description;
    if(options.context){const context=document.createElement('p');context.className='moderation-message-preview';context.textContent=options.context;dialog.querySelector('#report-description')!.after(context);}
  }
  const form = dialog.querySelector('form')!;
  const textarea = dialog.querySelector('textarea')!;
  const status = dialog.querySelector<HTMLElement>('.report-status')!;
  const submit = dialog.querySelector<HTMLButtonElement>('.report-submit')!;
  let busy = false;
  const dismiss = () => { if (!busy) dialog.close(); };
  dialog.querySelector('.report-close')!.addEventListener('click', dismiss);
  dialog.querySelector('.report-cancel')!.addEventListener('click', dismiss);
  dialog.addEventListener('cancel', e => { if (busy) e.preventDefault(); });
  dialog.addEventListener('click', e => {
    const rect = dialog.getBoundingClientRect();
    if (e.target === dialog && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)) dismiss();
  });
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (trigger.isConnected) {
      if (!trigger.disabled) trigger.focus();
      else trigger.closest('.post-footer')?.querySelector<HTMLAnchorElement>('a')?.focus();
    }
  }, { once: true });
  textarea.addEventListener('input', () => textarea.setCustomValidity(''));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;
    const reason = textarea.value.trim();
    textarea.setCustomValidity(reason ? '' : 'Please enter a reason.');
    if (!form.reportValidity()) return;
    busy = true;
    form.setAttribute('aria-busy', 'true');
    textarea.readOnly = true;
    dialog.querySelectorAll('button').forEach(button => button.disabled = true);
    status.classList.remove('error');
    status.textContent = 'Sending report…';
    submit.setAttribute('aria-label', 'Sending report…');submit.dataset.tooltip = 'Sending report…';
    try {
      await send(reason);
      busy = false;
      dialog.close();
    } catch {
      busy = false;
      form.removeAttribute('aria-busy');
      textarea.readOnly = false;
      dialog.querySelectorAll('button').forEach(button => button.disabled = false);
      status.classList.add('error');
      status.textContent = 'Your report could not be sent. Please try again in a moment.';
      submit.setAttribute('aria-label', 'Send report');submit.dataset.tooltip = 'Send report';
      textarea.focus();
    }
  });
  document.body.append(dialog);
  dialog.showModal();
}
