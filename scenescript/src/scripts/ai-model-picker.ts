import {modelProfiles,modelProfile,modelTask,suggestedModel,usableModel,type ModelEntry,type ReasoningEffort} from '../lib/ai-models';
import type {aiModelWords} from '../lib/ai-model-i18n';
/** UI-only configuration; no credentials or settings are persisted in the project. */
export function installAiModelPicker(action:HTMLSelectElement,model:HTMLInputElement){
 const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById('ai-workflow-'+id) as T;
 const t=JSON.parse($('dialog').dataset.modelWords!) as ReturnType<typeof aiModelWords>,choice=$<HTMLSelectElement>('model-choice'),effort=$<HTMLSelectElement>('reasoning');
 const lists=new Map<string,ModelEntry[]>();
 const provider=()=>modelTask(action.value)==='speech'?'elevenlabs':'openai';
 function option(parent:HTMLElement,value:string,label:string){const o=document.createElement('option');o.value=value;o.textContent=label;parent.append(o);}
 function thinking(){
  const text=modelTask(action.value)==='text',profile=modelProfile(model.value.trim()),previous=effort.value;
  $('reasoning-options').hidden=!text;$('model-recommendation').hidden=!text;
  effort.replaceChildren();option(effort,'',t.auto);if(text)for(const value of profile?.efforts??[])option(effort,value,t[value]);
  effort.value=Array.from(effort.options).some(o=>o.value===previous)?previous:'';effort.disabled=!text||!profile?.efforts.length;
  $('reasoning-hint').textContent=profile?.efforts.length?t.reasonHint:t.unknown;
  $('model-advice').textContent=action.value==='script'?t.recommendScript:t.recommendBoard;
  const list=lists.get(provider());$<HTMLButtonElement>('use-recommendation').disabled=!!list&&!list.some(m=>m.id===suggestedModel(action.value).id);
 }
 function choices(){
  const task=modelTask(action.value),list=lists.get(provider()),entries=(list??modelProfiles.filter(p=>p.task===task)).filter(e=>usableModel(e,task));
  choice.replaceChildren();const known=document.createElement('optgroup'),other=document.createElement('optgroup');known.label=list?t.listed:t.known;other.label=t.other;
  for(const entry of entries){const p=modelProfile(entry.id);option(p?known:other,entry.id,p?p.name+(p.id!==entry.id?' · '+entry.id:''):entry.name);}
  if(known.children.length)choice.append(known);if(other.children.length)choice.append(other);option(choice,'__manual',t.manual);
  const present=entries.some(e=>e.id===model.value);choice.value=present?model.value:'__manual';$('model-manual').hidden=present;thinking();
 }
 choice.addEventListener('change',()=>{const custom=choice.value==='__manual';$('model-manual').hidden=!custom;if(!custom)model.value=choice.value;thinking();model.dispatchEvent(new Event('input',{bubbles:true}));if(custom)model.focus();});
 model.addEventListener('input',thinking);
 $('use-recommendation').addEventListener('click',()=>{const suggestion=suggestedModel(action.value);model.value=suggestion.id;choices();effort.value=suggestion.effort;model.dispatchEvent(new Event('input',{bubbles:true}));});
 return {
  configure(defaultModel:string){model.value=defaultModel;effort.value='';choices();$('model-status').textContent='';},
  reset(){lists.clear();},
  accept(which:'openai'|'elevenlabs',entries:ModelEntry[]){lists.set(which,entries);choices();const total=entries.filter(e=>usableModel(e,modelTask(action.value))).length;$('model-status').textContent=`${t.loaded}: ${total} / ${entries.length}`+(entries.some(e=>e.id===model.value)?'':' · '+t.unlisted);},
  get reasoning(){return modelTask(action.value)==='text'&&effort.value?effort.value as ReasoningEffort:undefined;},
  get loading(){return t.loading;},
 };
}
