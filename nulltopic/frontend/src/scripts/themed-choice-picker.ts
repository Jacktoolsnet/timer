export interface Choice {value:string; title:string; description:string; reasons:string[];}
interface PickerOptions {choices:Choice[];hostId:string;triggerId:string;listId:string;presetsId:string;labelId:string;valueId:string;placeholder?:string;suggestionsLabel:string;isAvailable?:(value:string)=>boolean;}
export function initializeChoicePicker(select: HTMLSelectElement, reason: HTMLTextAreaElement, config:PickerOptions) {
  const choices=config.choices;
  const doc = select.ownerDocument, win = doc.defaultView!;
  const host = doc.querySelector<HTMLElement>('#'+config.hostId)!;
  const trigger = doc.querySelector<HTMLButtonElement>('#'+config.triggerId)!;
  const list = doc.querySelector<HTMLElement>('#'+config.listId)!;
  const presets = doc.querySelector<HTMLElement>('#'+config.presetsId)!;
  const options: HTMLButtonElement[] = [];
  function close(focus = false) { list.hidden = true; trigger.setAttribute('aria-expanded', 'false'); if (focus) trigger.focus(); }
  function open() {
    list.hidden = false; trigger.setAttribute('aria-expanded', 'true');
    const available=options.filter(option=>!option.hidden);
    (available.find(option=>option.dataset.value===select.value) || available[0])?.focus();
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
      const available=options.filter(option=>!option.hidden);
      const index = available.indexOf(option);
      if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? available.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + available.length) % available.length;
        available[next].focus(); available[next].scrollIntoView?.({block: 'nearest'});
      } else if (event.key === 'Escape') { event.preventDefault(); close(true); }
      else if (event.key === 'Tab') close(true);
    });
    options.push(option); list.append(option);
  }
  function sync() {
    for(const option of options)option.hidden=!!config.isAvailable && !config.isAvailable(option.dataset.value!);
    for(const option of select.options)if(choices.some(choice=>choice.value===option.value)){option.disabled=!!config.isAvailable&&!config.isAvailable(option.value);option.hidden=option.disabled;}
    if(select.value && config.isAvailable && !config.isAvailable(select.value))select.value='';
    const choice = choices.find(choice => choice.value === select.value);
    trigger.removeAttribute('aria-invalid');
    doc.querySelector('#'+config.valueId)!.textContent = choice?.title || config.placeholder || choices[0].title;
    options.forEach(option => option.setAttribute('aria-selected', String(option.dataset.value === choice?.value)));
    presets.replaceChildren();
    const label = doc.createElement('p'); label.textContent = choice ? config.suggestionsLabel : 'Choose a decision to see suggested responses.';
    presets.append(label);
    for (const text of choice?.reasons || []) {
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
  doc.querySelector<HTMLLabelElement>('#'+config.labelId)!.htmlFor = trigger.id;
  select.addEventListener('invalid', event=>{event.preventDefault();trigger.setAttribute('aria-invalid','true');trigger.focus();});
  if(select.required)trigger.setAttribute('aria-required','true');
  select.hidden = true; host.hidden = false; sync();
  return sync;
}
