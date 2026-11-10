/** Enhance a native select while retaining its form value and validation semantics. */
export function initializeSelectPicker(select:HTMLSelectElement){
 const d=select.ownerDocument,w=d.defaultView!,host=d.createElement('div'),trigger=d.createElement('button'),value=d.createElement('span'),list=d.createElement('div');
 host.className='themed-select-picker';trigger.type='button';trigger.id=select.id+'-trigger';trigger.className='themed-select-trigger';trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
 list.id=select.id+'-options';list.className='themed-select-options';list.role='listbox';list.hidden=true;trigger.setAttribute('aria-controls',list.id);
 const label=Array.from(d.querySelectorAll<HTMLLabelElement>('label')).find(label=>label.htmlFor===select.id);
 if(label){label.id ||= select.id+'-label';label.htmlFor=trigger.id;trigger.setAttribute('aria-labelledby',label.id);list.setAttribute('aria-labelledby',label.id);}
 const arrow=d.createElement('span');arrow.className='themed-select-arrow';arrow.setAttribute('aria-hidden','true');arrow.innerHTML='<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>';
 trigger.append(value,arrow);select.before(host);host.append(select,trigger,list);
 const options=Array.from(select.options).map(option=>{
  const button=d.createElement('button');button.type='button';button.role='option';button.tabIndex=-1;button.dataset.value=option.value;
  const name=d.createElement('span');name.textContent=option.textContent;
  const check=d.createElement('span');check.className='themed-select-check';check.setAttribute('aria-hidden','true');check.innerHTML='<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>';
  button.append(name,check);button.addEventListener('click',()=>{
   if(trigger.disabled||button.disabled)return;const changed=select.value!==option.value;select.value=option.value;sync();close(true);
   if(changed){select.dispatchEvent(new w.Event('input',{bubbles:true}));select.dispatchEvent(new w.Event('change',{bubbles:true}));}
  });
  return button;
 });
 const available=()=>options.filter(option=>!option.disabled);
 function focus(button:HTMLButtonElement|undefined){button?.focus();button?.scrollIntoView?.({block:'nearest'});}
 function close(returnFocus=false){list.hidden=true;trigger.setAttribute('aria-expanded','false');if(returnFocus&&!trigger.disabled)trigger.focus();}
 function sync(){
  value.textContent=select.selectedOptions[0]?.textContent||'';trigger.disabled=select.disabled;
  options.forEach((button,index)=>{button.disabled=select.disabled||select.options[index].disabled;button.setAttribute('aria-selected',String(button.dataset.value===select.value));});
  if(trigger.disabled)close();
 }
 function open(last=false){
  if(trigger.disabled)return;sync();list.hidden=false;
  const rect=trigger.getBoundingClientRect(),dialog=host.closest('dialog')?.getBoundingClientRect(),below=Math.min(w.innerHeight-12,dialog?.bottom??w.innerHeight-12)-rect.bottom,above=rect.top-Math.max(12,dialog?.top??12);
  const up=below<Math.min(list.scrollHeight,240)+8&&above>below;host.dataset.placement=up?'above':'below';
  list.style.setProperty('--select-options-height',Math.max(40,Math.min(240,(up?above:below)-8))+'px');
  trigger.setAttribute('aria-expanded','true');const buttons=available();focus(buttons.find(button=>button.dataset.value===select.value)||(last?buttons.at(-1):buttons[0]));
 }
 options.forEach(button=>button.addEventListener('keydown',event=>{
  const buttons=available(),index=buttons.indexOf(button);
  if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();focus(buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]);}
  else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}else if(event.key==='Tab')close();
 }));
 list.append(...options);select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');sync();
 trigger.addEventListener('click',()=>list.hidden?open():close());
 trigger.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();open(event.key==='ArrowUp');}else if(event.key==='Escape'&&!list.hidden){event.preventDefault();event.stopPropagation();close(true);}});
 d.addEventListener('click',event=>{if(!host.contains(event.target as Node))close();});host.addEventListener('focusout',event=>{if(!host.contains(event.relatedTarget as Node|null))close();});
 select.addEventListener('change',sync);select.form?.addEventListener('reset',()=>{close();w.queueMicrotask(sync);});
 select.addEventListener('invalid',event=>{event.preventDefault();trigger.focus();});w.addEventListener('pagehide',()=>close());host.closest('dialog')?.addEventListener('close',()=>close());
 return {sync,close,setDisabled(disabled:boolean){select.disabled=disabled;sync();}};
}
