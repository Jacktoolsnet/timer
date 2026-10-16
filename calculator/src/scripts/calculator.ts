import { currencySymbols, type Currency, calculate, emptyDocument, fixed, parse, validateDocument, type Document, type Step, type Operation, type Rational } from '../lib/calculation';
import {buildExample,exampleUi,type ExampleId} from '../lib/examples';
import type {Language} from '../lib/i18n';
import { calculatorText } from '../lib/calculator-text';
import {operationSymbols} from '../lib/operation-help';
import { enhanceCalculatorSelects } from './calculator-selects';
const app=document.querySelector<HTMLElement>('#calculator-app')!;
const c=JSON.parse(app.dataset.text!) as typeof calculatorText.en;
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const input=$<HTMLInputElement>('value'), name=$<HTMLInputElement>('step-name'), operation=$<HTMLInputElement>('operation');
const title=$<HTMLInputElement>('calculation-title'), decimals=$<HTMLSelectElement>('decimals'), round=$<HTMLInputElement>('round-each'), remember=$<HTMLInputElement>('remember-calculation');
const currency=$<HTMLSelectElement>('currency');
const side=$<HTMLSelectElement>('calculator-side');
side.value=document.documentElement.dataset.calculatorSide==='right'?'right':'left';
side.addEventListener('change',()=>{document.documentElement.dataset.calculatorSide=side.value;document.dispatchEvent(new Event('calculator-side-change'));});
const simpleTape=$<HTMLInputElement>('simple-tape');
let expandedStep:string|null=null;
simpleTape.checked=document.documentElement.dataset.tapeView==='simple';
simpleTape.addEventListener('change',()=>{
 document.documentElement.dataset.tapeView=simpleTape.checked?'simple':'detailed';expandedStep=null;
 document.dispatchEvent(new Event('calculator-tape-view-change'));render();
});
const optionsDialog=$<HTMLDialogElement>('calculator-options');
const explanationDialog=$<HTMLDialogElement>('operation-explanation');
const newDialog=$<HTMLDialogElement>('new-calculation-dialog');
const titleDialog=$<HTMLDialogElement>('calculation-title-dialog');
const examplesDialog=$<HTMLDialogElement>('examples-dialog');
const exampleLang=(Object.hasOwn(exampleUi,document.documentElement.lang)?document.documentElement.lang:'en') as Language;
let pendingExample:ExampleId|null=null;
function resetExamples(){pendingExample=null;$('examples-list').hidden=false;$('example-confirmation').hidden=true;}
$('examples').setAttribute('aria-haspopup','dialog');$('examples').setAttribute('aria-controls','examples-dialog');
$('examples').addEventListener('click',()=>{resetExamples();examplesDialog.showModal();});
function loadExample(id:ExampleId){mutate(()=>{doc=buildExample(exampleLang,id);});resetEditor();render();examplesDialog.close();resetExamples();$('export-status').textContent='';}
examplesDialog.querySelectorAll<HTMLButtonElement>('[data-example]').forEach(button=>button.addEventListener('click',()=>{
 const id=button.dataset.example as ExampleId;
 if(doc.steps.length||doc.title||input.value||name.value){pendingExample=id;$('example-confirmation-title').textContent=buildExample(exampleLang,id).title;$('examples-list').hidden=true;$('example-confirmation').hidden=false;$('example-cancel').focus();}
 else loadExample(id);
}));
$('example-cancel').addEventListener('click',()=>{const previous=pendingExample;resetExamples();examplesDialog.querySelector<HTMLButtonElement>(`[data-example="${previous}"]`)?.focus();});
$('example-confirm').addEventListener('click',()=>{if(pendingExample)loadExample(pendingExample);});
examplesDialog.addEventListener('close',resetExamples);
$('edit-calculation-title').addEventListener('click',()=>{title.value=doc.title;titleDialog.showModal();title.focus();title.select();});
$('cancel-calculation-title').addEventListener('click',()=>titleDialog.close());
$('calculation-title-form').addEventListener('submit',event=>{event.preventDefault();const value=title.value.trim();if(value!==doc.title)mutate(()=>doc.title=value);titleDialog.close();});
$('operation-explain').addEventListener('click',()=>explanationDialog.showModal());
const decimalsControl=enhanceCalculatorSelects(optionsDialog);
optionsDialog.addEventListener('close',()=>decimalsControl.close());
$('calculator-settings').addEventListener('click',()=>optionsDialog.showModal());
for(const dialog of [optionsDialog,explanationDialog,newDialog,titleDialog,examplesDialog])dialog.addEventListener('click',event=>{
 if(event.target!==dialog)return;
 const rect=dialog.getBoundingClientRect();
 if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
});
const focusButton=$<HTMLButtonElement>('calculator-focus');
let ownsFullscreen=false, focusSession=0, previousScroll=0;
function focusActive(){return document.body.classList.contains('calculator-focus-view');}
function setFocus(active:boolean){
 document.body.classList.toggle('calculator-focus-view',active);
 focusButton.setAttribute('aria-pressed',String(active));
 const label=(active?focusButton.dataset.exit:focusButton.dataset.enter)!;
 focusButton.setAttribute('aria-label',label);focusButton.querySelector('span')!.textContent=label;
}
async function leaveFocus(){
 ++focusSession;setFocus(false);
 const exit=ownsFullscreen&&!!document.fullscreenElement;ownsFullscreen=false;
 if(exit)await document.exitFullscreen().catch(()=>{});
 window.scrollTo(0,previousScroll);focusButton.focus({preventScroll:true});
}
focusButton.addEventListener('click',async()=>{
 if(focusActive()){await leaveFocus();return;}
 const session=++focusSession;previousScroll=window.scrollY;setFocus(true);window.scrollTo(0,0);
 // Fullscreen is an enhancement: focus view works when unsupported or denied.
 if(!document.fullscreenElement&&document.documentElement.requestFullscreen){
  try{
   await document.documentElement.requestFullscreen();ownsFullscreen=true;
   if(session!==focusSession||!focusActive())await leaveFocus();
  }catch{}
 }
});
document.addEventListener('fullscreenchange',()=>{
 if(ownsFullscreen&&!document.fullscreenElement){ownsFullscreen=false;if(focusActive())void leaveFocus();}
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&focusActive()&&!document.querySelector('dialog[open]')){event.preventDefault();void leaveFocus();}
});
const KEY='jacktools.calculator.document.v1' , CONSENT='jacktools.calculator.document-consent.v1';
let doc=emptyDocument(), undo:Document[]=[], redo:Document[]=[], editing:string|null=null, inserting:string|null=null, dirty=false, storageHealthy=true;
const clone=()=>structuredClone(doc);
try {remember.checked=localStorage.getItem(CONSENT)==='yes';if(remember.checked){const saved=localStorage.getItem(KEY);if(saved)doc=validateDocument(JSON.parse(saved));}}catch{remember.checked=false;$('calc-status').textContent=c.storageError;storageHealthy=false;}
function persist(){if(!remember.checked)return;try{localStorage.setItem(KEY,JSON.stringify(doc));storageHealthy=true;}catch{storageHealthy=false;$('calc-status').textContent=c.storageError;}}
function mutate(action:()=>void){undo.push(clone());if(undo.length>100)undo.shift();redo=[];action();dirty=true;persist();render();}
function display(value:Rational|null){return value?fixed(value,doc.decimals).replace('.',document.documentElement.lang==='en'?'.':','):'—';}
function amount(value:Rational|null){return display(value)+(value&&doc.currency?'\u00a0'+currencySymbols[doc.currency]:'');}
function errorText(error:string|null){return error==='zero'?c.zero:error==='blocked'?c.blocked:error==='limit'?c.limit:c.invalid;}
function node(tag:string,text?:string,className?:string){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
function setSubmitLabel(label:string){const button=$<HTMLButtonElement>('add-step');button.setAttribute('aria-label',label);button.title=label;}
function resetEditor(){editing=null;inserting=null;input.value='';name.value='';operation.value=doc.steps.length?'add':'set';$('cancel-edit').hidden=true;setSubmitLabel(c.addStep);syncInput();}
function syncInput(){
 input.disabled=['note','subtotal'].includes(operation.value);input.required=!input.disabled;input.setCustomValidity('');
 $('operation-label').textContent=c.ops[operation.value as Operation];
 $('operation-symbol').textContent=operationSymbols[operation.value as Operation];
 document.querySelectorAll<HTMLButtonElement>('[data-operation]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.operation===operation.value)));
 document.querySelectorAll<HTMLButtonElement>('.operator-key').forEach(button=>button.setAttribute('aria-pressed',String(symbols[button.dataset.key!]===operation.value)));
 $('operation-explanation-title').textContent=c.ops[operation.value as Operation];
 explanationDialog.querySelectorAll<HTMLElement>('.operation-help p').forEach(p=>{p.hidden=p.id!=='operation-tip-'+operation.value;});
}
function startEdit(id:string,insert=false){const s=doc.steps.find(s=>s.id===id);if(!s)return;editing=insert?null:id;inserting=insert?id:null;name.value=insert?'':s.name;input.value=insert?'':s.value;operation.value=insert?'add':s.operation;$('cancel-edit').hidden=false;setSubmitLabel(insert?c.insert:c.saveEdit);syncInput();render();$('step-form').scrollIntoView({behavior:'smooth',block:'center'});name.focus();}
function move(id:string,direction:number){const i=doc.steps.findIndex(s=>s.id===id),j=i+direction;if(i<0||j<0||j>=doc.steps.length)return;mutate(()=>{[doc.steps[i],doc.steps[j]]=[doc.steps[j],doc.steps[i]];});focusAction(id,direction<0?'up':'down');}
function focusAction(id:string,action:string){if(simpleTape.checked){expandedStep=id;syncReceiptExpansion();}document.querySelector<HTMLButtonElement>(`[data-id="${id}"] [data-action="${action}"]`)?.focus();}
function formula(step:Step,before:Rational|null,result:Rational|null,formatValue=false){
 const op=step.operation;if(op==='note'||op==='subtotal')return c.ops[op];
 const v=formatValue?display(parse(step.value)):step.value.replace('.',document.documentElement.lang==='en'?'.':',');
 if(!step.enabled)return `${c.ops[op]}: ${v}${['increase','discount','taxIn','taxOut'].includes(op)?' %':''}`;
 const symbol={set:'=',add:'+',subtract:'−',multiply:'×',divide:'÷',increase:'+',taxIn:'+',discount:'−',taxOut:'÷'}[op];
 if(op==='set')return `${c.ops.set}: ${v}`;
 if(op==='taxOut')return `${display(before)} ÷ (1 + ${v} / 100) · ${c.ops.taxOut}`;
 if(op==='increase'||op==='taxIn'||op==='discount'){
  let delta='—';if(before&&result)delta=display({n:result.n*before.d-before.n*result.d,d:result.d*before.d});
  return `${display(before)} ${symbol} ${v} % · ${c.delta}: ${delta} · ${c.ops[op]}`;
 }
 return `${display(before)} ${symbol} ${v}`;
}
function syncReceiptExpansion(){
 document.querySelectorAll<HTMLElement>('.tape-step').forEach(li=>{
  const expanded=li.dataset.id===expandedStep;li.dataset.expanded=String(expanded);
  li.querySelector('.receipt-summary')?.setAttribute('aria-expanded',String(expanded));
 });
}
function receiptFormula(s:Step,before:Rational|null,result:Rational|null,error:string|null){
 if(s.operation==='note')return s.name.trim()?'':c.ops.note;
 const value=display(parse(s.value)), percent=['increase','discount','taxIn','taxOut'].includes(s.operation);
 const symbols={set:'=',add:'+',subtract:'−',multiply:'×',divide:'÷',increase:'+',taxIn:'+',discount:'−',taxOut:'÷',subtotal:'Σ',note:''};
 const expression=s.operation==='subtotal'?'Σ':s.operation==='set'?value:s.operation==='taxOut'?`${display(before)} ÷ (1 + ${value} / 100)`:`${display(before)} ${symbols[s.operation]} ${value}${percent?' %':''}`;
 if(!s.enabled)return `${expression} · ${c.disabled}`;
 if(s.operation==='set')return `= ${error?errorText(error):amount(result)}`;
 return `${expression} = ${error?errorText(error):amount(result)}`;
}
function render(){
 const calculation=calculate(doc);$('result').textContent=amount(calculation.result);$('tape-result').textContent=amount(calculation.result);
 $('step-count').textContent=String(doc.steps.length);$('empty-tape').hidden=doc.steps.length>0;
 $('calculation-title-display').textContent=doc.title||c.untitled;
 if(!titleDialog.open)title.value=doc.title;currency.value=doc.currency||'';decimals.value=String(doc.decimals);decimalsControl.sync();round.checked=doc.roundEach;
 $<HTMLButtonElement>('undo').disabled=!undo.length;$<HTMLButtonElement>('redo').disabled=!redo.length;
 const list=$('steps');list.replaceChildren();
 doc.steps.forEach((s,i)=>{
  const row=calculation.rows[i];const li=node('li',undefined,'tape-step');li.dataset.id=s.id;li.dataset.enabled=String(s.enabled);li.dataset.editing=String(s.id===editing);li.draggable=!simpleTape.checked;
  const summary=node('button',undefined,'receipt-summary');summary.setAttribute('type','button');summary.setAttribute('aria-expanded',String(expandedStep===s.id));summary.setAttribute('aria-controls',`step-status-${s.id} step-actions-${s.id}`);summary.title=c.stepActions;
  if(s.name.trim())summary.append(node('span',s.name,'receipt-note'));
  const receiptText=receiptFormula(s,row.before,row.result,row.error);if(receiptText)summary.append(node('span',receiptText,'receipt-equation'));
  summary.addEventListener('click',()=>{expandedStep=expandedStep===s.id?null:s.id;syncReceiptExpansion();});li.dataset.expanded=String(expandedStep===s.id);li.append(summary);
  const header=node('div',undefined,'step-head');header.append(node('span',String(i+1).padStart(2,'0'),'step-number-small'),node('h3',s.operation==='set'?c.startValue:c.ops[s.operation],'step-name'));const topLine=node('div',undefined,'step-top-line');topLine.append(header);li.append(topLine);
  if(s.name.trim())li.append(node('p',s.name,'step-note'));
  li.append(node('p',formula(s,row.before,row.result),'step-equation'));
  const values=node('dl',undefined,'step-values'),hasInput=!['note','subtotal'].includes(s.operation);values.dataset.hasInput=String(hasInput);
  if(hasInput){const entered=node('div'),suffix=['increase','discount','taxIn','taxOut'].includes(s.operation)?' %':'';const value=node('dd',display(parse(s.value))+suffix,'step-input-value');value.title=c.value+': '+s.value.replace('.',document.documentElement.lang==='en'?'.':',')+suffix;entered.append(node('dt',c.value),value);values.append(entered);}
  const total=node('div',undefined,'step-result-cell');total.append(node('dt',c.total),node('dd',!s.enabled?'—':row.error?errorText(row.error):amount(row.result),'step-result'));values.append(total);li.append(values);
  const actions=node('div',undefined,'step-actions');actions.id=`step-actions-${s.id}`;actions.setAttribute('role','toolbar');actions.setAttribute('aria-orientation','horizontal');actions.setAttribute('aria-label',`${c.stepActions}: ${s.name||i+1}`);
  const label=node('label',undefined,'step-switch step-status-control'),trackWrap=node('span',undefined,'storage-switch'),checkbox=document.createElement('input');label.id=`step-status-${s.id}`;checkbox.type='checkbox';checkbox.checked=s.enabled;checkbox.setAttribute('role','switch');checkbox.setAttribute('aria-label',`${c.enabled}: ${s.name||i+1}`);
  checkbox.addEventListener('change',()=>{mutate(()=>{s.enabled=checkbox.checked;});document.querySelector<HTMLInputElement>(`[data-id="${s.id}"] input`)?.focus();});
  const track=node('span',undefined,'storage-switch-track');track.setAttribute('aria-hidden','true');trackWrap.append(checkbox,track);const stateText=node('span',s.enabled?c.active:c.disabled,'step-status-text'+(s.enabled?'':' step-state'));label.append(stateText,trackWrap);topLine.append(label);
  const actionLabels={edit:c.edit,insert:c.insert,up:c.up,down:c.down,remove:c.remove};
  const paths={edit:'m16 3 5 5M4 15 16 3l5 5L9 20l-6 1Z',insert:'M4 4h16M12 8v12m-5-5 5 5 5-5',up:'m5 11 7-7 7 7M12 4v16',down:'m5 13 7 7 7-7M12 4v16',remove:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7'};
  for(const action of ['edit','insert','up','down','remove'] as const){
   const tool=node('div',undefined,'step-tool'),button=document.createElement('button');button.type='button';button.dataset.action=action;button.setAttribute('aria-label',`${actionLabels[action]}: ${s.name||i+1}`);button.disabled=(action==='up'&&i===0)||(action==='down'&&i===doc.steps.length-1);
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',paths[action]);svg.append(path);button.append(svg);
   const tip=node('span',actionLabels[action],'tape-tooltip');tip.id=`step-tooltip-${s.id}-${action}`;tip.setAttribute('role','tooltip');button.setAttribute('aria-describedby',tip.id);
   button.addEventListener('click',()=>{if(action==='edit'||action==='insert')startEdit(s.id,action==='insert');if(action==='up'||action==='down')move(s.id,action==='up'?-1:1);if(action==='remove'){if(editing===s.id||inserting===s.id)resetEditor();mutate(()=>doc.steps.splice(i,1));const next=doc.steps[Math.min(i,doc.steps.length-1)];if(next)focusAction(next.id,'edit');else input.focus();}});tool.append(button,tip);actions.append(tool);
  }
  const controls=[...actions.querySelectorAll<HTMLInputElement|HTMLButtonElement>('input,button')];
  controls.forEach((control,index)=>{control.tabIndex=index===0?0:-1;control.addEventListener('focus',()=>{controls.forEach(other=>other.tabIndex=other===control?0:-1);delete control.closest<HTMLElement>('.step-tool')!.dataset.tooltipDismissed;});});
  actions.querySelectorAll<HTMLElement>('.step-tool').forEach(tool=>tool.addEventListener('pointerenter',()=>{delete tool.dataset.tooltipDismissed;}));
  actions.addEventListener('keydown',event=>{
   const available=controls.filter(control=>!control.disabled),index=available.indexOf(document.activeElement as HTMLInputElement|HTMLButtonElement);if(index<0)return;
   let next:number;if(event.key==='ArrowRight')next=(index+1)%available.length;else if(event.key==='ArrowLeft')next=(index-1+available.length)%available.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=available.length-1;
   else if(event.key==='Escape'){const tool=available[index].closest<HTMLElement>('.step-tool')!;if(tool.dataset.tooltipDismissed!=='true'){tool.dataset.tooltipDismissed='true';event.preventDefault();event.stopPropagation();}return;}else return;
   event.preventDefault();available[next].focus();
  });
  li.append(actions);
  li.addEventListener('dragstart',e=>{if(e.target instanceof Element&&e.target.closest('.step-actions,.step-status-control')){e.preventDefault();return;}e.dataTransfer?.setData('text/plain',s.id);if(e.dataTransfer)e.dataTransfer.effectAllowed='move';});
  li.addEventListener('dragover',e=>{e.preventDefault();li.classList.add('drag-over');});li.addEventListener('dragleave',()=>li.classList.remove('drag-over'));
  li.addEventListener('drop',e=>{e.preventDefault();const id=e.dataTransfer?.getData('text/plain');const from=doc.steps.findIndex(s=>s.id===id);if(from>=0&&from!==i)mutate(()=>{const [item]=doc.steps.splice(from,1);doc.steps.splice(doc.steps.findIndex(s=>s.id===li.dataset.id),0,item);});li.classList.remove('drag-over');});
  li.addEventListener('dragend',()=>document.querySelectorAll('.drag-over').forEach(el=>el.classList.remove('drag-over')));
  list.append(li);
 });
 renderPrint();
}
function submit(){
 input.setCustomValidity('');const op=operation.value as Operation;
 if(!['subtotal','note'].includes(op))try{parse(input.value);}catch{input.setCustomValidity(c.invalid);input.reportValidity();$('calc-status').textContent=c.invalid;return false;}
 if(!editing&&doc.steps.length>=500){$('calc-status').textContent=c.max;return false;}
 const step:Step={id:editing||crypto.randomUUID(),name:name.value.trim(),operation:op,value:input.disabled?'0':input.value.trim().replace(',','.'),enabled:editing?doc.steps.find(s=>s.id===editing)!.enabled:true};
 mutate(()=>{if(editing){doc.steps[doc.steps.findIndex(s=>s.id===editing)]=step;}else {const pos=inserting?doc.steps.findIndex(s=>s.id===inserting):doc.steps.length;doc.steps.splice(pos,0,step);}});
 resetEditor();render();$('calc-status').textContent=storageHealthy?c.applied:c.storageError;input.focus();return true;
}
$('step-form').addEventListener('submit',e=>{e.preventDefault();submit();});input.addEventListener('input',()=>input.setCustomValidity(''));
document.querySelectorAll<HTMLButtonElement>('[data-operation]').forEach(button=>{
 const op=button.dataset.operation as Operation;
 button.addEventListener('click',()=>{operation.value=op;syncInput();});
});
$('cancel-edit').addEventListener('click',()=>{resetEditor();render();input.focus();});
const symbols:Record<string,Operation>={'+':'add','−':'subtract','-':'subtract','×':'multiply','*':'multiply','÷':'divide','/':'divide'};
function key(key:string){
 if(symbols[key]){if(input.value.trim()&&!input.disabled&&!editing&&!inserting){if(!submit())return;}operation.value=symbols[key];syncInput();input.focus();return;}
 if(key==='clear')input.value='';else if(key==='backspace')input.value=input.value.slice(0,-1);else if(key==='±')input.value=input.value.startsWith('-')?input.value.slice(1):'-'+input.value;else{if(input.disabled)return;if(input.value.length<40)input.value+=key;}
 input.setCustomValidity('');input.focus();
}
document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(b=>b.addEventListener('click',()=>key(b.dataset.key!)));
// Operators always select an operation, even before the next value is entered.
// Use the ± key (or paste a signed value) for a negative operand.
input.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;if(symbols[e.key]){e.preventDefault();key(e.key);}});
// Route typing without stealing text edits, browser shortcuts or modal controls.
document.addEventListener('keydown',event=>{
 if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey||event.isComposing||event.key.length!==1)return;
 if(document.querySelector('dialog[open],#palette-dropdown[open]'))return;
 const target=event.target instanceof HTMLElement?event.target:null;
 const editable=target?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role=combobox],[role=listbox]');
 if(editable&&target!==input)return;
 const letter=/^\p{L}$/u.test(event.key),number=/^[0-9.,]$/.test(event.key);
 if(!letter&&(!number||target===input))return;
 const field=letter?name:input;
 if(field.disabled)return;
 event.preventDefault();
 if(field.value.length<field.maxLength)field.value+=event.key;
 field.focus();field.setSelectionRange(field.value.length,field.value.length);
 field.dispatchEvent(new Event('input',{bubbles:true}));
});

