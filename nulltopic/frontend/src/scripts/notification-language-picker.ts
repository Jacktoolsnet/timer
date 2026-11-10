/** A themed native-select enhancement. The select remains the single form/draft value. */
export function initializeNotificationLanguagePicker(select:HTMLSelectElement){
 const d=select.ownerDocument,w=d.defaultView!,host=d.getElementById('notification-language-picker')!,trigger=d.querySelector<HTMLButtonElement>('#notification-language-trigger')!,value=d.getElementById('notification-language-value')!,list=d.getElementById('notification-language-options')!,label=d.querySelector<HTMLLabelElement>('#notification-language-label')!;
 let busy=true;
 const buttons=Array.from(select.options).map(option=>{
  const button=d.createElement('button');button.type='button';button.role='option';button.tabIndex=-1;button.dataset.value=option.value;button.lang=option.lang;
  const code=d.createElement('span');code.className='notification-language-code';code.setAttribute('aria-hidden','true');code.textContent=option.value.toUpperCase();
  const name=d.createElement('span');name.textContent=option.textContent;
  const check=d.createElement('span');check.className='notification-language-check';check.setAttribute('aria-hidden','true');check.innerHTML='<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>';
  button.append(code,name,check);
  button.addEventListener('click',()=>{if(busy)return;const changed=select.value!==option.value;select.value=option.value;sync();close(true);if(changed){select.dispatchEvent(new w.Event('input',{bubbles:true}));select.dispatchEvent(new w.Event('change',{bubbles:true}));}});
  return button;
 });
 function sync(){const selected=select.selectedOptions[0];value.textContent=selected?.textContent||'';value.lang=selected?.lang||'';for(const button of buttons)button.setAttribute('aria-selected',String(button.dataset.value===select.value));}
 function close(focus=false){list.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus&&!trigger.disabled)trigger.focus();}
 function focus(index:number){buttons[index]?.focus();buttons[index]?.scrollIntoView?.({block:'nearest'});}
 function open(last=false){if(busy||trigger.disabled)return;list.hidden=false;const rect=trigger.getBoundingClientRect(),height=list.getBoundingClientRect().height;host.dataset.placement=w.innerHeight-rect.bottom<height+8&&rect.top>height+8?'above':'below';trigger.setAttribute('aria-expanded','true');const index=buttons.findIndex(button=>button.dataset.value===select.value);focus(index>=0?index:last?buttons.length-1:0);}
 buttons.forEach((button,index)=>button.addEventListener('keydown',event=>{
  if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();focus(event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length);}
  else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}else if(event.key==='Tab')close();
 }));
 list.replaceChildren(...buttons);select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');label.htmlFor=trigger.id;trigger.hidden=false;sync();trigger.disabled=true;
 trigger.addEventListener('click',()=>list.hidden?open():close());trigger.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();open(event.key==='ArrowUp');}else if(event.key==='Escape')close();});
 d.addEventListener('click',event=>{if(!host.contains(event.target as Node))close();});host.addEventListener('focusout',event=>{if(!host.contains(event.relatedTarget as Node|null))close();});select.addEventListener('change',sync);w.addEventListener('pagehide',()=>close());
 return {sync,close,setBusy(disabled:boolean){busy=disabled;trigger.disabled=disabled;buttons.forEach(button=>button.disabled=disabled);if(disabled)close();}};
}
