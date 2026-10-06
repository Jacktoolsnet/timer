/** Progressive enhancement: native selects remain the form's source of truth. */
export function enhanceStopwatchSelects(form: HTMLElement) {
  const closers: (() => void)[] = [];
  form.querySelectorAll<HTMLSelectElement>('select').forEach(select => {
    const label = select.closest('label')!;
    const caption = document.createElement('span');
    caption.id = `caption-${select.name}`;
    caption.textContent = label.firstChild?.textContent || select.name;
    const wrapper = document.createElement('div');
    wrapper.className = 'clock-select-field';
    const control = document.createElement('div');
    control.className = 'clock-select';
    const trigger = document.createElement('button');
    trigger.type = 'button'; trigger.className = 'clock-select-trigger';
    trigger.id = `trigger-${select.name}`;
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-labelledby', `${caption.id} ${trigger.id}`);
    const value = document.createElement('span');
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrow.setAttribute('viewBox', '0 0 24 24');
    arrow.setAttribute('class', 'clock-select-chevron');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.setAttribute('focusable', 'false');
    const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    chevron.setAttribute('d', 'm6 9 6 6 6-6');
    arrow.append(chevron);
    trigger.append(value, arrow);
    const list = document.createElement('div'); list.id = `options-${select.name}`;
    list.className = 'clock-select-options'; list.setAttribute('role','listbox');
    list.setAttribute('aria-labelledby',caption.id); list.hidden = true;
    trigger.setAttribute('aria-controls',list.id);
    const options = [...select.options].map(option => {
      const button = document.createElement('button'); button.type = 'button';
      button.setAttribute('role','option'); button.tabIndex = -1;
      const text = document.createElement('span'); text.textContent = option.text;
      const check = document.createElement('span'); check.className = 'option-check'; check.textContent = '✓'; check.setAttribute('aria-hidden','true');
      button.append(text,check);
      button.addEventListener('click', () => { select.value = option.value; select.dispatchEvent(new Event('change',{bubbles:true})); close(); trigger.focus(); });
      list.append(button); return button;
    });
    function sync() { value.textContent = select.selectedOptions[0]?.text || ''; options.forEach((b,i)=>b.setAttribute('aria-selected',String(i===select.selectedIndex))); }
    function close() { list.hidden = true; trigger.setAttribute('aria-expanded','false'); }
    function open() { closers.forEach(fn=>fn()); list.hidden = false; trigger.setAttribute('aria-expanded','true'); options[select.selectedIndex]?.focus(); }
    closers.push(close);
    trigger.addEventListener('click',()=>list.hidden?open():close());
    trigger.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();open();}});
    let typed = '', last = 0;
    list.addEventListener('keydown',e=>{
      const index = options.indexOf(document.activeElement as HTMLButtonElement);
      let next = index;
      if(e.key==='ArrowDown') next=(index+1)%options.length;
      else if(e.key==='ArrowUp') next=(index-1+options.length)%options.length;
      else if(e.key==='Home') next=0;
      else if(e.key==='End') next=options.length-1;
      else if(e.key==='Escape'){e.preventDefault();close();trigger.focus();return;}
      else if(e.key.length===1 && e.key!==' '){typed=Date.now()-last>700?e.key:typed+e.key;last=Date.now();next=[...select.options].findIndex(o=>o.text.toLocaleLowerCase().startsWith(typed.toLocaleLowerCase()));}
      else return;
      e.preventDefault();options[next]?.focus();
    });
    control.addEventListener('focusout',e=>{if(!control.contains(e.relatedTarget as Node))close();});
    document.addEventListener('click',e=>{if(!control.contains(e.target as Node))close();});
    select.addEventListener('change',sync);
    label.replaceWith(wrapper); select.hidden = true;
    control.append(trigger,list); wrapper.append(caption,select,control); sync();
  });
}
