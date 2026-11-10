import {currentLanguage,localizeTrustedUI, t} from '../lib/i18n';
/** Native modal dialog supplies focus containment and an inert page underneath. */
export function openReportDialog(trigger: HTMLButtonElement, send: (reason: string,contact:{reporterName?:string;reporterEmail?:string;language:string;goodFaith:boolean}) => Promise<unknown>, options?:{title:string;description:string;context?:string}) {
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
      <div class="report-fields"><label for="report-reason">Reason for reporting</label>
      <textarea id="report-reason" name="reason" rows="5" maxlength="1000" required autofocus placeholder="What should the moderators know?"></textarea>
      <label for="reporter-name">Your name (optional)</label><input id="reporter-name" name="reporterName" maxlength="120" autocomplete="name"/>
      <label for="reporter-email">Your email (optional)</label><input id="reporter-email" name="reporterEmail" type="email" maxlength="254" autocomplete="email"/>
      <p class="admin-field-hint">Without contact details, you can report anonymously. If you provide an email, we send receipt and case-update emails. You can stop them on the status page.</p>
      <div class="storage-choice"><label><span class="storage-switch"><input id="report-good-faith" type="checkbox" role="switch" required/><span class="storage-switch-track" aria-hidden="true"></span></span><span>I believe in good faith that my report is accurate and complete.</span></label></div></div>
      <section class="report-receipt" hidden><p>Save this private status link. Anyone with the link can view this report status. Without the link, anonymous access cannot be recovered.</p><label for="report-status-link">Private status link</label><input id="report-status-link" readonly/><div class="report-receipt-actions"><button type="button" data-copy-receipt class="admin-icon-button" aria-label="Copy status link" data-tooltip="Copy status link"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></svg></button><a data-open-receipt class="admin-icon-button" target="_blank" rel="noopener noreferrer" aria-label="Open report status" data-tooltip="Open report status"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h11v11M19 5 5 19"/></svg></a></div></section>
      <p class="report-status" role="status" aria-live="polite"></p>
      <div class="report-actions"><button class="report-cancel admin-icon-button" type="button" aria-label="Cancel" data-tooltip="Cancel"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18"/></svg></button><button class="report-submit admin-icon-button" type="submit" aria-label="Send report" data-tooltip="Send report"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/></svg></button></div>
    </form>`;
  localizeTrustedUI(dialog);
  if(options){
    dialog.querySelector('#report-title')!.textContent=options.title;
    dialog.querySelector('#report-description')!.textContent=options.description;
    if(options.context){const context=document.createElement('p');context.className='moderation-message-preview';context.textContent=options.context;dialog.querySelector('#report-description')!.after(context);}
  }
  const form = dialog.querySelector('form')!;
  const textarea = dialog.querySelector('textarea')!;
  const status = dialog.querySelector<HTMLElement>('.report-status')!;
  const submit = dialog.querySelector<HTMLButtonElement>('.report-submit')!;
  let busy = false,completed=false;
  dialog.querySelector('[data-copy-receipt]')!.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(dialog.querySelector<HTMLInputElement>('#report-status-link')!.value);status.textContent=t('Status link copied.');}catch{status.textContent=t('Copy failed. Select and copy the status link.');dialog.querySelector<HTMLInputElement>('#report-status-link')!.select();}});
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
  const updateSubmit = () => {
    submit.disabled = busy || completed || !textarea.value.trim() ||
      !Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('.report-fields input, .report-fields textarea')).every(field => field.validity.valid);
  };
  form.addEventListener('input', () => { textarea.setCustomValidity(''); updateSubmit(); });
  form.addEventListener('change', updateSubmit);
  updateSubmit();
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy||completed) return;
    const reason = textarea.value.trim();
    textarea.setCustomValidity(reason ? '' : t('Please enter a reason.'));
    if (!form.reportValidity()) return;
    busy = true;
    form.setAttribute('aria-busy', 'true');
    textarea.readOnly = true;dialog.querySelectorAll<HTMLInputElement>('.report-fields input').forEach(input=>input.disabled=true);
    dialog.querySelectorAll('button').forEach(button => button.disabled = true);
    status.classList.remove('error');
    status.textContent = t('Sending report…');
    submit.setAttribute('aria-label', t('Sending report…'));submit.dataset.tooltip = t('Sending report…');
    try {
      const result=await send(reason,{reporterName:dialog.querySelector<HTMLInputElement>('#reporter-name')!.value.trim()||undefined,reporterEmail:dialog.querySelector<HTMLInputElement>('#reporter-email')!.value.trim()||undefined,language:currentLanguage(),goodFaith:dialog.querySelector<HTMLInputElement>('#report-good-faith')!.checked});
      busy = false;
      const value=(result as {statusUrl?:unknown}|null)?.statusUrl;
      let link:URL|undefined;try{const url=new URL(String(value),document.baseURI);if(['http:','https:'].includes(url.protocol)&&!url.username&&!url.password&&url.pathname==='/dsa'&&/^#receipt=[A-Za-z0-9_-]{43}$/.test(url.hash)){const base=new URL(document.baseURI),loopback=['localhost','127.0.0.1','[::1]'];if(url.origin===base.origin||(loopback.includes(base.hostname)&&loopback.includes(url.hostname)))link=url;}}catch{}
      if(!link){dialog.close();return;}
      completed=true;form.removeAttribute('aria-busy');dialog.querySelectorAll('button').forEach(button=>button.disabled=false);submit.hidden=true;dialog.querySelector<HTMLElement>('.report-fields')!.hidden=true;dialog.querySelector<HTMLElement>('.report-receipt')!.hidden=false;dialog.querySelector<HTMLInputElement>('#report-status-link')!.value=link.href;dialog.querySelector<HTMLAnchorElement>('[data-open-receipt]')!.href=link.href;dialog.querySelector('#report-title')!.textContent=t('Report received');dialog.querySelector<HTMLElement>('#report-description')!.hidden=true;status.textContent='';
      const cancel=dialog.querySelector<HTMLButtonElement>('.report-cancel')!;cancel.setAttribute('aria-label',t('Close'));cancel.dataset.tooltip=t('Close');cancel.focus();
    } catch {
      busy = false;
      form.removeAttribute('aria-busy');
      textarea.readOnly = false;dialog.querySelectorAll<HTMLInputElement>('.report-fields input').forEach(input=>input.disabled=false);
      dialog.querySelectorAll('button').forEach(button => button.disabled = false);
      status.classList.add('error');
      status.textContent = t('Your report could not be sent. Please try again in a moment.');
      submit.setAttribute('aria-label', t('Send report'));submit.dataset.tooltip = t('Send report');
      updateSubmit();
      textarea.focus();
    }
  });
  document.body.append(dialog);
  document.defaultView?.addEventListener('pagehide',()=>dialog.remove(),{once:true});
  dialog.showModal();
}