$('undo').addEventListener('click',()=>{if(!undo.length)return;redo.push(clone());doc=undo.pop()!;dirty=true;resetEditor();persist();render();});
$('redo').addEventListener('click',()=>{if(!redo.length)return;undo.push(clone());doc=redo.pop()!;dirty=true;resetEditor();persist();render();});
$('new').addEventListener('click',()=>{newDialog.returnValue='';newDialog.showModal();});
newDialog.addEventListener('close',()=>{
 const confirmed=newDialog.returnValue==='new';newDialog.returnValue='';
 if(!confirmed)return;
 mutate(()=>{doc=emptyDocument();});resetEditor();render();input.focus();
});
currency.addEventListener('change',()=>mutate(()=>doc.currency=currency.value as Currency));
decimals.addEventListener('change',()=>mutate(()=>doc.decimals=Number(decimals.value)));round.addEventListener('change',()=>mutate(()=>doc.roundEach=round.checked));
remember.addEventListener('change',()=>{try{if(remember.checked){localStorage.setItem(CONSENT,'yes');persist();}else{localStorage.removeItem(CONSENT);localStorage.removeItem(KEY);}}catch{remember.checked=false;storageHealthy=false;$('calc-status').textContent=c.storageError;}});
document.addEventListener('calculator-clear',()=>{try{localStorage.removeItem(CONSENT);localStorage.removeItem(KEY);}catch{}remember.checked=false;});
function exportRows(){const result=calculate(doc);return doc.steps.map((s,i)=>[String(i+1),s.name,c.ops[s.operation],s.value,s.enabled?c.active:c.disabled,display(result.rows[i].before),formula(s,result.rows[i].before,result.rows[i].result),result.rows[i].error?errorText(result.rows[i].error):amount(result.rows[i].result)]);}
function download(data:string,type:string,extension:string){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=(doc.title||'jacktools-calculator').replace(/[^\p{L}\p{N}\-_ ]/gu,'').slice(0,80)+extension;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export').addEventListener('click',()=>download(JSON.stringify(doc,null,2),'application/json','.json'));
$('csv').addEventListener('click',()=>{
 const escape=(v:string)=>'"'+(/^[=+\-@\t\r]/.test(v)?"'":'')+v.replaceAll('"','""')+'"';
 const rows=[[c.titleLabel,doc.title],[c.rounding,doc.roundEach?c.perStep:c.exact],[c.decimals,String(doc.decimals)],...(doc.currency?[[c.currency,doc.currency]]:[]),[],['#',c.name,c.operation,c.value,c.status,c.before,c.delta,c.total],...exportRows(),[c.total,amount(calculate(doc).result)]];
 download('\uFEFF'+rows.map(row=>row.map(escape).join(';')).join('\r\n'),'text/csv;charset=utf-8','.csv');
});
$('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText([doc.title||c.title,...(doc.currency?[`${c.currency}: ${doc.currency}`]:[]),`${c.rounding}: ${doc.roundEach?c.perStep:c.exact} (${doc.decimals})`,...exportRows().map(row=>row.join('\t')),`${c.total}: ${amount(calculate(doc).result)}`].join('\n'));$('export-status').textContent=c.copied;}catch{$('export-status').textContent=c.copyError;}});
function renderPrint(){const result=calculate(doc);$('print-title').textContent=doc.title||c.title;$('print-rounding').textContent=`${c.rounding}: ${doc.roundEach?c.perStep:c.exact} · ${c.decimals}: ${doc.decimals}${doc.currency?` · ${c.currency}: ${doc.currency}`:''}`;$('print-result').textContent=c.total+': '+amount(result.result);const body=$('print-rows');body.replaceChildren();doc.steps.forEach((s,i)=>{if(!s.enabled)return;const tr=node('tr');for(const value of [String(i+1),s.name,formula(s,result.rows[i].before,result.rows[i].result,true),result.rows[i].error?errorText(result.rows[i].error):amount(result.rows[i].result)])tr.append(node('td',value));body.append(tr);});}
$('print').addEventListener('click',()=>{renderPrint();window.print();});
$('import').addEventListener('click',()=>$<HTMLInputElement>('import-file').click());
$('import-file').addEventListener('change',async()=>{const element=$<HTMLInputElement>('import-file'),file=element.files?.[0];if(!file)return;try{if(file.size>500000)throw Error();const loaded=validateDocument(JSON.parse(await file.text()));if(doc.steps.length&&!confirm(c.confirm))return;mutate(()=>doc=loaded);resetEditor();render();$('export-status').textContent=c.fileLoaded;}catch{$('export-status').textContent=c.fileError;}finally{element.value='';}});
window.addEventListener('beforeunload',e=>{if(dirty&&doc.steps.length&&(!remember.checked||!storageHealthy)){e.preventDefault();}});
resetEditor();render();

// A single tab stop with arrow navigation; tooltip text remains the accessible label.
const tapeToolbar=document.querySelector<HTMLElement>('.tape-actions')!;
const tapeButtons=[...tapeToolbar.querySelectorAll<HTMLButtonElement>('button')];
tapeButtons.forEach((button,index)=>{
 button.tabIndex=index===0?0:-1;
 const tool=button.closest<HTMLElement>('.tape-tool')!;
 button.addEventListener('focus',()=>{tapeButtons.forEach(other=>other.tabIndex=other===button?0:-1);delete tool.dataset.tooltipDismissed;});
 tool.addEventListener('pointerenter',()=>{delete tool.dataset.tooltipDismissed;});
});
tapeToolbar.addEventListener('keydown',event=>{
 const index=tapeButtons.indexOf(document.activeElement as HTMLButtonElement);if(index<0)return;
 let next:number;
 if(event.key==='ArrowRight')next=(index+1)%tapeButtons.length;
 else if(event.key==='ArrowLeft')next=(index-1+tapeButtons.length)%tapeButtons.length;
 else if(event.key==='Home')next=0;
 else if(event.key==='End')next=tapeButtons.length-1;
 else if(event.key==='Escape'){
  const tool=tapeButtons[index].closest<HTMLElement>('.tape-tool')!;
  if(tool.dataset.tooltipDismissed!=='true'){tool.dataset.tooltipDismissed='true';event.preventDefault();event.stopPropagation();}
  return;
 }else return;
 event.preventDefault();tapeButtons[next].focus();
});
