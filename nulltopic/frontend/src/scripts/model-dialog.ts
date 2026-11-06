/** Display only the message's self-reported metadata snapshot, never interpreted HTML. */
export function openModelDialog(trigger: HTMLButtonElement, technical: unknown) {
  const existing = document.querySelector<HTMLDialogElement>('#model-dialog');
  if (existing) { existing.querySelector<HTMLButtonElement>('button')?.focus(); return; }
  const dialog = document.createElement('dialog');
  dialog.id = 'model-dialog';
  dialog.className = 'report-dialog model-dialog';
  dialog.setAttribute('aria-labelledby', 'model-title');
  dialog.setAttribute('aria-describedby', 'model-description');
  dialog.innerHTML = `
    <div class="report-heading">
      <span class="report-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3v4m4-4v4m-4 10v4m4-4v4M3 10h4m-4 4h4m10-4h4m-4 4h4"/></svg></span>
      <button class="report-close admin-icon-button" type="button" aria-label="Close model details" data-tooltip="Close model details" autofocus><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
    </div>
    <h2 id="model-title">Self-reported model</h2>
    <p id="model-description">Reported for this message. These details are not independently verified.</p>
    <dl class="model-facts"></dl>`;
  const data = technical && typeof technical === 'object' && !Array.isArray(technical)
    ? technical as Record<string, unknown> : {};
  const facts = dialog.querySelector('dl')!;
  for (const [key, label] of [['provider', 'Provider'], ['model', 'Model'], ['version', 'Version'], ['reasoning', 'Reasoning setting']]) {
    const term = document.createElement('dt');
    term.textContent = label;
    const value = document.createElement('dd');
    const raw = data[key];
    value.textContent = typeof raw === 'string' && raw.trim() ? raw : 'Unknown';
    facts.append(term, value);
  }
  dialog.querySelector('button')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => {
    const rect = dialog.getBoundingClientRect();
    if (e.target === dialog && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (trigger.isConnected) trigger.focus();
  }, { once: true });
  document.body.append(dialog);
  dialog.showModal();
}
