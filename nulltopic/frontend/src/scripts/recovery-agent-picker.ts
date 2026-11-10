import {avatar,node} from './operator-notices';
export interface RecoveryAgent {id:string;name:string;handle:string;enabled:boolean;has_avatar?:boolean;}
/** Private owned-agent selection; changing selection never changes a recovery permission. */
export function initializeRecoveryAgentPicker(select:HTMLSelectElement,choose:(id:string,trigger:HTMLElement)=>void){
 const d=select.ownerDocument,host=d.getElementById('recovery-agent-picker')!,trigger=d.querySelector<HTMLButtonElement>('#recovery-agent-trigger')!,value=d.getElementById('recovery-agent-value')!,list=d.getElementById('recovery-agent-options')!;
 let agents:RecoveryAgent[]=[],buttons:HTMLButtonElement[]=[];
 function close(focus=false){list.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus();}
 function open(){if(trigger.disabled)return;list.hidden=false;trigger.setAttribute('aria-expanded','true');(buttons.find(b=>b.dataset.value===select.value)||buttons[0])?.focus();}
 function identity(a:RecoveryAgent){const text=node('span',undefined,'recovery-picker-identity');text.append(node('strong',a.name),node('span','@'+a.handle,'meta'));const row=node('span',undefined,'recovery-picker-row');row.append(avatar(a.id,a.name,a.has_avatar),text);return row;}
 function sync(){const selected=agents.find(a=>a.id===select.value);value.replaceChildren(...(selected?[identity(selected)]:[]));buttons.forEach(b=>b.setAttribute('aria-selected',String(b.dataset.value===select.value)));}
 function update(items:RecoveryAgent[]){
  const previous=select.value;agents=items;select.replaceChildren(...items.map(a=>{const option=d.createElement('option');option.value=a.id;option.textContent=a.name+' · @'+a.handle;return option;}));if(items.some(a=>a.id===previous))select.value=previous;
  buttons=items.map((a,index)=>{const b=node('button') as HTMLButtonElement;b.type='button';b.role='option';b.tabIndex=-1;b.dataset.value=a.id;b.append(identity(a));b.addEventListener('click',()=>{close(true);choose(a.id,trigger);});
   b.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next]?.focus();buttons[next]?.scrollIntoView?.({block:'nearest'});}else if(event.key==='Escape'){event.preventDefault();close(true);}else if(event.key==='Tab')close();});return b;});
  list.replaceChildren(...buttons);close();sync();trigger.disabled=!items.length;
 }
 trigger.addEventListener('click',()=>list.hidden?open():close());trigger.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();open();}else if(event.key==='Escape')close();});
 d.addEventListener('click',event=>{if(!host.contains(event.target as Node))close();});select.addEventListener('change',sync);select.addEventListener('invalid',event=>{event.preventDefault();trigger.focus();});d.defaultView!.addEventListener('pagehide',()=>close());
 return {update,sync,close,setBusy(busy:boolean){trigger.disabled=busy||!agents.length;if(busy)close();buttons.forEach(b=>b.disabled=busy);}};
}
