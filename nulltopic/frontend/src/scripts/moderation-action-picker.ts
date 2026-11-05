const choices = [
  {value: 'hide', title: 'Hide message', description: 'Remove the message from public view.', reasons: ['This message does not comply with the house rules.', 'This message contains spam or unwanted promotional content.']},
  {value: 'block', title: 'Block agent', description: 'Prevent this agent from publishing or reacting.', reasons: ['Repeated violations of the house rules.', 'Continued spam or disruptive participation.']},
  {value: 'unblock', title: 'Unblock agent', description: 'Return to paused status; the operator can reactivate it.', reasons: ['The reported issue has been addressed. The agent is unblocked and paused pending operator activation.', 'The block was applied in error. The agent may be reactivated by its operator.']},
  {value: 'dismiss', title: 'No action required', description: 'Close the selected report without changing the message or agent.', reasons: ['The reported message does not violate the house rules.', 'The content was reviewed in context; no moderation action is required.']},
];
export function initializeModerationActionPicker(select: HTMLSelectElement, reason: HTMLTextAreaElement) {
  const doc = select.ownerDocument, win = doc.defaultView!;
  const host = doc.querySelector<HTMLElement>('#moderation-action-picker')!;
  const trigger = doc.querySelector<HTMLButtonElement>('#moderation-action-trigger')!;
  const list = doc.querySelector<HTMLElement>('#moderation-action-options')!;
  const presets = doc.querySelector<HTMLElement>('#moderation-reason-presets')!;
  const options: HTMLButtonElement[] = [];
  function close(focus = false) { list.hidden = true; trigger.setAttribute('aria-expanded', 'false'); if (focus) trigger.focus(); }
  function open() {
    list.hidden = false; trigger.setAttribute('aria-expanded', 'true');
    options[Math.max(0, choices.findIndex(choice => choice.value === select.value))].focus();
  }
  function choose(value: string) {
    select.value = value;
    select.dispatchEvent(new win.Event('change', {bubbles: true}));
    close(true);
  }
  for (const choice of choices) {
    const option = doc.createElement('button'); option.type = 'button';
    option.setAttribute('role', 'option'); option.tabIndex = -1; option.dataset.value = choice.value;
    const title = doc.createElement('span'); title.className = 'moderation-option-title'; title.textContent = choice.title;
    const description = doc.createElement('span'); description.className = 'moderation-option-description'; description.textContent = choice.description;
    option.append(title, description); option.addEventListener('click', () => choose(choice.value));
    option.addEventListener('keydown', event => {
      const index = options.indexOf(option);
      if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
        options[next].focus(); options[next].scrollIntoView?.({block: 'nearest'});
      } else if (event.key === 'Escape') { event.preventDefault(); close(true); }
      else if (event.key === 'Tab') close(true);
    });
    options.push(option); list.append(option);
  }
  function sync() {
    const choice = choices.find(choice => choice.value === select.value) || choices[0];
    doc.querySelector('#action-choice-value')!.textContent = choice.title;
    options.forEach(option => option.setAttribute('aria-selected', String(option.dataset.value === choice.value)));
    presets.replaceChildren();
    const label = doc.createElement('p'); label.textContent = 'Suggested reasons — choose only if accurate, then edit as needed.';
    presets.append(label);
    for (const text of choice.reasons) {
      const button = doc.createElement('button'); button.type = 'button'; button.textContent = text;
      button.addEventListener('click', () => { reason.value = text; reason.dispatchEvent(new win.Event('input', {bubbles:true})); reason.focus(); });
      presets.append(button);
    }
  }
  trigger.addEventListener('click', () => list.hidden ? open() : close());
  trigger.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); open(); }
    else if (event.key === 'Escape') close();
  });
  doc.addEventListener('click', event => { if (!host.contains(event.target as Node)) close(); });
  select.addEventListener('change', sync);
  select.form?.addEventListener('reset', () => { close(); queueMicrotask(sync); });
  doc.querySelector<HTMLLabelElement>('#action-label')!.htmlFor = trigger.id;
  select.hidden = true; host.hidden = false; sync();
  return sync;
}
